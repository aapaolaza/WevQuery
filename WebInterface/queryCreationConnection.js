
/**
 * This code serves as the interface from the Web application to the main server
 * Requests file saving, and queries* 
 * 
 */

function requestSaveXmlQuery(title,xmlData){
 socket.emit('saveXMLQuery', {
                "title": title,
                "data": xmlData
              });
}

socket.on('clientXmlQuerySaved', function (data) {
  //the interface will determine the nature of the message (error or success) and notify the user
  showSaveQueryResult(data.errorMessage);
});

/**
 * Runs the query
 * @param {email} email to send the results of the query to
 * @param {isStrictMode} boolean indicating if query should run in strict mode
 * @param {xmlTitle} title for the query
 * @param {xmlData} query to run, in xml format
 */
function requestExecuteQuery(email,isStrictMode,xmlTitle,xmlData){
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
