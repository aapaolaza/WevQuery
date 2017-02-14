
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
