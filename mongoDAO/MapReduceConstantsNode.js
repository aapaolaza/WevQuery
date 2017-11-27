//Version
//LOG 2017-03-23 10:42:05

///Same as MapReduceConstants, but I changed it so it can be used with Node JS http://stackoverflow.com/questions/5625569/include-external-js-file-in-node-js-app

///Module exports to act as interface can be found at the end, after all variables and functions are defined
var mongodb = require('mongodb');

var mongoClient = mongodb.MongoClient
  , Server = mongodb.Server;

//This tag can be found in the "msg" field in the current ops command of MapReduce commands
const mapReduceTag = "m/r";
const xmlQueryResults = "xmlQueryResults";
const xmlQueryCatalog = "xmlQueryCatalog";

const mongoLogCollection = "log";
const userProfileCollection = "userProfiles";

//This prefix will be added to all queries
const queryCollectionPrefix = "xmlQuery_"

///MongoDB connection info
var dbAccessData = require("./dbAccessData");
const mongoPath = dbAccessData.mongoPath;
const mongoAuthenticateDB = dbAccessData.mongoAuthenticateDB;
const mongoQueryDB = dbAccessData.mongoQueryDB;
const mongoUser = dbAccessData.mongoUser;
const mongoPass = dbAccessData.mongoPass;

//Depending on the implementation, we might want to either use fields created after processing the data (urlSessionCounter, sdSessionCounter), or client created fields(episodecount)
const episodeField = "episodeCount"

const mongoTimeout = 0;//0

const userCollection = "activeUsers";
const eventCollection = "events";

//web site to be analysed, determined by its "sd" value. 10002 is kupb, 10006 is CS
const websiteId = "10006";

var globalDbConnection = null;


/** Connects to the database, authenticates the connection against the correspondent
 * This function is not available to NodeJs in the interface
 * as it won't work 
 * */
function connectAndValidate() {
  connect(mongoPath);

  if (mongoUser !== "" && mongoUser !== "DBUSERNAME") {
    print("Authentication is required");
    db = db.getSiblingDB(mongoAuthenticateDB);
    db.auth(mongoUser, mongoPass);
    db = db.getSiblingDB(mongoQueryDB);
  }
  else {
    db = db.getSiblingDB(mongoQueryDB);
  }
  console.log("connection secured");
  return db;
}

/**
 * Connect to the mongoDB and authenticate (if necessary).
 * If a connection already exists, return it.
 */
function connectAndValidateNodeJs(callback) {
  //var mongoclient = new MongoClient(new Server(mongoPath), {native_parser: true});
  //globalDbConnection=null;
  if (globalDbConnection && globalDbConnection.serverConfig.isConnected()) {
    callback(null, globalDbConnection);
  }
  else {
    createNewConnection(callback);
  }
}

function createNewConnection(callback) {
  console.log("connectAndValidateNodeJs(): CREATING a new connection");

  mongoConnectionPath = mongoPath;
  //For authentication we add the parameter to the mongoPath
  //From http://mongodb.github.io/node-mongodb-native/2.0/tutorials/connecting/
  //Authentication > Indirectly Against Another Database
  if (mongoUser !== "" && mongoUser !== "DBUSERNAME")
    mongoConnectionPath = mongoUser + ":" + mongoPass + "@" + mongoPath
      + "?authSource=" + mongoAuthenticateDB;

  var options = {
    server: {
      socketOptions: {
        keepAlive: mongoTimeout,
        connectTimeoutMS: mongoTimeout,
        socketTimeoutMS: mongoTimeout
      }
    },
    replset: {
      socketOptions: {
        keepAlive: mongoTimeout,
        connectTimeoutMS: mongoTimeout,
        socketTimeoutMS: mongoTimeout
      }
    }
  };

  // Open the connection to the server
  mongoClient.connect("mongodb://" + mongoConnectionPath, options, function (err, dbConnection) {
    if (err) { callback(err, null); }
    globalDbConnection = dbConnection;
    callback(err, dbConnection);
  });
}

/**
 * If there is an existing connection to reuse. Overwrites existing connection
 */
function reuseConnection(db) {
  globalDbConnection = db;
}

function closeConnection() {
  if (globalDbConnection) globalDbConnection.close();
}

function getCurrentConnectionOptions() {
  return ("mongoTimeout = " + mongoTimeout);
}



/** Completes single-digit numbers by a "0"-prefix
 * This is a special case for milliseconds, in which we will add up to two zeros 
 * */
function completeDateValsMilliseconds(dateVal) {
  var dateVal = "" + dateVal;
  if (dateVal.length < 2) return "00" + dateVal;
  if (dateVal.length < 3) return "0" + dateVal;
  else return dateVal;
}


/////////////////////////////////////////////START OF CONSTANTS/////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const scopeObject = {};

//list of banned IP addresses
//const bannedIPlist = [ { "ip" : "130.88.193.26"} , { "ip" : "IP1"} , { "ip" : "IP2"}];
const bannedIPlist = ["130.88.193.26", "IP1", "IP2"];
//the following query tests that the sid related with the ip 130.88.193.26 are filtered (it should be empty).
//db.map_reduce_example.find({"_id.sid":{$in:["8hgYRPR2x1Jz", "7O25l3TPWVkp", "1l8yDX2ehiEv", "ZrZ2OrGb6fAY", "qptygSdE0H1z", "uAWrwKFf00rY", "5ZGlnqS1CPAE", "EVJZCfwAXF7j", "01v2m0HonZ3r", "pSaMH85B0Adz", "dzJnQXxQBKJT", "Qcs4OFkpPIbB", "x8UVE8L4598v", "4YWnL6iA0UpF"]}});

scopeObject["bannedIPlist"] = bannedIPlist;


//These events should be ignored when calculating active times.
const incorrectActTimeEvents = ["mobileGyroscopeEvent", "mouseOverEvent", "resizeEvent"]
scopeObject["incorrectActTimeEvents"] = incorrectActTimeEvents;

///////////List of events
const loadEvent = "load";
scopeObject["loadEvent"] = loadEvent;

const mouseWheelEvent = "mousewheel";
scopeObject["mouseWheelEvent"] = mouseWheelEvent;

const mouseDownEvent = "mousedown";
scopeObject["mouseDownEvent"] = mouseDownEvent;

const mouseUpEvent = "mouseup";
scopeObject["mouseUpEvent"] = mouseUpEvent;

const mouseOverEvent = "mouseover";
scopeObject["mouseOverEvent"] = mouseOverEvent;

const mouseOutEvent = "mouseout";
scopeObject["mouseOutEvent"] = mouseOutEvent;

const mouseMoveEvent = "mousemove";
scopeObject["mouseMoveEvent"] = mouseMoveEvent;

const dblclickEvent = "dblclick";
scopeObject["dblclickEvent"] = dblclickEvent;

const mobileGyroscopeEvent = "mobileGyroscope";
scopeObject["mobileGyroscope"] = mobileGyroscopeEvent;

const scrollEvent = "scroll";
scopeObject["scrollEvent"] = scrollEvent;

const resizeEvent = "resize";
scopeObject["resize"] = resizeEvent;


//////Session timeout
const sessionTimeout = 40 * 60 * 1000;//40 mintues
scopeObject["sessionTimeout"] = sessionTimeout;
scopeObject["episodeField"] = episodeField;



////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////END OF CONSTANTS/////////////////////////////////////////////////



/////////////////////////////////////////////START OF CONSTANTS/////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Parse a date in "yyyy-mm-dd,HH:mm:ss:SSS" format, and return the ms.
 * I will do it manually to avoid problems with implementation dependant functions
 * new Date(year, month [, date [, hours[, minutes[, seconds[, ms]]]]])
 * 2013-07-05,09:25:53:970
 */
function parseDateToMs2(input) {
  var parts = input.split(',');

  var date = parts[0].split('-');
	/*var year = date[0];
	var month = date[1];
	var day = date[2];*/

  var time = parts[1].split(':');
	/*var hour = time[0];
	var minute = time[1];
	var secs = time[2];
	var millisecs = time[3];*/
  // new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
  return new Date(date[0], date[1] - 1, date[2], time[0], time[1], time[2], time[3]).getTime(); // Note: months are 0-based
}

/**
 * Returns current date in a readable format
 */
function datestamp() {
  var currentDate = new Date();
  return currentDate.getFullYear() + "-" + completeDateVals(currentDate.getMonth() + 1) + "-"
    + completeDateVals(currentDate.getDate()) + "," + completeDateVals(currentDate.getHours())
    + ":" + completeDateVals(currentDate.getMinutes())
    + ":" + completeDateVals(currentDate.getSeconds())
    + ":" + completeDateValsMilliseconds(currentDate.getMilliseconds());
}

/** Completes single-digit numbers by a "0"-prefix
 *  */
function completeDateVals(dateVal) {
  var dateVal = "" + dateVal;
  if (dateVal.length < 2) return "0" + dateVal;
  else return dateVal;
}

/** Completes single-digit numbers by a "0"-prefix
 * This is a special case for milliseconds, in which we will add up to two zeros 
 * */
function completeDateValsMilliseconds(dateVal) {
  var dateVal = "" + dateVal;
  if (dateVal.length < 2) return "00" + dateVal;
  if (dateVal.length < 3) return "0" + dateVal;
  else return dateVal;
}

/**
 * Given an epoch date, it returns a readable format of the date
 * @param {epoch date} datems 
 */
function datestampToReadable(datems) {
  var currentDate = new Date(datems);
  return currentDate.getFullYear() + "-" + completeDateVals(currentDate.getMonth() + 1) + "-"
    + completeDateVals(currentDate.getDate()) + "," + completeDateVals(currentDate.getHours())
    + ":" + completeDateVals(currentDate.getMinutes())
    + ":" + completeDateVals(currentDate.getSeconds())
    + ":" + completeDateValsMilliseconds(currentDate.getMilliseconds());
}


/**
* We need our own compare function in order to be able to sort the array according to the timestamp
*/
function compareEventTS(objectA, objectB) {

  var objectATime = Number(objectA.timestampms);
  var objectBTime = Number(objectB.timestampms);

  if (objectATime < objectBTime) {
    //timeDifference += "##" + objectATime+ "is SMALLER than " + objectBTime;
    return -1;
  }
  if (objectATime > objectBTime) {
    //timeDifference += "##" + objectATime+ "is BIGGER than " + objectBTime;
    return 1;
  }
  //timeDifference += "##" + objectATime+ "is EQUALS to " + objectBTime;
  return 0;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////END OF CONSTANTS/////////////////////////////////////////////////


//////Modules
module.exports.mongodb = mongodb;
module.exports.mapReduceTag = mapReduceTag;
module.exports.xmlQueryResults = xmlQueryResults;
module.exports.xmlQueryCatalog = xmlQueryCatalog;

module.exports.mongoLogCollection = mongoLogCollection;
module.exports.userProfileCollection = userProfileCollection;
module.exports.mongoQueryDB = mongoQueryDB;
module.exports.connectAndValidateNodeJs = connectAndValidateNodeJs;
module.exports.closeConnection = closeConnection;
module.exports.reuseConnection = reuseConnection;
module.exports.getCurrentConnectionOptions = getCurrentConnectionOptions;
module.exports.completeDateValsMilliseconds = completeDateValsMilliseconds;
module.exports.parseDateToMs2 = parseDateToMs2;
module.exports.datestamp = datestamp;
module.exports.completeDateVals = completeDateVals;
module.exports.completeDateValsMilliseconds = completeDateValsMilliseconds;
module.exports.datestampToReadable = datestampToReadable;
module.exports.compareEventTS = compareEventTS;
module.exports.websiteId = websiteId;
module.exports.userCollection = userCollection;
module.exports.scopeObject = scopeObject;
module.exports.eventCollection = eventCollection;
module.exports.bannedIPlist = bannedIPlist;
module.exports.sessionTimeout = sessionTimeout;
module.exports.mongoLogCollection = mongoLogCollection;
module.exports.userProfileCollection = userProfileCollection;
module.exports.episodeField = episodeField;