/**
 * Requests the database name
 */

function requestDatabaseName() {
  socket.emit('serverRequestDatabaseName');
}

socket.on('clientDatabaseNameFinished', function (data) {
  notifyUser("Database name has been retrieved: " + data.dbName, data.isError);
  fillDatabaseName(data.dbName);
});

/**
 * Requests the list of collections and their document count
 */

function requestDatabaseCollection() {
  socket.emit('serverRequestDatabaseCollections');
}

socket.on('clientDatabaseCollectionsFinished', function (data) {
  notifyUser("List of collections from the database has been retrieved: "
    + data.collectionList.length, data.isError);
  fillCollectionList(data.collectionList);
});


/**
 * Requests the list of all indexes
 */

function requestDatabaseIndexes() {
  socket.emit('serverRequestDatabaseIndexes');
}

socket.on('clientDatabaseIndexesFinished', function (data) {
  notifyUser(data.indexList.length + " indexes have been retrieved", data.isError);
  fillIndexList(data.indexList);
});

/**
 * Requests the list of all events and their counts
 * Receives an array of event objects, with their name and count
 */

function requestDatabaseEventCount() {
  socket.emit('serverRequestDatabaseEventCount');
}

socket.on('clientDatabaseEventCountFinished', function (data) {
  notifyUser(data.eventCountList.length + " event Counts have been retrieved", data.isError);
  fillEventCountList(data.eventCountList);
});


/**
 * Requests the list of all users with the corresponding events and counts
 * Receives an array of user objects,
 * each containing an array of event objects, with their name and count
 */

function requestDatabaseUsers() {
  socket.emit('serverRequestDatabaseUserEvents');
}

socket.on('clientDatabaseUserEventsFinished', function (data) {
  notifyUser(data.userEventsList.length + " Users have been retrieved", data.isError);
  fillUsersList(data.userEventsList);
});