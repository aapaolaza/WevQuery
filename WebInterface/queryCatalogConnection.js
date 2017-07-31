var queryCatalogConnection = createqueryCatalogConnectionFunctions();

function createqueryCatalogConnectionFunctions() {

  var queryCatalogConnectionObject = {};


  /**
 * Requests the list of all available collections
 */

  queryCatalogConnectionObject.requestCompletedQueries = function () {
    socket.emit('serverRequestCompletedQueries');
  }

  /**
   * Requests the list of all queries in Catalog
   */
  queryCatalogConnectionObject.requestCatalogQueries = function () {
    socket.emit('serverRequestCatalogQueries');
  }

  /**
  * Request the result list for a given query
  */
  queryCatalogConnectionObject.requestQueryResultList = function (title) {
    socket.emit('serverRequestQueryResults', { "queryTitle": title });
  }

  /**
 * Requests the list of all currently running queries
 */

  queryCatalogConnectionObject.requestRunningQueries = function () {
    socket.emit('serverRequestRunningQueries');
  }


  /**
   * Requests the deletion of a results collections
   */
  queryCatalogConnectionObject.requestQueryResultsDeletion = function (resultTitle) {
    console.log("Delete " + queryTitle + " results");
    socket.emit('serverDeleteResults', {
      "resultTitle": resultTitle
    });
  }

  /**
   * Requests the deletion of a Catalog element
   */
  queryCatalogConnectionObject.requestQueryCatalogDeletion = function (queryTitle) {
    console.log("Delete " + queryTitle + " Catalog");
    socket.emit('serverDeleteCatalog', {
      "queryTitle": queryTitle
    });
  }

  /**
   * Initiates the give query, with the given parameters
   * @param [string] email to send the results to
   * @param [boolean] determines if the query will be run on strict mode
   * @param [string] queryTitle for the query to be run.
   * @param [string] queryData is the XML string of the query to run.
   */
  queryCatalogConnectionObject.requestExecuteQuery = function (email, isStrictMode, queryTitle, queryData) {
    socket.emit('serverRunXMLQuery', {
      "email": email,
      "isStrictMode": isStrictMode,
      "xmlTitle": queryTitle,
      "xmlData": queryData,
      "timestamp": new Date().getTime()
    });
  }

  /**
   * Request the data for a query
   */
  function requestQueryData(title) {
    socket.emit('serverRequestQueryData', { "queryTitle": title });
  }

  return queryCatalogConnectionObject;
}


/**
 * Leave the socket connection receivers outside the function wrapper
 */
socket.on('clientCompletedQueriesFinished', function (data) {
  notifyUser(data.queryList.length + " finished queries have been retrieved", data.isError);
  queryCatalogLeftMenu.updateCompletedQueries(data.queryList);
});

socket.on('serverRequestCatalogQueriesFinished', function (data) {
  queryCatalog.saveQueryCatalogList(data.queryList);
  queryCatalogLeftMenu.updateCatalogQueries(data.queryList);
  notifyUser(data.queryList.length + " Catalog queries have been retrieved");
});

socket.on('serverRequestQueryResultsFinished', function (data) {
  notifyUser(data.resultList.length + " results for the query " + data.queryTitle
    + " have been retrieved");
  queryCatalog.addCatalogQueryResults(data.queryTitle, data.resultList);
});


socket.on('serverRequestRunningQueriesFinished', function (data) {
  queryCatalogLeftMenu.updateRunningQueries(data.queryList);
  notifyUser(data.queryList.length + " running queries have been retrieved");
});


socket.on('deleteResultFinished', function (data) {
  notifyUser("Results deleted" + data.message, false);
  queryCatalogConnection.requestCompletedQueries();
});

socket.on('deleteCatalogFinished', function (data) {
  notifyUser("Catalog deleted" + data.message, false);
  queryCatalogConnection.requestCatalogQueries();
});

socket.on('clientXmlQueryFinished', function (data) {
  notifyUser(data.message);
});

/**
 * Processes received json object
 * TODO: I don't like the idea of downloading the whole collection to the client. I think it's better to abstract him from that.
 */
socket.on('clientQueryDataProcessed', function (data) {
  notifyUser("A document for the query " + data.queryTitle + " has been received");
  console.log("A document for the query " + data.queryTitle + " has been received");
  console.log("The file is available in " + data.queryPath);

  //Construct the path to the resulting json file
  window.open(window.location.href.split("WebInterface")[0] + data.queryPath);
});