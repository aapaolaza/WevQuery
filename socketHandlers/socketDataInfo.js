
var mongoDAO;
var socketConnection;
var socketGeneric;
var socketInstance;


function initialiseSockets(generalMongoDAO, generalSocketGeneric,
  generalSocketConnection, generalSocketInstance) {

  mongoDAO = generalMongoDAO;
  socketConnection = generalSocketConnection;
  socketGeneric = generalSocketGeneric;
  socketInstance = generalSocketInstance;

  socketInstance.on('serverRequestDatabaseName', function (data) {
    console.log("serverRequestDatabaseName, requesting database name");
    getDatabaseName();
  });

  socketInstance.on('serverRequestDatabaseIndexes', function (data) {
    console.log("serverRequestDatabaseIndexes, requesting database indexes");
    getDatabaseIndexes();
  });

  socketInstance.on('serverRequestDatabaseEventCount', function (data) {
    console.log("serverRequestDatabaseEventCount, requesting events and counts from database");
    getEventCountList();
  });

  socketInstance.on('serverRequestDatabaseUserEvents', function (data) {
    console.log("serverRequestDatabaseUserEvents, requesting users and event counts from database");
    getUserEventsList();
  });
}

/**
 * Gets the database name
 */
function getDatabaseName() {
  mongoDAO.requestDBname(requestDatabaseNameReady);
}

function requestDatabaseNameReady(err,dbName) {
  if (err) {
    socketGeneric.sendMessageToUser(socketInstance.id, "requestDatabaseNameReady ERROR" + err, true, socketConnection);
    console.error("requestDatabaseNameReady() ERROR retrieving data" + err);
  }
  console.log("requestDatabaseNameReady() returning database name: " + dbName);
  socketConnection.emit('clientDatabaseNameFinished', {
    'dbName': dbName
  });
}


/**
 * Gets the indexes for the current database
 */

function getDatabaseIndexes() {
  mongoDAO.requestIndexes(requestIndexesReady);
}

/**
 * Recieves an array of strings describing each of the indexes
 * @param {err} err 
 * @param {array} indexList 
 */
function requestIndexesReady(err, indexList) {
  if (err) {
    socketGeneric.sendMessageToUser(socketInstance.id, "requestIndexesReady ERROR" + err, true, socketConnection);
    console.error("requestIndexesReady() ERROR retrieving data" + err);
  }
  console.log("requestIndexesReady() returning " + indexList.length + " indexes");
  socketConnection.emit('clientDatabaseIndexesFinished', {
    'indexList': indexList
  });
}


/**
 * Gets the event count list for the current database
 */

function getEventCountList() {
  mongoDAO.requestEventCountList(requestEventCountListReady);
}

/**
 * Recieves an array of event objects, with a name and a count for each
 * @param {err} err 
 * @param {array} indexList 
 */
function requestEventCountListReady(err, eventCountList) {
  if (err) {
    socketGeneric.sendMessageToUser(socketInstance.id, "requestEventCountListReady ERROR" + err, true, socketConnection);
    console.error("requestEventCountListReady() ERROR retrieving data" + err);
  }
  console.log("requestEventCountListReady() returning " + eventCountList.length + " indexes");
  socketConnection.emit('clientDatabaseEventCountFinished', {
    'eventCountList': eventCountList
  });
}

/**
 * Gets the event count list for the current database
 */

function getUserEventsList() {
  mongoDAO.requestUserListWithEvents(requestUserEventsListReady);
}

/**
 * Recieves an array of event objects, with a name and a count for each
 * @param {err} err 
 * @param {array} indexList 
 */
function requestUserEventsListReady(err, userEventsList) {
  if (err) {
    socketGeneric.sendMessageToUser(socketInstance.id, "requestUserEventsListReady ERROR" + err, true, socketConnection);
    console.error("requestUserEventsListReady() ERROR retrieving data" + err);
  }
  console.log("requestUserEventsListReady() returning " + userEventsList.length + " users");
  socketConnection.emit('clientDatabaseUserEventsFinished', {
    'userEventsList': userEventsList
  });
}


module.exports.initialiseSockets = initialiseSockets;