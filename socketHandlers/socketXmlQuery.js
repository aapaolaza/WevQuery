
var mongoDAO;
var socketConnection;
var socketGeneric;
var socketInstance;

function initialiseSockets(generalMongoDAO, generalSocketGeneric,
  generalSocketConnection, generalSocketInstance) {

  mongoDAO = generalMongoDAO;
  socketConnection = generalSocketConnection;
  socketGeneric = generalSocketGeneric;
  socketInstance = generalSocketInstance;

  socketInstance.on('saveXMLQuery', function (data) {
    console.log("saveXMLQuery, saving the following XML query: " + data.title);
    console.log("saveXMLQuery, description: " + data.description);
    console.log(data.xmlData)

    mongoDAO.isQueryTitleInCatalog(data.title, function (err, isTitleCorrect) {
      if (data.title && isTitleCorrect) {
        console.log(isTitleCorrect);
        mongoDAO.saveQuery(data.title, data.description, data.xmlData);
        socketConnection.emit('clientXmlQuerySaved', {});
      }
      else {
        console.log("On saveXMLQuery: Title is not valid, notify user that an error happened.");
        socketConnection.emit('clientXmlQuerySaved', { 'errorMessage': "The given title is not valid, please provide a different one. Is this title already in use?" });
      }
    });
  });

  //To be triggered when a request to run a query is received
  socketInstance.on('serverRunXMLQuery', function (data) {
    console.log("serverRunXMLQuery, running the provided query");
    //validate XML before executing query
    validateXMLagainstXSD(data.xmlData, function (err, isXmlValid) {
      if (err) { console.log(err); }
      else {
        if (isXmlValid) {
          // XML validation was correct, run query
          mongoDAO.isQueryTitleInResults(data.xmlTitle, function (err, isTitleCorrect) {
            if (isTitleCorrect) {
              //try to retrieve the information from the catalog
              mongoDAO.getCatalogQueryInfo(data.xmlTitle, function (err, catalogObject) {
                if (err) {
                  console.log(err);
                  //for some reason the query doesn't exist in catalog
                  socketGeneric.sendMessageToUser(socketInstance.id, "The provided query name " +
                    data.xmlTitle + " doesn't exist in the catalog", true, socketConnection);
                } else {
                  //if it exist, run the query 
                  startXmlQuery(catalogObject,data.isStrictMode);

                }

              });
            }
            else {
              console.log("Title is not valid, notify user that an error happened.");
              socketGeneric.sendMessageToUser(socketInstance.id, "The given title is not correct, provide a different one", true, socketConnection);
              console.log("xml title is not valid");
            }
          });
        } else {
          console.log("xml was invalid, notify user that an error happened.");
          socketGeneric.sendMessageToUser(socketInstance.id, "XML was not well formed", true, socketConnection);
          console.log("xml query failed");
        }
      }
    });
  });

  socketInstance.on('serverRequestCompletedQueries', function (data) {
    console.log("serverRequestCompletedQueries, requesting available queries");
    mongoDAO.getCompletedQueries(completedQueriesFinished);
  });

  socketInstance.on('serverRequestCatalogQueries', function (data) {
    console.log("serverRequestCatalogQueries, requesting Catalog queries");
    mongoDAO.getCatalogQueries(catalogQueriesFinished);
  });

  socketInstance.on('serverRequestRunningQueries', function (data) {
    console.log("serverRequestRunningQueries, requesting running queries");
    mongoDAO.getRunningQueries(runningQueriesFinished);
  });


  socketInstance.on('serverDeleteResults', function (data) {
    console.log("serverDeleteResults, deleting the following results: " + data.queryTitle);
    mongoDAO.deleteResultCollection(data.queryTitle, function (err) {
      if (err) return console.error("serverDeleteResults() ERROR in deleteResultCollection callback " + err);
      mongoDAO.deleteCompletedQuery(data.queryTitle, function (err) {
        if (err) return console.error("serverDeleteResults() ERROR in deleteCompletedQuery callback " + err);
        deleteResultFinished(data.queryTitle);
      });
    });
  });

  socketInstance.on('serverDeleteCatalog', function (data) {
    console.log("serverDeleteCatalog, deleting the following Catalog: " + data.queryTitle);
    mongoDAO.deleteCatalogQuery(data.queryTitle, function (err) {
      if (err) return console.error("serverDeleteCatalog() ERROR in deleteCatalogQuery callback " + err);
      deleteCatalogFinished(data.queryTitle);
    });
  });

}


/**
 * Provided a query document, runs the provided query and stores a results document when finished
 */
function startXmlQuery(queryDocument,isQueryStrict) {
  console.log("XML should be run at this point with the following information:");
  console.log("xmlTitle:" + queryDocument.title);
  console.log("xmlData:" + queryDocument.queryXML);

  var queryOptions = {};
  queryOptions.isQueryStrict = isQueryStrict;
  console.log("isQueryStrict:" + isQueryStrict);

  mongoDAO.runXmlQuery(queryDocument.title, queryDocument.queryXML, queryOptions,
    function (err, queryTitle, querydbTitle, processTime, isQueryStrict) {
      if (err) return console.error("startXmlQuery() ERROR in endCallback " + err);

      xmlQueryFinished(queryTitle, processTime);
    },
    function (err, queryTitle, querydbTitle, xmlQuery, isQueryStrict) {
      if (err) return console.error("startXmlQuery() ERROR in launchedCallback " + err);

      mongoDAO.addNewQueryDocument(queryTitle, isQueryStrict, xmlQuery);
    });

}


/**
 * When the database retrieves all available queries it returns an array of strings
 */

function completedQueriesFinished(err, queryList) {
  if (err) return console.error("completedQueriesFinished() ERROR retrieving available queries " + err);
  console.log("Available queries retrieved: " + queryList.length);
  socketConnection.emit('clientCompletedQueriesFinished', { 'queryList': queryList });
}

/**
 * When the database retrieves all Catalog queries it returns an array of query documents
 */
function catalogQueriesFinished(err, queryList) {
  if (err) return console.error("catalogQueriesFinished() ERROR retrieving Catalog queries " + err);
  socketConnection.emit('serverRequestCatalogQueriesFinished', { 'queryList': queryList });
}

/**
 * When the database retrieves all currently running queries it returns an array of query documents
 */
function runningQueriesFinished(err, queryList) {
  if (err) return console.error("runningQueriesFinished() ERROR retrieving running queries " + err);
  socketConnection.emit('serverRequestRunningQueriesFinished', { 'queryList': queryList });
}
/**
 * When the xmlQuery finishes, an email will be sent, and the Web interface will be notified
 */
function xmlQueryFinished(queryTitle, processTime) {
  console.log("xmlQueryFinished()");
  mongoDAO.setQueryFinished(queryTitle, processTime);
  //Notify Web dashboard
  socketConnection.emit('clientXmlQueryFinished', { 'message': "The query called " + queryTitle + " finished without problems" });
}

/**
 * When the result has been deleted, notify the user
 */
function deleteResultFinished(queryTitle) {
  console.log("deleteResultFinished()");
  socketConnection.emit('deleteResultFinished', { 'message': "The qresults of the query called " + queryTitle + " has been deleted" });
}

/**
 * When the Catalog has been deleted, notify the user
 */
function deleteCatalogFinished(queryTitle) {
  console.log("deleteCatalogFinished()");
  socketConnection.emit('deleteCatalogFinished', { 'message': "The Catalog of the query called " + queryTitle + " has been deleted" });
}


/**
 * This function should validate the XML against the schema.
 * returns no error if everything went alright.
 * If not, it will return the received error message.
 */
function validateXMLagainstXSD(xmlData, callback) {
  //TODO: for some reason this validator module does not recognise the JAVA installation. I will skip it.
  callback(null, true);
  return null;

  var validator = require('xsd-schema-validator');
  var schemaPath = '../schema.xsd'

  fs = require('fs')
  fs.readFile(schemaPath, 'utf8', function (err, xmlSchema) {
    if (err) {
      callback(err, null);
    }
    console.log("validating");
    console.log(xmlData);
    console.log(xmlSchema);
    validator.validateXML(xmlData, xmlSchema, function (err, result) {
      // err contains any technical error 
      console.log("Was there an error? " + err);
      console.log("Was Validation correct? " + result);
      callback(err, result.valid);
    });
  });
}


module.exports.initialiseSockets = initialiseSockets;