"use strict";//necessary for old NODE versions. otherwise some functions will not work

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

const port = 2929;
var logFile = "./wevQuery.log";

var connect = require('connect');
var serveStatic = require('serve-static');

var server = connect().use(serveStatic(__dirname)).listen(port, function () {
  console.log('WevQuery Server running on ' + port + '...');
});

var io = require('socket.io').listen(server);
var socketConnection = io.sockets;
//var socket = io.connect();
var fs = require('fs');
var exec = require('child_process').exec;
var path = require('path');
var url = require("url");

var mongoDAO = require("./mongoDAO/mongoDAO.js");

var resultsFolder = "./Results/";

//Create results folder if it doesn't exist
if (!fs.existsSync(resultsFolder)) {
  fs.mkdirSync(resultsFolder);
}

var emailConfig = require('./emailConfig.js');

var socketGeneric = require("./socketHandlers/socketGeneric.js");
var socketXmlQuery = require("./socketHandlers/socketXmlQuery.js");
var socketDataAnalysis = require("./socketHandlers/socketDataAnalysis.js");

// listen for commands from the Web dashboard
socketConnection.on('connection', function (socketInstance) {
  socketXmlQuery.initialiseSockets(mongoDAO,socketGeneric,socketConnection,socketInstance);
  socketDataAnalysis.initialiseSockets(mongoDAO,socketGeneric,socketConnection,socketInstance);
});



/**
 * Sends a mail, using the credentials stored in mail
 */
/*
const nodemailer = require('nodemailer');
console.log(emailConfig);
// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
  service: emailConfig.email.service,
  auth: {
    user: emailConfig.email.user,
    pass: emailConfig.email.password
  }
});

function sendEmailNotification(email, title, query, result) {
  let mailOptions = {
    from: emailConfig.email.user + ' <noone@noone.com>', // sender address
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
*/

/**
 * Log a message into the server's log file
 */
function logText(message) {
  var date = new Date(new Date().getTime());
  var datevalues = date.getFullYear() + "," +
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
    socketGeneric.sendMessageToUser(-1, "ADMINISTRATOR STOPPED THE SERVER", true,socketConnection);
  } else {
    socketGeneric.sendMessageToUser(-1, "FATAL ERROR, CONTACT ADMINISTRATOR", true, socketConnection);
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