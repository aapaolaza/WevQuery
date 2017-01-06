//Created as a node js script. Run:
//npm install mongodb --save
//https://www.npmjs.com/package/xpath
//npm install xpath
//npm install xmldom
//npm install yargs
//To run the script:
//node XMLtoMongoDB.js --file filename.xml --strictMode boolean

//Old dependencies
//I was using the following to convert the xml into a JS object (and then into JSON) but I don't need it
//npm install xml2js //https://www.npmjs.com/package/xml2js
//https://www.npmjs.com/package/json-query



//////We need to load the constants file
var constants = require("./MapReduceConstantsNode.js");
var MongoClient = require('mongodb').MongoClient
  , Server = require('mongodb').Server;



var xpath = require('xpath')
  , dom = require('xmldom').DOMParser

//db = connectAndValidate();

console.log("Running XMLtoMongoDB function at:" + datestamp());

//list of events to be processed, this will speed up the query, as only the relevant events will be considered
//var eventList = [loadEvent,mouseDownEvent,mouseUpEvent,mouseOverEvent,mouseMoveEvent,dblclickEvent];

//var userList = db.activeUsers.distinct("sid",{"sd" : websiteId});

//This command gives the nodelist the functionality to use "forEach"
//From http://stackoverflow.com/questions/24775725/loop-through-childnodes
//NodeList.prototype.forEach = Array.prototype.forEach

//Variables I need for the MapReduce function
var mapReduceVars = {};
mapReduceVars.eventList = "";
mapReduceVars.userList = "";
mapReduceVars.db = "";
mapReduceVars.isQueryStrict = false;
//bannedIPlist is provided by MapReduceConstants
var xmlDoc;

//Eases the step of retrieving parameters from the command line
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
loadXml(argv.file);

/**
 * Starting function, that loads the XML from the file system
 */
function loadXml(filename) {

  // Read the file and print its contents.
  var fs = require('fs');
  fs.readFile(filename, 'utf8', function (err, data) {
    if (err) throw err;
    console.log('XML successfully loaded: ' + filename);
    console.log(data);
    xmlDoc = new dom().parseFromString(data);
    xmlReady();
    //var eventListNodes = xpath.select("//eventList", xmlDoc)
  });
}

/**
 * Once the XML is ready, I can read the values, and prepare the MapReduce script
 */
function xmlReady() {
  mapReduceVars.eventList = xpath.select("//eventList/text()", xmlDoc).toString().split(",");
  mapReduceVars.eventList = uniqueArray(mapReduceVars.eventList);
  console.log(mapReduceVars.eventList);
  //connect to the database
  constants.connectAndValidateNodeJs(connectionEstablished);
}
/**
 * Callback for when the database connection is established
 * Conforming to the NodeJs standards, the first parameter is the error message
 */
function connectionEstablished(err, db) {
  if (err) console.log("connectionEstablished() ERROR connecting to DB" + err);
  mapReduceVars.db = db;
  console.log("Current database", mapReduceVars.db.databaseName);
  var userCollection = mapReduceVars.db.collection(constants.userCollection);

  console.log("Getting distinct users from the following Web site: " + constants.websiteId);

  //Both following queries are working now. I will need some real data to test this. I might just run it in the virtual box.
  /*var eventList = userCollection.distinct("event", function(err, docs) {
       console.log(docs);
  });*/
  userCollection.distinct("sid", { "sd": constants.websiteId },
    function (err, docs) {
      if (err) console.log("connectionEstablished():userList query ERROR " + err);
      //console.log(docs);
      mapReduceVars.userList = docs;
      mapReduceScript();
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


function mapReduceScript() {
  var eventCollection = mapReduceVars.db.collection(constants.eventCollection);

  //The xml needs to be processed, and transformed into JavaScript objects that MapReduce can process
  constants.scopeObject["xmlQueryObject"] = parseXMLToMapReduceObject();
  constants.scopeObject["isQueryStrict"] = mapReduceVars.isQueryStrict;

  console.log("mapReduceScript() start with the following parameters:");
  console.log("sd: " + constants.websiteId);
  console.log("sid: $in: " + mapReduceVars.userList.length + "users");
  console.log("ip: $nin: " + constants.bannedIPlist);
  console.log("event: $in: " + mapReduceVars.eventList);
  console.log("isQueryStrict: " + constants.scopeObject["isQueryStrict"]);

  console.log("sessionstartms: $exists: " + true);
  eventCollection.mapReduce(
    mapFunction.toString(),
    //reduceFunction.toString(),
    skinnyReduceFunction.toString(),
    {
      out: { replace: "xmlQuery" },
      query: {
        "sd": constants.websiteId
        //, "sid": { $in: mapReduceVars.userList }
        , "ip": { $nin: constants.bannedIPlist }
        , "event": { $in: mapReduceVars.eventList }
        , "sessionstartms": { "$exists": true }
      },
      //I add a scope with all the required variables.
      scope: constants.scopeObject,
      finalize: finalizeFunction.toString(),
      verbose: true
      //,sort: {sid:1, url:1, urlSessionCounter:1}
    },
    function (error, results, stats) {   // stats provided by verbose
      console.log("mapReduceScript() end");
      console.log(error);
      console.log(results);
      console.log(stats);
      mapReduceVars.db.close();
    }
  );
}

function parseXMLToMapReduceObject() {
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
  //each element in the eventList is an eventQueryObject
  //It will be identified by its index in the query array
  var eventQueryObject = new Object();
  eventQueryObject.nameList = xpath.select("//event[@pre='null']/eventList/text()", xmlDoc).toString().split(",");
  eventQueryObject.occurrences = xpath.select("string(//event[@pre='null']/@occurrences)", xmlDoc);

  //Get the context for that event
  eventQueryObject.contextList = new Object();
  eventQueryObject.contextList.type = [];
  eventQueryObject.contextList.value = [];

  var contextList = xpath.select("//event[@pre='null']/context", xmlDoc);
  console.log(contextList.length + "context elements have been found");

  for (i = 0; i < contextList.length; i++) {
    eventQueryObject.contextList.type[i] = contextList[i].getAttributeNode("type").toString();
    eventQueryObject.contextList.value[i] = contextList[i].getAttributeNode("value").toString();
  }

  var currentID = xpath.select("string(//event[@pre='null']/@id)", xmlDoc);
  //Keep the index of this event in the table
  eventIDTable[currentID] = xmlQueryObject.eventList.push(eventQueryObject);
  console.log("eventQueryObject with id=" + currentID);
  console.log(eventQueryObject);
  console.log("Adding " + (parseInt(eventQueryObject.occurrences) - 1) + " more events");
  //push as many event copies as the occurrences indicate
  for (i = 0; i < parseInt(eventQueryObject.occurrences) - 1; i++) {
    //LOG 2016-12-16 15:14:12 I cannot see any reason why I need a proper clone
    //a reference will do so the algorithm can abstract itself and just loop through everything
    //At the moment I don't Does not need
    xmlQueryObject.eventList.push(eventQueryObject);
    console.log(eventQueryObject);
  }

  areEventsLeft = true;
  while (areEventsLeft) {
    //Check if exists an event after last one processed
    //Instead of the "boolean" function, the length of the response can be checked:
    //if (xpath.select("//event[@pre='" + currentID + "']", xmlDoc).length>0) { 
    if (xpath.select("boolean(//event[@pre='" + currentID + "'])", xmlDoc)) {

      eventQueryObject = new Object();
      eventQueryObject.nameList = xpath.select("//event[@pre='" + currentID + "']/eventList/text()", xmlDoc).toString().split(",");
      eventQueryObject.occurrences = xpath.select("string(//event[@pre='" + currentID + "']/@occurrences)", xmlDoc);

      //Get the context for that event
      eventQueryObject.contextList = new Object();
      eventQueryObject.contextList.type = [];
      eventQueryObject.contextList.value = [];

      var contextList = xpath.select("//event[@pre='" + currentID + "']/context", xmlDoc);
      console.log(contextList.length + "context elements have been found");

      for (i = 0; i < contextList.length; i++) {
        eventQueryObject.contextList.type[i] = contextList[i].getAttributeNode("type").toString();
        eventQueryObject.contextList.value[i] = contextList[i].getAttributeNode("value").toString();
      }

      currentID = xpath.select("string(//event[@pre='" + currentID + "']/@id)", xmlDoc);
      //Keep the index of this event in the table
      eventIDTable[currentID] = xmlQueryObject.eventList.push(eventQueryObject);
      console.log("eventQueryObject with id=" + currentID);
      console.log(eventQueryObject);
      console.log("Adding " + (parseInt(eventQueryObject.occurrences) - 1) + " more events");
      //push as many event copies as the occurrences indicate
      for (i = 0; i < parseInt(eventQueryObject.occurrences) - 1; i++) {
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
      console.log("ERROR WITH THE UNIT VALUE OF TEMPORAL CONSTRAINT");

    //retrieve the event Ids for the temp constraints, and check the constructed table for the corresponding indexes
    var eventRef = tempRestrNode.getElementsByTagName('eventref');
    console.log("tempRestrObject with index=" + index);
    console.log("eventRef1 is " + eventRef[0].getAttribute("id") + " which can be found in the following array:");
    console.log(eventIDTable);

    tempRestrObject.eventRef1 = eventIDTable[eventRef[0].getAttribute("id")];
    tempRestrObject.eventRef2 = eventIDTable[eventRef[1].getAttribute("id")];
    console.log("tempRestrObject with index=" + index);
    console.log(tempRestrObject);
    xmlQueryObject.tempConstrList.push(tempRestrObject);
  });

  return xmlQueryObject;
}

/**
 * This function filters out all unwanted events.
 * It gets executed for each object, and gives access to internal variables via "this".
 **/
function mapFunction() {

  //we filter out the events we don't want to consider
  //if (eventArray.indexOf(this.event) > -1){
  /*
   * "emit" function takes two arguments: 1) the key on which to group the data, 2) data itself to group. Both of them can be objects ({this.id, this.userId},{this.time, this.value}) for example
   */
  //emit({sid:this.sid, sessionstartms:this.sessionstartms, url:this.url, urlSessionCounter:this.urlSessionCounter},
  emit({ sid: this.sid, url: this.url, urlSessionCounter: this.urlSessionCounter },
    {
      "episodeEvents":
      [
        {
          event: this.event,
          timestamp: this.timestamp,
          timestampms: this.timestampms,
          //sid: this.sid,
          ip: this.ip,
          //url: this.url,
          sessionstartms: this.sessionstartms,
          sessionstartparsed: this.sessionstartparsed,
          visitCounter: this.visitCounter,
          visitDuration: this.visitDuration,

          sdSessionCounter: this.sdSessionCounter,
          sdTimeSinceLastSession: this.sdTimeSinceLastSession,
          urlSessionCounter: this.urlSessionCounter,
          urlSinceLastSession: this.urlSinceLastSession,
          urlEpisodeLength: this.urlEpisodeLength,

          episodeUrlActivity: this.episodeUrlActivity,
          episodeSdActivity: this.episodeSdActivity,


          htmlSize: this.htmlSize,
          resolution: this.resolution,
          size: this.size,
          usableSize: this.usableSize,

          idleTime: this.idleTime,
          calculatedActiveTime: this.calculatedActiveTime,
          idleTimeSoFar: this.idleTimeSoFar,
          sdCalculatedActiveTime: this.sdCalculatedActiveTime,

          usertimezoneoffset: this.usertimezoneoffset,
          mouseCoordinates: this.mouseCoordinates,
          nodeInfo: this.nodeInfo,
          count: 1
        }
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
 * 
 */
function skinnyReduceFunction(key, values) {
  var deleteList = ["sessionstartms",
    "sessionstartparsed",
    "visitCounter",
    "visitDuration",
    "sdSessionCounter",
    "sdTimeSinceLastSession",
    "urlSessionCounter",
    "urlSinceLastSession",
    "urlEpisodeLength",
    "episodeUrlActivity",
    "episodeSdActivity",
    "htmlSize",
    "resolution",
    "size",
    "usableSize",
    "idleTime",
    "idleTimeSoFar",
    "sdCalculatedActiveTime",
    "usertimezoneoffset"];

  var reduced = { "episodeEvents": [] };
  for (var i in values) {
    var inter = values[i];
    for (var j in inter.episodeEvents) {
      //for all elements except the first one
      if (reduced.episodeEvents.length > 1) {
        for (var deleteIndex in deleteList) {
          delete inter.episodeEvents[j][deleteList[deleteIndex]];
        }
      }
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
  print("STARTING FINALIZE");

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
  function getNodeInfo(nodeInfo) {
    return ("NodeInfo [nodeId=" + nodeInfo.nodeId + ", nodeName=" + nodeInfo.nodeName
      + ", nodeDom=" + nodeInfo.nodeDom + ", nodeImg=" + nodeInfo.nodeImg
      + ", nodeLink=" + nodeInfo.nodeLink + ", nodeText=" + nodeInfo.nodeText
      + ", nodeType=" + nodeInfo.nodeType + ", nodeTextContent="
      + nodeInfo.nodeTextContent + ", nodeTextValue=" + nodeInfo.nodeTextValue + "]");
  }

	/**
	 * Parse a date in "yyyy-mm-dd,HH:mm:ss:SSS" format, and return the ms.
	 * I will do it manually to avoid problems with implementation dependant functions
	 * new Date(year, month [, date [, hours[, minutes[, seconds[, ms]]]]])
	 * 2013-07-05,09:25:53:970
	 */
  function parseDateToMs(input) {

    var dateString = input;
    var parts = dateString.split(',');

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
    return new Date(date[0], date[1] - 1, date[2], time[0], time[1], time[2], time[3]).getTime();
    // Note: we use  date[1]-1 because months are 0-based
  }

	/**
	 * This function will "fix" the events, by overriding the given timestampms, which doesn't exist in some of them,
	 * with the result of parseDateToMs on the regular timestamp
	 */

  function fixEventTS(event) {
    event.timestampms = parseDateToMs(event.timestamp);
    return event;
  }

  /**
  * Same as fixEventTS, but it will fix an entire array of events
  */
  function fixEventArrayTS(eventArray) {

    for (var i in eventArray) {
      eventArray[i].timestampms = parseDateToMs(eventArray[i].timestamp);
    }
    return eventArray;
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



	/**
	 * This function will just augmentate the object with the extra information I get from the
	 * eventObject
	 */

  function addInfoToBehaviour(behaviourObject, eventObject) {

    behaviourObject.timestamp = eventObject.timestamp;

    behaviourObject.timestampms = eventObject.timestampms;
    behaviourObject.sortingtimestampms = eventObject.timestampms;

    behaviourObject.sessionstartms = eventObject.sessionstartms;
    behaviourObject.sessionstartparsed = eventObject.sessionstartparsed;
    behaviourObject.visitCounter = eventObject.visitCounter;
    behaviourObject.visitDuration = eventObject.visitDuration;

    behaviourObject.sdSessionCounter = eventObject.sdSessionCounter;
    behaviourObject.sdTimeSinceLastSession = eventObject.sdTimeSinceLastSession;
    behaviourObject.urlSessionCounter = eventObject.urlSessionCounter;
    behaviourObject.urlSinceLastSession = eventObject.urlSinceLastSession;
    behaviourObject.urlEpisodeLength = eventObject.urlEpisodeLength;

    behaviourObject.htmlSize = eventObject.htmlSize;
    behaviourObject.resolution = eventObject.resolution;
    behaviourObject.size = eventObject.size;
    behaviourObject.usableSize = eventObject.usableSize;

    behaviourObject.idleTime = eventObject.idleTime;
    behaviourObject.calculatedActiveTime = eventObject.calculatedActiveTime;
    behaviourObject.idleTimeSoFar = eventObject.idleTimeSoFar;
    behaviourObject.sdCalculatedActiveTime = eventObject.sdCalculatedActiveTime;

    return behaviourObject
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
        && matchContextInfo(currentEvent.event, xmlQueryObject.eventList[indexToMatch].contextList)) {

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
    if (xmlQueryObject.eventList[0].nameList.indexOf(currentEvent.event) > -1){
      //initialise and add a new candidate
      var candidateObject = [];
      candidateObject.push(currentEvent);
      this.xmlQueryCandidatesList.push(candidateObject);
    }
  }

	/**
	 * Last event for this object. It takes any unfinished candidate and determines if it should be included or not
	 */
  XmlQuery.prototype.endBehaviour = function (currentEvent) {

  }

  XmlQuery.prototype.outputResult = function () {
    //return ("##OUTPUT: outputting " + this.controlledBehaviourList.length+" elements");

    return this.xmlQueryList;
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
    tempConstraintList.forEach(function (tempConstraint, index) {
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
    });
    //at this point, all temporal constraints checked out
    return (1);
  }

  function matchContextInfo(currentEvent, contextInfo) {
    for (i = 0; i < contextInfo.type.length; i++) {
      if (currentEvent[contextInfo.type[i]] != contextInfo.value[i])
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

  valuesArray = fixEventArrayTS(valuesArray);


  valuesArraySorted = valuesArray.sort(compare);
  valuesArraySorted.sort(compare);


  var debugLog = "";

  //general statistics and error control, such as number of events processed, and correct sorting test
  var generalStatistics = new Object();
  generalStatistics.count = 0;
  generalStatistics.isArrayOrdered = 0;
  generalStatistics.previousvalueObject = 0;
  generalStatistics.timeDifference = 0;
  generalStatistics.valuesBiggerThanPrevious = 0;
  generalStatistics.valuesSmallerThanPrevious = 0;
  generalStatistics.sdSessionCounter = 0;
  generalStatistics.sdTimeSinceLastSession = 0;
  generalStatistics.urlSessionCounter = 0;
  generalStatistics.urlSinceLastSession = 0;
  generalStatistics.calculatedActiveTimeMedian = 0;
  generalStatistics.sessionstartmsMedian = 0;
  generalStatistics.sdCalculatedActiveTimeMedian = 0;
  generalStatistics.urlEpisodeLength = 0;

  var calculatedActiveTimeList = [];
  var sessionstartmsList = [];

  var sdCalculatedActiveTimeList = [];

  //Behaviour Objects
  var xmlQuery = new XmlQuery();

  for (var i in valuesArraySorted) {
    valueObject = valuesArraySorted[i];

    //Overwrite the timestampms with the parseDateToMs(regularTimestamp)
    //valueObject = fixEventTS(valueObject);

    generalStatistics.count++;

    /////////////CODE TO OBTAIN THE HTML SIZE!////////////
    /*
          if (valueObject.event == loadEvent || valueObject.event == resizeEvent){
            pageSize.htmlSize = valueObject.htmlSize;
            pageSize.resolution = valueObject.resolution;
            pageSize.size = valueObject.size;
            pageSize.usableSize = valueObject.usableSize;
            pageSize.isPageSizeEstimated = false;
          }
    
          //if we don't have an htmlsize yet, loop until you find the first next one
          if (pageSize.htmlSize == ""){
            var j = i;
    
            while (pageSize.htmlSize == "" && j < valuesArraySorted.length){
              if (valuesArraySorted[i].event == loadEvent || valuesArraySorted[i].event == resizeEvent){
                pageSize.htmlSize = valueObject.htmlSize;
                pageSize.resolution = valueObject.resolution;
                pageSize.size = valueObject.size;
                pageSize.usableSize = valueObject.usableSize;
                pageSize.isPageSizeEstimated = true;
              }
              j++;
            }
          }
      */
    /////////////END OF CODE TO OBTAIN THE HTML SIZE!////////////

    xmlQuery.processEvent(valueObject);

    //We add what urlSession this object refers to. Depending on the mapReduce emit function, sdSession OR urlSession will remain the same.
    if (generalStatistics.sdSessionCounter == 0) {
      generalStatistics.sdSessionCounter = valueObject.sdSessionCounter;
      generalStatistics.sdTimeSinceLastSession = valueObject.sdTimeSinceLastSession;
      generalStatistics.urlSessionCounter = valueObject.urlSessionCounter;
      generalStatistics.urlSinceLastSession = valueObject.urlSinceLastSession;
      generalStatistics.urlEpisodeLength = valueObject.urlEpisodeLength;

      generalStatistics.episodeUrlActivity = valueObject.episodeUrlActivity;
      generalStatistics.episodeSdActivity = valueObject.episodeSdActivity;

    }
    else {
      //If any of them is different, store -1 (this will always happen with at least one of them
      if (generalStatistics.sdSessionCounter != valueObject.sdSessionCounter) { generalStatistics.sdSessionCounter = -1; }
      if (generalStatistics.sdTimeSinceLastSession != valueObject.sdTimeSinceLastSession) { generalStatistics.sdTimeSinceLastSession = -1; }
      if (generalStatistics.urlSessionCounter != valueObject.urlSessionCounter) { generalStatistics.urlSessionCounter = -1; }
      if (generalStatistics.urlSinceLastSession != valueObject.urlSinceLastSession) { generalStatistics.urlSinceLastSession = -1; }
      if (generalStatistics.episodeUrlActivity != valueObject.episodeUrlActivity) { generalStatistics.episodeUrlActivity = -1; }
      if (generalStatistics.episodeSdActivity != valueObject.episodeSdActivity) { generalStatistics.episodeSdActivity = -1; }
    }

    //Getting the episode timestamp and active time medians
    if (incorrectActTimeEvents.indexOf(valueObject.event) < 0) {
      calculatedActiveTimeList.push(parseInt(valueObject.calculatedActiveTime));
      generalStatistics.calculatedActiveTimeMedian = median(calculatedActiveTimeList);

      sessionstartmsList.push(parseInt(valueObject.sessionstartms));
      generalStatistics.sessionstartmsMedian = median(sessionstartmsList);

      sdCalculatedActiveTimeList.push(parseInt(valueObject.sdCalculatedActiveTime));
      generalStatistics.sdCalculatedActiveTimeMedian = median(sdCalculatedActiveTimeList);

    }

    /***
     * SORTING TEST
     */
    //if it's not the first element
    if (generalStatistics.previousvalueObject != 0) {
      //previous object's timestamp should be smaller that current's

      var previousTimeNumber = Number(generalStatistics.previousvalueObject.timestampms);
      var currentTimeNumber = Number(valueObject.timestampms);

      if (previousTimeNumber > currentTimeNumber) {
        generalStatistics.isArrayOrdered = -1;
        //timeDifference +="##" + previousTimeNumber +" is BIGGER than " + currentTimeNumber+"##";
        generalStatistics.valuesBiggerThanPrevious++;
      }
      else {
        //timeDifference += "##" + previousTimeNumber+" is SMALLER than " + currentTimeNumber+"##";
        //timeDifference += valueObject+",";
        generalStatistics.valuesSmallerThanPrevious++;
        generalStatistics.timeDifference += currentTimeNumber - previousTimeNumber;
      }
    }
    generalStatistics.previousvalueObject = valueObject;
  }

  //debugLog +=

  xmlQuery.endBehaviour();

  return {
    generalStatistics: generalStatistics,
    xmlQuery: xmlQuery.outputResult(),
    xmlQueryCounter: xmlQuery.outputResult().length,
    isQueryStrict:isQueryStrict

    /*
        episodeStartms: fixEventTS(valuesArraySorted[0]).timestampms,
        episodeEndms: fixEventTS(valuesArraySorted[valuesArraySorted.length - 1]).timestampms,
    
        episodeDurationms: Number(fixEventTS(valuesArraySorted[valuesArraySorted.length - 1]).timestampms) - Number(fixEventTS(valuesArraySorted[0]).timestampms),
    
        eventsInEpisodeCounter: valuesArraySorted.length,
    
        debugLog: debugLog
    */
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
