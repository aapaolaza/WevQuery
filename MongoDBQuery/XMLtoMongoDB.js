//Created as a node js script. Run:
//npm install mongodb --save
//https://www.npmjs.com/package/xpath
//npm install xpath
//npm install xmldom
//To run the script:
//node XMLtoMongoDB.js filename.xml

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
mapReduceVars.db="";
//bannedIPlist is provided by MapReduceConstants
var xmlDoc;

loadXml();

/**
 * Starting function, that loads the XML from the file system
 */
function loadXml() {
  // Make sure we got a filename on the command line.
  if (process.argv.length < 3) {
    var scriptFilename = process.argv[1].split("\\");
    scriptFilename = scriptFilename[scriptFilename.length - 1];
    console.log('Usage: node ' + scriptFilename + ' FILENAME.XML');
    process.exit(1);
  }
  // Read the file and print its contents.
  var fs = require('fs')
    , filename = process.argv[2];
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
      console.log(docs);
      mapReduceVars.userList = docs;
      mockMapReduceScript();
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

//startMapReduceScript();
function mockMapReduceScript() {
  mapReduceVars.eventList = xpath.select("//eventList/text()", xmlDoc).toString().split(",");

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
  eventQueryObject.name = xpath.select("//event[@pre='null']/eventList/text()", xmlDoc).toString().split(",");
  eventQueryObject.occurrences = xpath.select("string(//event[@pre='null']/@occurrences)", xmlDoc);

  var currentID = xpath.select("string(//event[@pre='null']/@id)", xmlDoc);
  //Keep the index of this event in the table
  eventIDTable[currentID] = xmlQueryObject.eventList.push(eventQueryObject);
  console.log("eventQueryObject with id=" + currentID);
  console.log(eventQueryObject);
  console.log("Adding " + (parseInt(eventQueryObject.occurrences) - 1) + " more events");
  //push as many event copies as the occurrences indicate
  for (i = 0; i < parseInt(eventQueryObject.occurrences)-1; i++) {
    console.log("inside loop");
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
      eventQueryObject.name = xpath.select("//event[@pre='" + currentID + "']/eventList/text()", xmlDoc).toString().split(",");
      eventQueryObject.occurrences = xpath.select("string(//event[@pre='" + currentID + "']/@occurrences)", xmlDoc);
      currentID = xpath.select("string(//event[@pre='" + currentID + "']/@id)", xmlDoc);
      //Keep the index of this event in the table
      eventIDTable[currentID] = xmlQueryObject.eventList.push(eventQueryObject);
      console.log("eventQueryObject with id=" + currentID);
      console.log(eventQueryObject);
      console.log("Adding " + (parseInt(eventQueryObject.occurrences) - 1) + " more events");
      //push as many event copies as the occurrences indicate
      for (i = 0; i < parseInt(eventQueryObject.occurrences)-1; i++) {
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

  /**
   * At this point in the execution the xmlQueryObject contains 2 lists
   * **eventList**, a list of the actual occurrences of events, in the corresponding order.
   * **tempConstrList**, a list of the temporal constraint, with indexes corresponding to
   * the position each event in the eventList.
   * The following step would be matching each occurrence of the event to the eventList,
   * and check the temporal constraints to discard candidates. 
   */

  mapReduceVars.db.close();
}

function mapReduceScript() {
  db.events.mapReduce(
    mapFunction,
    reduceFunction,
    {
      out: { replace: "mouseBehaviourSkinny" },
      query: {
        "sd": constants.websiteId
        , "sid": { $in: mapReduceVars.userList }
        , "ip": { $nin: constants.bannedIPlist }
        , "event": { $in: mapReduceVars.eventList }
        , "sessionstartms": { "$exists": true }
      },
      //I add a scope with all the required variables.
      scope: constants.scopeObject,
      finalize: finalizeFunction
      //,sort: {sid:1, url:1, urlSessionCounter:1}
    }
  );
}

/**
 * This function filters out all unwanted events.
 * It gets executed for each object, and gives access to internal variables via "this".
 **/
function mapFunction() {

  //list of events that are relevant for the behaviour to be found
  //var eventArray = ["mousewheel"];//"scroll",mouseUpEvent,"keydown"];

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
          sid: this.sid,
          ip: this.ip,
          url: this.url,
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

  function XmlQuery() {

    //list containing all the successfully gathered behaviours.
    this.xmlQueryList = [];
    //list containing the current candidates, will increase and decrease throughout the analysis
    this.xmlQueryCandidateList = [];

    mapReduceVars.eventList = xpath.select("//eventList/text()", xmlDoc).toString().split(",");

    var xmlQueryObject = {};
    xmlQueryObject.eventList = {};

    //each element in the eventList is an eventQueryObject
    //It will be identified by its index in the query array
    var eventQueryObject;
    eventQueryObject.name = {};
    eventQueryObject.occurrences;

    //Each time an event is processed, its index in the query is stored, so it can be retrieved for the corresponding temporal restriction
    var eventIDTable = {};

    //PROCESS XML
    //For each occurrence of event, create an eventQueryObject
    //i.e. if the event has more than one occurrence, create various.
    //WARNING!!! "n" occurrences is not supported at the moment.

    //First event has predecesor null
    eventQueryObject = new Object();
    eventQueryObject.name = xpath.select("event[@pre='null']/eventList/text()", xmlDoc).toString().split(",");
    eventQueryObject.occurrences = xpath.select("string(//event[@pre='null']/@occurrences)", xmlDoc);
    xmlQueryObject.eventList.push(eventQueryObject);
    var currentID = xpath.select("string(//event[@pre='null']/@id)", xmlDoc);

    areEventsLeft = true;
    while (areEventsLeft) {
      //Check if exists an event after last one processed 
      if (xpath.select("boolean(//event[@pre='" + currentID + "'])")) {

        eventQueryObject = new Object();
        eventQueryObject.name = xpath.select("event[@pre='" + currentID + "']/eventList/text()", xmlDoc).toString().split(",");
        eventQueryObject.occurrences = xpath.select("string(//event[@pre='" + currentID + "']/@occurrences)", xmlDoc);
        currentID = xpath.select("string(//event[@pre='" + currentID + "']/@id)", xmlDoc);
        //Keep the index of this event in the table
        eventIDTable[currentID] = xmlQueryObject.eventList.push(eventQueryObject);

        //push as many event copies as the occurrences indicate
        for (i = 0; i++; i <= eventQueryObject.occurrences) {
          //LOG 2016-12-16 15:14:12 I cannot see any reason why I need a proper clone
          //a reference will do so the algorithm can abstract itself and just loop through everything
          //At the moment I don't Does not need
          xmlQueryObject.eventList.push(eventQueryObject);
        }
      }
      else
        areEventsLeft = false;
    }

    //temporal restriction list will be created taking into account the index position of the event that they involve
    var tempRestrObject;
    //2 event references, which will be set to the corresponding index
    tempRestrObject.eventRef1;
    tempRestrObject.eventRef2;
    tempRestrObject.type;
    //The unit will be used to transform the given time value to ms.
    tempRestrObject.value;

    var tempRestrNodeList = xpath.select("//temporalconstraint", xmlDoc)
    tempRestrNodeList.forEach(function (tempRestrNode) {

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
      tempRestrObject.eventRef1 = eventIDTable[eventRef[0].getAttribute("id")];
      tempRestrObject.eventRef2 = eventIDTable[peventRef[1].getAttribute("id")];
    })


  }

  //We call this function for all mouserelated events
  XmlQuery.prototype.processEvent = function (currentEvent, pageSize) {

    //if it's the first event, store it, it should be the load event, but it could just be any other mouse event.
    if (this.firstEvent == null) {
      this.firstEvent = currentEvent;
    }

    //if it's a mousedown, record the value of this event, as well as the previous one
    else if (this.firstEvent != null
      && currentEvent.event == mouseDownEvent
      && !this.eventRecorded) {

      this.currentbehaviour = new Object();

      this.currentbehaviour.clickAfterLoadTime = currentEvent.timestampms - this.firstEvent.timestampms;

      this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour, currentEvent)

      this.currentbehaviour.mouseDownNode = currentEvent.nodeInfo;
      this.currentbehaviour.firstEvent = this.firstEvent;

      this.currentbehaviour.mouseDownTimestampms = currentEvent.timestampms;
      this.currentbehaviour.firstEventTimestampms = this.firstEvent.timestampms;

      this.currentbehaviour.pageSize = pageSize;
      this.clickAfterLoadList.push(this.currentbehaviour);

      this.eventRecorded = true

      return ("##PROCESS: XmlQuery found");
    }
  }

	/**
	 * We really don't need to do anything in this function, but I will leave it for consistency
	 */
  XmlQuery.prototype.endBehaviour = function (currentEvent) {

  }

  XmlQuery.prototype.outputResult = function () {
    //return ("##OUTPUT: outputting " + this.controlledBehaviourList.length+" elements");

    return this.xmlQueryList;
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

  var calculatedActiveTimeList = [];
  var sessionstartmsList = [];

  var sdCalculatedActiveTimeList = [];

  //Behaviour Objects
  var xmlQuery = new XmlQuery();
  var idleTime = new IdleMouseBehaviour();
  var timeToClick = new TimeToClickBehaviour();
  //var hoveringOver = new HoveringOverBehaviour();
  //var unintentionalMousemovement = new UnintentionalMousemovement();
  var failToClick = new FailToClick();
  var idleAfterClick = new IdleAfterClick();
  var lackOfMousePrecision = new LackOfMousePrecision();
  var repeatedClicks = new RepeatedClicks();
  //var failToClickDiffNode = new FailToClickDiffNode();
  //var failToClickIgnoreNode = new FailToClickIgnoreNode();

  var clickAfterLoad = new ClickAfterLoad();

  /////////////HTML SIZE variables
  var pageSize = new Object();
  pageSize.htmlSize = "";
  pageSize.resolution = "";
  pageSize.size = "";
  pageSize.usableSize = "";
  pageSize.isPageSizeEstimated = "";
  var resizeEvent = "resize";
  var loadEvent = "load";


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

    clickSpeed.processEvent(valueObject, pageSize);
    idleTime.processEvent(valueObject, pageSize);
    timeToClick.processEvent(valueObject, pageSize);
    //hoveringOver.processEvent(valueObject, pageSize);
    //unintentionalMousemovement.processEvent(valueObject, pageSize);
    failToClick.processEvent(valueObject, pageSize);
    idleAfterClick.processEvent(valueObject, pageSize);
    lackOfMousePrecision.processEvent(valueObject, pageSize);
    repeatedClicks.processEvent(valueObject, pageSize);
    //failToClickDiffNode.processEvent(valueObject, pageSize);
    //failToClickIgnoreNode.processEvent(valueObject, pageSize);
    clickAfterLoad.processEvent(valueObject, pageSize);

    if (valueObject.event == mouseDownEvent) {
      mouseStatistics.mousedownCounter++;

      switch (valueObject.button) {
        case "l":
          mouseStatistics.leftClickCounter++;
          break;
        case "m":
          mouseStatistics.middleClickCounter++;
          break;
        case "r":
          mouseStatistics.rightClickCounter++;
          break;
        default:
          mouseStatistics.unknownClickCounter++;
      }
    }
    else if (valueObject.event == mouseUpEvent) {
      mouseStatistics.mouseupCounter++;
    }

    //We add what urlSession this object refers to. Depending on the mapReduce emit function, sdSession OR urlSession will remain the same.
    if (mouseStatistics.sdSessionCounter == 0) {
      mouseStatistics.sdSessionCounter = valueObject.sdSessionCounter;
      mouseStatistics.sdTimeSinceLastSession = valueObject.sdTimeSinceLastSession;
      mouseStatistics.urlSessionCounter = valueObject.urlSessionCounter;
      mouseStatistics.urlSinceLastSession = valueObject.urlSinceLastSession;
      mouseStatistics.urlEpisodeLength = valueObject.urlEpisodeLength;

      mouseStatistics.episodeUrlActivity = valueObject.episodeUrlActivity;
      mouseStatistics.episodeSdActivity = valueObject.episodeSdActivity;

    }
    else {
      //If any of them is different, store -1 (this will always happen with at least one of them
      if (mouseStatistics.sdSessionCounter != valueObject.sdSessionCounter) { mouseStatistics.sdSessionCounter = -1; }
      if (mouseStatistics.sdTimeSinceLastSession != valueObject.sdTimeSinceLastSession) { mouseStatistics.sdTimeSinceLastSession = -1; }
      if (mouseStatistics.urlSessionCounter != valueObject.urlSessionCounter) { mouseStatistics.urlSessionCounter = -1; }
      if (mouseStatistics.urlSinceLastSession != valueObject.urlSinceLastSession) { mouseStatistics.urlSinceLastSession = -1; }
      if (mouseStatistics.episodeUrlActivity != valueObject.episodeUrlActivity) { mouseStatistics.episodeUrlActivity = -1; }
      if (mouseStatistics.episodeSdActivity != valueObject.episodeSdActivity) { mouseStatistics.episodeSdActivity = -1; }
    }

    //Getting the episode timestamp and active time medians
    if (incorrectActTimeEvents.indexOf(valueObject.event) < 0) {
      calculatedActiveTimeList.push(parseInt(valueObject.calculatedActiveTime));
      mouseStatistics.calculatedActiveTimeMedian = median(calculatedActiveTimeList);

      sessionstartmsList.push(parseInt(valueObject.sessionstartms));
      mouseStatistics.sessionstartmsMedian = median(sessionstartmsList);

      sdCalculatedActiveTimeList.push(parseInt(valueObject.sdCalculatedActiveTime));
      mouseStatistics.sdCalculatedActiveTimeMedian = median(sdCalculatedActiveTimeList);

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

  clickSpeed.endBehaviour();
  idleTime.endBehaviour();
  timeToClick.endBehaviour();
  //hoveringOver.endBehaviour();
  //unintentionalMousemovement.endBehaviour();
  failToClick.endBehaviour();
  idleAfterClick.endBehaviour();
  lackOfMousePrecision.endBehaviour();
  repeatedClicks.endBehaviour();
  //failToClickDiffNode.endBehaviour();
  //failToClickIgnoreNode.endBehaviour();
  clickAfterLoad.endBehaviour();

  return {
    generalStatistics: generalStatistics,
    mouseStatistics: mouseStatistics,

    clickSpeed: clickSpeed.outputResult(),
    clickSpeedCounter: clickSpeed.outputResult().length,

    idleTime: idleTime.outputResult(),
    idleTimeCounter: idleTime.outputResult().length,

    timeToClick: timeToClick.outputResult(),
    timeToClickCounter: timeToClick.outputResult().length,

    //hoveringOver:hoveringOver.outputResult(),
    //hoveringOverCounter:hoveringOver.outputResult().length,

    failToClick: failToClick.outputResult(),
    failToClickCounter: failToClick.outputResult().length,

    idleAfterClick: idleAfterClick.outputResult(),
    idleAfterClickCounter: idleAfterClick.outputResult().length,

    lackOfMousePrecision: lackOfMousePrecision.outputResult(),
    lackOfMousePrecisionCounter: lackOfMousePrecision.outputResult().length,

    repeatedClicks: repeatedClicks.outputResult(),
    repeatedClicksCounter: repeatedClicks.outputResult().length,

    clickAfterLoad: clickAfterLoad.outputResult(),
    clickAfterLoadCounter: clickAfterLoad.outputResult().length,


    /*
    behaviourCounter: clickSpeed.outputResult().length
              + idleTime.outputResult().length
              + timeToClick.outputResult().length
              + failToClick.outputResult().length
              + idleAfterClick.outputResult().length
              + lackOfMousePrecision.outputResult().length
              + repeatedClicks.outputResult().length
              + failToClickDiffNode.outputResult().length
              + failToClickIgnoreNode.outputResult().length,
      */
    episodeStartms: fixEventTS(valuesArraySorted[0]).timestampms,
    episodeEndms: fixEventTS(valuesArraySorted[valuesArraySorted.length - 1]).timestampms,

    episodeDurationms: Number(fixEventTS(valuesArraySorted[valuesArraySorted.length - 1]).timestampms) - Number(fixEventTS(valuesArraySorted[0]).timestampms),

    eventsInEpisodeCounter: valuesArraySorted.length,

    debugLog: debugLog

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
