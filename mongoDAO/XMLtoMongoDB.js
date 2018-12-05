//2017-06-12 17:45:34
//Created as a node js script. Run:
//npm install mongodb --save
//https://www.npmjs.com/package/xpath
//npm install xpath
//npm install xmldom
//npm install yargs
//To run the script:
//node XMLtoMongoDB.js --file filename.xml [--strictMode]

//Remember to start the mongo Server
//mongod --rest --bind_ip 127.0.0.1
//The rest option enables the Web log interface:
//http://localhost:28017/

//Old dependencies
//I was using the following to convert the xml into a JS object (and then into JSON) but I don't need it
//npm install xml2js //https://www.npmjs.com/package/xml2js
//https://www.npmjs.com/package/json-query



//////We need to load the constants file
var constants;
var mongoLog;

function setConstants(mapReduceConstants, mongoLogConstants) {
  constants = mapReduceConstants;
  mongoLog = mongoLogConstants;
}


var xpath = require('xpath')
  , dom = require('xmldom').DOMParser;
var async = require('async');



//This prefix will be added to all queries
var queryCollectionPrefix = "xmlQuery_";
var queryCollectionTempPrefix = "temp_xmlQuery_";


//This command gives the nodelist the functionality to use "forEach"
//From http://stackoverflow.com/questions/24775725/loop-through-childnodes
//NodeList.prototype.forEach = Array.prototype.forEach


//true if the file was run via command line "node ./XMLtoMongoDB.js"
if (require.main === module) {
  //Variables I need for the MapReduce function
  var mapReduceVars = {};
  mapReduceVars.eventList = "";
  mapReduceVars.userList = "";
  mapReduceVars.db = "";
  mapReduceVars.isQueryStrict = false;
  //bannedIPlist is provided by MapReduceConstants
  var xmlDoc;

  console.log("Running XMLtoMongoDB function at:" + datestamp());
  //yargs eases the step of retrieving parameters from the command line
  // Make sure we got a filename on the command line.
  var argv = require('yargs')
    .usage('Usage: $0 --file [filename.xml] --strictMode')
    .demandOption(['file'])
    .argv;
  console.log("All params right, carry on");
  //if --strictMode is not set, the following variable will be "undefined"
  if (argv.strictMode)
    mapReduceVars.isQueryStrict = true;
  console.log("StrictMode is " + mapReduceVars.isQueryStrict);

  //Start the xml Loading
  loadXml(argv.file, function (err, data) {
    if (err) return console.error('There was an error loading the XML', err);
    xmlDoc = data;
    //If the command is launched from the console, the title is set to the filename
    mapReduceVars.title = queryCollectionPrefix + argv.file.split(".")[0];
    //notify user of the error, or the result of the query
    prepareXml(xmlDoc, mapReduceVars, function (err, data) {
      //notify user of the error, or the result of the query
      console.log("Execution ended");
    });
  });
}
else {
  var path = require('path');
  var filename = path.basename(__filename);
  console.log(filename + " correctly loaded at " + datestamp());
}


/**
 * Given a query title, retrieves all the documents from the corresponding collection, and calls the given callback
 * function providing chunks of the resulting data
 * @param [queryTitle] the title of the query to store
 * @param [callback] The callback needs to follow this structure(err,title,item,isStillFinished);
 */

function getXmlQueryData(queryTitle, callback) {

  var collectionTitle = queryCollectionPrefix + queryTitle;

  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("getXmlQueryData() ERROR connecting to DB" + err);
    console.log("getXmlQueryData() Successfully connected to DB");

    // Does the corresponding collection exist?
    db.listCollections({ name: collectionTitle }).toArray(function (err, items) {
      if (err) return console.error("getXmlQueryData() ERROR REQUESTING COLLECTION" + err);
      if (items.length == 1) {
        //Collection exists, query its elements
        //var cursor =
        db.collection(collectionTitle).find({ "value.xmlQueryCounter": { $gt: 0 } }).toArray(function (err, documents) {
          console.log("printing results");
          console.log("Returning " + documents.length + " items");
          callback(null, queryTitle, documents);
        });
      }
      else {
        //Collection doesn't exist, return an error
        return console.error("getXmlQueryData() requested query doesn't exist:" + queryTitle);
      }
    });
  });
}

/**
 * Given a temporary query title, retrieves all the documents from the corresponding collection,
 * and calls the given callback function providing chunks of the resulting data
 * @param [queryCollName] the name of the collection where the query restuls are
 * @param [callback] The callback needs to follow this structure(err,title,item,isStillFinished);
 */

function getXmlQueryDataByCollection(queryCollName, callback) {

  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("getTempXmlQueryData() ERROR connecting to DB" + err);
    console.log("getTempXmlQueryData() Successfully connected to DB");

    // Does the corresponding collection exist?
    db.listCollections({ name: queryCollName }).toArray(function (err, items) {
      if (err) return console.error("getTempXmlQueryData() ERROR REQUESTING COLLECTION" + err);
      if (items.length == 1) {
        //Collection exists, query its elements
        //var cursor =
        db.collection(queryCollName).find({ "value.xmlQueryCounter": { $gt: 0 } }).toArray(function (err, documents) {
          console.log("printing results");
          console.log("Returning " + documents.length + " items");
          callback(null, queryCollName, documents);
        });
      }
      else {
        //Collection doesn't exist, return an error
        return console.error("getTempXmlQueryData() requested query doesn't exist:" + queryCollName);
      }
    });
  });
}

/**
 * Deletes the collection with the data for the given query title
 */
function deleteResultCollection(queryTitle, callback) {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("deleteResultCollection() ERROR connecting to DB" + err);
    db.collection(queryCollectionPrefix + queryTitle).drop(function (err, result) {
      if (err) {
        console.log(err);
      }
      callback(null);
    });
  });
}

/**
 * Deletes the temporal collection with the data for the given temporal query title
 * It checks that the given collection name starts with temp, to prevent accidental deletions
 */
function deleteTempResultCollection(queryCollName, callback) {
  console.log(queryCollName);
  if (!queryCollName.indexOf(queryCollectionTempPrefix) == 0)
    return console.error("collection name " + queryCollName + " is not a temporal collection" + err);

  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("deleteTempResultCollection() ERROR connecting to DB" + err);
    db.collection(queryCollName).drop(function (err, result) {
      if (err) {
        console.log(err);
      }
      callback(null);
    });
  });
  //deleteAllTempResultCollections();
}

function deleteAllTempResultCollections() {
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("deleteAllTempResultCollections() ERROR connecting to DB" + err);

    db.listCollections().toArray(function (err, collInfos) {
      // collInfos is an array of collection info objects that look like:
      // { name: 'test', options: {} }
      collInfos.forEach(function (collObject, index) {
        if (collObject.name.indexOf(queryCollectionTempPrefix) == 0) {
          console.log("Found temporal collection, DELETING");
          console.log(collObject);
          db.collection(collObject.name).drop(function (err, result) {
            if (err) {
              console.log(err);
            }
          });
        }
      });
    });
  });
}

/**
 * Callback for when the query is completed
 *
 * @callback runXmlQueryCallback
 * @param {err} err
 * @param {string} title of the query that has completed
 */

/**
 * Callback for when the query has been succesfully started
 * This callback is optional, and will be replaced with null if not provided
 *
 * @callback afterQueryStarts
 * @param {err} err
 * @param {string} title of the query that has completed
 * @param {string} xmlQuery string containing the xml query to run
 */

/**
 * Runs the provided xmlQuery. Accessible from the WevQueryServer
 * @param {string} title of the query, the results will be stored in a collection of the same name
 * @param {string} xmlQuery string containing the xml query to run
 * @param {object} queryOptions various options to be applied to the query.
 * @param {runXmlQueryCallback} callback to call when completed
 * @param {afterQueryStarts} callback to call as soon as the query has been succesfully started
 */
function runXmlQuery(title, xmlQuery, queryOptions, endCallback, launchedCallback) {

  //I am not sure if this assignment is necessary. Can I just pass "undefined" variables over?
  //The test for the validity of the callback will be done before calling it
  var launchedCallback = typeof launchedCallback !== 'undefined' ? launchedCallback : null;

  xmlDoc = new dom().parseFromString(xmlQuery);

  var mapReduceVars = {};
  mapReduceVars.eventList = "";
  mapReduceVars.db = "";
  mapReduceVars.title = title;
  mapReduceVars.dbTitle = queryCollectionPrefix + title;
  mapReduceVars.isTemp = false;

  //parse the options object
  //Check if the option exist in the provided object, if not, set to default.
  mapReduceVars.isQueryStrict = typeof queryOptions.isQueryStrict !== 'undefined' ?
    queryOptions.isQueryStrict : false;
  mapReduceVars.startTimems = typeof queryOptions.startTimems !== 'undefined' ?
    queryOptions.startTimems : null;
  mapReduceVars.endTimems = typeof queryOptions.endTimems !== 'undefined' ?
    queryOptions.endTimems : null;
  mapReduceVars.userList = typeof queryOptions.userList !== 'undefined' ?
    queryOptions.userList : null;

  prepareXml(xmlQuery, xmlDoc, mapReduceVars, endCallback, launchedCallback);
}

/**
 * Runs the provided xmlQuery, and stores it in a temporary collection. Accessible from the WevQueryServer
 * @param {string} title of the query, the results will be stored in a collection of the same name
 * @param {string} xmlQuery string containing the xml query to run
 * @param {object} queryOptions various options to be applied to the query.
 * @param {runXmlQueryCallback} callback to call when completed
 * @param {afterQueryStarts} callback to call as soon as the query has been succesfully started
 */
function runXmlTempQuery(title, xmlQuery, queryOptions, endCallback, launchedCallback) {

  //I am not sure if this assignment is necessary. Can I just pass "undefined" variables over?
  //The test for the validity of the callback will be done before calling it
  var launchedCallback = typeof launchedCallback !== 'undefined' ? launchedCallback : null;

  xmlDoc = new dom().parseFromString(xmlQuery);

  var mapReduceVars = {};
  mapReduceVars.eventList = "";
  mapReduceVars.db = "";
  mapReduceVars.title = title;
  mapReduceVars.dbTitle = queryCollectionTempPrefix + title + "_" + new Date().getTime();
  mapReduceVars.isTemp = true;

  //parse the options object
  //Check if the option exist in the provided object, if not, set to default.
  mapReduceVars.isQueryStrict = typeof queryOptions.isQueryStrict !== 'undefined' ?
    queryOptions.isQueryStrict : false;
  mapReduceVars.startTimems = typeof queryOptions.startTimems !== 'undefined' ?
    queryOptions.startTimems : null;
  mapReduceVars.endTimems = typeof queryOptions.endTimems !== 'undefined' ?
    queryOptions.endTimems : null;
  mapReduceVars.userList = typeof queryOptions.userList !== 'undefined' ?
    queryOptions.userList : null;
  mapReduceVars.url = typeof queryOptions.url !== 'undefined' ?
    queryOptions.url : null;

  prepareXml(xmlQuery, xmlDoc, mapReduceVars, endCallback, launchedCallback);
}


/**
 * Starting function, that loads the XML from the file system
 */
function loadXml(filename, callback) {

  // Read the file and print its contents.
  var fs = require('fs');
  fs.readFile(filename, 'utf8', function (err, data) {
    if (err) throw err;
    console.log('XML successfully loaded: ' + filename);
    console.log(data);
    xmlDoc = new dom().parseFromString(data);
    callback(null, xmlDoc);
    //var eventListNodes = xpath.select("//eventList", xmlDoc)
  });
}

/**
 * Once the XML is ready, I can read the values, and prepare the MapReduce script
 */
function prepareXml(xmlQuery, xmlDoc, mapReduceVars, endCallback, launchedCallback) {
  mapReduceVars.eventList = xpath.select("//eventList/text()", xmlDoc).toString().split(",");
  mapReduceVars.eventList = uniqueArray(mapReduceVars.eventList);
  console.log(mapReduceVars.eventList);
  //connect to the database
  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("prepareXml() ERROR connecting to DB" + err);
    console.log("prepareXml() Successfully connected to DB");
    mapReduceVars.db = db;
    executeXmlMapReduce(xmlQuery, xmlDoc, mapReduceVars, endCallback, launchedCallback);
  });
}


/**
 * Simple function to act like the "unique" function in Run
 * Takes an array, and returns it without duplicates
 */
function uniqueArray(array) {
  return array.filter(function (value, index, self) {
    return self.indexOf(value) === index;
  });
}


function executeXmlMapReduce(xmlQuery, xmlDoc, mapReduceVars, endCallback, launchedCallback) {

  var startTimems = new Date();

  var eventCollection = mapReduceVars.db.collection(constants.eventCollection);
  //The xml needs to be processed, and transformed into JavaScript objects that MapReduce can process
  var mapReduceXMLQueryObject = parseXMLToMapReduceObject(xmlDoc);
  constants.scopeObject["xmlQueryObject"] = mapReduceXMLQueryObject;
  constants.scopeObject["requiredFieldList"] = retrieveQueriedFields(mapReduceXMLQueryObject);

  constants.scopeObject["isQueryStrict"] = mapReduceVars.isQueryStrict;

  console.log("executeXmlMapReduce() start with the following parameters:");
  console.log("ip: $nin: " + constants.bannedIPlist);
  console.log("event: $in: " + mapReduceVars.eventList);
  console.log("information from events: " + constants.scopeObject["requiredFieldList"]);
  console.log("isQueryStrict: " + constants.scopeObject["isQueryStrict"]);
  console.log("title: " + mapReduceVars.title);
  console.log("collection name: " + mapReduceVars.dbTitle);

  var queryObject = {};
  queryObject.ip = { $nin: constants.bannedIPlist };
  queryObject.event = { $in: mapReduceVars.eventList };
  queryObject.sessionstartms = { "$exists": true };

  if (mapReduceVars.userList) {
    queryObject.sid = { $in: mapReduceVars.userList };
  }

  if (mapReduceVars.url) {
    queryObject.url = mapReduceVars.url;
  }

  if (mapReduceVars.startTimems || mapReduceVars.endTimems) {
    queryObject.timestampms = {};
  }
  if (mapReduceVars.startTimems) {
    queryObject.timestampms.$gte = mapReduceVars.startTimems;
  }
  if (mapReduceVars.endTimems) {
    queryObject.timestampms.$lte = mapReduceVars.endTimems;
  }

  console.log("Query options:")
  console.log(queryObject);

  console.log("_------------------_");

  var value = eventCollection.mapReduce(
    mapFunction.toString(),
    reduceFunction.toString(),
    {
      out: { replace: mapReduceVars.dbTitle },
      query: queryObject,
      //I add a scope with all the required variables.
      scope: constants.scopeObject,
      finalize: finalizeFunction.toString(),
      verbose: true
    },
    function (err, results, stats) {   // stats provided by verbose
      console.log("executeXmlMapReduce() end");

      if (err) {
        mongoLog.logMessage("optime", "mapReduceScript",
          constants.websiteId, "MapReduce failed", startTimems, new Date());

        //if the mapReduce was temporary, delete any results
        if (mapReduceVars.isTemp) {
          mapReduceVars.db.collection(mapReduceVars.dbTitle).drop();
        }
        return console.error("executeXmlMapReduce() ERROR " + err);
      }

      mongoLog.logMessage("optime", "mapReduceScript",
        constants.websiteId, "MapReduce finished successfully", startTimems, new Date());

      console.log(results);
      console.log(stats);
      console.log("Query finished in " + stats.processtime + " ms");
      endCallback(null, mapReduceVars.title, mapReduceVars.dbTitle, stats.processtime);
    }
  );

  //Add a delay to the funcion, as the query will not be available straight away
  if (launchedCallback !== null) {
    setTimeout(function () {
      console.log("calling launchedCallback");
      console.log(mapReduceVars.title);
      console.log(xmlQuery);
      launchedCallback(null, mapReduceVars.title, mapReduceVars.dbTitle, xmlQuery)
    }, 500);
  }
}

/**
 * Given an XML string, it converts it into a JavaScript Object, so the MapReduce query can interpret it
 * @param {string} xmlDoc 
 */
function parseXMLToMapReduceObject(xmlDoc) {
  console.log();

  console.log("Start XML parsing");

  var xmlQueryObject = {};
  xmlQueryObject.eventList = [];
  xmlQueryObject.tempConstrList = [];
  //Each time an event is processed, its index in the query is stored, so it can be retrieved for the corresponding temporal restriction
  var eventIDTable = {};

  //PROCESS XML
  //For each occurrence of event, create an eventQueryObject
  //i.e. if the event has more than one occurrence, create various.
  //WARNING!!! "n" occurrences is not supported at the moment.

  //First event has predecesor null
  currentID = "null";
  //each element in the eventList is an eventQueryObject
  //It will be identified by its index in the query array
  areEventsLeft = true;
  while (areEventsLeft) {
    //Check if exists an event after last one processed (stored at currentID)
    //Instead of the "boolean" function, the length of the response can be checked:
    //if (xpath.select("//event[@pre='" + currentID + "']", xmlDoc).length>0) { 
    if (xpath.select("boolean(//event[@pre='" + currentID + "'])", xmlDoc)) {
      var eventQueryObject = new Object();
      eventQueryObject.nameList = xpath.select("//event[@pre='" + currentID + "']/eventList/text()", xmlDoc).toString().split(",");
      eventQueryObject.occurrences = xpath.select("string(//event[@pre='null']/@occurrences)", xmlDoc);

      //Get the context for that event
      eventQueryObject.context = new Object();
      eventQueryObject.context.typeList = [];
      eventQueryObject.context.valueList = [];

      var context = xpath.select("//event[@pre='" + currentID + "']/context", xmlDoc);
      console.log(context.length + "context elements have been found");

      for (i = 0; i < context.length; i++) {
        eventQueryObject.context.typeList[i] = context[i].getAttributeNode("type").value;
        eventQueryObject.context.valueList[i] = context[i].getAttributeNode("value").value;
      }

      //Modify the context list so it matches the corresponding values in the DB
      eventQueryObject.context = fixContextValues(eventQueryObject.context);

      currentID = xpath.select("string(//event[@pre='" + currentID + "']/@id)", xmlDoc);
      //Keep the index of this event in the table. The '-1' is necessary to obtain the index of the last element
      eventIDTable[currentID] = xmlQueryObject.eventList.push(eventQueryObject) - 1;
      console.log("eventQueryObject with id=" + currentID);
      console.log(eventQueryObject);
      console.log("Adding " + (parseInt(eventQueryObject.occurrences) - 1) + " more events");
      //push as many event copies as the occurrences indicate
      for (i = 0; i < parseInt(eventQueryObject.occurrences) - 1; i++) {
        //LOG 2016-12-16 15:14:12 I cannot see any reason why I need a proper clone
        //a reference will do so the algorithm can abstract itself and just loop through everything
        xmlQueryObject.eventList.push(eventQueryObject);
        console.log(eventQueryObject);
      }
    }
    else
      areEventsLeft = false;
  }
  console.log(xmlQueryObject.eventList.length + " eventQueryObjects were added to the list");
  console.log(xmlQueryObject);

  //temporal restriction list will be created taking into account the index position of the event that they involve
  var tempRestrObject = {};
  //2 event references, which will be set to the corresponding index
  tempRestrObject.eventRef1;
  tempRestrObject.eventRef2;
  tempRestrObject.type;
  //The unit will be used to transform the given time value to ms.
  tempRestrObject.value;

  var tempRestrNodeList = xpath.select("//temporalconstraint", xmlDoc)
  tempRestrNodeList.forEach(function (tempRestrNode, index) {

    tempRestrObject = new Object();
    tempRestrObject.type = tempRestrNode.getAttribute("type");

    if (tempRestrNode.getAttribute("unit") == "sec")
      tempRestrObject.value = tempRestrNode.getAttribute("value") * 1000;
    else if (tempRestrNode.getAttribute("unit") == "min")
      tempRestrObject.value = tempRestrNode.getAttribute("value") * 60 * 1000;
    else
      interruptExecution("parseXMLToMapReduceObject(): ERROR WITH THE UNIT VALUE OF TEMPORAL CONSTRAINT");

    //retrieve the event Ids for the temp constraints, and check the constructed table for the corresponding indexes
    var eventRef = tempRestrNode.getElementsByTagName('eventref');
    console.log("tempRestrObject with index=" + index);
    console.log("eventRef1 is " + eventRef[0].getAttribute("id") + " which can be found in the following array:");
    console.log(eventIDTable);

    tempRestrObject.eventRef1 = eventIDTable[eventRef[0].getAttribute("id")];
    tempRestrObject.eventRef2 = eventIDTable[eventRef[1].getAttribute("id")];
    console.log("tempRestrObject contains a restriction involving indexes " + tempRestrObject.eventRef1 + ", and " + tempRestrObject.eventRef2);
    console.log(tempRestrObject);
    xmlQueryObject.tempConstrList.push(tempRestrObject);
  });

  return xmlQueryObject;
}

/**
 * Given an object with a list of types and values, fixes the
 * context list so it matches the corresponding values in the db
 * Needs to be kept up to date with the schema
 * @param {Object} contextList 
 */
function fixContextValues(contextInfo) {
  //XML schema to be used to read the possible context values
  //For the time being, we will use a hardcoded list of the values that need processing
  //it will be hardcoded anyway in order to give each context a different treatment
  for (i = 0; i < contextInfo.typeList.length; i++) {
    switch (contextInfo.typeList[i]) {
      case "NodeID":
        contextInfo.typeList[i] = "node.id";
        break;
      case "NodeClass":
        contextInfo.typeList[i] = "node.class";
        break;
      case "NodeType":
        contextInfo.typeList[i] = "node.type";
        contextInfo.valueList[i] = contextInfo.valueList[i].toUpperCase();
        break;
      case "NodeDom":
        contextInfo.typeList[i] = "node.dom";
        break;
      case "NodeImg":
        contextInfo.typeList[i] = "node.img";
        break;
      case "NodeLink":
        contextInfo.typeList[i] = "node.link";
        break;
      case "NodeTextContent":
        contextInfo.typeList[i] = "node.textContent";
        break;
      case "NodeTextValue":
        contextInfo.typeList[i] = "node.textValue";
        break;
      case "URL":
        contextInfo.typeList[i] = "url";
        break;
      case "ScrollState":
        //This context will require more work, and can only be done live.
        break;
      default:
        break;
    }
  }
  console.log("fixContextValues(): context values have been adapted");
  console.log(contextInfo);

  return (contextInfo);
}

/**
 * Given an XML query transformed into JavaScript object, it retrieves the fields necessary to run the query.
 * Alternatively, this function could be modified to use the original XML and query all "context" nodes
 * @param {Object} mapReduceXMLQueryObject 
 */
function retrieveQueriedFields(mapReduceXMLQueryObject) {
  //fields that are required for the MapReduce
  var requiredFieldList = ["_id", "sd", "sid", "timestampms", "event", constants.episodeField];

  //Additional fields to support the MapReduce query
  mapReduceXMLQueryObject.eventList.forEach(function (eventObject, index) {
    //CAUTION the context is not actually a list, but an object that contains a list of type and value
    eventObject.context.typeList.forEach(function (contextTypeField, index) {
      if (requiredFieldList.indexOf(contextTypeField) == -1)
        requiredFieldList.push(contextTypeField);

    });
  });
  return requiredFieldList;
}

/**
 * This function filters out all unwanted events.
 * It gets executed for each object, and gives access to internal variables via "this".
 **/
function mapFunction() {
  /* 
    I am still not sure why, but accessing this with a variable returns undefined
    this[requiredField] where requiredField="event" won't work, but this["event"] will
    Instead, use eventToEmit as a copy of "this"
  */
  var eventToEmit = this;

  /*
   * "emit" function takes two arguments: 1) the key on which to group the data, 2) data itself to group. Both of them can be objects ({this.id, this.userId},{this.time, this.value}) for example
   */

  var emitData = {};

  requiredFieldList.forEach(function (requiredField, index) {
    //is the requiredField a nested field? if so the nesting needs to be tackled.
    if (requiredField.indexOf(".") > -1) {
      var mainField = requiredField.split(".")[0];
      var nestedField = requiredField.split(".")[1];

      //Only emit this field if the event contains it
      if (eventToEmit[mainField]) {
        var contentToEmit = eventToEmit[mainField][nestedField];

        //check again if the nested field exists
        if (contentToEmit) {
          //Does the nested field contain additional nest levels AND the field still exists?
          //If so, go down another level
          while (contentToEmit && nestedField.indexOf(".") > -1) {
            nestedField = nestedField.split(".")[1];
            contentToEmit = contentToEmit[nestedField];
          }
          //final check, only emit if field exists
          if (contentToEmit) {
            emitData[requiredField] = contentToEmit;
          }
        }
      }
    }
    else
      emitData[requiredField] = eventToEmit[requiredField];
  });


  //emit({sid:this.sid, sessionstartms:this.sessionstartms, url:this.url, urlSessionCounter:this.urlSessionCounter},
  emit({ sid: this.sid, url: this.url, episodeCount: this[episodeField] },
    {
      "episodeEvents":
        [
          emitData
        ]
    }
  );
  //}
}



/**
 *
 * Aggregates different values for each given key. It will take each key, and all the values from Map step, and process them one by one.
 * It takes two parameters: 1) Key 2) array of values (number of values outputted from Map step)
 * Reduce function should just put values in the same list, as it doesn't have access to "all" data, only to a certain batch
 
 */
function reduceFunction(key, values) {
  var reduced = { "episodeEvents": [] };
  for (var i in values) {
    var inter = values[i];
    for (var j in inter.episodeEvents) {
      reduced.episodeEvents.push(inter.episodeEvents[j]);
    }
  }
  return reduced;
}

/**
 * Same as reduceFunction, but after the first value, it will strip down all unnecessary data.
 * All necessary data has been stored in scope["requiredFieldList"] by retrieveQueriedFields)=
 */
function skinnyReduceFunction(key, values) {

  var reduced = { "episodeEvents": [] };
  for (var i in values) {
    var inter = values[i];
    for (var j in inter.episodeEvents) {
      //for all elements except the first one
      //if (reduced.episodeEvents.length > 1) {
      for (var fieldIndex in reduced.episodeEvents[j]) {
        if (requiredFieldList.indexOf(fieldIndex) == -1) {
          delete inter.episodeEvents[j][fieldIndex];
        }
      }
      //}
      reduced.episodeEvents.push(inter.episodeEvents[j]);
    }
  }
  return reduced;
}


/**
 * This function is called at the end, with the reduced values for each "key" object.
 * This is the function that has access to ALL data, and this is the step in which events can be ordered and processed
 */
function finalizeFunction(key, reduceOutput) {

  //////////////////////////START OF Auxiliary Functions/////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////
  /**
  * We need our own compare function in order to be able to sort the array according to the timestamp
  */
  function compare(objectA, objectB) {

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

  /**
   * Function to compare nodeInfos
   * My first approach was going to be the following, but I think using this function is more secure
   * if (JSON.stringify(currentEvent.nodeInfo) == JSON.stringify(this.lackOfMousePrecisionList[i].nodeInfo)){
   */
  function getNodeInfo(node) {
    return ("NodeInfo [nodeId=" + node.id + ", nodeName=" + node.name
      + ", nodeDom=" + node.dom + ", nodeImg=" + node.img
      + ", nodeLink=" + node.link + ", nodeText=" + node.text
      + ", nodeType=" + node.type + ", nodeTextContent="
      + node.textContent + ", nodeTextValue=" + node.textValue + "]");
  }

  /**
 * This function just returns the median of a given array of numbers
 */
  function median(values) {

    values.sort(function (a, b) { return a - b; });

    var half = Math.floor(values.length / 2);

    if (values.length % 2)
      return values[half];
    else
      return (values[half - 1] + values[half]) / 2.0;
  }

  ///////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////END OF Auxiliary Functions/////////////////////////////

  //////////////////////////START OF XML query/////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Constructor for the XmlQuery object.
   * It takes the xmlDoc and initialises all the variables
   */
  function XmlQuery() {

    //Stores the results of the query
    this.xmlQueryList = [];

    //Stores the prospective query results
    this.xmlQueryCandidatesList = [];
  }

  /**
   * For each event, this function is called.
   * It takes the event to be processed and matches it against the list of prospective events.
   * 
   * Algorithm to follow:
   * 
    For each candidate
      If null
        match first event
      If eventIndex > 0 //moving forward in the matching
        if(match [eventIndex]) //processed event matches the corresponding event
          if (Check temporal Constraints) //only if both the event and the temporal constraint match we will pick it
            addEvent
            increase eventIndex
            if (complete match)//Check if the match for the query is done
              Add to completed
              Remove candidate
            else if (impossible match)//Is the match not feasible any more? Check temporal constraints
              Remove candidate
        else
        //If either the matching, or the temporal constraint fails, do nothing, we'll try again with the next event
   */
  XmlQuery.prototype.processEvent = function (currentEvent) {

    var candidatesToRemove = [];
    var xmlQuery = this;
    this.xmlQueryCandidatesList.forEach(function (xmlQueryCandidate, index) {
      var indexToMatch = xmlQueryCandidate.length;
      if (xmlQueryObject.eventList[indexToMatch].nameList.indexOf(currentEvent.event) > -1
        && matchContextInfo(currentEvent, xmlQueryObject.eventList[indexToMatch].context)) {
        currentEvent.contextInfo = {};
        currentEvent.contextInfo.currentEvent = currentEvent[xmlQueryObject.eventList[indexToMatch].context.typeList[0]];
        currentEvent.contextInfo.contextToMatch = xmlQueryObject.eventList[indexToMatch].context.valueList[0];

        //the event matches, add it to the list, and test temporal constraints.
        xmlQueryCandidate.push(currentEvent);

        if (matchTemporalConstraintList(xmlQueryCandidate, xmlQueryObject.tempConstrList)) {
          //Is a match, check if the full query has been matched
          if (xmlQueryObject.eventList.length == xmlQueryCandidate.length) {
            //If it's fully finished, add it to the results list and mark it to be removed.
            xmlQuery.xmlQueryList.push(xmlQueryCandidate);
            candidatesToRemove.push(index);
          }
        }
        else {
          //It's not a match, mark it to be removed
          candidatesToRemove.push(index);
        }

        //Old code, not sure of its use
        //xmlQueryObject.eventList;
        //xmlQueryObject.tempConstrList;

      } else if (isQueryStrict) {
        //The event didn't match!
        //I we need to be strict, this candidate is not valid any longer
        candidatesToRemove.push(index);

      }
    });

    //Remove all non-valid candidates
    while (candidatesToRemove.length) {
      this.xmlQueryCandidatesList.splice(candidatesToRemove.pop(), 1);
    }

    //Compare current event to the first event in the matching list
    if (xmlQueryObject.eventList[0].nameList.indexOf(currentEvent.event) > -1
      && matchContextInfo(currentEvent, xmlQueryObject.eventList[0].context)) {
      //initialise a new candidate
      var candidateObject = [];
      candidateObject.push(currentEvent);

      //is the query looking for sequences formed of a single event?
      //If so, just store it as a match, if not, add it to the candidate list to match further events
      if (xmlQueryObject.eventList.length == 1)
        xmlQuery.xmlQueryList.push(candidateObject);
      else
        this.xmlQueryCandidatesList.push(candidateObject);
    }
  }

  /**
   * Last event for this object. It takes any unfinished candidate and determines if it should be included or not
   */
  XmlQuery.prototype.endBehaviour = function (currentEvent) {

  }

  /**
   * Transforms the array into an object before returning it
   */
  XmlQuery.prototype.outputResult = function () {
    //return ("##OUTPUT: outputting " + this.controlledBehaviourList.length+" elements");
    function toObject(arr) {
      var rv = {};
      for (var i = 0; i < arr.length; ++i)
        rv[i] = arr[i];
      return rv;
    }
    return toObject(this.xmlQueryList);
  }

  /**
   * Tests if the given temporal constraint applies.
   * Returns 1 (true) if applicable, 0 (false) if not.
   * This function takes 2 events and a temporal constraint as parameters, and tests
   * if the temporal constraint is valid.
   * a temporal constraint object is as following:
   * tempRestrObject= {eventRef1, eventRef2, type,value}
   */
  function matchTemporalConstraintList(xmlQueryCandidate, tempConstraintList) {
    //For some reason the forEach loop didn't work. 
    //    tempConstraintList.forEach(function (tempConstraint, index) {
    for (var index = 0; index < tempConstraintList.length; index++) {
      var tempConstraint = tempConstraintList[index];

      //Events are added to the candidates list following the order as in the query
      //Therefore the indexes must match the references initially set in the tempConstraint

      //We only need to test for events that are already included in the candidate.
      //If the length of the candidate is smaller than the index, then it will be ignored
      if (tempConstraint.eventRef1 < xmlQueryCandidate.length &&
        tempConstraint.eventRef2 < xmlQueryCandidate.length) {
        var event1 = xmlQueryCandidate[tempConstraint.eventRef1];
        var event2 = xmlQueryCandidate[tempConstraint.eventRef2];
        var timeDistance = Math.abs(event1.timestampms - event2.timestampms);

        if (tempConstraint.type == "within" && timeDistance > tempConstraint.value)
          return (0);
        else if (tempConstraint.type == "between" && timeDistance < tempConstraint.value)
          return (0);
      }
      //});
    };
    //at this point, all temporal constraints checked out
    return (1);
  }

  function matchContextInfoComplex(currentEvent, contextInfo) {
    var fieldName;
    for (i = 0; i < contextInfo.typeList.length; i++) {
      fieldName = contextInfo.typeList[i];
      //The nested fields need to be tackled in a different way
      if (fieldName.indexOf(".") > -1) {
        var mainField = fieldName.split(".")[0];
        var nestedField = fieldName.split(".")[1];
        var contentToCompare = currentEvent[mainField][nestedField];

        //Does the nested field contain additional nest levels? If so, go down another level
        while (nestedField.indexOf(".") > - 1) {
          nestedField = nestedField.split(".")[1];
          contentToCompare = contentToCompare[nestedField];
        }
        if (contentToCompare != contextInfo.valueList[i])
          return false;
      }
      else if (currentEvent[fieldName] != contextInfo.valueList[i])
        return false;
    }
    return true;
  }

  function matchContextInfo(currentEvent, contextInfo) {
    for (i = 0; i < contextInfo.typeList.length; i++) {
      if (currentEvent[contextInfo.typeList[i]] != contextInfo.valueList[i])
        return false;
    }
    return true;
  }

  ///////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////END OF XML query/////////////////////////////




  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////START OF FUNCTION//////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  var valuesArray = reduceOutput.episodeEvents;

  valuesArraySorted = valuesArray.sort(compare);
  //valuesArraySorted.sort(compare);

  var debugLog = "";

  //Behaviour Objects
  var xmlQuery = new XmlQuery();

  for (var i in valuesArraySorted) {
    valueObject = valuesArraySorted[i];

    xmlQuery.processEvent(valueObject);
  }

  xmlQuery.endBehaviour();

  return {
    xmlQuery: xmlQuery.outputResult(),
    xmlQueryCounter: Object.keys(xmlQuery.outputResult()).length,
    isQueryStrict: isQueryStrict,
    tempConstrList: xmlQueryObject.tempConstrList
  }
}


/**
 * Takes a query title as input, and replaces all the event results with the corresponding
 * data from the database.
 * Is just an interface to feedQueryInformationByCollection()
 * @param {string} queryTitle with the name of the query results to feed back
 */
function feedQueryResultsByTitle(queryTitle, callback) {
  var startTimems = new Date();
  var queryCollName = queryCollectionPrefix + queryTitle;
  feedQueryInformationByCollection(queryCollName, callback);
}

/**
 * Takes a query collection name as input, and replaces all the event results with the corresponding
 * data from the database
 * @param {string} queryTitle with the name of the query results to feed back
 */
function feedQueryInformationByCollection(queryCollName, callback) {
  console.log("Starting the feed of the information");

  var startTimems = new Date();

  constants.connectAndValidateNodeJs(function (err, db) {
    var resultCount = 0;
    //Retrieve all documents with at least one result
    db.collection(queryCollName).find({ "value.xmlQueryCounter": { $gt: 0 } })
      .toArray(function (err, documents) {
        //docElem = documents[0];

        //async.eachLimit(documents, 1,
        async.each(documents,
          function (docElem, callback) {
            updateXmlQueryDocument(docElem, db, queryCollName, callback);
          },
          function (err) {
            if (err) {
              console.error(err.message);
              mongoLog.logMessage("error", "feedQueryResultsInformation",
                constants.websiteId, "feedQueryResultsInformation() failed", startTimems, new Date());
              callback(err);
            }
            else {
              mongoLog.logMessage("optime", "feedQueryResultsInformation",
                constants.websiteId, "feedQueryResultsInformation finished successfully " + queryCollName, startTimems, new Date());

              //Update count, and call parent callback when count reaches end
              resultCount++;
              if (resultCount >= documents.length);
              callback(null);
            }
          });
      });
  });

}

/**
 * Given a xmlQuery result document, augments all the events with information from the main event DB
 * @param {xmlQueryDocument} docElem 
 * @param {mongoDBConnection} db
 * @param {string} queryCollName
 */
function updateXmlQueryDocument(docElem, db, queryCollName, callback) {
  var documentId = docElem._id;
  /*console.log("feedQueryResultsInformation of document:");
  console.log(documentId);*/

  var resultTotal = 0;
  var resultCount = 0;

  //quick loop through the object (no db operations) to count how many elements will be processed.
  for (var xmlQueryIndex in docElem.value.xmlQuery) {
    xmlQueryResult = docElem.value.xmlQuery[xmlQueryIndex];
    xmlQueryResult.forEach(function (eventInQuery, eventIndexInResult) {
      resultTotal++;
    });
  }

  //For each result
  for (let xmlQueryIndex in docElem.value.xmlQuery) {
    xmlQueryResult = docElem.value.xmlQuery[xmlQueryIndex];

    //For each event in the result, retrieve the corresponding information from the database
    xmlQueryResult.forEach(function (eventInQuery, eventIndexInResult) {
      // console.log(`Retrieving information for event: ${eventInQuery._id}`);

      //."toArray()" is necessary so the eventFullInfo is not a cursor, and can be used to update the database directly
      db.collection(constants.eventCollection).find({ _id: eventInQuery._id }).toArray(function (err, eventFullInfo) {
        //Once the event is retrieved, we need to update the correspoding object in the results collection
        //Only one event will match a single ID, get rid of the list
        eventFullInfo = eventFullInfo[0];

        //Create an index so we can access this particular occurrence
        //http://stackoverflow.com/questions/6702450/variable-with-mongodb-dotnotation
        //We are updating the specific use of a particular event inside that collection.
        let xmlQueryEventIndex = {}
        for (objectIndex in docElem._id) {
          xmlQueryEventIndex['_id.' + objectIndex] = docElem._id[objectIndex];
        }

        //xmlQueryEventIndex["value.xmlQuery." + xmlQueryIndex + "._id"] = new constants.mongodb.ObjectID(eventInQuery._id);
        xmlQueryEventIndex["value.xmlQuery." + xmlQueryIndex + "._id"] = eventInQuery._id;
        //I don';t know why using the ID is not working. Testing with other values.
        //xmlQueryEventIndex["value.xmlQuery." + xmlQueryIndex + ".timestampms"] = eventInQuery.timestampms;
        //http://stackoverflow.com/questions/9200399/replacing-embedded-document-in-array-in-mongodb

        let xmlQueryEventUpdatedValue = {};
        xmlQueryEventUpdatedValue["value.xmlQuery." + xmlQueryIndex + ".$"] = eventFullInfo;
        /*
        console.log("Finding ID:");
        console.log(xmlQueryEventIndex);
        console.log("Updating it with:");
        console.log(xmlQueryEventUpdatedValue);
        */
        db.collection(queryCollName).updateOne(
          xmlQueryEventIndex,
          { $set: xmlQueryEventUpdatedValue }, function (err, doc) {
            resultCount++;
            if (err)
              callback(err);
            else {
              if (resultCount >= resultTotal)
                callback();
            }
          });
      });
    });
  }
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
 * Function to interrupt the execution at any time. An optional message can be added
 */
function interruptExecution(message) {
  console.log("XMLtoMongoDB execution failed");
  if (message)
    console.log(message);
  //the code will be 1 by default, indicating a failure
  process.exit(1);
}


/**
 * Available functions from this module
 */
module.exports.setConstants = setConstants;
module.exports.runXmlQuery = runXmlQuery;
module.exports.runXmlTempQuery = runXmlTempQuery;
module.exports.getXmlQueryData = getXmlQueryData;
module.exports.getXmlQueryDataByCollection = getXmlQueryDataByCollection;
module.exports.feedQueryInformationByCollection = feedQueryInformationByCollection;
module.exports.feedQueryResultsByTitle = feedQueryResultsByTitle;
module.exports.deleteResultCollection = deleteResultCollection;
module.exports.deleteTempResultCollection = deleteTempResultCollection;