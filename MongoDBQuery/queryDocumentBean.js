/**
 * For each query, the following object is created in xmlQueryResults:
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
 * Once deleted, it's moved to the xmlQueryCatalog
 */


var constants = require("./MapReduceConstantsNode.js");

//This tag can be found in the "msg" field in the current ops command of MapReduce commands
const mapReduceTag = "m/r";
const xmlQueryResults = "xmlQueryResults";
const xmlQueryCatalog = "xmlQueryCatalog";

//This prefix will be added to all queries
const queryCollectionPrefix = "xmlQuery_"

initialiseDB();
function initialiseDB() {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("initialiseDB() ERROR connecting to DB" + err);
    db.collection(xmlQueryResults).createIndex({ "title": 1 }, { unique: true });
    db.collection(xmlQueryCatalog).createIndex({ "title": 1 }, { unique: true });
  });
}

/**
 * Initialise new query document
 * It adds a new document with the current date, the name of the query, and its possible opid
 */
function addNewQueryDocument(queryTitle, queryData) {

  console.log("Adding the following document to the db");
  console.log(queryTitle);
  console.log(queryData);

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
          opObject.msg.substring(0, mapReduceTag.length) == mapReduceTag) {
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
      if (timerunning != -1) {
        console.log("The last query to be executed was: " + opid + ", storing it to the database");

        var document = {
          title: queryTitle,
          queryXML: queryData,
          operationID: opid,
          microsecs_running: timerunning,
          datems: new Date().getTime(),
          readableDate: new Date().toISOString(),
          progress: traduceProgress(queryMessage),
          finished: false
        };
        db.collection(xmlQueryResults).insert(document, function (err, records) {
          if (err) return console.error("insertNewDocument() ERROR INSERTING QUERY DOCUMENT " + err);
          else console.log("new query document stored correctly");
        });

        document = {
          title: queryTitle,
          queryXML: queryData,
          operationID: opid,
          processtimems: -1,
          datems: new Date().getTime(),
          readableDate: new Date().toISOString()
        };
        db.collection(xmlQueryCatalog).insert(document, function (err, records) {
          if (err) return console.error("insertNewDocument() ERROR INSERTING QUERY Catalog DOCUMENT " + err);
          else console.log("new Catalog document stored correctly");
        });
      }
      else
        console.log("No query was found");
    });
  });
}

/**
 * Given a query title, it checks if this title is usable, i.e. doesn't exist in the results db yet
 */
function isQueryTitleUnique(queryTitle, callback) {

  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("isQueryTitleUnique() ERROR connecting to DB" + err);
    console.log("isQueryTitleUnique() Successfully connected to DB");
    db.collection(xmlQueryResults).distinct("title", function (err, items) {
      if (err) return console.error("isQueryTitleUnique() ERROR REQUESTING DISTINCT TITLES from " + xmlQueryResults + err);
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
    db.collection(xmlQueryCatalog).distinct("title", function (err, items) {
      if (err) return console.error("isQueryTitleInCatalog() ERROR REQUESTING DISTINCT TITLES" + xmlQueryCatalog + err);
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
function saveQuery(queryTitle, queryData) {

  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("saveQuery() ERROR connecting to DB" + err);
    document = {
      title: queryTitle,
      queryXML: queryData,
      operationID: "",
      processtimems: -1,
      datems: new Date().getTime(),
      readableDate: new Date().toISOString()
    };
    db.collection(xmlQueryCatalog).insert(document, function (err, records) {
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
    db.collection(xmlQueryResults).find().toArray(function (err, queryCatalogList) {
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
                db.collection(xmlQueryResults).update({ _id: queryCatalogObject._id },
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
              db.collection(xmlQueryResults).update({ _id: queryCatalogObject._id },
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
  //Extraction is hardcoded to this particular kind of report.

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
    db.collection(xmlQueryCatalog).update({ title: queryTitle },
      { $set: { processtimems: timems } });

    db.collection(xmlQueryResults).update({ title: queryTitle },
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
        db.collection(xmlQueryResults).update({ title: queryTitle },
          {
            $set: {
              count: count
            }
          });
        db.collection(xmlQueryCatalog).update({ title: queryTitle },
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
        db.collection(xmlQueryResults).update({ title: queryTitle },
          {
            $set: {
              totalCount: count
            }
          });
        db.collection(xmlQueryCatalog).update({ title: queryTitle },
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
    db.collection(xmlQueryResults).find().toArray(function (err, queryResultsList) {
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
 * callback rec
 */
function getCatalogQueries(callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("getCatalogQueries() ERROR connecting to DB" + err);
    console.log("getCatalogQueries() Successfully connected to DB");

    db.collection(xmlQueryCatalog).find().toArray(function (err, queryCatalogList) {
      callback(null, queryCatalogList);
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
      db.collection(xmlQueryResults).find({ finished: false }).toArray(function (err, nonFinishedQueryList) {
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
    db.collection(xmlQueryResults).remove({ "title": queryTitle }, function (err, result) {
      if (err) {
        console.log(err);
      }
      db.close();
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
    db.collection(xmlQueryCatalog).remove({ "title": queryTitle }, function (err, result) {
      if (err) {
        console.log(err);
      }
      db.close();
      callback(null);
    });
  });
}

module.exports.addNewQueryDocument = addNewQueryDocument;
module.exports.isQueryTitleUnique = isQueryTitleUnique;
module.exports.isQueryTitleInCatalog = isQueryTitleInCatalog;
module.exports.saveQuery = saveQuery;
module.exports.updateQueryStatus = updateQueryStatus;
module.exports.setQueryFinished = setQueryFinished;
module.exports.getCompletedQueries = getCompletedQueries;
module.exports.getCatalogQueries = getCatalogQueries;
module.exports.getRunningQueries = getRunningQueries;
module.exports.deleteCompletedQuery = deleteCompletedQuery;
module.exports.deleteCatalogQuery = deleteCatalogQuery;