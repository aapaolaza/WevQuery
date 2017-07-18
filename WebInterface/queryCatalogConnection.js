var queryCatalogConnection = createqueryCatalogConnectionFunctions();

function createqueryCatalogConnectionFunctions() {

  var queryCatalogConnectionObject = {};


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

  return queryCatalogConnectionObject;
}

/**
 * Leave the socket connection receivers outside the function wrapper
 */
socket.on('serverRequestCatalogQueriesFinished', function (data) {
  queryCatalog.updateCatalogQueries(data.queryList);
  notifyUser(data.queryList.length + " Catalog queries have been retrieved");
});

socket.on('serverRequestQueryResultsFinished', function (data) {
  notifyUser(data.resultList.length + " results for the query " + data.queryTitle
    + " have been retrieved");
  queryCatalog.addCatalogQueryResults(data.queryTitle, data.resultList);
});