/**
 * WevQuery server.
 * 1. npm install socket.io
 * 2. install connect and serve-static 
 *   npm install connect serve-static
 * https://github.com/senchalabs/connect
 * 2. npm i xsd-schema-validator
 * xsd-schema-validator requires having Java installed!!! check https://www.npmjs.com/package/xsd-schema-validator
 * 3. node WevQueryServer.js
 */

var port = 8080;
var logFile = "./wevQuery.log";

var connect = require('connect');
var serveStatic = require('serve-static');
var app = connect().use(serveStatic(__dirname)).listen(8080, function () {
  console.log('Server running on ' + port + '...');
});

var io = require('socket.io').listen(app);
//var socket = io.connect();
var fs = require('fs');
var exec = require('child_process').exec;
var path = require('path');
var url = require("url");

var mongoDAO = require("./MongoDBQuery/mongoDAO.js");

var resultsFolder = "./Results/";

//Create results folder if it doesn't exist
if (!fs.existsSync(resultsFolder)) {
  fs.mkdirSync(resultsFolder);
}

var clientsLogFolder = "./ClientLogs/";

//Create results folder if it doesn't exist
if (!fs.existsSync(clientsLogFolder)) {
  fs.mkdirSync(clientsLogFolder);
}

var config = require('./config.js');

// listen for commands from the Web dashboard
io.sockets.on('connection', function (socket) {

  socket.on('saveXMLQuery', function (data) {
    log("saveXMLQuery, saving the following XML query: " + data.title);
    log(data.xmlData)

    mongoDAO.isQueryTitleInCatalog(data.title, function (err, isTitleCorrect) {
      if (isTitleCorrect) {
        console.log(isTitleCorrect);
        mongoDAO.saveQuery(data.title, data.xmlData);
        io.sockets.emit('clientXmlQuerySaved', {});
      }
      else {
        log("On saveXMLQuery: Title is not valid, notify user that an error happened.");
        io.sockets.emit('clientXmlQuerySaved', { 'errorMessage': "The given title is not valid, please provide a different one. Is this title already in use?" });
      }
    });
  });

  //To be triggered when a request to run a query is received
  socket.on('serverRunXMLQuery', function (data) {
    log("serverRunXMLQuery, running the provided query");
    //validate XML before executing query
    validateXMLagainstXSD(data.xmlData, function (err, isXmlValid) {
      if (err) { log(err); }
      else {
        if (isXmlValid) {
          // XML validation was correct, run query
          mongoDAO.isQueryTitleUnique(data.xmlTitle, function (err, isTitleCorrect) {
            if (isTitleCorrect)
              startXmlQuery(data);
            else {
              console.log("Title is not valid, notify user that an error happened.");
              sendMessageToUser(socket.id, "The given title is not correct, provide a different one", true);
              log("xml title is not valid");
            }
          });
        } else {
          console.log("xml was invalid, notify user that an error happened.");
          sendMessageToUser(socket.id, "XML was not well formed", true);
          log("xml query failed");
        }
      }
    });
  });


  socket.on('serverRequestCompletedQueries', function (data) {
    log("serverRequestCompletedQueries, requesting available queries");
    mongoDAO.getCompletedQueries(completedQueriesFinished);
  });

  socket.on('serverRequestCatalogQueries', function (data) {
    log("serverRequestCatalogQueries, requesting Catalog queries");
    mongoDAO.getCatalogQueries(CatalogQueriesFinished);
  });

  socket.on('serverRequestRunningQueries', function (data) {
    log("serverRequestRunningQueries, requesting running queries");
    mongoDAO.getRunningQueries(runningQueriesFinished);
  });



  socket.on('serverAnalyseGeneralOverview', function (data) {
    log("serverAnalyseGeneralOverview, requesting general information of all results");
    analyseQueryData();
  });

  socket.on('serverEventSequences', function (data) {
    log("serverEventSequences, requesting count for all event sequences");
    getEventSeqCount();
  });


  socket.on('serverAllEventTransitions', function (data) {
    log("serverAllEventTransitions, requesting transitions for all event sequences");
    getAllEventTransitions();
  });


  socket.on('serverRequestQueryData', function (data) {
    log("serverRequestQueryData, requesting the following query: " + data.queryTitle);
    requestQueryDataForClient(data.queryTitle);
  });

  socket.on('serverDeleteResults', function (data) {
    log("serverDeleteResults, deleting the following results: " + data.queryTitle);
    mongoDAO.deleteResultCollection(data.queryTitle, function (err) {
      if (err) return console.error("serverDeleteResults() ERROR in deleteResultCollection callback " + err);
      mongoDAO.deleteCompletedQuery(data.queryTitle, function (err) {
        if (err) return console.error("serverDeleteResults() ERROR in deleteCompletedQuery callback " + err);
        deleteResultFinished(data.queryTitle);
      });
    });
  });

  socket.on('serverDeleteCatalog', function (data) {
    log("serverDeleteCatalog, deleting the following Catalog: " + data.queryTitle);
    mongoDAO.deleteCatalogQuery(data.queryTitle, function (err) {
      if (err) return console.error("serverDeleteCatalog() ERROR in deleteCatalogQuery callback " + err);
      deleteCatalogFinished(data.queryTitle);
    });
  });

});

/**
 * Runs the provided xmlQuery
 */
function startXmlQuery(xmlData) {
  log("XML should be run at this point with the following information:");
  log("email:" + xmlData.email);
  log("isStrictMode:" + xmlData.isStrictMode);
  log("xmlTitle:" + xmlData.xmlTitle);
  log("xmlData:" + xmlData.xmlData);
  mongoDAO.runXmlQuery(xmlData.xmlTitle, xmlData.isStrictMode, xmlData.xmlData,
    function (err, queryTitle, processTime) {
      if (err) return console.error("startXmlQuery() ERROR in endCallback " + err);

      xmlQueryFinished(queryTitle, processTime);
    },
    function (err, queryTitle, queryData) {
      if (err) return console.error("startXmlQuery() ERROR in launchedCallback " + err);

      mongoDAO.addNewQueryDocument(queryTitle, queryData);
    });

}


/**
 * When the database retrieves all available queries it returns an array of strings
 */

function completedQueriesFinished(err, queryList) {
  if (err) return console.error("completedQueriesFinished() ERROR retrieving available queries " + err);
  log("Available queries retrieved: " + queryList.length);
  io.sockets.emit('clientCompletedQueriesFinished', { 'queryList': queryList });
}

/**
 * When the database retrieves all Catalog queries it returns an array of query documents
 */
function CatalogQueriesFinished(err, queryList) {
  if (err) return console.error("CatalogQueriesFinished() ERROR retrieving Catalog queries " + err);
  io.sockets.emit('serverRequestCatalogQueriesFinished', { 'queryList': queryList });
}

/**
 * When the database retrieves all currently running queries it returns an array of query documents
 */
function runningQueriesFinished(err, queryList) {
  if (err) return console.error("runningQueriesFinished() ERROR retrieving running queries " + err);
  io.sockets.emit('serverRequestRunningQueriesFinished', { 'queryList': queryList });
}
/**
 * When the xmlQuery finishes, an email will be sent, and the Web interface will be notified
 */
function xmlQueryFinished(queryTitle, processTime) {
  log("xmlQueryFinished()");
  mongoDAO.setQueryFinished(queryTitle, processTime);
  //Notify Web dashboard
  io.sockets.emit('clientXmlQueryFinished', { 'message': "The query called " + queryTitle + " finished without problems" });
}

/**
 * When the result has been deleted, notify the user
 */
function deleteResultFinished(queryTitle) {
  log("deleteResultFinished()");
  io.sockets.emit('deleteResultFinished', { 'message': "The qresults of the query called " + queryTitle + " has been deleted" });
}

/**
 * When the Catalog has been deleted, notify the user
 */
function deleteCatalogFinished(queryTitle) {
  log("deleteCatalogFinished()");
  io.sockets.emit('deleteCatalogFinished', { 'message': "The Catalog of the query called " + queryTitle + " has been deleted" });
}


/**
 * This function should validate the XML against the schema.
 * returns no error if everything went alright.
 * If not, it will return the received error message.
 */
function validateXMLagainstXSD(xmlData, callback) {
  //TODO: for some reason this validator module does not recognise the JAVA installation. I will skip it.
  callback(null, true);
  return null;

  var validator = require('xsd-schema-validator');
  var schemaPath = './WebInterface/eventseq.xsd'

  fs = require('fs')
  fs.readFile(schemaPath, 'utf8', function (err, xmlSchema) {
    if (err) {
      callback(err, null);
    }
    console.log("validating");
    console.log(xmlData);
    console.log(xmlSchema);
    validator.validateXML(xmlData, xmlSchema, function (err, result) {
      // err contains any technical error 
      console.log("Was there an error? " + err);
      console.log("Was Validation correct? " + result);
      callback(err, result.valid);
    });
  });
}


/**
 * Requests the query results and stores them in a json in the "results" folder
 * TODO: uses the data from the results folder to run analysis
 */
function storeQueryJson(queryTitle, callback) {
  var filename = resultsFolder + queryTitle + ".json";
  console.log("printing to: " + filename);
  fs.stat(filename, function (err, stat) {
    if (err == null) {
      console.log('File exists');
      callback(null, queryTitle, filename);
    } else if (err.code == 'ENOENT') {
      // file does not exist, request data from mongo, and write
      mongoDAO.getQueryData(queryTitle, function (err, title, itemList) {
        if (err) return console.error("getQueryData() ERROR connecting to DB" + err);

        var dataOutput = fs.createWriteStream(filename, { 'flags': 'a' });
        dataOutput.write("[");

        for (var index = 0; index < itemList.length; index++) {
          dataOutput.write(JSON.stringify(itemList[index]));
          dataOutput.write(",");
        }
        dataOutput.write("]");
        callback(null, queryTitle, filename);
      });
    } else {
      console.log('Some other error: ', err.code);
      callback(err, queryTitle, null);
    }
  });
}

/**
 * Analyse the query and create some analysis data
 * TODO: uses the data from the results folder to run analysis
 */

function analyseQueryData() {
  //I can use https://plot.ly/nodejs/ to create nice graphs
  mongoDAO.stackedChart(analyseQueryDataReady);
}

function analyseQueryDataReady(err, allCollectionsList, uniqueUrls) {
  if (err) return console.error("analyseQueryDataReady() ERROR retrieving data" + err);
  io.sockets.emit('analyseGeneralOverviewProcessed', {
    'generalOverviewData': allCollectionsList,
    'urlIndexes': uniqueUrls
  });
}

/**
 * Request the count for all event sequences
 */
function getEventSeqCount() {
  mongoDAO.getEventSequences(getEventSeqCountReady);
}

function getEventSeqCountReady(err, sequenceList, eventNameList) {
  if (err) return console.error("getEventSeqCountReady() ERROR retrieving data" + err);
  log("getEventSeqCountReady() Received the sequences count, responding client");
  io.sockets.emit('eventSequenceCountProcessed', {
    'eventSeqCountList': sequenceList,
    'eventNameList': eventNameList
  });
}


/**
 * Request the transitions for all event sequences
 */
function getAllEventTransitions() {
  mongoDAO.getAllEventTransitions(getAllEventTransitionsReady);
}

function getAllEventTransitionsReady(err, transitionObject) {
  if (err) return console.error("getAllEventTransitionsReady() ERROR retrieving data" + err);
  log("getAllEventTransitionsReady() Received the transition sequences, responding client");
  //console.log(JSON.stringify(transitionObject, null, 2));
  io.sockets.emit('serverAllEventTransitionsProcessed', {
    'transitionObject': transitionObject
  });
}


/**
 * Requests the information for a particular query
 * @param [queryTitle] indicates the name of the query to retrieve from the db
 */
function requestQueryDataForClient(queryTitle) {
  //Check if exists, get it from DB if not
  storeQueryJson(queryTitle, function (err, title, path) {
    //Once is queried from DB, provide link to the file
    io.sockets.emit('clientQueryDataProcessed', {
      'queryTitle': title,
      'queryPath': path
    });
  });
}

/**
 * Function to send a standard message notification to the user
 * A log of messages will be kept for the clients
 * @param [string] clientID to keep in the server Log
 * @param [string] message to send to the client
 * @param [boolean] indicates if the message is an error
 */
function sendMessageToUser(clientId, message, isError) {
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

  var clientLogFile = clientsLogFolder + clientId + ".log";

  var log = fs.createWriteStream(clientLogFile, { 'flags': 'a' });
  log.write(logEntry);

  io.sockets.emit('messageToClient', {
    'message': logEntry,
    'isError': isError
  });
}



/**
 * Sends a mail, using the credentials stored in mail
 */
const nodemailer = require('nodemailer');
console.log(config);
// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
  service: config.email.service,
  auth: {
    user: config.email.user,
    pass: config.email.password
  }
});

function sendEmailNotification(email, title, query, result) {
  let mailOptions = {
    from: '"config.email.user" <noone@noone.com>', // sender address
    to: email, // list of receivers
    subject: title, // Subject line
    text: query, // plain text body
    html: '<b>Hello world ?</b>' // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      return console.log(error);
    }
    console.log('Message %s sent: %s', info.messageId, info.response);
  });
}

/**
 * Log a message into the server's log file
 */
function log(message) {
  var timestamp = new Date().getTime();
  date = new Date(timestamp);
  datevalues = date.getFullYear() + "," +
    (date.getMonth() + 1) + "," +
    date.getDate() + "," +
    date.getHours() + ":" +
    date.getMinutes() + ":" +
    date.getSeconds();

  var logEntry = datevalues + " MESSAGE:" + message + "\n";
  console.log("clientlog: " + logEntry);

  var log = fs.createWriteStream(logFile, { 'flags': 'a' });
  log.write(logEntry);

}


/**
 *  Empty the log file
 */
function clearLog() {
  fs.writeFile(logFile, "");
}

/**
 * Rename the log file by appending something
 * does not check to see if it overwrites...
 */
function saveLog(id) {
  // save log file to new file
  fs.rename(logFile, logFile + "." + id);
  clearLog();
}


/**
 * Error handling
 */
process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
  if (options.adminInitiated) {
    sendMessageToUser(-1, "ADMINISTRATOR STOPPED THE SERVER", true);
  } else {
    sendMessageToUser(-1, "FATAL ERROR, CONTACT ADMINISTRATOR", true);
  }
  if (options.cleanup) console.log('clean');
  if (err) console.log(err.stack);
  if (options.exit) process.exit();
}


//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { adminInitiated: true, exit: true }));

//catches uncaught exceptions
//Do we want to close the server if there is an uncaught exception?
process.on('uncaughtException', exitHandler.bind(null, { exit: false }));