let mongoDAO;
let socketConnection;
let socketGeneric;
let socketInstance;
let patternMiningInterface;

const fs = require('fs');


/**
 * Given the filename, reads it and sends the content to the client
 * @param {String} filename 
 */
function miningResultsReady(title, filename) {
  console.log(`miningResultsReady() for input:${title}`);
  fs.readFile(filename, 'utf8', (err, results) => {
    if (err) console.log(`miningResultsReady() problem reading file: ${err}`);

    socketConnection.emit('clientPatternResultsReady', { title, results: results });
  });
}


function initialiseSockets(generalMongoDAO, generalSocketGeneric,
  generalSocketConnection, generalSocketInstance, generalPatternMiningInterface) {
  mongoDAO = generalMongoDAO;
  socketConnection = generalSocketConnection;
  socketGeneric = generalSocketGeneric;
  socketInstance = generalSocketInstance;
  patternMiningInterface = generalPatternMiningInterface;

  socketInstance.on('serverRequestPreparePatternDataset', (data) => {
    console.log(`serverRequestPreparePatternDataset, requesting pattern
      dataset for the following input ${data.resultTitleList}`);
    patternMiningInterface.createPatternDataset(data,
      (err, patternDataset) => {
        console.log('send clientPreparePatternDatasetProcessed');

        socketConnection.emit('clientPreparePatternDatasetProcessed', {
          resultTitleList: data.resultTitleList,
          patternDataset,
        });
      }, miningResultsReady, miningResultsReady);
  });
}


module.exports.initialiseSockets = initialiseSockets;
