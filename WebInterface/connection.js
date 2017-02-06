var urlarr = window.location.href.split("/");
var server = urlarr[0] + "//" + urlarr[2]
var socket = io.connect(server);


/**
 * This code serves as the interface from the Web application to the main server
 * Requests file saving, and queries* 
 * 
 */

function ioSaveXmlQuery(){
 socket.emit('saveXMLQuery', {
                "title": currentIndex,
                "data": imagesIndexesList[currentIndex],
                "timestamp": new Date().getTime()
            });
}

/**
 * Runs the query
 * @param {email} email to send the results of the query to
 * @param {isStrictMode} boolean indicating if query should run in strict mode
 * @param {xmlTitle} title for the query
 * @param {xmlData} query to run, in xml format
 */
function ioExecuteQuery(email,isStrictMode,xmlTitle,xmlData){
  socket.emit('serverRunXMLQuery', {
                "email":email,
                "isStrictMode":isStrictMode,
                "xmlTitle":xmlTitle,
                "xmlData":xmlData,
                "timestamp": new Date().getTime()
            });
}

/**
 * List of socket listeners
 */

socket.on('clientXmlQueryFinished', function (data) {
  notifyUser(data.message);
});

/**
 * Analysis functions
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

/**
 * Notify user
 * I would use a toast, and add the resulting link to the query to the Web dashboard
 */
function notifyUser(message){
  console.log("notifying user:"+message)
  showToast(message);
  //update analysis dashboard
}