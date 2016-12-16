//////We need to load the constants file
//load("../MapReduceConstants.js");

//db = connectAndValidate();

print("Running XMLtoMongoDB function at:" + datestamp());

//list of events to be processed, this will speed up the query, as only the relevant events will be considered
//var eventList = [loadEvent,mouseDownEvent,mouseUpEvent,mouseOverEvent,mouseMoveEvent,dblclickEvent];

//var userList = db.activeUsers.distinct("sid",{"sd" : websiteId});

//This command gives the nodelist the functionality to use "forEach"
//From http://stackoverflow.com/questions/24775725/loop-through-childnodes
NodeList.prototype.forEach = Array.prototype.forEach

/**
 * It loads the given XML and once loaded it initiates the processing
 */
function loadXML(){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      startMapReduceScript(this);
    }
  };
  xhttp.open("GET", xmlFilename, true);
  xhttp.send();
}

function startMapReduceScript(xmlObject){
  var xmlDoc = xmlObject.responseXML;
  var eventNodeList = xmlDoc.getElementsByTagName("eventList");
  eventNodeList.forEach(function(item){
    console.log(item);
  });
}

function mapReduceScript(){
  db.events.mapReduce(
    mapFunction,
    reduceFunction,
    {
      out: { replace: "mouseBehaviourSkinny" },
      query: {
        "sd" : websiteId
        , "sid" : {$in: userList }
        //,"$nor" :  bannedIPlist
        , "ip": {$nin: bannedIPlist }
        , "event": { $in: eventList }
        ,"sessionstartms" : { "$exists" : true}
        },
      //I add a scope with all the required variables.
      scope : scopeObject,
      finalize:finalizeFunction
      //,sort: {sid:1, url:1, urlSessionCounter:1}
    }
  );
}

print("mouseBehaviourSkinny function finished at:" + datestamp());

/**
 * This function filters out all unwanted events.
 * It gets executed for each object, and gives access to internal variables via "this".
 **/
function mapFunction () {

	//list of events that are relevant for the behaviour to be found
	//var eventArray = ["mousewheel"];//"scroll",mouseUpEvent,"keydown"];

	//we filter out the events we don't want to consider
	//if (eventArray.indexOf(this.event) > -1){
		/*
		 * "emit" function takes two arguments: 1) the key on which to group the data, 2) data itself to group. Both of them can be objects ({this.id, this.userId},{this.time, this.value}) for example
		 */
		//emit({sid:this.sid, sessionstartms:this.sessionstartms, url:this.url, urlSessionCounter:this.urlSessionCounter},
		emit({sid:this.sid, url:this.url, urlSessionCounter:this.urlSessionCounter},
				{ "episodeEvents":
					[
						{
							event:this.event,
							timestamp:this.timestamp,
							timestampms:this.timestampms,
							sid:this.sid,
							ip:this.ip,
							url:this.url,
							sessionstartms:this.sessionstartms,
							sessionstartparsed:this.sessionstartparsed,
							visitCounter:this.visitCounter,
							visitDuration:this.visitDuration,

							sdSessionCounter:this.sdSessionCounter,
							sdTimeSinceLastSession:this.sdTimeSinceLastSession,
							urlSessionCounter:this.urlSessionCounter,
							urlSinceLastSession:this.urlSinceLastSession,
							urlEpisodeLength:this.urlEpisodeLength,

							episodeUrlActivity: this.episodeUrlActivity,
							episodeSdActivity: this.episodeSdActivity,


							htmlSize : this.htmlSize,
							resolution : this.resolution,
							size : this.size,
							usableSize : this.usableSize,

							idleTime:this.idleTime,
							calculatedActiveTime:this.calculatedActiveTime,
							idleTimeSoFar:this.idleTimeSoFar,
							sdCalculatedActiveTime:this.sdCalculatedActiveTime,

							usertimezoneoffset:this.usertimezoneoffset,
							mouseCoordinates:this.mouseCoordinates,
							nodeInfo:this.nodeInfo,
							count:1
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
function reduceFunction (key, values) {
	var reduced = {"episodeEvents":[]};
		for (var i in values)
		{
			var inter = values[i];
			for (var j in inter.episodeEvents)
			{
				reduced.episodeEvents.push(inter.episodeEvents[j]);
			}
		}
	return reduced;
}

/**
 * This function is called at the end, with the reduced values for each "key" object.
 * This is the function that has access to ALL data, and this is the step in which events can be ordered and processed
 */
function finalizeFunction (key, reduceOutput) {


	//////////////////////////START OF Auxiliary Functions/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////
	/**
	* We need our own compare function in order to be able to sort the array according to the timestamp
	*/
	function compare(objectA,objectB) {

		var objectATime = Number(objectA.timestampms);
		var objectBTime = Number(objectB.timestampms);

		if (objectATime < objectBTime){
			//timeDifference += "##" + objectATime+ "is SMALLER than " + objectBTime;
			return -1;
		}
		if (objectATime > objectBTime){
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
	function getNodeInfo(nodeInfo){
		return("NodeInfo [nodeId=" + nodeInfo.nodeId + ", nodeName=" + nodeInfo.nodeName
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
		return new Date(date[0], date[1]-1, date[2], time[0],time[1],time[2],time[3]).getTime();
		// Note: we use  date[1]-1 because months are 0-based
	}

	/**
	 * This function will "fix" the events, by overriding the given timestampms, which doesn't exist in some of them,
	 * with the result of parseDateToMs on the regular timestamp
	 */

	 function fixEventTS(event){
		event.timestampms = parseDateToMs(event.timestamp);
		return event;
	 }

	 /**
	 * Same as fixEventTS, but it will fix an entire array of events
	 */
	function fixEventArrayTS(eventArray){

		for(var i in eventArray)
		{
			eventArray[i].timestampms = parseDateToMs(eventArray[i].timestamp);
		}
		return eventArray;
	 }
 	/**
	 * This function just returns the median of a given array of numbers
	 */
	function median(values) {

	    values.sort( function(a,b) {return a - b;} );

	    var half = Math.floor(values.length/2);

	    if(values.length % 2)
	        return values[half];
	    else
	        return (values[half-1] + values[half]) / 2.0;
	}



	/**
	 * This function will just augmentate the object with the extra information I get from the
	 * eventObject
	 */

	 function addInfoToBehaviour(behaviourObject, eventObject){

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

		behaviourObject.htmlSize  = eventObject.htmlSize;
		behaviourObject.resolution  = eventObject.resolution;
		behaviourObject.size  = eventObject.size;
		behaviourObject.usableSize  = eventObject.usableSize;

		behaviourObject.idleTime = eventObject.idleTime;
		behaviourObject.calculatedActiveTime = eventObject.calculatedActiveTime;
		behaviourObject.idleTimeSoFar = eventObject.idleTimeSoFar;
		behaviourObject.sdCalculatedActiveTime = eventObject.sdCalculatedActiveTime;

		return behaviourObject
	 }
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF Auxiliary Functions/////////////////////////////

	//////////////////////////START OF ClickSpeedBehaviour/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////

	function ClickSpeedBehaviour(){
		/*
		 * I need to add somekind of threshold, in order to remove mouseclick data that relates to a different
		 * behaviour rather than a regular click
		 */
		this.withinClickThreshold = 10000;

		//This will be a list containing all the behaviours.
		this.clickSpeedBehaviourList =[];
		//previous occurrence of the event to be compared to
		this.previousMousedown = null;
		this.currentbehaviour = null;
	}

	//We call this function when either mousedown or mouseup are found.
	ClickSpeedBehaviour.prototype.processEvent = function(currentEvent, pageSize) {

		//if it's a mousedown, we just need to store it as the last occurring mousedown
		if (currentEvent.event==mouseDownEvent){
			this.previousMousedown = currentEvent;
			this.currentbehaviour = new Object();
			return ("##PROCESS: new Behaviour started");
		}
		/*
		 * if not, store the behaviour as a new mouseclick IF the time between mousedown and up is smaller than threshold
		 */
		else if ((currentEvent.event==mouseUpEvent)
				&& this.previousMousedown != null ){
				//&& (currentEvent.timestampms - this.previousMousedown.timestampms) < this.withinClickThreshold){

				this.currentbehaviour.clickTime = currentEvent.timestampms - this.previousMousedown.timestampms;

				this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,this.previousMousedown)

				this.currentbehaviour.sortingtimestampms = currentEvent.timestampms;

				this.currentbehaviour.pageSize = pageSize;

				this.currentbehaviour.mouseDownNode = this.previousMousedown.nodeInfo;
				this.currentbehaviour.mouseDownCoord = this.previousMousedown.mouseCoordinates;

				this.currentbehaviour.mouseUpNode = currentEvent.nodeInfo;
				this.currentbehaviour.mouseUpCoord = currentEvent.mouseCoordinates;


				this.currentbehaviour.mouseDownTimestampms = this.previousMousedown.timestampms;
				this.currentbehaviour.mouseUpTimestampms = currentEvent.timestampms;

				this.clickSpeedBehaviourList.push(this.currentbehaviour);

				return ("##PROCESS: mousewheel within previous one found");

		}
	}
	/**
	 * We really don't need to do anything in this function, but I will leave it for consistency
	 */
	ClickSpeedBehaviour.prototype.endBehaviour = function(currentEvent) {

	}

	ClickSpeedBehaviour.prototype.outputResult = function()
	{
		//return ("##OUTPUT: outputting " + this.controlledBehaviourList.length+" elements");

		return this.clickSpeedBehaviourList;
	}

	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF ClickSpeedBehaviour/////////////////////////////


	//////////////////////////START OF IdleMouseBehaviour/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////

	function IdleMouseBehaviour(){

		this.idleBottomThreshold = 3700;//1500;
		this.idleTopThreshold = 120000;

		//This will be a list containing all the behaviours.
		this.idleMouseBehaviourList =[];
		//previous occurrence of the event to be compared to
		this.previousEvent = null;
		this.currentbehaviour = null;

		this.eventList = [mouseDownEvent,mouseUpEvent,mouseMoveEvent,mouseOverEvent,mouseOutEvent];
	}

	//We call this function for all mouserelated events
	IdleMouseBehaviour.prototype.processEvent = function(currentEvent, pageSize) {

		//if it's a mouseevent
		if (this.eventList.indexOf(currentEvent.event)>-1){
			//If we had a previous one, compare times and report if qualifies

			if (this.previousEvent != null
				//&& (currentEvent.timestampms - this.previousEvent.timestampms) < this.idleTopThreshold
				&& ((currentEvent.timestampms - this.previousEvent.timestampms) > this.idleBottomThreshold)){

				this.currentbehaviour.mouseIdleTime = currentEvent.timestampms - this.previousEvent.timestampms;
				this.currentbehaviour.startOfIdleTime = this.previousEvent.timestampms;
				this.currentbehaviour.endOfIdleTime = currentEvent.timestampms;

				this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,this.previousEvent);

				this.currentbehaviour.pageSize = pageSize;
				this.idleMouseBehaviourList.push(this.currentbehaviour);

				//we reset the starting values
				this.previousEvent = null;
				this.currentbehaviour = new Object();

				return ("##PROCESS: mousewheel within previous one found");
			}
			//if it's out of thresolds or there is no previoustime start new timestamp
			else{
				this.previousEvent = currentEvent;
				this.currentbehaviour = new Object();
			}
		}
	}

	/**
	 * We really don't need to do anything in this function, but I will leave it for consistency
	 */
	IdleMouseBehaviour.prototype.endBehaviour = function(currentEvent) {

	}


	IdleMouseBehaviour.prototype.outputResult = function() {
		//return ("##OUTPUT: outputting " + this.controlledBehaviourList.length+" elements");

		return this.idleMouseBehaviourList;
	}
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF IdleMouseBehaviour/////////////////////////////


	//////////////////////////START OF TimeToClickBehaviour/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////

	function TimeToClickBehaviour(){

		//This will be a list containing all the behaviours.
		this.timeToClickList =[];

		//previous occurrence of the event to be compared to
		this.lastMouseOver = null;
		this.currentbehaviour = null;

	}

	//We call this function for all mouserelated events
	TimeToClickBehaviour.prototype.processEvent = function(currentEvent, pageSize) {

		//if it's a mouseover, store it
		if (currentEvent.event == mouseOverEvent){
			this.lastMouseOver = currentEvent;
		}

		//if it's a mousedown, compare it with the previous mouseover (if there is one) AND the node value
		else if (this.lastMouseOver!=null
				&& currentEvent.event == mouseDownEvent
				&& (getNodeInfo(currentEvent.nodeInfo) == getNodeInfo(this.lastMouseOver.nodeInfo))){

			this.currentbehaviour = new Object();

			this.currentbehaviour.timeToClick = currentEvent.timestampms - this.lastMouseOver.timestampms;

			this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,currentEvent)

			this.currentbehaviour.mouseDownNode = currentEvent.nodeInfo;

			this.currentbehaviour.mouseDownTimestampms = currentEvent.timestampms;
			this.currentbehaviour.mouseOverTimestampms = this.lastMouseOver.timestampms;

			this.currentbehaviour.pageSize = pageSize;
			this.timeToClickList.push(this.currentbehaviour);


			return ("##PROCESS: mousewheel within previous one found");
		}
	}

	/**
	 * We really don't need to do anything in this function, but I will leave it for consistency
	 */
	TimeToClickBehaviour.prototype.endBehaviour = function(currentEvent) {

	}

	TimeToClickBehaviour.prototype.outputResult = function() {
		//return ("##OUTPUT: outputting " + this.controlledBehaviourList.length+" elements");

		return this.timeToClickList;
	}
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF TimeToClickBehaviour/////////////////////////////


	//////////////////////////START OF HoveringOverBehaviour/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////

	function HoveringOverBehaviour(){

		//This will be a list containing all the behaviours.
		this.hoveringOverList =[];

		//previous occurrence of the event to be compared to
		this.lastMouseOver = null;
		this.currentbehaviour = null;

		this.idleBottomThreshold = 100;
		this.idleTopThreshold = 60000;
	}

	//We call this function for all mouserelated events
	HoveringOverBehaviour.prototype.processEvent = function(currentEvent, pageSize) {

		//if it's a mouseover, store it
		if (currentEvent.event == mouseOverEvent){
			this.lastMouseOver = currentEvent;
			this.currentbehaviour = new Object();
		}

		//if it's a mouseout, compare it with the previous mouseover (if there is one)
		else if (this.lastMouseOver!=null
				&& currentEvent.event == mouseOutEvent
				&& ((currentEvent.timestampms - this.lastMouseOver.timestampms) < this.idleTopThreshold)
				&& ((currentEvent.timestampms - this.lastMouseOver.timestampms) > this.idleBottomThreshold)){

			this.currentbehaviour.hoveringTime = currentEvent.timestampms - this.lastMouseOver.timestampms;

			this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,this.lastMouseOver)

			this.currentbehaviour.pageSize = pageSize;

			this.hoveringOverList.push(this.currentbehaviour);

			return ("##PROCESS: mousewheel within previous one found");
		}
	}

	/**
	 * We really don't need to do anything in this function, but I will leave it for consistency
	 */
	HoveringOverBehaviour.prototype.endBehaviour = function(currentEvent) {

	}

	HoveringOverBehaviour.prototype.outputResult = function() {
		//return ("##OUTPUT: outputting " + this.controlledBehaviourList.length+" elements");

		return this.hoveringOverList;
	}
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF HoveringOverBehaviour/////////////////////////////


	//////////////////////////START OF UnintentionalMousemovement/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////

	function UnintentionalMousemovement(){

		//This will be a list containing all the behaviours.
		this.unintentionalMousemovementList =[];

		//previous occurrence of the event to be compared to
		this.lastMouseEvent = null;

		this.thresholdWithinMouse = 200;

		this.thresholdMinMousemoveDuration = 400;

		//this.eventList = [mouseDownEvent,mouseUpEvent,mouseMoveEvent,mouseOverEvent,mouseOutEvent]
		this.eventList = [mouseMoveEvent,mouseOverEvent,mouseOutEvent]
	}

	//We call this function for all mouserelated events
	UnintentionalMousemovement.prototype.processEvent = function(currentEvent, pageSize) {

		if (this.eventList.indexOf(currentEvent.event)>-1){

			//if this was the first mousemovefound
			if (this.lastMouseEvent == null){
				this.currentbehaviour = new Object();
				this.currentbehaviour.moveTime = 0;
				//this.currentbehaviour.firstMouseEvent = currentEvent;
				//this.currentbehaviour.lastMouseEvent = currentEvent;
				this.lastMouseEvent = currentEvent;

				this.currentbehaviour.sortingtimestampms = currentEvent.timestampms;

				this.currentbehaviour.pageSize = pageSize;
			}

			//if it's a mouse event AND it's within threshold from the previous one
			else if ((currentEvent.timestampms - this.lastMouseEvent.timestampms) < this.thresholdWithinMouse){

				this.currentbehaviour.moveTime = currentEvent.timestampms - this.currentbehaviour.firstMouseEvent.timestampms;
				//this.currentbehaviour.lastMouseEvent = currentEvent;

				this.lastMouseEvent = currentEvent;

				return ("##PROCESS: movement within previous one found");
			}
			//there was a mouseevent, but it was later than the within threshold
			else{
				//we store current behaviour IF the duration is more than threshold
				if (this.currentbehaviour.moveTime > this.thresholdMinMousemoveDuration){
					this.unintentionalMousemovementList.push(this.currentbehaviour);
				}

				//we start a new behvaiour with current mousemove

				this.currentbehaviour = new Object();
				this.currentbehaviour.moveTime = 0;
				//this.currentbehaviour.firstMouseEvent = currentEvent;
				//this.currentbehaviour.lastMouseEvent = currentEvent;
				this.lastMouseEvent = currentEvent;

				this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,currentEvent);

				this.currentbehaviour.pageSize = pageSize;

			}

		}
	}

	UnintentionalMousemovement.prototype.endBehaviour = function(currentEvent) {
		//we store current behaviour IF the duration is more than threshold
		if (this.currentbehaviour != null
			&& this.currentbehaviour.moveTime > this.thresholdMinMousemoveDuration){
			this.unintentionalMousemovementList.push(this.currentbehaviour);
		}
		/*
		 * we reset the values so next mousemove is considered as first
		 * (although there shouldn't be more, or endBhevaiour would have not been called
		 */
		this.lastMouseEvent = null;
		this.currentbehaviour = null;
		this.firstMouseEvent = null;
	}

	UnintentionalMousemovement.prototype.outputResult = function() {

		return this.unintentionalMousemovementList;
	}
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF UnintentionalMousemovement/////////////////////////////


	//////////////////////////START OF FailToClick/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////

	function FailToClick(){

		//This will be a list containing all the behaviours.
		this.failToClickList =[];

		//previous occurrence of the event to be compared to
		this.lastMouseDown = null;

		this.currentbehaviour = null;

		this.thresholdWithinMousedown = 5000;

		//number of clicks necessary for the behaviour to be reported
		this.clickNumberThreshold = 2;
	}

	//We call this function for all mouserelated events
	FailToClick.prototype.processEvent = function(currentEvent, pageSize) {

		if (currentEvent.event == mouseDownEvent){

			//if this was the first mousedownfound
			if (this.lastMouseDown == null){
				//Is "new Object()" necessary? TEST IT
				this.currentbehaviour = new Object();

				this.currentbehaviour.firstMouseDownNode = currentEvent.nodeInfo;
				this.currentbehaviour.firstMouseDownCoord = currentEvent.mouseCoordinates;
				this.currentbehaviour.firstMouseDownTimestampms = currentEvent.timestampms;

				this.currentbehaviour.lastMouseDownNode = currentEvent.nodeInfo;
				this.currentbehaviour.lastMouseDownCoord = currentEvent.mouseCoordinates;
				this.currentbehaviour.lastMouseDownTimestampms = currentEvent.timestampms;

				this.currentbehaviour.mouseDownStreakDuration = 0;
				this.currentbehaviour.totalDistanceBetweenClicks = 0;

				this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,currentEvent);

				this.currentbehaviour.pageSize = pageSize;
				this.currentbehaviour.clickCounter = 1;

				this.lastMouseDown = currentEvent;
			}

			//if it's a mouse event AND it's within threshold from the previous one
			else if ((currentEvent.timestampms - this.lastMouseDown.timestampms) < this.thresholdWithinMousedown){

				this.currentbehaviour.mouseDownStreakDuration = currentEvent.timestampms - this.currentbehaviour.firstMouseDownTimestampms;
				this.currentbehaviour.totalDistanceBetweenClicks = Math
											.sqrt(Math.pow(currentEvent.mouseCoordinates.coordX
																- this.lastMouseDown.mouseCoordinates.coordX,
															2)
													+ Math.pow(currentEvent.mouseCoordinates.coordY
																- this.lastMouseDown.mouseCoordinates.coordY,
															2));

				this.currentbehaviour.lastMouseDownNode = currentEvent.nodeInfo;
				this.currentbehaviour.lastMouseDownCoord = currentEvent.mouseCoordinates;
				this.currentbehaviour.firstMouseDownTimestampms = currentEvent.timestampms;


				this.currentbehaviour.clickCounter ++;

				this.lastMouseDown = currentEvent;

				return ("##PROCESS: mousedown within previous one found");
			}
			//there was a mousedown, but it was later than the within threshold
			else{
				//we store current behaviour IF the number of clicks was above threshold
				if (this.currentbehaviour.clickCounter > this.clickNumberThreshold){
					this.failToClickList.push(this.currentbehaviour);
				}
				//we start a new behaviour with current mousedown
				this.currentbehaviour = new Object();

				this.currentbehaviour.firstMouseDownNode = currentEvent.nodeInfo;
				this.currentbehaviour.firstMouseDownCoord = currentEvent.mouseCoordinates;

				this.currentbehaviour.lastMouseDownNode = currentEvent.nodeInfo;
				this.currentbehaviour.lastMouseDownCoord = currentEvent.mouseCoordinates;

				this.currentbehaviour.mouseDownStreakDuration = 0;
				this.currentbehaviour.totalDistanceBetweenClicks = 0;

				this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,currentEvent);

				this.currentbehaviour.pageSize = pageSize;
				this.currentbehaviour.clickCounter = 1;

				this.lastMouseDown = currentEvent;
			}

		}
	}

	FailToClick.prototype.endBehaviour = function(currentEvent) {
		//we store current behaviour IF the number of clicks was above threshold
		if (this.lastMouseDown != null
			&& this.currentbehaviour.clickCounter > this.clickNumberThreshold){
			this.failToClickList.push(this.currentbehaviour);
		}
		//we reset the values so next mousemove is considered as first
		this.lastMouseDown = null;
	}

	FailToClick.prototype.outputResult = function() {

		return this.failToClickList;
	}
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF FailToClick/////////////////////////////


	//////////////////////////START OF IdleAfterClick/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////

	function IdleAfterClick(){

		//This will be a list containing all the behaviours.
		this.idleAfterClickList =[];

		//previous occurrence of the event to be compared to
		this.lastMouseUp = null;
		this.lastMouseDown = null;

		this.currentbehaviour = null;

		this.idleThreshold = 0;

	}

	//We call this function for all mouserelated events
	IdleAfterClick.prototype.processEvent = function(currentEvent, pageSize) {

		//We always store the latest mouseup
		if (currentEvent.event == mouseUpEvent){
			this.lastMouseUp = currentEvent;
		}
		//We always store the latest mousedown
		else if (currentEvent.event == mouseDownEvent){
			this.lastMouseDown = currentEvent;
		}
		//if any other event (except from domchange) is found AND we have a lastMouseup
		else if (this.lastMouseUp != null
				&& this.lastMouseDown != null
				&& currentEvent.event != "domchange"){
			//we store current behaviour IF the idle time between lastmouseup and currentEvent is higher than threshold
			//if ((currentEvent.timestampms - this.lastMouseUp.timestampms) >= this.idleThreshold){
				this.currentbehaviour = new Object();

				this.currentbehaviour.mouseDownNode = this.lastMouseDown.nodeInfo;
				this.currentbehaviour.mouseUpNode = this.lastMouseUp.nodeInfo;
				this.currentbehaviour.eventAfterClick = currentEvent;

				this.currentbehaviour.mouseDownCoord = this.lastMouseDown.mouseCoordinates;

				this.currentbehaviour.timeAfterClick = (currentEvent.timestampms - this.lastMouseUp.timestampms);

				this.currentbehaviour.pageSize = pageSize;
				this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,this.lastMouseDown)

				this.currentbehaviour.mouseDownTimestampms = this.lastMouseDown.timestampms;
				this.currentbehaviour.mouseUpTimestampms = this.lastMouseUp.timestampms;


				this.idleAfterClickList.push(this.currentbehaviour);
			//}
			//we reset the values
			this.lastMouseUp = null;
			this.lastMouseDown = null;
		}
	}

	/**
	 * We really don't need to do anything in this function, but I will leave it for consistency
	 */
	IdleAfterClick.prototype.endBehaviour = function(currentEvent) {

	}

	IdleAfterClick.prototype.outputResult = function() {

		return this.idleAfterClickList;
	}
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF IdleAfterClick/////////////////////////////



	//////////////////////////START OF LackOfMousePrecision/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////

	function LackOfMousePrecision(){

		//This will be a list containing all the behaviours.
		this.lackOfMousePrecisionList =[];

		//We keep a list of all mouseovers, until we find a click, after that this list will reset
		//we will use the ".unshift(Object)" to push elements to the start, so they are ordered chronologically inverse
		this.mouseOverList = [];

		this.currentbehaviour = null;

		this.beforeMouseClickThreshold = 10000;

	}

	//We call this function for all mouserelated events
	LackOfMousePrecision.prototype.processEvent = function(currentEvent, pageSize) {


		//We always store the latest mouseup
		if (currentEvent.event == mouseOverEvent){
			this.mouseOverList.unshift(currentEvent);
		}

		//if a mousedown is found we need to look for mouseovers with the same node
		else if (currentEvent.event == mouseDownEvent){

			this.currentbehaviour = new Object();

			this.currentbehaviour.nodeInfo = currentEvent.nodeInfo;
			this.currentbehaviour.mouseOverCounter = 0;
			this.currentbehaviour.firstMouseOverTime = 0;
			this.currentbehaviour.mouseOverTimeList = "[";

			this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,currentEvent);

			this.currentbehaviour.visitCounter = currentEvent.visitCounter;
			this.currentbehaviour.visitDuration = currentEvent.visitDuration;

			this.currentbehaviour.pageSize = pageSize;
			//we loop through past mouseovers as long as the times restrictions apply
			for (var i=0; i < this.mouseOverList.length
				&& (currentEvent.timestampms - this.mouseOverList[i].timestampms) < this.beforeMouseClickThreshold
				;i++)
			{
				//if the node is the same, we keep it
				if (getNodeInfo(currentEvent.nodeInfo) == getNodeInfo(this.mouseOverList[i].nodeInfo)){

					this.currentbehaviour.mouseOverTimeList += (this.mouseOverList[i].timestampms - currentEvent.timestampms) + ",";
					this.currentbehaviour.firstMouseOverTime = (this.mouseOverList[i].timestampms - currentEvent.timestampms);
					this.currentbehaviour.mouseOverCounter ++;
				}
			}

			//if after going through all mouseovers, we have found more than 1, report it
			if (this.currentbehaviour.mouseOverCounter > 1){
				//we remove the last ",", and we add a "["
				this.currentbehaviour.mouseOverTimeList = this.currentbehaviour.mouseOverTimeList.substring(0,this.currentbehaviour.mouseOverTimeList.length-1)
															+ "]";
				this.lackOfMousePrecisionList.push(this.currentbehaviour);
			}

			//whatever happens, this behaviour occurrence has ended. Reset.
			this.mouseOverList = [];
		}
	}

	/**
	 * We really don't need to do anything in this function, but I will leave it for consistency
	 */
	LackOfMousePrecision.prototype.endBehaviour = function(currentEvent) {

	}

	LackOfMousePrecision.prototype.outputResult = function() {

		return this.lackOfMousePrecisionList;
	}
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF LackOfMousePrecision/////////////////////////////


	//////////////////////////START OF RepeatedClicks/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////

	function RepeatedClicks(){

		//This will be a list containing all the behaviours.
		this.repeatedClicksList =[];

		//We keep a list of all mouseovers, until we find a click, after that this list will reset
		//we will use the ".unshift(Object)" to push elements to the start, so they are ordered chronologically inverse
		this.lastMouseDown = null;
		this.currentbehaviour = null;

		this.betweenClicksThreshold = 3000;

	}

	//We call this function for all mouserelated events
	RepeatedClicks.prototype.processEvent = function(currentEvent, pageSize) {

		if (currentEvent.event == mouseDownEvent){
			//first mousedown
			if (this.lastMouseDown==null){
				this.lastMouseDown = currentEvent;

				this.currentbehaviour = new Object();
				this.currentbehaviour.numberOfClicks = 1;
				this.currentbehaviour.timeBetweenClicks = "[";
				this.currentbehaviour.totalTimeBetweenClicks = 0;
				this.currentbehaviour.firstClickTime = currentEvent.timestamp;
				this.currentbehaviour.firstClickTimems = currentEvent.timestampms;
				this.currentbehaviour.lastClickTime = currentEvent.timestamp;
				this.currentbehaviour.lastClickTimems = currentEvent.timestampms;
				this.currentbehaviour.nodeInfo = currentEvent.nodeInfo;

				this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,currentEvent);

				this.currentbehaviour.pageSize = pageSize;
			}

			//later mousedowns, store if it's the same node AND is within time threshold
			else if ((currentEvent.timestampms - this.lastMouseDown.timestampms) < this.betweenClicksThreshold
					&& (getNodeInfo(currentEvent.nodeInfo) == getNodeInfo(this.lastMouseDown.nodeInfo))){

				this.currentbehaviour.numberOfClicks ++;
				this.currentbehaviour.timeBetweenClicks += (currentEvent.timestampms - this.currentbehaviour.lastClickTimems) + ",";
				this.currentbehaviour.totalTimeBetweenClicks = currentEvent.timestampms - this.currentbehaviour.firstClickTimems;
				this.currentbehaviour.lastClickTime = currentEvent.timestamp;
				this.currentbehaviour.lastClickTimems = currentEvent.timestampms;
			}

			//if it doesn't comply to either timeThreshold OR equal nodes
			else{
				//store existing behaviour
				if (this.currentbehaviour.numberOfClicks > 1){
					this.currentbehaviour.timeBetweenClicks = this.currentbehaviour.timeBetweenClicks.substring(0,this.currentbehaviour.timeBetweenClicks.length-1)
															+ "]";
					this.repeatedClicksList.push(this.currentbehaviour);
				}

				//start a new behaviour with current mousedown
				this.lastMouseDown = currentEvent;
				this.currentbehaviour = new Object();
				this.currentbehaviour.numberOfClicks = 1;
				this.currentbehaviour.timeBetweenClicks = "[";
				this.currentbehaviour.totalTimeBetweenClicks = 0;
				this.currentbehaviour.firstClickTime = currentEvent.timestamp;
				this.currentbehaviour.firstClickTimems = currentEvent.timestampms;
				this.currentbehaviour.lastClickTime = currentEvent.timestamp;
				this.currentbehaviour.lastClickTimems = currentEvent.timestampms;
				this.currentbehaviour.nodeInfo = currentEvent.nodeInfo;

				this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,currentEvent);

				this.currentbehaviour.pageSize = pageSize;
			}
		}
	}


	RepeatedClicks.prototype.endBehaviour = function(currentEvent) {
		if (this.lastMousedown != null
			&& this.currentbehaviour.numberOfClicks > 1){
			this.currentbehaviour.timeBetweenClicks = this.currentbehaviour.timeBetweenClicks.substring(0,this.currentbehaviour.timeBetweenClicks.length-1)
													+ "]";
			this.repeatedClicksList.push(this.currentbehaviour);
		}

		this.lastMouseDown = null;
		this.currentbehaviour = null;
	}

	RepeatedClicks.prototype.outputResult = function() {

		return this.repeatedClicksList;
	}
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF RepeatedClicks/////////////////////////////


	//////////////////////////START OF FailToClickDiffNode/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * This specific behaviour will collect all possible behaviours, and then will select the longest one
	 * in which the user actually clicked on a node element which was different from all the previous ones.
	 */
	function FailToClickDiffNode(){

		//This will be a list containing all the behaviours.
		this.failToClickDiffNodeList =[];

		//We keep a list of all mouseovers, until we find a click, after that this list will reset
		//we will use the ".unshift(Object)" to push elements to the start, so they are ordered chronologically inverse
		this.lastMouseDown = null;
		this.currentbehaviour = null;
		this.listOfPossibleBehaviours = [];

		this.betweenClicksThreshold = 5000;

	}

	//We call this function for all mouserelated events
	FailToClickDiffNode.prototype.processEvent = function(currentEvent, pageSize) {

		if (currentEvent.event == mouseDownEvent){
			//first mousedown
			if (this.lastMousedown == null){
				this.lastMouseDown = currentEvent;

				this.currentbehaviour = new Object();
				this.currentbehaviour.numberOfClicks = 1;
				this.currentbehaviour.timeBetweenClicks = "[";
				this.currentbehaviour.totalTimeBetweenClicks = 0;
				this.currentbehaviour.firstClickTime = currentEvent.timestamp;
				this.currentbehaviour.firstClickTimems = currentEvent.timestampms;
				this.currentbehaviour.lastClickTime = currentEvent.timestamp;
				this.currentbehaviour.lastClickTimems = currentEvent.timestampms;
				this.currentbehaviour.nodeInfo = currentEvent.nodeInfo;

				this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,currentEvent);

				this.currentbehaviour.pageSize = pageSize;
				this.currentbehaviour.nodeInfoList = [];
				this.currentbehaviour.nodeInfoList.push(currentEvent.nodeInfo);
				//This boolean keeps track of the eligibility of this current behaviour.
				this.currentbehaviour.isLastClickedNodeDiff = false;

				/*
				 * We want to keep the longest click streak in which the last node has not been clicked before.
				 * In order to do that, we need to create a new behaviour for each click we find.
				 * When the time constraint is violated the longest behaviour conforming to the rule will be reported.
				 */
 				this.listOfPossibleBehaviours = [];

				this.listOfPossibleBehaviours.unshift(this.currentbehaviour);
			}
			//later mousedowns, store if is within time threshold
			else if ((currentEvent.timestampms - this.lastMouseDown.timestampms) < this.betweenClicksThreshold){

				this.currentbehaviour.numberOfClicks ++;
				this.currentbehaviour.timeBetweenClicks += (currentEvent.timestampms - this.currentbehaviour.lastClickTimems) + ",";
				this.currentbehaviour.totalTimeBetweenClicks = currentEvent.timestampms - this.currentbehaviour.firstClickTimems;
				this.currentbehaviour.lastClickTime = currentEvent.timestamp;
				this.currentbehaviour.lastClickTimems = currentEvent.timestampms;

				//Check current list to see if this node had been clicked before
				this.currentbehaviour.isLastClickedNodeDiff = !(this.currentbehaviour.nodeInfoList
																.indexOf(getNodeInfo(currentEvent.nodeInfo)) > -1);
				this.currentbehaviour.nodeInfoList.push(currentEvent.nodeInfo);

				//it should remain unshift rather than push to leave longest ones at the start
				this.listOfPossibleBehaviours.unshift(this.currentbehaviour);
			}

			//if it doesn't comply to either timeThreshold OR equal nodes
			else{
				//loop through existing behaviours (longest one first)
				var eligibleBehaviourFound = false;
				for (var i=0; i < this.listOfPossibleBehaviours.length&& !eligibleBehaviourFound;i++){

					//for each element of possible behaviours, check their eligibility. As soon as we find one, report it (it should be the longest)
					if (this.listOfPossibleBehaviours[i].isLastClickedNodeDiff){

						this.currentbehaviour = this.listOfPossibleBehaviours[i];

						if (this.currentbehaviour.numberOfClicks > 1){
							this.currentbehaviour.timeBetweenClicks = this.currentbehaviour.timeBetweenClicks.substring(0,this.currentbehaviour.timeBetweenClicks.length-1)
										+ "]";
							this.failToClickDiffNodeList.push(this.currentbehaviour);
							eligibleBehaviourFound = true;
						}
					}
				}
				//reset list
				this.lastMouseDown = null;
				this.currentbehaviour = null;
				this.listOfPossibleBehaviours = [];
			}
		}
	}


	FailToClickDiffNode.prototype.endBehaviour = function(currentEvent) {
		//loop through existing behaviours (longest one first)
		var eligibleBehaviourFound = false;
		for (var i=0; i < this.listOfPossibleBehaviours.length&& !eligibleBehaviourFound;i++){

			//for each list of possible behaviours, check their eligibility. As soon as we find one, report it (it should be the longest)
			if (this.listOfPossibleBehaviours[i].isLastClickedNodeDiff){
				if (this.currentbehaviour.numberOfClicks > 1){
					this.currentbehaviour.timeBetweenClicks = this.currentbehaviour.timeBetweenClicks.substring(0,this.currentbehaviour.timeBetweenClicks.length-1)
								+ "]";
					this.failToClickDiffNodeList.push(this.currentbehaviour);
					eligibleBehaviourFound = true;
				}
			}
		}
		//reset list
		this.lastMouseDown = null;
		this.currentbehaviour = null;
	}

	FailToClickDiffNode.prototype.outputResult = function() {

		return this.failToClickDiffNodeList;
	}
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF FailToClickDiffNode/////////////////////////////


	//////////////////////////START OF FailToClickIgnoreNode/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Unlike FailToClickDiffNode, this behaviour will include any repeated click as a behaviour,
	 * even if the last click takes place in a node clicked before
	 */
	function FailToClickIgnoreNode(){

		//This will be a list containing all the behaviours.
		this.failToClickIgnoreNodeList =[];

		//We keep a list of all mouseovers, until we find a click, after that this list will reset
		//we will use the ".unshift(Object)" to push elements to the start, so they are ordered chronologically inverse
		this.lastMouseDown = null;
		this.currentbehaviour = null;

		this.betweenClicksThreshold = 5000;

	}

	//We call this function for all mouserelated events
	FailToClickIgnoreNode.prototype.processEvent = function(currentEvent, pageSize) {

		if (currentEvent.event == mouseDownEvent){
			//first mousedown
			if (this.lastMousedown == null){
				this.lastMouseDown = currentEvent;

				this.currentbehaviour = new Object();
				this.currentbehaviour.numberOfClicks = 1;
				this.currentbehaviour.timeBetweenClicks = "[";
				this.currentbehaviour.totalTimeBetweenClicks = 0;
				this.currentbehaviour.firstClickTime = currentEvent.timestamp;
				this.currentbehaviour.firstClickTimems = currentEvent.timestampms;
				this.currentbehaviour.lastClickTime = currentEvent.timestamp;
				this.currentbehaviour.lastClickTimems = currentEvent.timestampms;
				this.currentbehaviour.nodeInfo = currentEvent.nodeInfo;

				this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,currentEvent);

				this.currentbehaviour.pageSize = pageSize;
			}
			//later mousedowns, store if is within time threshold
			else if ((currentEvent.timestampms - this.lastMouseDown.timestampms) < this.betweenClicksThreshold){

				this.currentbehaviour.numberOfClicks ++;
				this.currentbehaviour.timeBetweenClicks += (currentEvent.timestampms - this.currentbehaviour.lastClickTimems) + ",";
				this.currentbehaviour.totalTimeBetweenClicks = currentEvent.timestampms - this.currentbehaviour.firstClickTimems;
				this.currentbehaviour.lastClickTime = currentEvent.timestamp;
				this.currentbehaviour.lastClickTimems = currentEvent.timestampms;
			}

			//if it doesn't comply to either timeThreshold OR equal nodes
			else{
				if (this.currentbehaviour.numberOfClicks > 1){
					this.currentbehaviour.timeBetweenClicks = this.currentbehaviour.timeBetweenClicks.substring(0,this.currentbehaviour.timeBetweenClicks.length-1)
								+ "]";
					this.failToClickIgnoreNodeList.push(this.currentbehaviour);
				}

				//reset list
				this.lastMouseDown = null;
				this.currentbehaviour = null;
			}
		}
	}

	/**
	 * We really don't need to do anything in this function, but I will leave it for consistency
	 */
	FailToClickIgnoreNode.prototype.endBehaviour = function(currentEvent) {
		if (this.lastMousedown != null
			&& this.currentbehaviour.numberOfClicks > 1){
			this.currentbehaviour.timeBetweenClicks = this.currentbehaviour.timeBetweenClicks.substring(0,this.currentbehaviour.timeBetweenClicks.length-1)
						+ "]";
			this.failToClickIgnoreNodeList.push(this.currentbehaviour);
		}

		//reset list
		this.lastMouseDown = null;
		this.currentbehaviour = null;
	}

	FailToClickIgnoreNode.prototype.outputResult = function() {

		return this.failToClickIgnoreNodeList;
	}
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF FailToClickIgnoreNode/////////////////////////////


	//////////////////////////START OF ClickAfterLoad/////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////

	function ClickAfterLoad(){

		//This will be a list containing all the behaviours.
		this.clickAfterLoadList =[];

		//previous occurrence of the event to be compared to
		this.firstEvent = null;
		this.currentbehaviour = null;
		this.eventRecorded = false;

	}

	//We call this function for all mouserelated events
	ClickAfterLoad.prototype.processEvent = function(currentEvent, pageSize) {

		//if it's the first event, store it, it should be the load event, but it could just be any other mouse event.
		if (this.firstEvent == null){
			this.firstEvent = currentEvent;
		}

		//if it's a mousedown, record the value of this event, as well as the previous one
		else if (this.firstEvent!=null
				&& currentEvent.event == mouseDownEvent
				&& !this.eventRecorded){

			this.currentbehaviour = new Object();

			this.currentbehaviour.clickAfterLoadTime = currentEvent.timestampms - this.firstEvent.timestampms;

			this.currentbehaviour = addInfoToBehaviour(this.currentbehaviour,currentEvent)

			this.currentbehaviour.mouseDownNode = currentEvent.nodeInfo;
			this.currentbehaviour.firstEvent = this.firstEvent;

			this.currentbehaviour.mouseDownTimestampms = currentEvent.timestampms;
			this.currentbehaviour.firstEventTimestampms = this.firstEvent.timestampms;

			this.currentbehaviour.pageSize = pageSize;
			this.clickAfterLoadList.push(this.currentbehaviour);

			this.eventRecorded = true

			return ("##PROCESS: clickAfterLoad found");
		}
	}

	/**
	 * We really don't need to do anything in this function, but I will leave it for consistency
	 */
	ClickAfterLoad.prototype.endBehaviour = function(currentEvent) {

	}

	ClickAfterLoad.prototype.outputResult = function() {
		//return ("##OUTPUT: outputting " + this.controlledBehaviourList.length+" elements");

		return this.clickAfterLoadList;
	}
	///////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////END OF TimeToClickBehaviour/////////////////////////////



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

		//general variables for general scroll statistics per episode
		var mouseStatistics = new Object();
			mouseStatistics.mousedownCounter = 0;
			mouseStatistics.rightClickCounter = 0;
			mouseStatistics.middleClickCounter = 0;
			mouseStatistics.leftClickCounter = 0;
			mouseStatistics.unknownClickCounter = 0;
			mouseStatistics.mouseupCounter = 0;

		//We add what urlSession this object refers to. Depending on the mapReduce emit function, sdSession OR urlSession will remain the same.
		mouseStatistics.sdSessionCounter = 0;
		mouseStatistics.sdTimeSinceLastSession = 0;
		mouseStatistics.urlSessionCounter = 0;
		mouseStatistics.urlSinceLastSession = 0;
		mouseStatistics.calculatedActiveTimeMedian = 0;
		mouseStatistics.sessionstartmsMedian = 0;
		mouseStatistics.sdCalculatedActiveTimeMedian = 0;
		mouseStatistics.urlEpisodeLength = 0;

		var calculatedActiveTimeList = [];
		var sessionstartmsList = [];

		var sdCalculatedActiveTimeList = [];

		//Behaviour Objects
		var clickSpeed = new ClickSpeedBehaviour();
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


		for(var i in valuesArraySorted)
		{
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

			if (valueObject.event == mouseDownEvent){
				mouseStatistics.mousedownCounter ++;

				switch (valueObject.button)
				{
					case "l":
						mouseStatistics.leftClickCounter ++;
					    break;
					case "m":
		  				mouseStatistics.middleClickCounter ++;
					    break;
					case "r":
						mouseStatistics.rightClickCounter ++;
					    break;
					default:
						mouseStatistics.unknownClickCounter ++;
				}
			}
			else if (valueObject.event == mouseUpEvent){
				mouseStatistics.mouseupCounter ++;
			}

			//We add what urlSession this object refers to. Depending on the mapReduce emit function, sdSession OR urlSession will remain the same.
			if (mouseStatistics.sdSessionCounter == 0){
				mouseStatistics.sdSessionCounter = valueObject.sdSessionCounter;
				mouseStatistics.sdTimeSinceLastSession = valueObject.sdTimeSinceLastSession;
				mouseStatistics.urlSessionCounter = valueObject.urlSessionCounter;
				mouseStatistics.urlSinceLastSession = valueObject.urlSinceLastSession;
				mouseStatistics.urlEpisodeLength = valueObject.urlEpisodeLength;

				mouseStatistics.episodeUrlActivity = valueObject.episodeUrlActivity;
				mouseStatistics.episodeSdActivity = valueObject.episodeSdActivity;

			}
			else{
				//If any of them is different, store -1 (this will always happen with at least one of them
				if (mouseStatistics.sdSessionCounter != valueObject.sdSessionCounter) {mouseStatistics.sdSessionCounter=-1;}
				if (mouseStatistics.sdTimeSinceLastSession != valueObject.sdTimeSinceLastSession) {mouseStatistics.sdTimeSinceLastSession=-1;}
				if (mouseStatistics.urlSessionCounter != valueObject.urlSessionCounter) {mouseStatistics.urlSessionCounter=-1;}
				if (mouseStatistics.urlSinceLastSession != valueObject.urlSinceLastSession) {mouseStatistics.urlSinceLastSession=-1;}
				if (mouseStatistics.episodeUrlActivity != valueObject.episodeUrlActivity) {mouseStatistics.episodeUrlActivity=-1;}
				if (mouseStatistics.episodeSdActivity != valueObject.episodeSdActivity) {mouseStatistics.episodeSdActivity=-1;}
			}

			//Getting the episode timestamp and active time medians
			if (incorrectActTimeEvents.indexOf(valueObject.event) < 0){
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
			if (generalStatistics.previousvalueObject!=0){
				//previous object's timestamp should be smaller that current's

				var previousTimeNumber = Number(generalStatistics.previousvalueObject.timestampms);
				var currentTimeNumber = Number(valueObject.timestampms);

				if (previousTimeNumber > currentTimeNumber){
					generalStatistics.isArrayOrdered = -1;
					//timeDifference +="##" + previousTimeNumber +" is BIGGER than " + currentTimeNumber+"##";
					generalStatistics.valuesBiggerThanPrevious++;
				}
				else{
					//timeDifference += "##" + previousTimeNumber+" is SMALLER than " + currentTimeNumber+"##";
					//timeDifference += valueObject+",";
					generalStatistics.valuesSmallerThanPrevious++;
					generalStatistics.timeDifference += currentTimeNumber-previousTimeNumber;
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

		return{
			generalStatistics:generalStatistics,
			mouseStatistics:mouseStatistics,

			clickSpeed:clickSpeed.outputResult(),
			clickSpeedCounter:clickSpeed.outputResult().length,

			idleTime:idleTime.outputResult(),
			idleTimeCounter:idleTime.outputResult().length,

			timeToClick:timeToClick.outputResult(),
			timeToClickCounter:timeToClick.outputResult().length,

			//hoveringOver:hoveringOver.outputResult(),
			//hoveringOverCounter:hoveringOver.outputResult().length,

			failToClick:failToClick.outputResult(),
			failToClickCounter:failToClick.outputResult().length,

			idleAfterClick:idleAfterClick.outputResult(),
			idleAfterClickCounter:idleAfterClick.outputResult().length,

			lackOfMousePrecision:lackOfMousePrecision.outputResult(),
			lackOfMousePrecisionCounter:lackOfMousePrecision.outputResult().length,

			repeatedClicks:repeatedClicks.outputResult(),
			repeatedClicksCounter:repeatedClicks.outputResult().length,

			clickAfterLoad:clickAfterLoad.outputResult(),
			clickAfterLoadCounter:clickAfterLoad.outputResult().length,


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
			episodeStartms : fixEventTS(valuesArraySorted[0]).timestampms,
			episodeEndms : fixEventTS(valuesArraySorted[valuesArraySorted.length-1]).timestampms,

			episodeDurationms: Number(fixEventTS(valuesArraySorted[valuesArraySorted.length-1]).timestampms)- Number(fixEventTS(valuesArraySorted[0]).timestampms),

			eventsInEpisodeCounter : valuesArraySorted.length,

			debugLog:debugLog

		}
}

/**
 * Returns current date in a readable format
 */
function datestamp() {
	var currentDate 	= new Date();
	return currentDate.getFullYear() + "-" + completeDateVals(currentDate.getMonth()+1) + "-"
	  + completeDateVals(currentDate.getDate()) + "," + completeDateVals(currentDate.getHours())
	  + ":" + completeDateVals(currentDate.getMinutes())
	  + ":" + completeDateVals(currentDate.getSeconds())
	  + ":" + completeDateValsMilliseconds(currentDate.getMilliseconds());

}

/** Completes single-digit numbers by a "0"-prefix
 *  */
function completeDateVals(dateVal) {
	var dateVal = "" + dateVal;
	if (dateVal.length<2) return "0" + dateVal;
	else return dateVal;
}

/** Completes single-digit numbers by a "0"-prefix
 * This is a special case for milliseconds, in which we will add up to two zeros
 * */
function completeDateValsMilliseconds(dateVal) {
	var dateVal = "" + dateVal;
	if (dateVal.length<2) return "00" + dateVal;
	if (dateVal.length<3) return "0" + dateVal;
	else return dateVal;
}
