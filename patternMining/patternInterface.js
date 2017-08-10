/**
 * Makes use of spmf.jar to launch various pattern mining algorithms
 */

const exec = require('child_process').exec;
const async = require('async');

/**
   * External package to ease the use of efficient binary search
   * and insertion in ordered arrays
   * Example use:
   * binarySearch(array,searchItem,searchFunction)
   */
const binarySearch = require('binarysearch');

// Used to create a hash of events' combined ID to be used as index
const crypto = require('crypto');

const fs = require('fs');

const folderName = 'patternMining';
const resultsFolderName = 'patternFiles';
const patternMiningJarFile = 'spmf.jar';

let mongoDAO;

function initialisePatternInterface(globalMongoDAO) {
  mongoDAO = globalMongoDAO;
}


/**
 * Runs the SPMF algorithm indicated by algoName.
 * inputFile and oututFile needs to be defined.
 * extraParams can be used to specify further paramenters for the execution, null otherwise
 * Example: java - jar spmf.jar run PrefixSpan contextPrefixSpan.txt output.txt 50%
 * 
 * Note: I have seen that using execFile is more efficient,
 * as it doesn't spawn a shell terminal. To be tested
 * 
 * @param {String} algoName
 * @param {String} inputFile
 * @param {String} outputFile
 * @param {String} extraParams
 */
function runSPMF(algoName, inputFile, outputFile, extraParams, callback) {
  let parameters = algoName;
  parameters += ` ${inputFile}`;
  parameters += ` ${outputFile}`;

  if (extraParams) {
    parameters += ` ${extraParams}`;
  }
  const execInstr = `java -jar ./${folderName}/${patternMiningJarFile} run ${parameters}`;
  console.log(`runSPMF with instructions: ${execInstr}`);
  const spmfProcess = exec(execInstr,
    // it might be necessary to remove the `.jar` from the file
    (error, stdout, stderr) => {
      console.log(`Output -> ${stdout}`);
      if (error !== null) {
        console.log(`Error -> ${error}`);
      }
      callback(error);
    });
}


/**
 * Runs the frequent sequential pattern mining algorithm
 * called PrefixSpan.
 * Takes inputFile as the input and stores the output of the algorithm in OutputFile
 * @param {String} inputFile 
 * @param {String} outputFile
 * @param {int} minimum support
 */
function itemPatApriori(inputFile, outputFile, minSupport) {
  console.log(`itemPatApriori started at ${new Date().toUTCString()}`);
  const algoName = 'Apriori';
  const extraParams = `${minSupport.toString()}%`;
  runSPMF(algoName, inputFile, outputFile, extraParams,
    (err) => {
      if (err) console.log(err);
      console.log(`itemPatApriori finished at ${new Date().toUTCString()}`);
    });
}

/**
 * Runs the frequent sequential pattern mining algorithm
 * called PrefixSpan.
 * Takes inputFile as the input and stores the output of the algorithm in OutputFile
 * @param {String} inputFile 
 * @param {String} outputFile
 * @param {int} minimum support
 */
function seqPatPrefixSpan(inputFile, outputFile, minSupport) {
  console.log(`seqPatPrefixSpan started at ${new Date().toUTCString()}`);
  const algoName = 'PrefixSpan';
  const extraParams = `${minSupport.toString()}%`;
  runSPMF(algoName, inputFile, outputFile, extraParams,
    (err) => {
      if (err) console.log(err);
      console.log(`seqPatPrefixSpan finished at ${new Date().toUTCString()}`);
    });
}


/**
 * patternDatasetObject provides the functionality to initialise and prepare a set of arrays
 * with information from a given set of results
 * TODO: decide on the behaviour of this algorithm when events
 * taking place during a behaviour are considered, as well as overlapping behaviours
 */

function PatternDatasetObject(name) {
  this.name = name;

  /** Array with the list of user/episode pairs
    * and the corresponding event sequences */
  this.patternArray = {};

  /**
    * The indexes employed in patternArray are hash keys of the _id
    * field in the database. This list contains the translation of the
    * hash into the _id object
    */
  this.patternArrayIndexList = {};

  /**
   * Rather than storing the whole event information, a code will be employed
   * to minimise the dataset size. This array contains the directory of events
   */
  this.eventSet = [];

  console.log(this);
}

/**
 * Custom search function to use so the array is timestamp ordered
 * @param {*} value 
 * @param {*} find 
 */
function tsSearchFunction(value, find) {
  if (value.timestampms > find.timestampms) return 1;
  else if (value.timestampms < find.timestampms) return -1;
  return 0;
}


/**
 * Takes a string as input and returns a hash
 * @param {String} data to be converted to hash
 */
function createHash(data) {
  return crypto.createHash('sha256').update(data).digest('base64');
}

/**
 * Given an idObject, initialises the corresponding position in
 * the array if it doesn't exist. Retuns the created index
 */
PatternDatasetObject.prototype.initialiseEpisode = function (idObject) {
  // create user/episode pair item index
  const patternArrayIndex = createHash(JSON.stringify(idObject));
  // store index value if it's new
  if (!this.patternArrayIndexList[patternArrayIndex]) {
    this.patternArrayIndexList[patternArrayIndex] = idObject;
  }
  // Initialise user/episode array if not exist
  if (!this.patternArray[patternArrayIndex]) {
    this.patternArray[patternArrayIndex] = [];
  }
  return patternArrayIndex;
};

/**
 * Helper that takes a patternArrayIndex, timestamp, and eventData
 * and stores the given eventData in the corresponding position.
 *
 * @param {string} patternArrayIndex 
 * @param {int} timestampms 
 * @param {object} eventData 
 */
PatternDatasetObject.prototype.pushPatternItem =
  function (patternArrayIndex, timestampms, eventName) {
    if (!this.patternArray[patternArrayIndex]) {
      return (`${patternArrayIndex} cannot be found in patternArray.
      Available indexes are:${Object.keys(this.patternArray)}`);
    }

    // Store the eventName in the eventSet if it doesn't already exist
    let eventKey = this.eventSet.indexOf(eventName);
    if (eventKey === -1) {
      this.eventSet.push(eventName);
      // the key to use is the index of the last inserted item
      eventKey = this.eventSet.length - 1;
    }

    // the event order key will be the timestampms, and instead of the event name
    // we will just store the eventKey
    // push the event into the episode subarray into the corresponding temporally ordered position
    binarySearch.insert(
      this.patternArray[patternArrayIndex],
      { timestampms, eventKey },
      tsSearchFunction);
    return true;
  };

/**
 * Simple function to print out the contents of the object
 */
PatternDatasetObject.prototype.print = function () {
  // console.log(this);
  console.log(this.patternArray);
  console.log(this.patternArrayIndexList);
};

/**
 * Simple function to print out the lengths of the contents of the object
 */
PatternDatasetObject.prototype.printCounts = function () {
  console.log(`patternArray: ${Object.keys(this.patternArray).length}`);
  console.log(`patternArrayIndexList: ${Object.keys(this.patternArrayIndexList).length}`);
  console.log(`eventSet: ${this.eventSet.length}`);
};


/**
 * Stores relevant information about the provided patternDataset
 * Information such as the eventSet index, and the full list of
 * sequences can be found here
 * @param {PatternDatasetObject} patternDataset
 */
function storePatternDatasetInfo(patternDataset) {
  const filename = `./${folderName}/${resultsFolderName}/${patternDataset.name}info.json`;
  fs.writeFile(filename, JSON.stringify(patternDataset, null, 2), 'utf-8');
}

/**
 * Given a PatternDataset object, it creates a textfile
 * suitable to be used as input for pattern mining
 * algorithms looking for frequent itemsets.
 * The input should be formatted as a text file 
 * in which each line corresponds to a set of items
 * 
 * @param {PatternDatasetObject} patternDataset 
 */
function prepareItemsetInput(patternDataset) {
  console.log(`Starting the prepareItemsetInput of ${patternDataset.name}`);
  const filename = `./${folderName}/${resultsFolderName}/${patternDataset.name}Itemset.txt`;
  const dataOutput = fs.createWriteStream(filename, { flags: 'w' });

  const seqIndexList = Object.keys(patternDataset.patternArray);
  seqIndexList.forEach((seqIndex) => {
    // If the sequence only has one item, ignore
    if (patternDataset.patternArray[seqIndex].length !== 1) {
      // For each sequence in the pattern array just print it out as a line
      let textLine = '';
      patternDataset.patternArray[seqIndex].forEach((eventOcurr) => {
        // For each item, print it out and add a space
        textLine += `${eventOcurr.eventKey} `;
      });
      dataOutput.write(`${textLine}\n`);
    }
  });
  console.log(`Finished the prepareItemsetInput of ${patternDataset.name}`);

  const outputFilename = `./${folderName}/${resultsFolderName}/${patternDataset.name}ItemsetApriori.txt`;
  itemPatApriori(filename, outputFilename, 2);
}


/**
 * Given a PatternDataset object, it creates a textfile
 * suitable to be used as input for pattern mining
 * algorithms looking for sequences.
 * The input should be formatted as a text file with
 * sequences of itemsets, which are events considered to be
 * taking place at the same time. Each item in an itemset is
 * separated with a space, and each itemset is separated
 * with a -1. The end of the sequence is marked with a -2.
 * 
 * @param {PatternDatasetObject} patternDataset
 */
function prepareSequenceInput(patternDataset) {
  console.log(`Starting the prepareSequenceInput of ${patternDataset.name}`);
  const filename = `./${folderName}/${resultsFolderName}/${patternDataset.name}Sequence.txt`;
  const dataOutput = fs.createWriteStream(filename, { flags: 'w' });

  const seqIndexList = Object.keys(patternDataset.patternArray);
  seqIndexList.forEach((seqIndex) => {
    // If the sequence only has one item, ignore
    if (patternDataset.patternArray[seqIndex].length !== 1) {
      // For each sequence in the pattern array just print it out as a line
      let textLine = '';
      patternDataset.patternArray[seqIndex].forEach((eventOcurr) => {
        // For each item, print it out and add a space and a -1 followed by another space
        textLine += `${eventOcurr.eventKey} -1 `;
      });
      // each line ends with a -2
      dataOutput.write(`${textLine} -2\n`);
    }
  });
  console.log(`Finished the prepareSequenceInput of ${patternDataset.name}`);

  const outputFilename = `./${folderName}/${resultsFolderName}/${patternDataset.name}SeqPrefixSpan.txt`;
  seqPatPrefixSpan(filename, outputFilename, 2);
}


/**
 * Given a list of result titles, creates an array of sequences of events.
 * TODO the format of this array is yet to be defined.
 * At the moment it will be:
 * MasterArray[UserEpisodePair[OrderedEvents]]
 * where UserEpisodePair is a hash of the _id object from the results in the database
 */
function createPatternDataset(resultTitleList, callback) {
  const patternDataset = new PatternDatasetObject(new Date().getTime());
  // It might look like a callback hell, but I am just using nested async.each functions
  // only the lowest level callback will be called from within the algorithm.
  // The rest of callbacks will be called from within callback functions

  // For each resultTitle
  async.each(resultTitleList, (resultTitle, resultTitleCallback) => {
    // retrieve result collection data
    mongoDAO.getXmlQueryData(resultTitle, (err, title, resultData) => {
      if (err) return console.error(`createPatternDataset: getXmlQueryData() ERROR connecting to DB ${err}`);
      // For each user/episode pair item in the result collection
      async.each(resultData, (resultItem, resultItemCallback) => {
        // Initialise the corresponding episode
        const patternArrayIndex = patternDataset.initialiseEpisode(resultItem._id);

        // For each behaviour occurrence in the user/episode
        async.each(resultItem.value.xmlQuery, (resultOccurr, resultOccurrCallback) => {
          // resultOcurr is an array of 1 to many items, a single timestamp needs to be defined
          const timestampms = resultOccurr[0].timestampms;
          // if a purging of all other overlapping events needs to be scheduled,
          // this is place to store the corresponding timestamps
          // For the time being, I will just take the first timestamp
          // for (var index = 0; index < resultOccurr.length; index++) {
          //   var resultOcurrItem = resultOccurr[index];
          //   timestampms
          // }
          patternDataset.pushPatternItem(patternArrayIndex, timestampms, resultTitle);
          // trigger the lowest level callback
          resultOccurrCallback();
        }, (resultOccurrErr) => {
          // all resultOccurrCallback ended or there was an error
          if (resultOccurrErr) console.log('A resultOccurr could not be processed');
          resultItemCallback();
        });
      }, (resultItemErr) => {
        // all resultListCallbacks ended or there was an error
        if (resultItemErr) console.log('A resultItem could not be processed');
        resultTitleCallback();
      });
      return null;
    });
  }, (err) => {
    // all resultListCallbacks ended or there was an error
    if (err) console.log('A resultTitle could not be processed');
    patternDataset.printCounts();
    console.log('All result titles from the following list have been processed:');
    console.log(resultTitleList);
    console.log(`There were ${patternDataset.patternArray.length} arrays`);
    callback(null, patternDataset);
    storePatternDatasetInfo(patternDataset);
    prepareItemsetInput(patternDataset);
    prepareSequenceInput(patternDataset);
  });
}

module.exports.initialisePatternInterface = initialisePatternInterface;
module.exports.createPatternDataset = createPatternDataset;
