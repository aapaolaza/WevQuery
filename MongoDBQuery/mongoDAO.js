/**
 * Serves as the interface to the mongoDB modules.
 */

var queryDocument = require("./queryDocumentBean.js");
var xmlToMongoDB = require("./XMLtoMongoDB.js");

module.exports.runXmlQuery = xmlToMongoDB.runXmlQuery;
module.exports.getQueryData = xmlToMongoDB.getQueryData;
module.exports.deleteResultCollection = xmlToMongoDB.deleteResultCollection;

module.exports.addNewQueryDocument = queryDocument.addNewQueryDocument;
module.exports.isQueryTitleUnique = queryDocument.isQueryTitleUnique;
module.exports.isQueryTitleInCatalog = queryDocument.isQueryTitleInCatalog;
module.exports.saveQuery = queryDocument.saveQuery;
module.exports.updateQueryStatus = queryDocument.updateQueryStatus;
module.exports.setQueryFinished = queryDocument.setQueryFinished;
module.exports.getCompletedQueries = queryDocument.getCompletedQueries;
module.exports.getCatalogQueries = queryDocument.getCatalogQueries;
module.exports.getRunningQueries = queryDocument.getRunningQueries;
module.exports.deleteCompletedQuery = queryDocument.deleteCompletedQuery;
module.exports.deleteCatalogQuery = queryDocument.deleteCatalogQuery;