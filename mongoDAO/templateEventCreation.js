
const async = require('async');

const typeList = [];

// NEVER USE SPACES FOR THE names
typeList.push({ id: null, tag: 'IMG', name: 'Image' });
typeList.push({ id: null, tag: 'A', name: 'Link' });
typeList.push({ id: null, tag: 'H1', name: 'Header1' });
typeList.push({ id: null, tag: 'H2', name: 'Header2' });
typeList.push({ id: null, tag: 'H3', name: 'Header3' });

// ID list based elements

const idList = ['PageHeader', 'graphic-tiles', 'Title', 'NavLine', 'FooterTip', 'FirstColumn', 'FooterUnder', 'ThirdColumn', 'FooterToe', 'twitter-widget-0', 'SecondColumn', 'Logo', 'news-tiles', 'q', 'Search', 'MainNavigation', 'MainBodyContent', 'ViewGoogleMap_btn', 'MobileTopNav_btn', 'Search_btn', 'Social', 'MobileBtns', 'PageFooter', 'AFif_uno462', 'AFif_duo462', 'main', 'AFif_uno448', 'AFif_duo448', 'suggestion_form'];

idList.forEach((idItem) => {
  typeList.push({ id: idItem, tag: null, name: idItem });
});

const eventTypeList = ['mousedown', 'mouseup', 'mouseover', 'mouseout'];

let constants;
let mongoLog;
let mongoDAO;

function setConstants(mapReduceConstants, mongoLogConstants, mongoDAOConstants) {
  constants = mapReduceConstants;
  mongoLog = mongoLogConstants;
  mongoDAO = mongoDAOConstants;
}


/**
 * Taking the typeList and eventTypeList variables,
 * it creates a collection of template queries to be run against
 * the database to extract the predefined template events
 */
function createTemplates(callback) {
  console.log(`Creating template queries for ${typeList.length} node element types for the following events ${eventTypeList}`);
  const documentList = [];
  typeList.forEach((typeObject) => {
    eventTypeList.forEach((eventType) => {
      const docObject = {};
      docObject.title = `${eventType}_${typeObject.name}`;
      docObject.description = `${eventType} on an element ${typeObject.name}`;
      docObject.queryXML = `<eql><event id="event1" pre="null" occurrences="1"><eventList>${eventType}</eventList>`;
      docObject.datems = new Date().getTime();
      docObject.readableDate = new Date().toISOString();

      // When looking for events with a specific ID, leave the nodeType empty
      if (typeObject.id) {
        docObject.queryXML += `<context type="NodeID" value="${typeObject.id}"/></event></eql>`;
      } else {
        // When looking for events with a specific nodeType, set the nodeID to null
        docObject.queryXML += `<context type="NodeType" value="${typeObject.tag}"/><context type="NodeID" value="${typeObject.id}"/></event></eql>`;
      }

      docObject.isTemplate = true; // added to identify template queries
      docObject.name = typeObject.name;
      docObject.nodeType = typeObject.tag;
      docObject.nodeID = typeObject.id;
      docObject.event = eventType;
      documentList.push(docObject);
    });
  });

  constants.connectAndValidateNodeJs((errConnection, db) => {
    if (errConnection) callback(errConnection);
    console.log(`Inserting ${documentList.length} elements`);
    // Remove existing template documents first
    db.collection(constants.xmlQueryCatalog).remove({ isTemplate: true },
      (removeErr) => {
        if (removeErr) {
          callback(removeErr);
        }
        db.collection(constants.xmlQueryCatalog).insertMany(documentList, (errInsertion, r) => {
          if (errConnection) return (errConnection);
          console.log(`All ${r.insertedCount} elements were inserted`);
          callback(null);
        });
      });
  });
}

/**
 * Goes through all the existing template queries and runs them
 * @param {boolean} force even if the query already exists, it overwrites it
 * @param {*} callback
 */
function runTemplateQueries(force, callback) {
  const queryOptions = {};

  queryOptions.isQueryStrict = true;
  queryOptions.urlRestriction = 'http://www.cs.manchester.ac.uk/';

  constants.connectAndValidateNodeJs((errConnection, db) => {
    db.collection(constants.xmlQueryCatalog).find({ isTemplate: true }).toArray(
      (err, queryCatalogList) => {
        db.collection(constants.xmlQueryResults).distinct('title', (errDistinct, resultTitleList) => {
          async.eachSeries(queryCatalogList, (queryCatalogObject, asyncCallback) => {
            // If query has been run already, and force mode is off, do nothing
            if (force || resultTitleList.indexOf(queryCatalogObject.title) === -1) {
              // has not been run yet, or it needs to be overwritten (force: true), run it
              mongoDAO.runXmlQuery(queryCatalogObject.title, queryCatalogObject.title,
                queryCatalogObject.queryXML, queryOptions,
                (finishedErr, queryTitle, querydbTitle, processTime, isQueryStrict) => {
                  console.log(`${queryCatalogObject.title} query finished in ${processTime} and stored in collection ${querydbTitle}, strictMode ${isQueryStrict}`);
                  setTemplateQueryFinished(queryTitle, processTime);
                  asyncCallback();
                },
                (startedErr, queryTitle, querydbTitle, xmlQuery, isQueryStrict) => {
                  console.log(`${queryCatalogObject.title} query started, strictMode ${isQueryStrict}`);
                  addNewTemplateQueryDocument(queryTitle, queryTitle, isQueryStrict, xmlQuery);
                });
            }
          }, (asyncErr) => {
            if (asyncErr) {
              console.log('One of the queries failed');
              callback(asyncErr);
            } else {
              console.log('All queries finished successfully');
              callback();
            }
          });
        });
      });
  });
}

/**
 * Initialise new template query document.
 * WARNING: There will always be a single result for each template!!!
 * It adds a new document with the current date, the name of the query, and its possible opid
 */
function addNewTemplateQueryDocument(queryTitle, resultTitle, isQueryStrict, xmlQuery) {
  console.log('addNewTemplateQueryDocument(): Adding the following document to the db');
  console.log(queryTitle);
  console.log(resultTitle);
  console.log(xmlQuery);

  let timerunning = -1;
  let queryMessage = '';
  let opid = -1;
  constants.connectAndValidateNodeJs((err, db) => {
    // Removed the processtime code as it was triggering errors when all template queries are run at the same time.
    // the following is equivalent to db.currentOp() in the shell
    db.eval('return db.currentOp()', (currentOpErr, opList) => {
      // console.log('currentOp',err,opList);
      opList.inprog.forEach((opObject) => {
        // From the queries being executed, find the one running on 
        // ucivitdb with the smallest time
        if (opObject.ns.indexOf(constants.mongoQueryDB) > -1 &&
          typeof opObject.msg !== 'undefined' &&
          opObject.msg.substring(0, constants.mapReduceTag.length) === constants.mapReduceTag) {
          // we found an operation running on the ucivitdb database
          console.log(`${opObject.opid} has been running for ${opObject.secs_running}secs and ${opObject.microsecs_running}microsecs`);
          if (timerunning === -1) {
            opid = opObject.opid;
            timerunning = opObject.microsecs_running;
            queryMessage = opObject.msg;
          } else if (opObject.microsecs_running < timerunning) {
            console.log('found a more recent query');
            opid = opObject.opid;
            timerunning = opObject.microsecs_running;
            queryMessage = opObject.msg;
          }
        }
      });

      const document = {
        title: queryTitle,
        queryXML: xmlQuery,
        resultTitle,
        isStrictMode: isQueryStrict,
        operationID: opid,
        microsecs_running: timerunning,
        datems: new Date().getTime(),
        readableDate: new Date().toISOString(),
        progress: traduceProgress(queryMessage),
        isTemplate: true,
        finished: false,
      };

      // Rather than inserting, we will upsert, and keep a single document per template.
      db.collection(constants.xmlQueryResults).update({ resultTitle }, document, { upsert: true },
        (insertErr) => {
          if (insertErr) console.error(`addNewTemplateQueryDocument() ERROR INSERTING QUERY DOCUMENT ${insertErr}`);
          console.log('addNewTemplateQueryDocument(): new result document stored correctly');
        });
    });
  });
}

/**
* Once a template query is completed, update its status, and the elapsed time
*/
function setTemplateQueryFinished(queryTitle, timems) {
  constants.connectAndValidateNodeJs((err, db) => {
    if (err) return console.error(`setTemplateQueryFinished() ERROR connecting to DB${err}`);
    db.collection(constants.xmlQueryCatalog).update({ title: queryTitle },
      { $set: { processtimems: timems } });

    db.collection(constants.xmlQueryResults).update({ title: queryTitle },
      {
        $set: {
          microsecs_running: -1,
          progress: 'Finished',
          finished: true,
        },
      });

    // Update the count of the found items, and the total
    // Update the number of usable elements
    db.collection(constants.queryCollectionPrefix + queryTitle)
      .find({ 'value.xmlQueryCounter': { $gt: 0 } })
      .count((countErr, count) => {
        db.collection(constants.xmlQueryResults).update({ title: queryTitle },
          { $set: { count } });
        db.collection(constants.xmlQueryCatalog).update({ title: queryTitle },
          { $set: { count } });
      });

    // Update the total number of episodes in which any of the events was found
    db.collection(constants.queryCollectionPrefix + queryTitle)
      .find()
      .count((countErr, count) => {
        db.collection(constants.xmlQueryResults).update({ title: queryTitle },
          { $set: { totalCount: count } });
        db.collection(constants.xmlQueryCatalog).update({ title: queryTitle },
          { $set: { totalCount: count } });
      });
  });
}


/**
 * Given the message from the DB, it transforms it into a readable progress report.
 * It will be either "Retrieving events" (step 1)
 * Or the number of the step, with the corresponding progress percentage
 * 
 * 
 * the progress is the DB looks like this:
 * "m/r: (1/3) emit phase M/R: (1/3) Emit Progress: 9625/1 962500%"
 * "m/r: (3/3) final reduce to collection M/R: (3/3) Final Reduce Progress: 17161/33441 51%"
 * So this function returns a readable string representing the progress
 * for the dashboard
 * 
 * Step 1: During the first step, no progress is known, as it's finding the corresponding events.
 * Step 2: too short for my algorithm, as just takes the events along to the second step
 * Step 3: a progress is given and I can report it.
 */
function traduceProgress(progressString) {
  // Extraction is hardcoded to this particular kind of report.
  // Return empty if no message is provided
  if (progressString == "") { return progressString; }
  //retrieve step number
  var step = progressString.split("(")[1][0];
  if (step != 1) {
    var progress = progressString.substring(progressString.length - 3, progressString.length - 1);
    return ("Step " + step + ":" + progress);
  }
  return "Step 1: retrieving events";
}

/**
 * Returns a list of all the nodeTypes and nodeIds from the template events.
 * @param {*} callback 
 */
function retrieveNodeTypeAndIDList(callback) {
  const nodeList = {};

  // NodeTypes are represented by the actual tag, relating to the DOM element
  // and the name, which represents an abstraction of the actual tag.
  // we'll keep a list of both, so we can return the abstraction to the user
  nodeList.nodeTags = [];
  nodeList.nodeTypes = [];
  nodeList.nodeIDs = [];
  nodeList.events = [];

  constants.connectAndValidateNodeJs((connErr, db) => {
    db.collection(constants.xmlQueryCatalog).find({ isTemplate: true }).toArray(
      (err, templateEventList) => {
        if (err) callback(err);
        templateEventList.forEach((templateEvent) => {
          if ((templateEvent.nodeType) &&
            nodeList.nodeTags.indexOf(templateEvent.nodeType) === -1) {
            // If it's the first time encountering the tag, store the tag and the name abstraction
            nodeList.nodeTags.push(templateEvent.nodeType);
            nodeList.nodeTypes.push(templateEvent.name);
          }
          if ((templateEvent.nodeID) &&
            nodeList.nodeIDs.indexOf(templateEvent.nodeID) === -1) {
            nodeList.nodeIDs.push(templateEvent.nodeID);
          }
          if ((templateEvent.event) &&
            nodeList.events.indexOf(templateEvent.event) === -1) {
            nodeList.events.push(templateEvent.event);
          }
        });
        callback(null, nodeList);
      });
  });
}

module.exports.setConstants = setConstants;
module.exports.createTemplates = createTemplates;
module.exports.runTemplateQueries = runTemplateQueries;
module.exports.retrieveNodeTypeAndIDList = retrieveNodeTypeAndIDList;
