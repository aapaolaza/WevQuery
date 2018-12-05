/**
 * Serves as the interface to the mongoDB modules.
 */

const databaseInfo = require('./databaseInfo.js');
const queryDocument = require('./queryDocumentBean.js');
const xmlToMongoDB = require('./XMLtoMongoDB.js');
const analyseData = require('./analyseData.js');

// The database connection is shared within the app, to reduce the number of opened connections
const mapReduceConstants = require('./MapReduceConstantsNode.js');
const mongoLogConstants = require('./mongoLog.js');

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
module.exports.requestEvents = databaseInfo.requestEvents;
module.exports.requestMovingSearchHistory = databaseInfo.requestMovingSearchHistory;
module.exports.requestMovingResultClickList = databaseInfo.requestMovingResultClickList;

module.exports.getEventCount = databaseInfo.getEventCount;
module.exports.getUniqueUserCount = databaseInfo.getUniqueUserCount;
module.exports.getUniqueEpisodes = databaseInfo.getUniqueEpisodes;

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

module.exports.stackedChart = analyseData.stackedChart;
module.exports.getEventSequences = analyseData.getEventSequences;
module.exports.getAllEventTransitions = analyseData.getAllEventTransitions;

module.exports.closeConnection = mapReduceConstants.closeConnection;
