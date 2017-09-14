
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
  constants.connectAndValidateNodeJs((err, db) => {
    db.listCollections().toArray((err, collectionInDBList) => {
      collectionInDBList.forEach((collectionInDBObject) => {
        const collObjectTemp = {};
        // console.log(collectionInDBObject);
        collObjectTemp.name = collectionInDBObject.name;
        db.collection(collectionInDBObject.name).count({ 'value.xmlQueryCounter': { $ne: 0 } },
          (err, count) => {
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
  constants.connectAndValidateNodeJs((err, db) => {
    db.collection(constants.eventCollection).indexes((err, indexList) => {
      if (err) return console.error('requestIndexes(): Error retrieving the indexes', err);
      console.log(`${indexList.length} indexes retrieved`);

      indexList.forEach((indexObject) => {
        /* console.log("Index retrieved:");
        console.log(indexObject); */
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
  // each element in this list will contain a name and a count
  const eventObjectList = [];
  constants.connectAndValidateNodeJs((err, db) => {
    db.collection(constants.eventCollection).distinct('event', (err, eventsList) => {
      eventsList.forEach((eventName) => {
        const eventObject = {};
        eventObject.name = eventName;

        db.collection(constants.eventCollection).count({ event: eventName },
          (err, eventCount) => {
            console.log(`Event ${eventName} was found ${eventCount} times`);
            eventObject.count = eventCount;
            eventObjectList.push(eventObject);

            // if all events have been processed, callback
            if (eventObjectList.length >= eventsList.length) { callback(null, eventObjectList); }
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
  requestUsers((err, userList) => {
    userList.forEach((userId) => {
      // for each user
      const userEventObject = {};
      userEventObject.name = userId;
      userEventObject.eventList = [];

      requestEventListForUser(userId, (err, eventList) => {
        eventList.forEach((eventName) => {
          // for each event from this user
          requestEventCountForEventAndUser(eventName, userId,
            (err, eventObject) => {
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
  constants.connectAndValidateNodeJs((err, db) => {
    db.collection(constants.eventCollection).distinct('sid',
      (err, userList) => {
        if (err) return console.error('requestUsers()', err);
        callback(null, userList);
      });
  });
}

function requestEventListForUser(userId, callback) {
  constants.connectAndValidateNodeJs((err, db) => {
    db.collection(constants.eventCollection).distinct('event', { sid: userId },
      (err, eventList) => {
        if (err) return console.error('requestEventListForUser()', err);
        callback(null, eventList);
      });
  });
}

function requestEventCountForEventAndUser(eventName, userId, callback) {
  constants.connectAndValidateNodeJs((err, db) => {
    const eventObject = {};
    eventObject.name = eventName;

    db.collection(constants.eventCollection).count({ event: eventName, sid: userId },
      (err, eventCount) => {
        eventObject.count = eventCount;
        callback(null, eventObject);
      });
  });
}

/**
 * Creates a list of all available unique nodes,
 * and for each of them it stores the number of events
 * associated with them.
 * constants = require("./mongoDAO/MapReduceConstantsNode.js");
 * 
 * createNodeCollection(null, function(err){console.log("FINISHED")})
 * createNodeCollection('http://www.cs.manchester.ac.uk/', function(err){console.log("FINISHED")})
 * @param {*} callback 
 */
function createNodeCollection(urlOpt, callback) {
  constants.connectAndValidateNodeJs((err, db) => {
    console.log(`Starting createNodeCollection() execution at ${new Date().toUTCString()}`);

    // nodeIndex is a hash function that uniquely represents a node and serves as a direct index to it
    db.collection(constants.nodeListCollection).createIndex({ index: 1 }, { unique: true });
    db.collection(constants.nodeListCollection).createIndex({ generalCount: 1 });

    // Before creating the list, remove any existing node Collection
    db.collection(constants.nodeListCollection).drop(() => {
      console.log('collection deleted');
      // Look for ALL events that have a node object.
      // db.collection(constants.eventCollection).find({ sid: "w62zkMya3kBE", "nodeInfo": { $exists: true } })

      const eventSearchOpt = { nodeInfo: { $exists: true } };

      if (urlOpt) eventSearchOpt.url = urlOpt;

      db.collection(constants.eventCollection).find(eventSearchOpt)
        .forEach((eventItem) => {
          // First generate the index
          // console.log(`creating index for ${JSON.stringify(eventItem.nodeInfo)}`);
          const nodeIndex = createHash(JSON.stringify(eventItem.nodeInfo));
          // Then upsert the corresponding event in the nodeList
          // if it exists, increase the count for the corresponding event name
          const incObject = {};
          incObject[`eventCount.${eventItem.event}`] = 1;
          incObject.generalCount = 1;

          db.collection(constants.nodeListCollection).update({ index: nodeIndex },
            {
              $set: {
                nodeInfo: eventItem.nodeInfo,
              },
              $inc: incObject,
            },
            {
              upsert: true,
            },
            (err) => {
              // The upsert will fail if there is a race condition.
              // If it happens, the recommendation is just retrying.
              if (err) {
                console.log('An error occurred during an update');
                // from https://stackoverflow.com/questions/37295648/mongoose-duplicate-key-error-with-upsert
                if (err.code === 11000) {
                  // Another upsert occurred during the upsert, try again. You could omit the
                  // upsert option here if you don't ever delete docs while this is running.
                  db.collection(constants.nodeListCollection).update({ index: nodeIndex },
                    {
                      $set: {
                        nodeInfo: eventItem.nodeInfo,
                      },
                      $inc: incObject,
                    },
                    {
                      upsert: true,
                    },
                    (err) => {
                      if (err) {
                        console.trace(err);
                      }
                    });
                } else {
                  console.trace(err);
                }
              }
            });
        },
        (err) => {
          if (err) {
            console.log('An error occurred during the process of the events with nodeInfo');
            callback(err);
          } else {
            console.log(`createNodeCollection() finished successfully at ${new Date().toUTCString()}`);
            callback(null);
          }
        });
    });
  });
}

const crypto = require('crypto');
/**
 * Takes a string as input and returns a hash
 * @param {String} data to be converted to hash
 */
function createHash(data) {
  return crypto.createHash('sha256').update(data).digest('base64');
}

module.exports.setConstants = setConstants;
module.exports.requestDBname = requestDBname;
module.exports.requestDBCollections = requestDBCollections;
module.exports.requestIndexes = requestIndexes;
module.exports.requestEventCountList = requestEventCountList;
module.exports.requestUserListWithEvents = requestUserListWithEvents;
