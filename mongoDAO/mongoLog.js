let constants;
const wevQueryOptions = require('../options');

function setConstants(mapReduceConstants) {
  constants = mapReduceConstants;
}


const APPNAME = 'WevQuery';

/**
 *  * Given a message and a timestamp, it logs the operation,
 * or error to the db.
 * @param {string} type can be either error,message, or optime
 * @param {*} operation that called this function
 * @param {*} sd code of the URL where this funciton is operating
 * @param {*} message to store
 * @param {*} startTimems if given, the start of the operation to store
 * @param {*} endTimems  if given, the end of the operation to store
 */
function logMessage(type, operation, sd, message, startTimems, endTimems) {
  if (!wevQueryOptions.logMode) return;
  constants.connectAndValidateNodeJs((err, db) => {
    if (err) return console.error(`initialiseDB() ERROR connecting to DB${err}`);
    const logDocument = {
      application: APPNAME,
      type,
      operation,
      sd,
      message,
      duration: (endTimems - startTimems),
      startTimems,
      startTime: constants.datestampToReadable(startTimems),
      endTimems,
      endTime: constants.datestampToReadable(endTimems),
    };
    db.collection(constants.mongoLogCollection).insert(logDocument, (insertErr) => {
      if (insertErr) return console.error(`logMessage() ERROR INSERTING LOG DOCUMENT ${insertErr}`);
      return console.log('logMessage() new Log document stored correctly');
    });
  });
}


module.exports.setConstants = setConstants;
module.exports.logMessage = logMessage;
