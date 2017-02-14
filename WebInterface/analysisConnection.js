

/**
 * Requests the list of all available collections
 */
 
function requestCompletedQueries(){
  socket.emit('serverRequestCompletedQueries');
}

socket.on('clientCompletedQueriesFinished', function (data) {
  notifyUser(data.queryList.length + " finished queries have been retrieved",data.isError);
  updateCompletedQueries(data.queryList);
});


/**
 * Requests the list of all queries in history
 */
 
function requestHistoryQueries(){
  socket.emit('serverRequestHistoryQueries');
}

socket.on('serverRequestHistoryQueriesFinished', function (data) {
  updateHistoryQueries(data.queryList);
  notifyUser(data.queryList.length + " history queries have been retrieved");
});

/**
 * Requests the list of all currently running queries
 */
 
function requestRunningQueries(){
  socket.emit('serverRequestRunningQueries');
}

socket.on('serverRequestRunningQueriesFinished', function (data) {
  updateRunningQueries(data.queryList);
  notifyUser(data.queryList.length + " running queries have been retrieved");
});


/**
 * Requests the deletion of a results collections
 */
function requestQueryResultsDeletion(queryTitle){
  console.log("Delete "+queryTitle + " results");
  socket.emit('serverDeleteResults', {
                "queryTitle":queryTitle
            });
}

socket.on('deleteResultFinished', function (data) {
  notifyUser("Results deleted" + data.message,false);
  requestCompletedQueries();
});


/**
 * Requests the deletion of a history element
 */
function requestQueryHistoryDeletion(queryTitle){
  console.log("Delete "+queryTitle + " history");
  socket.emit('serverDeleteHistory', {
                "queryTitle":queryTitle
            });
}

socket.on('deleteHistoryFinished', function (data) {
  notifyUser("History deleted" + data.message,false);
  requestHistoryQueries();
});

/**
 * Initiates the give query, with the given parameters
 * @param [string] email to send the results to
 * @param [boolean] determines if the query will be run on strict mode
 * @param [string] queryTitle for the query to be run.
 * @param [string] queryData is the XML string of the query to run.
 */
function requestExecuteQuery(email, isQueryStrict, queryTitle,queryData){
  socket.emit('serverRunXMLQuery', {
                "email":email,
                "isStrictMode":isQueryStrict,
                "xmlTitle":queryTitle,
                "xmlData":queryData,
                "timestamp": new Date().getTime()
            });
}

socket.on('clientXmlQueryFinished', function (data) {
  notifyUser(data.message);
});

/**
 * Request the data for a query
 */
function requestQueryData(title){
  socket.emit('serverRequestQueryData', {"queryTitle":title});
}


/**
 * Processes received json object
 * TODO: I don't like the idea of downloading the whole collection to the client. I think it's better to abstract him from that.
 */
socket.on('clientQueryDataProcessed', function (data) {
    notifyUser("A document for the query " + data.queryTitle + " has been received");
    console.log("A document for the query " + data.queryTitle + " has been received");
    console.log("The file is available in " + data.queryPath);
});