var constants = require("./MapReduceConstantsNode.js");
var MongoClient = require('mongodb').MongoClient
  , Server = require('mongodb').Server;

//This tag can be found in the "msg" field in the current ops command of MapReduce commands
var mapReduceTag = "m/r";
var xmlQueryCatalog = "xmlQueryCatalog"
var queryCollectionPrefix = "xmlQuery_"

function addNewQueryDocument(queryTitle){
  var opid ="";
  var timerunning=-1;
  constants.connectAndValidateNodeJs(function (err, db) {
    //the following is equivalent to db.currentOp() in the shell
    db.eval("return db.currentOp()",function (err, opList) {
      console.log('currentOp',err,opList);
      opList.inprog.forEach(function (opObject, index) {       
        //From the queries being executed, find the one running on 
        //ucivitdb with the smallest time
        if(opObject.ns.indexOf(constants.mongoQueryDB)>-1 &&
          opObject.msg.substring(0,mapReduceTag.length) == mapReduceTag){
          //we found an operation running on the ucivitdb database
          console.log(opObject.opid + " has been running for " + opObject.secs_running
          + "secs and " + opObject.microsecs_running + "microsecs");
          if (timerunning == -1){
            opid = opObject.opid;
            timerunning = opObject.microsecs_running;
          }
          else if (opObject.microsecs_running<timerunning){
            console.log("found a more recent query");
            opid = opObject.opid;
            timerunning = opObject.microsecs_running;
          }
        }
      });
      if (timerunning!=-1){
        console.log("The last query to be executed was: " + opid + ", storing it to the database");
        
        var document = {title:queryTitle,
                        collectionName:queryCollectionPrefix+queryTitle,
                        operationID:opid,
                        datems:new Date().getTime(),
                        readableDate:new Date().toISOString()};
        db.collection(xmlQueryCatalog).insert(document, {w: 1}, function(err, records){
          if (err) return console.error("addNewQueryDocument() ERROR INSERTING QUERY DOCUMENT " + err);
          else console.log ("new query document stored correctly");
        });
      }
      else
        console.log("No query was found");
    });
  });
}
addNewQueryDocument("random");
return;