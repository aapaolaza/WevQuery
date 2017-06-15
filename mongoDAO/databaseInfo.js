
//////We need to load the constants file
var constants;
var mongoLog;



function setConstants(mapReduceConstants, mongoLogConstants) {
  constants = mapReduceConstants;
  mongoLog = mongoLogConstants;
}

function requestDBname(callback) {
  callback(null, constants.mongoQueryDB);
}

/**
 * Returns the list of all indexes in the database, in string format
 * @param {callback} callback 
 */
function requestIndexes(callback) {
  var indexStringList = [];
  constants.connectAndValidateNodeJs(function (err, db) {
    db.collection(constants.eventCollection).indexes(function (err, indexList) {
      if (err) return console.error("requestIndexes(): Error retrieving the indexes", err);
      console.log(indexList.length + " indexes retrieved");

      indexList.forEach(function (indexObject) {
        /*console.log("Index retrieved:");
        console.log(indexObject);*/
        indexStringList.push(JSON.stringify(indexObject));
      });
      callback(null, indexStringList);
    });
  });
}

/**
 * Returns the list of all unique events in the database and their count
 * @param {callback} callback 
 */
function requestEventCountList(callback) {
  //each element in this list will contain a name and a count
  var eventObjectList = []
  constants.connectAndValidateNodeJs(function (err, db) {
    db.collection(constants.eventCollection).distinct('event', function (err, eventsList) {
      eventsList.forEach(function (eventName) {
        var eventObject = {};
        eventObject.name = eventName;

        db.collection(constants.eventCollection).count({ 'event': eventName },
          function (err, eventCount) {
            console.log("Event " + eventName + " was found " + eventCount + " times")
            eventObject.count = eventCount;
            eventObjectList.push(eventObject);

            //if all events have been processed, callback
            if (eventObjectList.length >= eventsList.length)
              callback(null, eventObjectList);
          });
      });
    });
  });
}

/**
 * Returns a list of all users in the database,
 * each with a list of events with their counts
 * @param {callback} callback 
 */
function requestUserListWithEvents(callback) {
  var userEventsList = [];
  requestUsers(function (err, userList) {
    userList.forEach(function (userId) {
      //for each user
      var userEventObject = {};
      userEventObject.name = userId;
      userEventObject.eventList = [];

      requestEventListForUser(userId, function (err, eventList) {
        eventList.forEach(function (eventName) {
          //for each event from this user
          requestEventCountForEventAndUser(eventName, userId,
            function (err, eventObject) {
              userEventObject.eventList.push(eventObject);

              /*console.log("Event " + eventObject.name + " was found " + eventObject.count
                + " times for user " + userId + ". " + userEventObject.eventList.length
                + " processed out of " + eventList.length);*/

              //Check if all events for this user have been processed
              if (userEventObject.eventList.length >= eventList.length) {
                userEventsList.push(userEventObject);
                //if finished, also check if ALL users have been processed, and callback
                if (userEventsList.length >= userList.length) {
                  callback(null, userEventsList);
                  return;
                }
                /*else
                  console.log((userList.length - userEventsList.length) + " users to go");*/
              }
            });
        });
      });
    });
  });

}

/**
 * Returns the list of all indexes in the database
 * @param {callback} callback 
 */
function requestUsers(callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    db.collection(constants.eventCollection).distinct('sid', function (err, userList) {
      if (err) return console.error("requestUsers()", err);
      callback(null, userList);
    });
  });
}

function requestEventListForUser(userId, callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    db.collection(constants.eventCollection).distinct('event', { 'sid': userId },
      function (err, eventList) {
        if (err) return console.error("requestEventListForUser()", err);
        callback(null, eventList);
      });
  });
}

function requestEventCountForEventAndUser(eventName, userId, callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    var eventObject = {};
    eventObject.name = eventName;

    db.collection(constants.eventCollection).count({ 'event': eventName, 'sid': userId },
      function (err, eventCount) {
        eventObject.count = eventCount;
        callback(null, eventObject);
      });
  });
}

module.exports.setConstants = setConstants;
module.exports.requestDBname = requestDBname;
module.exports.requestIndexes = requestIndexes;
module.exports.requestEventCountList = requestEventCountList;
module.exports.requestUserListWithEvents = requestUserListWithEvents;