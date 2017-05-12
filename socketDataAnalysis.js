
var mongoDAO;
var socketConnection;

var socketGeneric = require("./socketGeneric.js");

function initialiseSockets(generalMongoDAO, generalSocketConnection, socket) {

  socketConnection = generalSocketConnection;
  mongoDAO = generalMongoDAO;

  socket.on('serverAnalyseGeneralOverview', function (data) {
    console.log("serverAnalyseGeneralOverview, requesting general information of all results");
    analyseQueryData();
  });

  socket.on('serverEventSequences', function (data) {
    console.log("serverEventSequences, requesting count for all event sequences");
    getEventSeqCount();
  });

  socket.on('serverAllEventTransitions', function (data) {
    console.log("serverAllEventTransitions, requesting transitions for all event sequences");
    getAllEventTransitions();
  });

  socket.on('serverRequestQueryData', function (data) {
    console.log("serverRequestQueryData, requesting the following query: " + data.queryTitle);
    requestQueryDataForClient(data.queryTitle);
  });
}


/**
 * Requests the query results and stores them in a json in the "results" folder
 * TODO: uses the data from the results folder to run analysis
 */
function storeQueryJson(queryTitle, callback) {
  var filename = resultsFolder + queryTitle + ".json";
  console.log("printing to: " + filename);
  fs.stat(filename, function (err, stat) {
    if (err == null) {
      console.log('File exists');
      callback(null, queryTitle, filename);
    } else if (err.code == 'ENOENT') {
      // file does not exist, request data from mongo, and write
      mongoDAO.getQueryData(queryTitle, function (err, title, itemList) {
        if (err) return console.error("getQueryData() ERROR connecting to DB" + err);

        var dataOutput = fs.createWriteStream(filename, { 'flags': 'a' });
        dataOutput.write("[");

        for (var index = 0; index < itemList.length; index++) {
          dataOutput.write(JSON.stringify(itemList[index]));
          dataOutput.write(",");
        }
        dataOutput.write("]");
        callback(null, queryTitle, filename);
      });
    } else {
      console.log('Some other error: ', err.code);
      callback(err, queryTitle, null);
    }
  });
}

/**
 * Analyse the query and create some analysis data
 * TODO: uses the data from the results folder to run analysis
 */

function analyseQueryData() {
  //I can use https://plot.ly/nodejs/ to create nice graphs
  mongoDAO.stackedChart(analyseQueryDataReady);
}

function analyseQueryDataReady(err, allCollectionsList, uniqueUrls) {
  if (err) {
    socketGeneric.sendMessageToUser(socket.id, "analyseQueryDataReady ERROR" + err, true, socketConnection);
    console.error("analyseQueryDataReady() ERROR retrieving data" + err);
  }
  socketConnection.emit('analyseGeneralOverviewProcessed', {
    'generalOverviewData': allCollectionsList,
    'urlIndexes': uniqueUrls
  });
}

/**
 * Request the count for all event sequences
 */
function getEventSeqCount() {
  mongoDAO.getEventSequences(getEventSeqCountReady);
}

function getEventSeqCountReady(err, sequenceList, eventNameList) {
  if (err) return console.error("getEventSeqCountReady() ERROR retrieving data" + err);
  console.log("getEventSeqCountReady() Received the sequences count, responding client");
  socketConnection.emit('eventSequenceCountProcessed', {
    'eventSeqCountList': sequenceList,
    'eventNameList': eventNameList
  });
}


/**
 * Request the transitions for all event sequences
 */
function getAllEventTransitions() {
  mongoDAO.getAllEventTransitions(getAllEventTransitionsReady);
}

function getAllEventTransitionsReady(err, transitionObject) {
  if (err) return console.error("getAllEventTransitionsReady() ERROR retrieving data" + err);
  console.log("getAllEventTransitionsReady() Received the transition sequences, responding client");
  //console.log(JSON.stringify(transitionObject, null, 2));
  socketConnection.emit('serverAllEventTransitionsProcessed', {
    'transitionObject': transitionObject
  });
}


/**
 * Requests the information for a particular query
 * @param [queryTitle] indicates the name of the query to retrieve from the db
 */
function requestQueryDataForClient(queryTitle) {
  //Check if exists, get it from DB if not
  storeQueryJson(queryTitle, function (err, title, path) {
    //Once is queried from DB, provide link to the file
    socketConnection.emit('clientQueryDataProcessed', {
      'queryTitle': title,
      'queryPath': path
    });
  });
}

module.exports.initialiseSockets = initialiseSockets;