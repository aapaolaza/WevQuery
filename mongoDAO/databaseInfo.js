
// ////We need to load the constants file
let constants;
let mongoLog;

function setConstants(mapReduceConstants, mongoLogConstants) {
  constants = mapReduceConstants;
  mongoLog = mongoLogConstants;
}

function requestDBname(callback) {
  callback(null, constants.mongoQueryDB);
}

/**
 * Returns the list of all collections in the database, with their count
 * @param {callback} callback
 */
function requestDBCollections(callback) {
  const collectionList = [];
  constants.connectAndValidateNodeJs((connectErr, db) => {
    db.listCollections().toArray((listErr, collectionInDBList) => {
      collectionInDBList.forEach((collectionInDBObject) => {
        const collObjectTemp = {};
        // console.log(collectionInDBObject);
        collObjectTemp.name = collectionInDBObject.name;
        db.collection(collectionInDBObject.name).count((collCountErr, count) => {
          collObjectTemp.count = count;
          collectionList.push(collObjectTemp);
          // check if all collections have been processed
          if (collectionList.length >= collectionInDBList.length) {
            callback(null, collectionList);
          }
        });
      });
    });
  });
}

/**
 * Returns the list of all indexes in the database, in string format
 * @param {callback} callback
 */
function requestIndexes(callback) {
  const indexStringList = [];
  constants.connectAndValidateNodeJs((connectErr, db) => {
    db.collection(constants.eventCollection).indexes((indexErr, indexList) => {
      if (indexErr) return console.error('requestIndexes(): Error retrieving the indexes', indexErr);
      console.log(`${indexList.length} indexes retrieved`);

      indexList.forEach((indexObject) => {
        indexStringList.push(JSON.stringify(indexObject));
      });
      return callback(null, indexStringList);
    });
  });
}

/**
 * Returns the list of all unique events in the database and their count
 * @param {callback} callback
 */
function requestEventCountList(callback) {
  // each element in this list will contain a name and a count
  const eventObjectList = [];
  constants.connectAndValidateNodeJs((connectErr, db) => {
    db.collection(constants.eventCollection).distinct('event', (distinctErr, eventsList) => {
      eventsList.forEach((eventName) => {
        const eventObject = {};
        eventObject.name = eventName;

        db.collection(constants.eventCollection)
          .count({ event: eventName }, (countErr, eventCount) => {
            console.log(`Event ${eventName} was found ${eventCount} times`);
            eventObject.count = eventCount;
            eventObjectList.push(eventObject);

            // if all events have been processed, callback
            if (eventObjectList.length >= eventsList.length) {
              callback(null, eventObjectList);
            }
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
  const userEventsList = [];
  requestUsers((reqUserErr, userList) => {
    userList.forEach((userId) => {
      // for each user
      const userEventObject = {};
      userEventObject.name = userId;
      userEventObject.eventList = [];

      requestEventListForUser(userId, (reqEvErr, eventList) => {
        eventList.forEach((eventName) => {
          // for each event from this user
          requestEventCountForEventAndUser(eventName, userId, (reqEvCountErr, eventObject) => {
            userEventObject.eventList.push(eventObject);

            // Check if all events for this user have been processed
            if (userEventObject.eventList.length >= eventList.length) {
              userEventsList.push(userEventObject);
              // if finished, also check if ALL users have been processed, and callback
              if (userEventsList.length >= userList.length) {
                callback(null, userEventsList);
              }
              /* else
                console.log((userList.length - userEventsList.length) + " users to go"); */
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
  constants.connectAndValidateNodeJs((connectErr, db) => {
    db.collection(constants.eventCollection).distinct('sid', (distinctErr, userList) => {
      if (connectErr) return console.error('requestUsers()', distinctErr);
      return callback(null, userList);
    });
  });
}

function requestEventListForUser(userId, callback) {
  constants.connectAndValidateNodeJs((connectErr, db) => {
    db.collection(constants.eventCollection).distinct(
      'event', { sid: userId },
      (distinctErr, eventList) => {
        if (distinctErr) return console.error('requestEventListForUser()', distinctErr);
        return callback(null, eventList);
      }
    );
  });
}

function requestEventCountForEventAndUser(eventName, userId, callback) {
  constants.connectAndValidateNodeJs((connectErr, db) => {
    const eventObject = {};
    eventObject.name = eventName;

    db.collection(constants.eventCollection).count(
      { event: eventName, sid: userId },
      (countErr, eventCount) => {
        eventObject.count = eventCount;
        callback(null, eventObject);
      }
    );
  });
}

/**
 * Given a set of options, returns all the events matching the criteria
 * @param {*} queryOptions
 */
function requestEvents(queryOptions, callback) {
  const searchParams = {};

  // Given the query options by the user, construct the search parameters
  if (queryOptions.eventName) {
    // searchParams.event = { $in: [queryOptions.eventName]};
    searchParams.event = queryOptions.eventName;
  }

  if (queryOptions.userList) {
    searchParams.sid = { $in: queryOptions.userList };
  }

  if (queryOptions.startTimems || queryOptions.endTimems) {
    searchParams.timestampms = {};
  }
  if (queryOptions.startTimems) {
    searchParams.timestampms.$gte = queryOptions.startTimems;
  }
  if (queryOptions.endTimems) {
    searchParams.timestampms.$lte = queryOptions.endTimems;
  }

  constants.connectAndValidateNodeJs((connectErr, db) => {
    if (connectErr) return callback(connectErr);
    db.collection(constants.eventCollection).find(searchParams)
      .toArray((findErr, eventList) => {
        if (findErr) {
          findErr.params = searchParams;
          return callback(findErr);
        }
        return callback(null, eventList);
      });
    return null;
  });
  return null;
}

/**
 * Given an object with a userID and a length, computes and returns the search history,
 * by retrieving the 'resultLoaded' events
 * @param {*} queryOptions
 */
function requestMovingSearchHistory(queryOptions, callback) {
  const searchParams = {};

  // Given the query options by the user, construct the search parameters
  if (queryOptions.length) {
    // searchParams.event = { $in: [queryOptions.eventName]};
    searchParams.length = queryOptions.length;
  } else {
    searchParams.length = 10;
  }

  if (queryOptions.userID) {
    searchParams.sid = queryOptions.userID;
  }

  constants.connectAndValidateNodeJs((connectErr, db) => {
    if (connectErr) return callback(connectErr);
    db.collection(constants.eventCollection).aggregate([
      { $match: { sid: searchParams.sid, event: 'resultLoaded' } },
      { $project: { sid: 1, timestampms: 1, episodeCount: 1, result: 1, urlFull: 1 } },
      {
        $group: {
          _id: { episodeCount: '$episodeCount', searchID: '$result.searchID' },
          timestampms: { $first: '$timestampms' },
          query: { $first: '$result.query' },
          docCount: { $first: '$result.docCount' },
          urlFull: { $first: '$urlFull' },
        },
      },
      { $sort: { timestampms: -1 } },
      { $limit: searchParams.length },
    ]).toArray((findErr, eventList) => {
      if (findErr) {
        findErr.params = searchParams;
        return callback(findErr);
      }
      return callback(null, eventList);
    });
    return null;
  });
  return null;
}

module.exports.setConstants = setConstants;
module.exports.requestDBname = requestDBname;
module.exports.requestDBCollections = requestDBCollections;
module.exports.requestIndexes = requestIndexes;
module.exports.requestEventCountList = requestEventCountList;
module.exports.requestUserListWithEvents = requestUserListWithEvents;
module.exports.requestEvents = requestEvents;
module.exports.requestMovingSearchHistory = requestMovingSearchHistory;