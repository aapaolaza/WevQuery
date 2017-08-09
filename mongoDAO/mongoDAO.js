/**
 * Serves as the interface to the mongoDB modules.
 */

var databaseInfo = require("./databaseInfo.js");
var queryDocument = require("./queryDocumentBean.js");
var xmlToMongoDB = require("./XMLtoMongoDB.js");
var analyseData = require("./analyseData.js");

//The database connection is shared within the app, to reduce the number of opened connections
var mapReduceConstants = require("./MapReduceConstantsNode.js");
var mongoLogConstants = require("./mongoLog.js");

mongoLogConstants.setConstants(mapReduceConstants);
xmlToMongoDB.setConstants(mapReduceConstants, mongoLogConstants);
queryDocument.setConstants(mapReduceConstants, mongoLogConstants);
analyseData.setConstants(mapReduceConstants, mongoLogConstants, this);
databaseInfo.setConstants(mapReduceConstants, mongoLogConstants, this);


module.exports.requestDBname = databaseInfo.requestDBname;
module.exports.requestDBCollections = databaseInfo.requestDBCollections;
module.exports.requestIndexes = databaseInfo.requestIndexes;
module.exports.requestEventCountList = databaseInfo.requestEventCountList;
module.exports.requestUserListWithEvents = databaseInfo.requestUserListWithEvents;

module.exports.runXmlQuery = xmlToMongoDB.runXmlQuery;
module.exports.runXmlTempQuery = xmlToMongoDB.runXmlTempQuery;
module.exports.getXmlQueryData = xmlToMongoDB.getXmlQueryData;
module.exports.getXmlQueryDataByCollection = xmlToMongoDB.getXmlQueryDataByCollection;
module.exports.feedQueryInformationByCollection = xmlToMongoDB.feedQueryInformationByCollection;
module.exports.feedQueryResultsByTitle = xmlToMongoDB.feedQueryResultsByTitle;
module.exports.deleteResultCollection = xmlToMongoDB.deleteResultCollection;
module.exports.deleteTempResultCollection = xmlToMongoDB.deleteTempResultCollection;

module.exports.addNewQueryDocument = queryDocument.addNewQueryDocument;
module.exports.isQueryTitleInResults = queryDocument.isQueryTitleInResults;
module.exports.isQueryTitleInCatalog = queryDocument.isQueryTitleInCatalog;
module.exports.saveQuery = queryDocument.saveQuery;
module.exports.updateQueryStatus = queryDocument.updateQueryStatus;
module.exports.setQueryFinished = queryDocument.setQueryFinished;
module.exports.getCompletedQueries = queryDocument.getCompletedQueries;
module.exports.getCatalogQueries = queryDocument.getCatalogQueries;
module.exports.getCatalogQueryInfo = queryDocument.getCatalogQueryInfo;
module.exports.getResultsForCatalogQuery = queryDocument.getResultsForCatalogQuery;
module.exports.getRunningQueries = queryDocument.getRunningQueries;
module.exports.deleteCompletedQuery = queryDocument.deleteCompletedQuery;
module.exports.deleteCatalogQuery = queryDocument.deleteCatalogQuery;

module.exports.setConstants = analyseData.setConstants;
module.exports.getStackedChartDataAll = analyseData.getStackedChartDataAll;
module.exports.getStackedChartDataForResult = analyseData.getStackedChartDataForResult;
module.exports.getSunburstDataAll = analyseData.getSunburstDataAll;
module.exports.getSunburstDataForResult = analyseData.getSunburstDataForResult;
module.exports.getSankeyDataAll = analyseData.getSankeyDataAll;
module.exports.getSankeyDataForResult = analyseData.getSankeyDataForResult;

module.exports.initialiseIndexes = mapReduceConstants.initialiseIndexes;
module.exports.closeConnection = mapReduceConstants.closeConnection;
