/**
 * Queries the database and extracts the corresponding data to support
 * analysis of data in the client
 */

// ////We need to load the constants file
let constants;
let mongoLog;
let mongoDAO;

function setConstants(mapReduceConstants, mongoLogConstants, mongoDAOConstants) {
  constants = mapReduceConstants;
  mongoLog = mongoLogConstants;
  mongoDAO = mongoDAOConstants;
}


const fs = require('fs');
const util = require('util');

// This tag can be found in the "msg" field in the current ops command of MapReduce commands
const mapReduceTag = 'm/r';
const xmlQueryResults = 'xmlQueryResults';
const xmlQueryCatalog = 'xmlQueryCatalog';

// This prefix will be added to all queries
const queryCollectionPrefix = 'xmlQuery_';

const analysisResultsFolder = './Results/analysisResults';

const homeURL = 'http://www.cs.manchester.ac.uk/';
const homeURLReplace = 'HOME/';

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
  constants.connectAndValidateNodeJs((err, db) => {
    if (err) return console.error(`getQueryData() ERROR connecting to DB${err}`);
    mongoDAO.getCompletedQueries((err, resultCollectionList) => {
      let collectionsProcessed = 0;

      // keeps track of which collection is at which index
      const titleList = [];
      // keeps a list of all Url counts for all collections
      const allCollectionsList = [];
      // keeps a list of all unique urls to ease the construction of the final csv
      const uniqueUrls = [];

      resultCollectionList.forEach((resultCollectionTitle, collectionIndex, collectionsArray) => {
        // for each results collection, loop through its documents
        db.collection(queryCollectionPrefix + resultCollectionTitle.title).find({
          'value.xmlQueryCounter': { $gt: 0 },
        }).toArray((err, documents) => {
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
function getStackedChartDataAll(callback) {
  // all the occurrences for urls below this threshold of frequency will be removed before sending them out 
  const urlCountThreshold = 20;

  constants.connectAndValidateNodeJs((err, db) => {
    if (err) return console.error(`getStackedChartDataAll() ERROR connecting to DB${ err}`);
    mongoDAO.getCompletedQueries((err, resultCollectionList) => {
      let collectionsProcessed = 0;

      // keeps a list of all Url counts for all collections
      const allCollectionsList = [];
      // keeps a list of all unique urls to ease the construction of the final csv
      const uniqueUrls = [];
      // We keep track of the number of occurrences per URL, so we can return only the most popular subset
      const urlFreqCount = [];

      if (resultCollectionList.length == 0) {
        callback(null, [], []);
      }

      resultCollectionList.forEach((resultCollectionTitle, collectionIndex, collectionsArray) => {
        // for each results collection, loop through its documents
        db.collection(queryCollectionPrefix + resultCollectionTitle.title).find({
          'value.xmlQueryCounter': { $gt: 0 },
        }).toArray((err, documents) => {
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
 * Returns an object describing the general stats for the collections
 * It basically returns the same output as `getStackedChartDataAll`
 * but only has one item in the list of URLs
 */
function getStackedChartDataForResult(resultTitle, callback) {
  // all the occurrences for urls below this threshold of frequency will be removed before sending them out 
  const urlCountThreshold = 20;

  constants.connectAndValidateNodeJs((err, db) => {
    if (err) return console.error(`getStackedChartDataForResult() ERROR connecting to DB${ err}`);

    const collectionsProcessed = 0;

    // keeps a list of all Url counts for all collections
    const allCollectionsList = [];
    // keeps a list of all unique urls to ease the construction of the final csv
    const uniqueUrls = [];
    // We keep track of the number of occurrences per URL, so we can return only the most popular subset
    const urlFreqCount = [];

    // for each results collection, loop through its documents
    db.collection(queryCollectionPrefix + resultTitle).find({
      'value.xmlQueryCounter': { $gt: 0 },
    }).toArray((err, documents) => {
      console.log(`Returning ${  documents.length  } items`);

      // For each collection, create an object list of urls
      const collectionUrlCountList = {};

      // For each document, create a csv row
      documents.forEach((docElem, index) => {
        // each document might have several occurrences of the same behaviour

        for (var index in docElem.value.xmlQuery) {
          seqOccurence = docElem.value.xmlQuery[index];
          if (typeof collectionUrlCountList[docElem._id.url] === 'undefined') {
            collectionUrlCountList[docElem._id.url] = 1;
          } else {
            collectionUrlCountList[docElem._id.url]++;
          }
          if (uniqueUrls.indexOf(docElem._id.url) == -1) {
            uniqueUrls.push(docElem._id.url);
            urlFreqCount[uniqueUrls.indexOf(docElem._id.url)] = 0;
          } else {
            urlFreqCount[uniqueUrls.indexOf(docElem._id.url)]++;
          }
        }
      });

      if (countProperties(collectionUrlCountList) > 0) {
        const resultObject = {};
        resultObject.key = resultTitle;
        resultObject.valuesObjectArray = collectionUrlCountList;
        allCollectionsList.push(resultObject);
      }

      const freqUrlList = returnTop(uniqueUrls, urlFreqCount, urlCountThreshold);


      // Once we have processed all the data, I need to crate an array of x,y values for the graph
      // in this case, it will be an array of url, count pairs, but it needs to be an array for the graph to interpret it

      // We basically translate references to a URL into a number.
      // This number corresponds to the position of that URL in the freqUrlList list
      allCollectionsList.forEach((collectionObject, index) => {
        collectionObject.values = [];
        let urlObjectArray = collectionObject.valuesObjectArray;
        for (let valueIndex in urlObjectArray) {
          if (urlObjectArray.hasOwnProperty(valueIndex)) {
            if (freqUrlList.indexOf(valueIndex) > -1) {
              collectionObject.values.push({
                x: freqUrlList.indexOf(valueIndex),
                y: urlObjectArray[valueIndex],
              });
            }
          }
        }
      });

      callback(null, allCollectionsList, freqUrlList);
    });
  });
}


/**
 * Queries all finished queries and retrieves the event sequences
 * It groups them and counts them
 * @param [callback] Returns an array of event sequences, with a key value in the format "event1-event2-event3", and the value of the resulting count for that sequence.
 */

function getSunburstDataAll(callback) {
  // It will keep all sequences using the event names as indexes.
  const sequenceList = {};

  // keep a list of all unique event names
  const eventNameList = [];

  constants.connectAndValidateNodeJs((err, db) => {
    if (err) return console.error(`getSunburstDataAll() ERROR connecting to DB${ err}`);

    mongoDAO.getCompletedQueries((err, resultCollectionList) => {
      if (err) return console.error(`getSunburstDataAll() ERROR REQUESTING COMPLETED QUERIES${  err}`);
      let collectionsProcessed = 0;


      if (resultCollectionList.length == 0) {
        callback(null, [], []);
      }

      resultCollectionList.forEach((resultCollectionTitle, index, collectionsArray) => {
        console.log('getSunburstDataAll(): Processing ' + resultCollectionTitle.title);
        db.collection(queryCollectionPrefix + resultCollectionTitle.title).find({ 'value.xmlQueryCounter': { $gt: 0 } }).toArray((err, documents) => {
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

            console.log("getSunburstDataAll(): All collections processed");
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
 * Retrieves the event sequences for the given result
 * It groups them and counts them
 * @param [string] resultTitle the name of the result to return
 * @param [callback] Returns an array of event sequences, with a key value in the format "event1-event2-event3", and the value of the resulting count for that sequence.
 */

function getSunburstDataForResult(resultTitle, callback) {
  // It will keep all sequences using the event names as indexes.
  const sequenceList = {};

  // keep a list of all unique event names
  const eventNameList = [];

  constants.connectAndValidateNodeJs((err, db) => {
    if (err) return console.error(`getSunburstDataForResult() ERROR connecting to DB${err}`);

    console.log(`getSunburstDataForResult(): Processing ${resultTitle}`);
    db.collection(queryCollectionPrefix + resultTitle).find({ 'value.xmlQueryCounter': { $gt: 0 } }).toArray((err, documents) => {
      // for each document, loop for each event name
      documents.forEach((documentItem, index) => {
        let eventList = '';

        // The xmlQuery collection is nested twice (noted as a bug)
        documentItem.value.xmlQuery[0].forEach((eventItem, index) => {
          if (eventNameList.indexOf(eventItem.event) == -1)
            eventNameList.push(eventItem.event);

          if (index == 0)
            eventList += eventItem.event;
          else
            eventList += "-" + eventItem.event;
        });

        // using eventList as the index, increase the count for this sequence
        if (typeof sequenceList[eventList] === 'undefined') {
          sequenceList[eventList] = 1;
        } else {
          sequenceList[eventList]++;
        }
      });

      console.log('getSunburstDataForResult(): All collections processed');
      // All documents for all resultCollectionList have been collectionsProcessed
      // transform the object array into an array of key,values
      const sequenceArray = [];

      for (const prop in sequenceList) {
        if (sequenceList.hasOwnProperty(prop)) {
          const seqItem = {};
          seqItem.key = prop;
          seqItem.value = sequenceList[prop];
          sequenceArray.push(seqItem);
        }
      }

      callback(null, sequenceArray, eventNameList);
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

function getSankeyDataAll(callback) {
  // It will keep all sequences using the union of 2 event names as indexes.
  let transitionIndex = '';
  const sequenceList = {};

  // keep a list of all unique event names
  const eventNameList = [];

  // keep a list of all unique event names to ease the search of the index
  const nodesIndex = [];
  // Keep another list with pairs "name": label, to return to the client
  const nodes = [];

  // It will keep all sequences using the event names as indexes.
  const links = [];

  constants.connectAndValidateNodeJs((err, db) => {
    if (err) return console.error(`getSankeyDataAll() ERROR connecting to DB${err}`);

    mongoDAO.getCompletedQueries((err, resultCollectionList) => {
      if (err) return console.error(`getSankeyDataAll() ERROR REQUESTING COMPLETED QUERIES${  err}`);
      let collectionsProcessed = 0;

      if (resultCollectionList.length == 0) {
        const emptyTransitionObject = {
          nodes: [],
          links: [],
        };

        callback(null, emptyTransitionObject);
      }

      resultCollectionList.forEach((resultCollectionTitle, index, collectionsArray) => {
        console.log('getSankeyDataAll(): Processing ' + resultCollectionTitle.title);
        db.collection(queryCollectionPrefix + resultCollectionTitle.title).find({ 'value.xmlQueryCounter': { $gt: 0 } }).toArray((err, documents) => {
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

            console.log("getSankeyDataAll(): All collections processed");
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
 * Retrieves the event transitions for a given result
 * It groups them and counts them
 * @param [callback] Returns a single object containing two arrays:
 * nodes: A list of labels for the transitions
 * "nodes":[{"name":"Agricultural 'waste'"},{"name":"Bio-conversion"}]
 * links: A list of weighed transitions, referencing the index of the labels
 * "links":[{"source":0,"target":1,"value":124.729},{"source":1,"target":2,"value":0.597}]
 */

function getSankeyDataForResult(resultTitle, callback) {
  // It will keep all sequences using the union of 2 event names as indexes.
  let transitionIndex = '';
  const sequenceList = {};

  // keep a list of all unique event names
  const eventNameList = [];

  // keep a list of all unique event names to ease the search of the index
  const nodesIndex = [];
  // Keep another list with pairs "name": label, to return to the client
  const nodes = [];

  // It will keep all sequences using the event names as indexes.
  const links = [];

  constants.connectAndValidateNodeJs((err, db) => {
    if (err) return console.error(`getSankeyDataForResult() ERROR connecting to DB${err}`);

    console.log(`getSankeyDataForResult(): Processing ${resultTitle}`);
    db.collection(queryCollectionPrefix + resultTitle).find({ 'value.xmlQueryCounter': { $gt: 0 } }).toArray((err, documents) => {
      // for each document, loop for each event name
      documents.forEach((documentItem, index) => {
        let predecesor = '';

        // The xmlQuery collection is nested twice (noted as a bug)
        documentItem.value.xmlQuery[0].forEach((eventItem, index) => {
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

      // transform the array of transitions into source,target,value pairs, using nodes' indexes


      for (const prop in sequenceList) {
        if (sequenceList.hasOwnProperty(prop)) {
          const seqItem = {};
          // For each source and target, look for their corresponding index
          seqItem.source = nodesIndex.indexOf(prop.split('_')[0]);
          seqItem.target = nodesIndex.indexOf(prop.split('_')[1]);
          seqItem.value = sequenceList[prop];
          links.push(seqItem);
        }
      }
      const transitionObject = { nodes, links };

      callback(null, transitionObject);
    });
  });
}

/**
 * Given a frequency array, and a content array, it returns the top X most recurring elements
 */
function returnTop(contentArray, freqArray, threshold) {
  console.log('returnTop()');
  console.log(contentArray);
  freqArray.forEach((freqItem, index) => {
    if (isNaN(Number(freqItem))) { console.log(freqItem); }
  });
  // The regular Math.max doesn't work on node js. I need to call an abstract function for that
  console.log();

  const result = [];
  let index;
  let maxTemp;
  // Makes the max operation threshold times
  while (result.length < threshold) {
    maxTemp = freqArray.reduce((a, b) => Math.max(a, b), 0);
    index = freqArray.indexOf(maxTemp);

    // console.log("biggest element was:" + maxTemp);
    // console.log(contentArray[index]);
    // console.log(index);
    result.push(contentArray[index]);
    contentArray.splice(index, 1);
    freqArray.splice(index, 1);
  }
  console.log(`returning the top elements:${result}`);
  return result;
}

function countProperties(obj) {
  let count = 0;

  for (const prop in obj) {
    if (obj.hasOwnProperty(prop)) { ++count; }
  }

  return count;
}

function safeCsv(field) {
  return (util.format('%s', field).replace(',', '_'));
}

module.exports.setConstants = setConstants;
module.exports.getStackedChartDataAll = getStackedChartDataAll;
module.exports.getStackedChartDataForResult = getStackedChartDataForResult;
module.exports.getSunburstDataAll = getSunburstDataAll;
module.exports.getSunburstDataForResult = getSunburstDataForResult;
module.exports.getSankeyDataAll = getSankeyDataAll;
module.exports.getSankeyDataForResult = getSankeyDataForResult;
