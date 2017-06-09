/**
 * Serves as the interface to the mongoDB modules.
 */
var queryDocument = require("./queryDocumentBean.js");
var xmlToMongoDB = require("./XMLtoMongoDB.js");

//The database connection is shared within the app, to reduce the number of opened connections
var mapReduceConstants = require("./MapReduceConstantsNode.js");
var mongoLogConstants = require("./mongoLog.js");

mongoLogConstants.setConstants(mapReduceConstants);
xmlToMongoDB.setConstants(mapReduceConstants,mongoLogConstants);
queryDocument.setConstants(mapReduceConstants,mongoLogConstants);

module.exports.runXmlQuery = xmlToMongoDB.runXmlQuery;
module.exports.runXmlTempQuery = xmlToMongoDB.runXmlTempQuery;
module.exports.getXmlQueryData = xmlToMongoDB.getXmlQueryData;
module.exports.deleteResultCollection = xmlToMongoDB.deleteResultCollection;

module.exports.addNewQueryDocument = queryDocument.addNewQueryDocument;
module.exports.isQueryTitleUnique = queryDocument.isQueryTitleUnique;
module.exports.isQueryTitleInCatalog = queryDocument.isQueryTitleInCatalog;
module.exports.saveQuery = queryDocument.saveQuery;
module.exports.updateQueryStatus = queryDocument.updateQueryStatus;
module.exports.setQueryFinished = queryDocument.setQueryFinished;
module.exports.getCompletedQueries = queryDocument.getCompletedQueries;
module.exports.getCatalogQueries = queryDocument.getCatalogQueries;
module.exports.getCatalogQueryInfo = queryDocument.getCatalogQueryInfo;
module.exports.getRunningQueries = queryDocument.getRunningQueries;
module.exports.deleteCompletedQuery = queryDocument.deleteCompletedQuery;
module.exports.deleteCatalogQuery = queryDocument.deleteCatalogQuery;

module.exports.closeConnection = mapReduceConstants.closeConnection;
