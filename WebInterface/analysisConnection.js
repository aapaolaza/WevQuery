
var analysisConnection = createAnalysisConnectionFunctions();

function createAnalysisConnectionFunctions() {

  var analysisConnectionObject = {};

  /**
   * Requests the list of all available collections
   */

  analysisConnectionObject.requestCompletedQueries = function () {
    socket.emit('serverRequestCompletedQueries');
  }

  /**
   * Requests the list of the titles of all available collections
   */

  analysisConnectionObject.requestCompletedQueriesTitles = function () {
    socket.emit('serverRequestCompletedQueryTitles');
  }

  /**
   * Requests the list of all queries in Catalog
   */

  analysisConnectionObject.requestCatalogQueries = function () {
    socket.emit('serverRequestCatalogQueries');
  }

  /**
   * Requests the list of all currently running queries
   */

  analysisConnectionObject.requestRunningQueries = function () {
    socket.emit('serverRequestRunningQueries');
  }

  /**
   * Requests the deletion of a results collections
   */
  analysisConnectionObject.requestQueryResultsDeletion = function (queryTitle) {
    console.log("Delete " + queryTitle + " results");
    socket.emit('serverDeleteResults', {
      "queryTitle": queryTitle
    });
  }

  /**
   * Requests the deletion of a Catalog element
   */
  analysisConnectionObject.requestQueryCatalogDeletion = function (queryTitle) {
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
  analysisConnectionObject.requestExecuteQuery = function (email, isStrictMode, queryTitle, queryData) {
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
  analysisConnectionObject.requestQueryData = function (title) {
    socket.emit('serverRequestQueryData', { "queryTitle": title });
  }

  analysisConnectionObject.requestStackedChartData = function (resultTitle) {
    socket.emit('serverRequestStackedChartData', { "resultTitle": resultTitle });
  }

  analysisConnectionObject.requestSunburstData = function (resultTitle) {
    socket.emit('serverRequestSunburstData', { "resultTitle": resultTitle });
  }

  analysisConnectionObject.requestSankeyData = function (resultTitle) {
    socket.emit('serverRequestSankeyData', { "resultTitle": resultTitle });
  }

  return analysisConnectionObject;
}


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

socket.on('clientSendStackedChartData', function (data) {
  notifyUser("clientSendStackedChartData and " + data.generalOverviewData.length + " collections were received");

  analysis.stackedChartDataReceived({
    generalOverviewData: data.generalOverviewData,
    urlIndexes: data.urlIndexes
  });
});

socket.on('clientSendSunburstData', function (data) {
  notifyUser("clientSendSunburstData and " + data.eventSeqCountList.length + " event sequence counts have been received");
  analysis.sunburstDataReceived({
    eventSeqCountList: data.eventSeqCountList,
    eventNameList: data.eventNameList
  });
});


socket.on('clientSendSankeyData', function (data) {
  console.log("clientSendSankeyData signal");
  notifyUser("clientSendSankeyData and " + data.transitionObject.links.length + " event transitions have been received");
  testTransitions = data.transitionObject;
  console.log(data.transitionObject);
  analysis.sankeyDataReceived(data.transitionObject);
});