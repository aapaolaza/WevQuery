/**
 * For each query, the following object is created in constants.xmlQueryResults:
 * 
 ```json
 {title:queryTitle,
  queryXML:queryData,
  operationID:opid,
  microsecs_running: timerunning,
  datems:new Date().getTime(),
  readableDate:new Date().toISOString(),
  progress:queryMessage,
  finished:false,
  count:usableCount,
  totalCount:totalNumberOfEpisodes};
  ```
 * Once deleted, it's moved to the constants.xmlQueryCatalog
 */


//////We need to load the constants file
var constants;
var mongoLog;

function setConstants(mapReduceConstants, mongoLogConstants) {
  constants = mapReduceConstants;
  mongoLog = mongoLogConstants;
  initialiseDB();
}

//This prefix will be added to all queries
const queryCollectionPrefix = "xmlQuery_";

function initialiseDB() {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("initialiseDB() ERROR connecting to DB" + err);
    db.collection(constants.xmlQueryResults).createIndex({ "title": 1 }, { unique: true });
    db.collection(constants.xmlQueryCatalog).createIndex({ "title": 1 }, { unique: true });
  });
}

/**
 * Initialise new query document
 * It adds a new document with the current date, the name of the query, and its possible opid
 */
function addNewQueryDocument(queryTitle, isStrictMode, xmlQuery) {

  console.log("addNewQueryDocument(): Adding the following document to the db");
  console.log(queryTitle);
  console.log(xmlQuery);

  var opid = "";
  var timerunning = -1;
  var queryMessage = "";
  constants.connectAndValidateNodeJs(function (err, db) {
    //the following is equivalent to db.currentOp() in the shell
    db.eval("return db.currentOp()", function (err, opList) {
      //console.log('currentOp',err,opList);
      opList.inprog.forEach(function (opObject, index) {
        //From the queries being executed, find the one running on 
        //ucivitdb with the smallest time
        if (opObject.ns.indexOf(constants.mongoQueryDB) > -1 &&
          typeof opObject.msg !== 'undefined' &&
          opObject.msg.substring(0, constants.mapReduceTag.length) == constants.mapReduceTag) {
          //we found an operation running on the ucivitdb database
          console.log(opObject.opid + " has been running for " + opObject.secs_running
            + "secs and " + opObject.microsecs_running + "microsecs");
          if (timerunning == -1) {
            opid = opObject.opid;
            timerunning = opObject.microsecs_running;
            queryMessage = opObject.msg;
          }
          else if (opObject.microsecs_running < timerunning) {
            console.log("found a more recent query");
            opid = opObject.opid;
            timerunning = opObject.microsecs_running;
            queryMessage = opObject.msg;
          }
        }
      });
      if (timerunning != -1)
        console.log("The last query to be executed was: " + opid + ", storing it to the database");
      else
        console.log("Could not find the last query to be executed, has it finished already?");

      var document = {
        title: queryTitle,
        queryXML: xmlQuery,
        isStrictMode: isStrictMode,
        operationID: opid,
        microsecs_running: timerunning,
        datems: new Date().getTime(),
        readableDate: new Date().toISOString(),
        progress: traduceProgress(queryMessage),
        finished: false
      };
      db.collection(constants.xmlQueryResults).insert(document, function (err, records) {
        if (err) return console.error("addNewQueryDocument() ERROR INSERTING QUERY DOCUMENT " + err);
        else console.log("addNewQueryDocument(): new result document stored correctly");
      });

      document = {
        title: queryTitle,
        queryXML: xmlQuery,
        operationID: opid,
        processtimems: -1,
        datems: new Date().getTime(),
        readableDate: new Date().toISOString()
      };
      db.collection(constants.xmlQueryCatalog).insert(document, function (err, records) {
        if (err) return console.error("insertNewDocument() ERROR INSERTING QUERY Catalog DOCUMENT " + err);
        else console.log("new Catalog document stored correctly");
      });
    });
  });
}

/**
 * Given a query title, it checks if the title exists in results already
 * i.e. doesn't exist in the results db yet
 */
function isQueryTitleInResults(queryTitle, callback) {

  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("isQueryTitleInResults() ERROR connecting to DB" + err);
    console.log("isQueryTitleInResults() Successfully connected to DB");
    db.collection(constants.xmlQueryResults).distinct("title", function (err, items) {
      if (err) return console.error("isQueryTitleInResults() ERROR REQUESTING DISTINCT TITLES from " + constants.xmlQueryResults + err);
      if (items.indexOf(queryTitle) > -1) {
        //Query title is in use
        callback(null, false);
        return;
      }
      callback(null, true);
    });

  });
}

/**
 * Given a query title, it checks if this title is usable, i.e. doesn't exist in thecatalog db yet
 */
function isQueryTitleInCatalog(queryTitle, callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("isQueryTitleInCatalog() ERROR connecting to DB" + err);
    db.collection(constants.xmlQueryCatalog).distinct("title", function (err, items) {
      if (err) return console.error("isQueryTitleInCatalog() ERROR REQUESTING DISTINCT TITLES" + constants.xmlQueryCatalog + err);
      console.log("looking for " + queryTitle + " in");
      console.log(items);
      if (items.indexOf(queryTitle) > -1) {
        //Query title is in use
        callback(null, false);
        return;
      }
      //title has not been used before
      callback(null, true);
    });
  });
}


/**
 * Saves the given query title and data to the catalog
 */
function saveQuery(queryTitle, queryDescription, queryData) {

  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("saveQuery() ERROR connecting to DB" + err);
    document = {
      title: queryTitle,
      description: queryDescription,
      queryXML: queryData,
      operationID: "",
      processtimems: -1,
      datems: new Date().getTime(),
      readableDate: new Date().toISOString()
    };
    db.collection(constants.xmlQueryCatalog).insert(document, function (err, records) {
      if (err) return console.error("saveQuery() ERROR INSERTING QUERY Catalog DOCUMENT " + err);
      else console.log("saveQuery() new Catalog document stored correctly");
    });
  });
}
/**
 * Uses the query catalog and updates the status of the running queries
 */
function updateQueryStatus(callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("updateQueryStatus() ERROR connecting to DB" + err);
    //get all registered queries
    db.collection(constants.xmlQueryResults).find().toArray(function (err, queryCatalogList) {
      //retrieve all runnning processes
      db.eval("return db.currentOp()", function (err, opList) {

        //For each query in the catalog, see if it's still running
        queryCatalogList.forEach(function (queryCatalogObject, index) {
          if (queryCatalogObject.finished == false) {
            //If we don't find the corresponding process ID, then the query must have finished
            queryCatalogObject.finished = true;
            opList.inprog.forEach(function (opObject, index) {
              if (queryCatalogObject.operationID == opObject.opid) {
                queryCatalogObject.finished = false;
                //update the queryCatalogObject with the information from the database
                db.collection(constants.xmlQueryResults).update({ _id: queryCatalogObject._id },
                  {
                    $set: {
                      microsecs_running: opObject.microsecs_running,
                      progress: traduceProgress(opObject.msg),
                      finished: false
                    }
                  });
              }
            });
            //If it's still true, then the query has finished, update
            if (queryCatalogObject.finished == true) {
              db.collection(constants.xmlQueryResults).update({ _id: queryCatalogObject._id },
                {
                  $set: {
                    microsecs_running: -1,
                    progress: "Finished",
                    finished: true
                  }
                });
            }
          }
        });//all queries in the catalog have been processed
        callback(null);
      });
    });
  });
}

/**
 * Given the message from the DB, it transforms it into a readable progress report.
 * It will be either "Retrieving events" (step 1)
 * Or the number of the step, with the corresponding progress percentage
 * 
 * 
 * the progress is the DB looks like this:
 * "m/r: (1/3) emit phase M/R: (1/3) Emit Progress: 9625/1 962500%"
 * "m/r: (3/3) final reduce to collection M/R: (3/3) Final Reduce Progress: 17161/33441 51%"
 * So this function returns a readable string representing the progress
 * for the dashboard
 * 
 * Step 1: During the first step, no progress is known, as it's finding the corresponding events.
 * Step 2: too short for my algorithm, as just takes the events along to the second step
 * Step 3: a progress is given and I can report it.
 */
function traduceProgress(progressString) {
  //Extraction is hardcoded to this particular kind of report. Return empty if no message is provided
  if (progressString=="")
    return progressString;
  //retrieve step number
  var step = progressString.split("(")[1][0];
  if (step != 1) {
    var progress = progressString.substring(progressString.length - 3, progressString.length - 1);
    return ("Step " + step + ":" + progress);
  }
  else
    return "Step 1: retrieving events";
}

/**
 * Once a query is completed, update its status, and the elapsed time
 */
function setQueryFinished(queryTitle, timems) {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("updateQueryCatalog() ERROR connecting to DB" + err);
    db.collection(constants.xmlQueryCatalog).update({ title: queryTitle },
      { $set: { processtimems: timems } });

    db.collection(constants.xmlQueryResults).update({ title: queryTitle },
      {
        $set: {
          microsecs_running: -1,
          progress: "Finished",
          finished: true
        }
      });

    //Update the count of the found items, and the total
    //Update the number of usable elements
    db.collection(queryCollectionPrefix + queryTitle)
      .find({ "value.xmlQueryCounter": { $gt: 0 } })
      .count(function (err, count) {
        db.collection(constants.xmlQueryResults).update({ title: queryTitle },
          {
            $set: {
              count: count
            }
          });
        db.collection(constants.xmlQueryCatalog).update({ title: queryTitle },
          {
            $set: {
              count: count
            }
          });
      });

    //Update the total number of episodes in which any of the events was found
    db.collection(queryCollectionPrefix + queryTitle)
      .find()
      .count(function (err, count) {
        db.collection(constants.xmlQueryResults).update({ title: queryTitle },
          {
            $set: {
              totalCount: count
            }
          });
        db.collection(constants.xmlQueryCatalog).update({ title: queryTitle },
          {
            $set: {
              totalCount: count
            }
          });
      });
  });
}


/**
 * Requests a list of the finished available queries
 * callback receives an error, and an array of query names
 */
function getCompletedQueries(callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("getCompletedQueries() ERROR connecting to DB" + err);
    console.log("getCompletedQueries() Successfully connected to DB");
    db.collection(constants.xmlQueryResults).find().toArray(function (err, queryResultsList) {
      if (err) callback(err);
      var queryList = []
      queryResultsList.forEach(function (queryResultsItem, index) {
        if (queryResultsItem.finished) {
          queryList.push(queryResultsItem);
        }
      });
      callback(null, queryList);
    });
  });
}

/**
 * Requests the list of all Catalog queries
 */
function getCatalogQueries(callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("getCatalogQueries() ERROR connecting to DB" + err);
    console.log("getCatalogQueries() Successfully connected to DB");

    db.collection(constants.xmlQueryCatalog).find().toArray(function (err, queryCatalogList) {
      callback(null, queryCatalogList);
    });
  });
}



/**
 * Given a query title, gets the information for that query
 * 
 */
function getCatalogQueryInfo(queryTitle, callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("getCatalogQueryInfo() ERROR connecting to DB" + err);
    console.log("getCatalogQueryInfo() Successfully connected to DB");

    db.collection(constants.xmlQueryCatalog).find({ "title": queryTitle }).toArray(function (err, queryCatalogInfo) {
      if (queryCatalogInfo.length > 0)
        callback(null, queryCatalogInfo[0]);
      else
        callback("getCatalogQueryInfo(): requested query doesn't exist in catalog:" + queryTitle, null);
    });
  });
}

/**
 * Given a query Title, returns all the results associated with it
 */

function getResultsForCatalogQuery(queryTitle, callback){
   constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("getResultsForCatalogQuery() ERROR connecting to DB" + err);
    console.log("getResultsForCatalogQuery() Successfully connected to DB");
    
    db.collection(constants.xmlQueryResults).find({title:queryTitle}).toArray(function (err, queryResultList) {
      callback(null, queryTitle, queryResultList);
    });
  });
}

/**
 * Updates the status of the queries, and retrieves all unfinished running queries
 */

function getRunningQueries(callback) {
  updateQueryStatus(function (err, db) {
    if (err) return console.error("getRunningQueries() ERROR calling updateQueryStatus " + err);
    constants.connectAndValidateNodeJs(function (err, db) {
      if (err) return console.error("getRunningQueries() ERROR connecting to DB" + err);
      //get all nonfinished queries
      db.collection(constants.xmlQueryResults).find({ finished: false }).toArray(function (err, nonFinishedQueryList) {
        if (err) return console.error("getRunningQueries() ERROR retrieving non finished queries " + err);
        callback(null, nonFinishedQueryList);
      });
    });
  });
}


/**
 * Deletes the catalog corresponding to the given query title
 */
function deleteCompletedQuery(queryTitle, callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("deleteResultCollection() ERROR connecting to DB" + err);
    db.collection(constants.xmlQueryResults).remove({ "title": queryTitle }, function (err, result) {
      if (err) {
        console.log(err);
      }
      callback(null);
    });
  });
}

/**
 * Deletes the Catalog corresponding to the given query title
 */
function deleteCatalogQuery(queryTitle, callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("deleteCatalogQuery() ERROR connecting to DB" + err);
    db.collection(constants.xmlQueryCatalog).remove({ "title": queryTitle }, function (err, result) {
      if (err) {
        console.log(err);
      }
      callback(null);
    });
  });
}


module.exports.setConstants = setConstants;
module.exports.addNewQueryDocument = addNewQueryDocument;
module.exports.isQueryTitleInResults = isQueryTitleInResults;
module.exports.isQueryTitleInCatalog = isQueryTitleInCatalog;
module.exports.saveQuery = saveQuery;
module.exports.updateQueryStatus = updateQueryStatus;
module.exports.setQueryFinished = setQueryFinished;
module.exports.getCompletedQueries = getCompletedQueries;
module.exports.getCatalogQueries = getCatalogQueries;
module.exports.getCatalogQueryInfo = getCatalogQueryInfo;
module.exports.getResultsForCatalogQuery = getResultsForCatalogQuery;
module.exports.getRunningQueries = getRunningQueries;
module.exports.deleteCompletedQuery = deleteCompletedQuery;
module.exports.deleteCatalogQuery = deleteCatalogQuery;