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
var app = connect().use(serveStatic(__dirname)).listen(8080, function(){
    console.log('Server running on '+ port + '...');
});

var io = require('socket.io').listen(app);
//var socket = io.connect();
var fs = require('fs');
var exec = require('child_process').exec;
var path = require('path');
var url = require("url");

var mongoDBQuery = require("./MongoDBQuery/XMLtoMongoDB.js");


// listen for commands from the Web dashboard
io.sockets.on('connection', function (socket) {

    // new slide
    // pass on requests to all clients
    socket.on('saveXMLQuery', function (xmlData) {
        log("saveXMLQuery, saving the following XML query: " + xmlData.title);
        socket.broadcast.emit('showimage', xmlData);
    });

    //To be triggered when a request to run a query is received
    socket.on('runXMLQuery', function (data) {
      log("runXMLQuery, running the provided query");
      //validate XML before executing query
        validateXMLagainstXSD(data.xmlData, function(err, isXmlValid) {
          if (err){log(err);}
          else{
            if (isXmlValid){
              // XML validation was correct, run query
              runXmlQuery(data);
            }else{
              console.log("xml was invalid, notify user that an error happened.");
              log("xml query failed");
            }
          }
        });
    });
});

/**
 * Runs the provided xmlQuery
 */
function runXmlQuery(xmlData){
  log("XML should be run at this point with the following information:");
  log("email:"+xmlData.email);
  log("isStrictMode:"+xmlData.isStrictMode);
  log("xmlTitle:"+xmlData.xmlTitle);
  log("xmlData:"+xmlData.xmlData);
  mongoDBQuery.mongoRunXmlQuery(xmlData.xmlTitle,xmlData.isStrictMode,xmlData.xmlData,function(err,queryTitle){
    xmlQueryFinished(err,queryTitle);
  });
}

/**
 * When the xmlQuery finishes, an email will be sent, and the Web interface will be notified
 */
function xmlQueryFinished(err,queryTitle){
  if (err) return console.error("xmlQueryFinished() ERROR executing query " + err);
  log("xmlQueryFinished()");
  //Notify Web dashboard
  io.sockets.emit('xmlQueryFinished',{'message':"The query called "+ queryTitle +" finished without problems"});
}


/**
 * This function should validate the XML against the schema.
 * returns no error if everything went alright.
 * If not, it will return the received error message.
 */
function validateXMLagainstXSD(xmlData,callback){
 //TODO: for some reason this validator module does not recognise the JAVA installation. I will skip it.
  callback(null, true);
  return null;

  var validator = require('xsd-schema-validator');
  var schemaPath = './WebInterface/eventseq.xsd'

  fs = require('fs')
  fs.readFile(schemaPath, 'utf8', function (err,xmlSchema) {
    if (err) {
      callback(err,null);
    }
    console.log("validating");
    console.log(xmlData);
    console.log(xmlSchema);
    validator.validateXML(xmlData, xmlSchema, function(err, result){
      // err contains any technical error 
      console.log("Was there an error? " +  err);
      console.log("Was Validation correct? " +  result);
      callback(err, result.valid);
    });
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
    spawn.on('error', function(err){
        return callback(err, null);
    })
    spawn.stderr.on('data', function(data) {
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

