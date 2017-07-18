/**
 * Requests all the information to fill in the interface
 */
function initialiseValues() {
  console.log("initialising interface");
  requestDatabaseName();
  requestDatabaseCollection();
  requestDatabaseIndexes();

  $("#databaseEventList").append("<div>Loading event counts</div>");
  requestDatabaseEventCount();

  $("#databaseUserList").append("<div>Loading user event counts</div>");
  requestDatabaseUsers();
}


function fillDatabaseName(dbName) {
  $("#databaseName").text(dbName);
}

/**
 * Fills in the indexList with the provided list
 */
function fillIndexList(indexList) {
  indexList.forEach(function (indexObject) {
    $("#databaseIndexList").append("<div>" + indexObject + "</div>");
  });
}


/**
 * Fills in the collection list with the provided array of collection objects
 * Each object in the array contains the name of the collection and its count of documents
 */
function fillCollectionList(collectionList) {
  collectionList.forEach(function (collectionObject) {
    $("#databaseCollectionList").append("<div>" + collectionObject.name
      + ":" + collectionObject.count + "</div>");
  });
}

/**
 * Receives a list of events, with a name and a count.
 * @param {array} eventList 
 */
function fillEventCountList(eventCountList) {
  $("#databaseEventList").empty();
  eventCountList.forEach(function (eventObject) {
    $("#databaseEventList").append("<div>" + eventObject.name + ":" + eventObject.count + "</div>");
  });
}

/**
 * Receives a list of users. For each user, there is a name and a list of event,
 * with a name and a count for each.
 * @param {array} eventList 
 */
function fillUsersList(userList) {
  $("#databaseUserList").empty();
  userList.forEach(function (userObject) {
    var userElement = $(document.createElement('details'));
    userElement.append("<summary>" + userObject.name + "</summary>");
    userObject.eventList.forEach(function (eventObject) {
      userElement.append("<div>" + eventObject.name + ":" + eventObject.count + "</div>");
    });
    $("#databaseUserList").append(userElement);
  });
}

