var testData;
var testUrlIndexes;
var testTransitions = {};

/**
 * Requests the list of all available collections
 */

function requestCompletedQueries() {
  socket.emit('serverRequestCompletedQueries');
}

socket.on('clientCompletedQueriesFinished', function (data) {
  notifyUser(data.queryList.length + " finished queries have been retrieved", data.isError);
  updateCompletedQueries(data.queryList);
});

/**
 * Requests the list of the titles of all available collections
 */

function requestCompletedQueriesTitles() {
  socket.emit('serverRequestCompletedQueryTitles');
}

socket.on('clientCompletedQueryTitlesFinished', function (data) {
  notifyUser(data.titleList.length + " titles of finished queries have been retrieved", data.isError);
  updateResultMultiChoice(data.titleList);
});


/**
 * Requests the list of all queries in Catalog
 */

function requestCatalogQueries() {
  socket.emit('serverRequestCatalogQueries');
}

socket.on('serverRequestCatalogQueriesFinished', function (data) {
  updateCatalogQueries(data.queryList);
  notifyUser(data.queryList.length + " Catalog queries have been retrieved");
});

/**
 * Requests the list of all currently running queries
 */

function requestRunningQueries() {
  socket.emit('serverRequestRunningQueries');
}

socket.on('serverRequestRunningQueriesFinished', function (data) {
  updateRunningQueries(data.queryList);
  notifyUser(data.queryList.length + " running queries have been retrieved");
});


/**
 * Requests the deletion of a results collections
 */
function requestQueryResultsDeletion(queryTitle) {
  console.log("Delete " + queryTitle + " results");
  socket.emit('serverDeleteResults', {
    "queryTitle": queryTitle
  });
}

socket.on('deleteResultFinished', function (data) {
  notifyUser("Results deleted" + data.message, false);
  requestCompletedQueries();
});


/**
 * Requests the deletion of a Catalog element
 */
function requestQueryCatalogDeletion(queryTitle) {
  console.log("Delete " + queryTitle + " Catalog");
  socket.emit('serverDeleteCatalog', {
    "queryTitle": queryTitle
  });
}

socket.on('deleteCatalogFinished', function (data) {
  notifyUser("Catalog deleted" + data.message, false);
  requestCatalogQueries();
});

/**
 * Initiates the give query, with the given parameters
 * @param [string] email to send the results to
 * @param [boolean] determines if the query will be run on strict mode
 * @param [string] queryTitle for the query to be run.
 * @param [string] queryData is the XML string of the query to run.
 */
function requestExecuteQuery(email, isStrictMode, queryTitle, queryData) {
  socket.emit('serverRunXMLQuery', {
    "email": email,
    "isStrictMode": isStrictMode,
    "xmlTitle": queryTitle,
    "xmlData": queryData,
    "timestamp": new Date().getTime()
  });
}

socket.on('clientXmlQueryFinished', function (data) {
  notifyUser(data.message);
});

/**
 * Request the data for a query
 */
function requestQueryData(title) {
  socket.emit('serverRequestQueryData', { "queryTitle": title });
}

/**
 * Processes received json object
 * TODO: I don't like the idea of downloading the whole collection to the client. I think it's better to abstract him from that.
 */
socket.on('clientQueryDataProcessed', function (data) {
  notifyUser("A document for the query " + data.queryTitle + " has been received");
  console.log("A document for the query " + data.queryTitle + " has been received");
  console.log("The file is available in " + data.queryPath);

  //Construct the path to the resulting json file
  window.open(window.location.href.split("WebInterface")[0]+data.queryPath);
});


function requestAnalysisData() {
  socket.emit('serverAnalyseGeneralOverview');
}

socket.on('analyseGeneralOverviewProcessed', function (data) {
  notifyUser("analyseGeneralOverviewProcessed and " + data.generalOverviewData.length + " collections were received");

  generalOverviewDataReceived({
    generalOverviewData:data.generalOverviewData, 
    urlIndexes:data.urlIndexes });
});


function requestAnalysisCount() {
  socket.emit('serverEventSequences');
}

socket.on('eventSequenceCountProcessed', function (data) {
  notifyUser("eventSequenceCountProcessed and " + data.eventSeqCountList.length + " event sequence counts have been received");
  sunburstDataReceived({
    eventSeqCountList:data.eventSeqCountList,
    eventNameList:data.eventNameList});
});


function requestAllEventTransitions() {
  socket.emit('serverAllEventTransitions');
}

socket.on('serverAllEventTransitionsProcessed', function (data) {
  console.log("serverAllEventTransitionsProcessed signal");
  notifyUser("serverAllEventTransitionsProcessed and " + data.transitionObject.links.length + " event transitions have been received");
  testTransitions = data.transitionObject;
  console.log(data.transitionObject);
  sankeyDataReceived(data.transitionObject);
});

