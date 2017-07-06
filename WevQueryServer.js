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

//Load libraries
var express = require("express");
var serveStatic = require('serve-static');
var auth = require('basic-auth');

//Load external files
var userCredentials = require('./userCredentials.js');
var socketGeneric = require("./socketHandlers/socketGeneric.js");
var socketXmlQuery = require("./socketHandlers/socketXmlQuery.js");
var socketDataAnalysis = require("./socketHandlers/socketDataAnalysis.js");
var socketDataInfo = require("./socketHandlers/socketDataInfo.js");

//Start Express server
var app = express();
var router = express.Router();

const port = 2929;
var logFile = "./wevQuery.log";

//Start router
var wevqueryRouter = require("./rest/wevqueryRouter.js");
app.use('/wevqueryrest', wevqueryRouter);

console.log(userCredentials.userList);
console.log(userCredentials.email);
console.log(userCredentials);

//Only add authentication if there are users in the list (apart from default, if still there)
if (Object.keys(userCredentials.userList).length > 1
  || (Object.keys(userCredentials.userList).length == 1 && userCredentials.userList["user"] != "password")) {
  app.use(authFunction);
}
else
  console.log("AUTHENTICATION DISABLED");

//Restrict access to specific files and folders
app.all('/mongoDAO/*', function (req,res, next) {
   res.status(403).send({
      message: 'Access Forbidden'
   });
});

app.all('/userCredentials.js', function (req,res, next) {
   res.status(403).send({
      message: 'Access Forbidden'
   });
});

var httpServer = app.use(serveStatic(__dirname)).listen(port, function () {
  console.log('WevQuery Server running on ' + port + '...');
});



var io = require('socket.io')(httpServer);

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


// listen for commands from the Web dashboard
socketConnection.on('connection', function (socketInstance) {
  socketXmlQuery.initialiseSockets(mongoDAO, socketGeneric, socketConnection, socketInstance);
  socketDataAnalysis.initialiseSockets(mongoDAO, socketGeneric, socketConnection, socketInstance, resultsFolder);
  socketDataInfo.initialiseSockets(mongoDAO, socketGeneric, socketConnection, socketInstance);
});

function authFunction(req, res, next) {
  var objUser = auth(req)
  if (objUser === undefined || userCredentials.userList[objUser.name] !== objUser.pass) {
    res.set("WWW-Authenticate", "Basic realm=Authorization Required")
    res.status(401).end()
  } else { next() }
}




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
    socketGeneric.sendMessageToUser(-1, "ADMINISTRATOR STOPPED THE SERVER", true, socketConnection);
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