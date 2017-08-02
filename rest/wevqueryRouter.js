/**
 * Modular router to handle requests based on wevquery
 * https://expressjs.com/en/guide/routing.html
 */


var express = require('express')
var mongoDAO = require('../mongoDAO/mongoDAO.js')




var router = express.Router()

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Wevquery router Time: ', Date.now())
  next()
})

/**
 * The root of the router returns a list of available queries
 */
router.get("/", function (req, res) {
  res.json({
    "error": false, "message": "MOVING interaction REST service",
    "routes": router.stack          // registered routes
      .filter(r => r.route)    // take out all the middleware
      .map(r => r.route.path)  // get all the paths
  });
});

// define the about route
router.get('/about', function (req, res) {
  res.send('MOVING interaction REST service')
})

/**
 * Retrieve the list of available queries
 */
router.get('/catalog', function (req, res) {
  mongoDAO.getCatalogQueries(
    function (err, catalogQueries) {
      res.json(catalogQueries);
    });
})


//For ucivitdb mock data, use the following rest query to test
// /loadToKeydown/?userid=0aCVHH9zoBm5&starttime=1454136343379&endtime=1456137344379&strictMode=false&fillEventInfo=false
router.route("/:queryname/")
  .get(function (req, res) {

    var queryName = req.params.queryname;

    var queryOptions = {};

    //Provides access to the parameters following the conventional ?name=value&name2=value2
    //If any of the following parameters is provided, store them as queryOptions

    if (typeof req.query.userid !== 'undefined')
      queryOptions.userList = [req.query.userid];

    if (typeof req.query.starttime !== 'undefined')
      queryOptions.startTimems = req.query.starttime.toString();

    if (typeof req.query.endtime !== 'undefined')
      queryOptions.endTimems = req.query.endtime.toString();

    if (typeof req.query.strictMode !== 'undefined')
      queryOptions.isQueryStrict = req.query.strictMode;


    if (typeof req.query.fillEventInfo !== 'undefined')
      queryOptions.fillEventInfo = req.query.fillEventInfo == "true";

    var title = queryName;

    //If any of the variables has not been defined, return an error
    if (queryName) {
      //Retrieve the information for that query
      mongoDAO.getCatalogQueryInfo(queryName, function (err, queryCatalogInfo) {
        if (queryCatalogInfo === null)
          res.json({ "error": true, "message": "The query '" + queryName + "' could not be found" });
        else {
          //Store the query into a new collection, with a temporary name
          mongoDAO.runXmlTempQuery(title, queryCatalogInfo.queryXML, queryOptions,
            function (err, queryTitle, queryCollName, processTime) {
              if (err) return console.error("wevQueryRouter() ERROR in endCallback " + err);
              //Query ended

              //Do we need to fill in ALL information for resulting events?
              if (queryOptions.fillEventInfo) {
                mongoDAO.feedQueryInformationByCollection(queryCollName, function (err) {
                  if (err) return console.error("WevQueryRouter: feedQueryInformationByCollection() ERROR connecting to DB" + err);
                  //The collection has been fed, return the collection, which is now FULL
                  returnResultsAndClean(res,queryCollName);
                });
              }
              else {
                //no need to fill in additional information, return collection as it is
                returnResultsAndClean(res,queryCollName);
              }
            },
            function (err, queryTitle, queryData) {
              if (err) return console.error("wevQueryRouter() ERROR in launchedCallback " + err);
              console.log("WevQueryRouter: getXmlQueryData() MapReduce started for query title" +
                queryTitle + " with query " + queryData);
            })
        }
      });
    }
    else
      res.json({ "error": true, "message": "wevqueryRouter /:queryname/ is missing variables" });
  })

/**
 * Given a response object and a query result collection name,
 * sends the results to the client and deletes the temporary collection.
 * @param {Response} res 
 * @param {String} queryCollName 
 */
function returnResultsAndClean(res,queryCollName) {
  //return the results, and delete the collection
  mongoDAO.getXmlQueryDataByCollection(queryCollName, function (err, title, itemList) {
    if (err) return console.error("WevQueryRouter: getXmlQueryData() ERROR connecting to DB" + err);
    console.log("wevQueryRouter() query ended, retrieving results");
    var jsonOutput = [];

    for (var index = 0; index < itemList.length; index++) {
      jsonOutput.push(itemList[index]);
    }
    res.json(jsonOutput);

    //Delete generated temporal collection
    mongoDAO.deleteTempResultCollection(queryCollName,
      function (err) {
        if (err) return console.error("WevQueryRouter: deleteTempResultCollection()" +
          "ERROR deleting: " + queryCollName + err);
      });
  });
}

function cleanUp() {
  featuresDAO.cleanUp();
}

module.exports = router;
module.exports.cleanUp = cleanUp;