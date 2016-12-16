/**
 * Simple Web server for testing purposes
 * 1. install serve-static 
 *   npm install connect serve-static
 * 2. Run node js with this file
 *   node server.js
 * 3. http://localhost:8080/
 */
var connect = require('connect');
var serveStatic = require('serve-static');
connect().use(serveStatic(__dirname)).listen(8080, function(){
    console.log('Server running on 8080...');
});