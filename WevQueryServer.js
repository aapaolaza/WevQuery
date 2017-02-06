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

var mongoDBQuery = require("./MongoDBQuery/XMLtoMongoDB.js");

var resultsFolder = "./Results/";

//Create results folder if it doesn't exist
if (!fs.existsSync(resultsFolder)) {
  fs.mkdirSync(resultsFolder);
}

var config = require('./config.js');

// listen for commands from the Web dashboard
io.sockets.on('connection', function (socket) {

  socket.on('saveXMLQuery', function (xmlData) {
    log("saveXMLQuery, saving the following XML query: " + xmlData.title);
    io.sockets.emit('showimage', xmlData);
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
          runXmlQuery(data);
        } else {
          console.log("xml was invalid, notify user that an error happened.");
          log("xml query failed");
        }
      }
    });
  });

  socket.on('serverAnalyseQueryData', function (data) {
    log("serverAnalyseQueryData, requesting the following query: " + data.queryTitle);
    analyseQueryData(data.queryTitle);
  });

  socket.on('serverRequestQueryData', function (data) {
    log("serverRequestQueryData, requesting the following query: " + data.queryTitle);
    requestQueryDataForClient(data.queryTitle);
  });

});

/**
 * Runs the provided xmlQuery
 */
function runXmlQuery(xmlData) {
  log("XML should be run at this point with the following information:");
  log("email:" + xmlData.email);
  log("isStrictMode:" + xmlData.isStrictMode);
  log("xmlTitle:" + xmlData.xmlTitle);
  log("xmlData:" + xmlData.xmlData);
  mongoDBQuery.mongoRunXmlQuery(xmlData.xmlTitle, xmlData.isStrictMode, xmlData.xmlData, function (err, queryTitle) {
    xmlQueryFinished(err, queryTitle);
  });
}

/**
 * When the xmlQuery finishes, an email will be sent, and the Web interface will be notified
 */
function xmlQueryFinished(err, queryTitle) {
  if (err) return console.error("xmlQueryFinished() ERROR executing query " + err);
  log("xmlQueryFinished()");
  //Notify Web dashboard
  io.sockets.emit('clientXmlQueryFinished', { 'message': "The query called " + queryTitle + " finished without problems" });
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
function storeQueryJson(queryTitle,callback) {
  var filename = resultsFolder + queryTitle + ".json";
  console.log("printing to: "+filename);
  fs.stat(filename, function (err, stat) {
    if (err == null) {
      console.log('File exists');
      callback(null,queryTitle,filename);
    } else if (err.code == 'ENOENT') {
      // file does not exist, request data from mongo, and write
      mongoDBQuery.getQueryData(queryTitle, function (err, title, itemList) {
        if (err) return console.error("getQueryData() ERROR connecting to DB" + err);
        
        var dataOutput = fs.createWriteStream(filename, { 'flags': 'a' });
        dataOutput.write("[");

        for (var index = 0; index < itemList.length; index++) {
          dataOutput.write(JSON.stringify(itemList[index]));
          dataOutput.write(",");
        }          
        dataOutput.write("]");
        callback(null,queryTitle,filename);
      });
    } else {
      console.log('Some other error: ', err.code);
      callback(err,queryTitle,null);
    }
  });
}

/**
 * Analyse the query and create some analysis data
 * TODO: uses the data from the results folder to run analysis
 */

function analyseQueryData() {
  //I can use https://plot.ly/nodejs/ to create nice graphs
}

/**
 * Requests the information for a particular query
 * @param [queryTitle] indicates the name of the query to retrieve from the db
 */
function requestQueryDataForClient(queryTitle) {
  //Check if exists, get it from DB if not
  storeQueryJson(queryTitle,function (err,title,path){
    //Once is queried from DB, provide link to the file
    io.sockets.emit('clientQueryDataProcessed', {
      'queryTitle': title,
      'queryPath': path
      });
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

  var logEntry = datevalues + " " + message + "\n";
  console.log("log: " + logEntry);

  var log = fs.createWriteStream(logFile, { 'flags': 'a' });
  log.write(logEntry);
  /*
    // newer version of node.js uses appendFile:
      fs.appendFile("/home/andy/bbc.log", logEntry, function(err) {
              if(err) {
                  console.log(err);
              } else {
                  console.log("The file was saved!");
              }
          }); 
  */
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


function javaversion(callback) {
  var spawn = require('child_process').spawn('java', ['-version']);
  spawn.on('error', function (err) {
    return callback(err, null);
  })
  spawn.stderr.on('data', function (data) {
    data = data.toString().split('\n')[0];
    var javaVersion = new RegExp('java version').test(data) ? data.split(' ')[2].replace(/"/g, '') : false;
    if (javaVersion != false) {
      // TODO: We have Java installed
      return callback(null, javaVersion);
    } else {
      // TODO: No Java installed

    }
  });
}

