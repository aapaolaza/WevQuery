var mongoDAO;
var socketConnection;
var socketGeneric;
var socketInstance;
var patternMiningInterface;
const fs = require('fs');


function initialiseSockets(generalMongoDAO, generalSocketGeneric,
  generalSocketConnection, generalSocketInstance, generalPatternMiningInterface) {

  mongoDAO = generalMongoDAO;
  socketConnection = generalSocketConnection;
  socketGeneric = generalSocketGeneric;
  socketInstance = generalSocketInstance;
  patternMiningInterface = generalPatternMiningInterface;

  socketInstance.on('serverRequestPreparePatternDataset', function (data) {
    console.log(`serverRequestPreparePatternDataset, requesting pattern
      dataset for the following input ${data.resultTitleList}`);
    patternMiningInterface.preparePatternDataset(data.resultTitleList,
      function (err, patternDataset) {
        console.log("send clientPreparePatternDatasetProcessed");

        socketConnection.emit('clientPreparePatternDatasetProcessed', {
          'resultTitleList': data.resultTitleList,
          'patternDataset': patternDataset
        });
      }
    );
  });
}

module.exports.initialiseSockets = initialiseSockets;