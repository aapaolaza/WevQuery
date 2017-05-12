/**
 * Function to send a standard message notification to the user
 * A log of messages will be kept for the clients
 * @param [string] clientID to keep in the server Log
 * @param [string] message to send to the client
 * @param [boolean] indicates if the message is an error
 */
function sendMessageToUser(clientId, message, isError, socketConnection) {
  var timestamp = new Date().getTime();
  date = new Date(timestamp);
  datevalues = date.getFullYear() + "," +
    (date.getMonth() + 1) + "," +
    date.getDate() + "," +
    date.getHours() + ":" +
    date.getMinutes() + ":" +
    date.getSeconds();

  var logEntry = datevalues + " " + message + "\n";
  console.log("log: " + logEntry);

  socketConnection.emit('messageToClient', {
    'message': logEntry,
    'isError': isError
  });
}

module.exports.sendMessageToUser = sendMessageToUser;