/**
 * Queries the database and extracts the corresponding data to support
 * analysis of data in the client
 */

//////We need to load the constants file
var constants;
var mongoLog;
var mongoDAO;

function setConstants(mapReduceConstants,mongoLogConstants,mongoDAOConstants){
  constants = mapReduceConstants;
  mongoLog = mongoLogConstants;
  mongoDAO = mongoDAOConstants;
}


var fs = require('fs');
var util = require('util');

//This tag can be found in the "msg" field in the current ops command of MapReduce commands
const mapReduceTag = "m/r";
const xmlQueryResults = "xmlQueryResults";
const xmlQueryCatalog = "xmlQueryCatalog";

//This prefix will be added to all queries
const queryCollectionPrefix = "xmlQuery_"

const analysisResultsFolder = "./Results/analysisResults";

const homeURL = "http://www.cs.manchester.ac.uk/";
const homeURLReplace = "HOME/";

/**
 * Provides a general overview of the data, taking into account all collections.
 * It is bespoke data for the https://bl.ocks.org/mbostock/3886208 graph
 * It creates a column for each behaviour, and the count of behaviours for each URL in each row.
 * URL,seq1,seq2,seq3
 * url1,count1,count2,count3
 * url2,count4,count5,count6
 * it returns a string with the filename of the created CSV
 */
function stackedChartCSV(callback) {


  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("getQueryData() ERROR connecting to DB" + err);
    mongoDAO.getCompletedQueries(function (err, resultCollectionList) {
      var collectionsProcessed = 0;

      //keeps track of which collection is at which index
      var titleList = [];
      //keeps a list of all Url counts for all collections
      var allCollectionsList = [];
      //keeps a list of all unique urls to ease the construction of the final csv
      var uniqueUrls = [];

      resultCollectionList.forEach(function (resultCollectionTitle, collectionIndex, collectionsArray) {

        //for each results collection, loop through its documents
        db.collection(queryCollectionPrefix + resultCollectionTitle.title).find({
          "value.xmlQueryCounter": { $gt: 0 }
        }).toArray(function (err, documents) {
          console.log("Returning " + documents.length + " items");

          //For each collection, create an object list of urls
          var collectionUrlCountList = {}

          //For each document, create a csv row
          documents.forEach(function (docElem, index) {

            //each document might have several occurrences of the same behaviour
            for (var index in docElem.value.xmlQuery) {
              seqOccurence = docElem.value.xmlQuery[index];
              if (typeof collectionUrlCountList[docElem._id.url] === 'undefined') {
                collectionUrlCountList[docElem._id.url] = 1;
              }
              else {
                collectionUrlCountList[docElem._id.url]++;
              }
              if (uniqueUrls.indexOf(docElem._id.url) == -1)
                uniqueUrls.push(docElem._id.url)

              /*csvLine = "";
              csvLine += safeCsv(resultCollectionTitle.title) + ",";
              csvLine += safeCsv(docElem._id.url) + ",";
              //There is more information to extract, but as it's an unbounded list of elements, it's query dependent
              csvLine += safeCsv(docElem.value.generalStatistics.sessionstartmsMedian) + ",";
              csvLine += safeCsv(docElem.value.generalStatistics.calculatedActiveTimeMedian) + ",";
              csvLine += safeCsv(seqOccurence.length);
              //write csvLine to file
              dataOutput.write(csvLine + "\n");*/
            }
          });
          collectionsProcessed++;

          titleList[collectionIndex] = resultCollectionTitle.title;
          allCollectionsList[collectionIndex] = collectionUrlCountList;

          if (collectionsProcessed === collectionsArray.length) {

            var filename = analysisResultsFolder + "stackedChart.csv";

            //'w' flag directly overwrites the file if it exists
            var dataOutput = fs.createWriteStream(filename, { 'flags': 'w' });

            //fills in the headers
            var csvLine = "State,";
            titleList.forEach(function (title, index) {
              if (index == 0)
                csvLine += title;
              else
                csvLine += "," + title;
            });
            dataOutput.write(csvLine + "\n");

            //For each URL, create a row
            uniqueUrls.forEach(function (urlItem, index) {
              csvLine = "";
              csvLine = urlItem.replace(homeURL, homeURLReplace) + ",";

              allCollectionsList.forEach(function (collectionItem, index) {
                var csvAddToLine = ""
                if (typeof collectionItem[urlItem] === 'undefined')
                  csvAddToLine += 0;
                else
                  csvAddToLine += collectionItem[urlItem];

                if (index == 0)
                  csvLine += csvAddToLine;
                else
                  csvLine += "," + csvAddToLine;
              });
              dataOutput.write(csvLine + "\n");
            });

            //dataOutput.close();
            callback(null, filename);
            //all behaviours finished
          }
        });
      });

    });
  });
}


/**
 * Returns an object describing the general stats for the collections
 */
function stackedChart(callback) {
  //all the occurrences for urls below this threshold of frequency will be removed before sending them out 
  var urlCountThreshold = 20;

  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("getQueryData() ERROR connecting to DB" + err);
    mongoDAO.getCompletedQueries(function (err, resultCollectionList) {
      var collectionsProcessed = 0;

      //keeps a list of all Url counts for all collections
      var allCollectionsList = [];
      //keeps a list of all unique urls to ease the construction of the final csv
      var uniqueUrls = [];
      //We keep track of the number of occurrences per URL, so we can return only the most popular subset
      var urlFreqCount = [];

      resultCollectionList.forEach(function (resultCollectionTitle, collectionIndex, collectionsArray) {

        //for each results collection, loop through its documents
        db.collection(queryCollectionPrefix + resultCollectionTitle.title).find({
          "value.xmlQueryCounter": { $gt: 0 }
        }).toArray(function (err, documents) {
          console.log("Returning " + documents.length + " items");

          //For each collection, create an object list of urls
          var collectionUrlCountList = {};

          //For each document, create a csv row
          documents.forEach(function (docElem, index) {

            //each document might have several occurrences of the same behaviour

            for (var index in docElem.value.xmlQuery) {
              seqOccurence = docElem.value.xmlQuery[index];
              if (typeof collectionUrlCountList[docElem._id.url] === 'undefined') {
                collectionUrlCountList[docElem._id.url] = 1;
              }
              else {
                collectionUrlCountList[docElem._id.url]++;
              }
              if (uniqueUrls.indexOf(docElem._id.url) == -1) {
                uniqueUrls.push(docElem._id.url);
                urlFreqCount[uniqueUrls.indexOf(docElem._id.url)] = 0;
              }
              else {
                urlFreqCount[uniqueUrls.indexOf(docElem._id.url)]++;
              }
            }
          });



          collectionsProcessed++;
          if (countProperties(collectionUrlCountList) > 0) {
            var resultObject = {}
            resultObject.key = resultCollectionTitle.title;
            resultObject.valuesObjectArray = collectionUrlCountList;
            allCollectionsList.push(resultObject);
          }
          if (collectionsProcessed === collectionsArray.length) {
            //all behaviours finished asynchronously

            var freqUrlList = returnTop(uniqueUrls, urlFreqCount, urlCountThreshold)


            //Once we have processed all the data, I need to crate an array of x,y values for the graph
            //in this case, it will be an array of url, count pairs, but it needs to be an array for the graph to interpret it

            //We basically translate references to a URL into a number.
            //This number corresponds to the position of that URL in the freqUrlList list
            allCollectionsList.forEach(function (collectionObject, index) {

              collectionObject.values = [];
              var urlObjectArray = collectionObject.valuesObjectArray;
              for (var valueIndex in urlObjectArray) {
                if (urlObjectArray.hasOwnProperty(valueIndex)) {
                  if (freqUrlList.indexOf(valueIndex) > -1) {
                    collectionObject.values.push({
                      x: freqUrlList.indexOf(valueIndex),
                      y: urlObjectArray[valueIndex]
                    });
                  }
                }
              }
            });


            //For each URL, if the selected collection doesn't have it, add a '0' in that position
            /*uniqueUrls.forEach(function (urlItem, index) {
              allCollectionsList.forEach(function (collectionItem, index) {
                if (typeof collectionItem.values[urlItem] === 'undefined')
                 collectionItem.values[urlItem]= 0;
              });
            });*/

            callback(null, allCollectionsList, freqUrlList);
          }
        });
      });

    });
  });
}



/**
 * Queries all finished queries and retrieves the event sequences
 * It groups them and counts them
 * @param [callback] Returns an array of event sequences, with a key value in the format "event1-event2-event3", and the value of the resulting count for that sequence.
 */

function getEventSequences(callback) {

  //It will keep all sequences using the event names as indexes.
  var sequenceList = {};

  //keep a list of all unique event names
  var eventNameList = [];

  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("getEventSequences() ERROR connecting to DB" + err);

    mongoDAO.getCompletedQueries(function (err, resultCollectionList) {
      if (err) return console.error("getEventSequences() ERROR REQUESTING COMPLETED QUERIES" + err);
      var collectionsProcessed = 0;

      resultCollectionList.forEach(function (resultCollectionTitle, index, collectionsArray) {
        console.log("getEventSequences(): Processing " + resultCollectionTitle.title);
        db.collection(queryCollectionPrefix + resultCollectionTitle.title).find({ "value.xmlQueryCounter": { $gt: 0 } }).toArray(function (err, documents) {
          //for each document, loop for each event name
          documents.forEach(function (documentItem, index) {
            var eventList = "";

            //The xmlQuery collection is nested twice (noted as a bug)
            documentItem.value.xmlQuery[0].forEach(function (eventItem, index) {
              if (eventNameList.indexOf(eventItem.event) == -1)
                eventNameList.push(eventItem.event);

              if (index == 0)
                eventList += eventItem.event;
              else
                eventList += "-" + eventItem.event;
            });

            //using eventList as the index, increase the count for this sequence
            if (typeof sequenceList[eventList] === 'undefined') {
              sequenceList[eventList] = 1;
            }
            else {
              sequenceList[eventList]++;
            }

          });

          collectionsProcessed++;
          if (collectionsProcessed === collectionsArray.length) {

            console.log("getEventSequences(): All collections processed");
            //All documents for all resultCollectionList have been collectionsProcessed
            //transform the object array into an array of key,values
            var sequenceArray = [];

            for (var prop in sequenceList) {
              if (sequenceList.hasOwnProperty(prop)) {
                var seqItem = {}
                seqItem.key = prop;
                seqItem.value = sequenceList[prop];
                sequenceArray.push(seqItem);
              }
            }

            callback(null, sequenceArray, eventNameList);
          }
        });
      });
    });
  });
}

/**
 * Queries all finished queries and retrieves the event transitions
 * It groups them and counts them
 * @param [callback] Returns a single object containing two arrays:
 * nodes: A list of labels for the transitions
 * "nodes":[{"name":"Agricultural 'waste'"},{"name":"Bio-conversion"}]
 * links: A list of weighed transitions, referencing the index of the labels
 * "links":[{"source":0,"target":1,"value":124.729},{"source":1,"target":2,"value":0.597}]
 */

function getAllEventTransitions(callback) {
  //It will keep all sequences using the union of 2 event names as indexes.
  var transitionIndex = "";
  var sequenceList = {};

  //keep a list of all unique event names
  var eventNameList = [];

  //keep a list of all unique event names to ease the search of the index
  var nodesIndex = [];
  //Keep another list with pairs "name": label, to return to the client
  var nodes = [];

  //It will keep all sequences using the event names as indexes.
  var links = [];

  constants.connectAndValidateNodeJs(function (err, db) {
    if (err) return console.error("getEventTransitions() ERROR connecting to DB" + err);

    mongoDAO.getCompletedQueries(function (err, resultCollectionList) {
      if (err) return console.error("getEventTransitions() ERROR REQUESTING COMPLETED QUERIES" + err);
      var collectionsProcessed = 0;

      resultCollectionList.forEach(function (resultCollectionTitle, index, collectionsArray) {
        console.log("getEventTransitions(): Processing " + resultCollectionTitle.title);
        db.collection(queryCollectionPrefix + resultCollectionTitle.title).find({ "value.xmlQueryCounter": { $gt: 0 } }).toArray(function (err, documents) {
          //for each document, loop for each event name
          documents.forEach(function (documentItem, index) {
            var predecesor = "";

            //The xmlQuery collection is nested twice (noted as a bug)
            documentItem.value.xmlQuery[0].forEach(function (eventItem, index) {
              if (nodesIndex.indexOf(eventItem.event) == -1) {
                nodesIndex.push(eventItem.event);
                nodes.push({ "name": eventItem.event });
              }

              //If there has been a previous event, store the transition to the current one
              if (predecesor !== "") {
                //use both events as the index
                transitionIndex = predecesor + "_" + eventItem.event;
                if (typeof sequenceList[transitionIndex] === 'undefined') {
                  sequenceList[transitionIndex] = 1;
                }
                else {
                  sequenceList[transitionIndex]++;
                }
              }
              predecesor = eventItem.event;
            });
          });

          collectionsProcessed++;
          if (collectionsProcessed === collectionsArray.length) {

            console.log("getEventTransitions(): All collections processed");
            //All documents for all resultCollectionList have been processed

            //transform the array of transitions into source,target,value pairs, using nodes' indexes


            for (var prop in sequenceList) {
              if (sequenceList.hasOwnProperty(prop)) {
                var seqItem = {}
                //For each source and target, look for their corresponding index
                seqItem.source = nodesIndex.indexOf(prop.split("_")[0]);
                seqItem.target = nodesIndex.indexOf(prop.split("_")[1]);
                seqItem.value = sequenceList[prop];
                links.push(seqItem);
              }
            }
            var transitionObject = { nodes, links };

            callback(null, transitionObject);
          }
        });
      });
    });
  });
}

/**
 * Given a frequency array, and a content array, it returns the top X most recurring elements
 */
function returnTop(contentArray, freqArray, threshold) {
  console.log("returnTop()");
  console.log(contentArray);
  freqArray.forEach(function (freqItem, index) {
    if (isNaN(Number(freqItem)))
      console.log(freqItem);
  });
  //The regular Math.max doesn't work on node js. I need to call an abstract function for that
  console.log();

  var result = [];
  var index;
  var maxTemp;
  //Makes the max operation threshold times
  while (result.length < threshold) {
    maxTemp = freqArray.reduce(function (a, b) { return Math.max(a, b); }, 0);
    index = freqArray.indexOf(maxTemp);

    console.log("biggest element was:" + maxTemp);
    console.log(contentArray[index]);
    console.log(index);
    result.push(contentArray[index]);
    contentArray.splice(index, 1);
    freqArray.splice(index, 1);
  }
  console.log("returning the top elements:" + result)
  return result;
}

function countProperties(obj) {
  var count = 0;

  for (var prop in obj) {
    if (obj.hasOwnProperty(prop))
      ++count;
  }

  return count;
}

function safeCsv(field) {
  return (util.format("%s", field).replace(",", "_"));
}

module.exports.setConstants = setConstants;
module.exports.stackedChart = stackedChart;
module.exports.getEventSequences = getEventSequences;
module.exports.getAllEventTransitions = getAllEventTransitions;