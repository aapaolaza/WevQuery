
var mongoDAO;
var socketConnection;
var socketGeneric;
var socketInstance;
var resultsFolder;
var fs = require('fs');


function initialiseSockets(generalMongoDAO, generalSocketGeneric,
  generalSocketConnection, generalSocketInstance, resultsFolderName) {

  mongoDAO = generalMongoDAO;
  socketConnection = generalSocketConnection;
  socketGeneric = generalSocketGeneric;
  socketInstance = generalSocketInstance;
  resultsFolder = resultsFolderName;

  socketInstance.on('serverRequestStackedChartData', function (data) {
    if (data.resultTitle == "") {
      console.log("serverRequestStackedChartData, requesting stacked chart data for all results");
      mongoDAO.getStackedChartDataAll(stackedChartDataReady);
    }
    else {
      console.log("serverRequestStackedChartData, requesting stacked chart data for " + data.resultTitle);
      mongoDAO.getStackedChartDataForResult(data.resultTitle, stackedChartDataReady);
    }
  });

  socketInstance.on('serverRequestSunburstData', function (data) {
    console.log("serverRequestSunburstData, requesting count for all event sequences");
    if (data.resultTitle == "") {
      console.log("serverRequestSunburstData, requesting Event Sequences for all results");
      mongoDAO.getSunburstDataAll(sunburstDataReady);
    }
    else {
      console.log("serverRequestSunburstData, requesting Event Sequences for "
        + data.resultTitle);
      mongoDAO.getSunburstDataForResult(data.resultTitle, sunburstDataReady);
    }
  });

  socketInstance.on('serverRequestSankeyData', function (data) {
    console.log("serverRequestSankeyData, requesting transitions for all event sequences");
    if (data.resultTitle == "") {
      console.log("serverRequestSankeyData, requesting Event transitions for all results");
      mongoDAO.getSankeyDataAll(sankeyDataReady);
    }
    else {
      console.log("serverRequestSankeyData, requesting Event transitions for "
        + data.resultTitle);
      mongoDAO.getSankeyDataForResult(data.resultTitle, sankeyDataReady);
    }
  });

  socketInstance.on('serverRequestQueryData', function (data) {
    console.log("serverRequestQueryData, requesting the following query: " + data.queryTitle);
    requestQueryDataForClient(data.queryTitle);
  });
}


/**
 * Requests the query results and stores them in a json in the "results" folder
 * TODO: uses the data from the results folder to run analysis
 */
function storeQueryJson(queryTitle, callback) {
  var filename = resultsFolder + queryTitle + "_" + new Date().getTime() + ".json";
  console.log("printing to: " + filename);
  fs.stat(filename, function (err, stat) {
    if (err == null) {
      console.log('File exists');
      callback(null, queryTitle, filename);
    } else if (err.code == 'ENOENT') {
      // file does not exist, request data from mongo, and write
      mongoDAO.getXmlQueryData(queryTitle, null, (err, title, itemList) => {
        if (err) return console.error("getXmlQueryData() ERROR connecting to DB" + err);

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


function stackedChartDataReady(err, allCollectionsList, uniqueUrls) {
  if (err) {
    socketGeneric.sendMessageToUser(socketInstance.id, "stackedChartDataReady ERROR" + err, true, socketConnection);
    console.error("stackedChartDataReady() ERROR retrieving data" + err);
  }
  console.log("send clientSendStackedChartData");
  socketConnection.emit('clientSendStackedChartData', {
    'generalOverviewData': allCollectionsList,
    'urlIndexes': uniqueUrls
  });
}

function sunburstDataReady(err, sequenceList, eventNameList) {
  if (err) return console.error("sunburstDataReady() ERROR retrieving data" + err);
  console.log("sunburstDataReady() Received the sequences count, responding client");
  socketConnection.emit('clientSendSunburstData', {
    'eventSeqCountList': sequenceList,
    'eventNameList': eventNameList
  });
}


function sankeyDataReady(err, transitionObject) {
  if (err) return console.error("sankeyDataReady() ERROR retrieving data" + err);
  console.log("sankeyDataReady() Received the transition sequences, responding client");
  //console.log(JSON.stringify(transitionObject, null, 2));
  socketConnection.emit('clientSendSankeyData', {
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