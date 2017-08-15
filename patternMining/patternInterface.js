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
const readline = require('readline');

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

  this.filenames = {
    itemSet: `./${folderName}/${resultsFolderName}/${this.name}Itemset.txt`,
    itemSetOutput: `./${folderName}/${resultsFolderName}/${this.name}ItemsetApriori.txt`,
    itemSetOutputTranslated: `./${folderName}/${resultsFolderName}/${this.name}ItemsetAprioriTranslated.txt`,
    seqSet: `./${folderName}/${resultsFolderName}/${this.name}Seq.txt`,
    seqSetOutput: `./${folderName}/${resultsFolderName}/${this.name}SeqPrefixSpan.txt`,
    seqSetOutputTranslated: `./${folderName}/${resultsFolderName}/${this.name}SeqPrefixSpanTranslated.txt`,
  };

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
 */
PatternDatasetObject.prototype.storePatternDatasetInfo = function () {
  const filename = `./${folderName}/${resultsFolderName}/${this.name}info.json`;
  fs.writeFile(filename, JSON.stringify(this, null, 2), 'utf-8');
};

/**
 * Given a PatternDataset object, it creates a textfile
 * suitable to be used as input for pattern mining
 * algorithms looking for frequent itemsets.
 * The input should be formatted as a text file 
 * in which each line corresponds to a set of items
 * 
 */
PatternDatasetObject.prototype.prepareItemsetInput = function (callback) {
  console.log(`Starting the prepareItemsetInput of ${this.name}`);
  const dataOutput = fs.createWriteStream(this.filenames.itemSet, { flags: 'w' });

  const seqIndexList = Object.keys(this.patternArray);
  seqIndexList.forEach((seqIndex) => {
    // If the sequence only has one item, ignore
    if (this.patternArray[seqIndex].length !== 1) {
      // For each sequence in the pattern array just print it out as a line
      let textLine = '';
      this.patternArray[seqIndex].forEach((eventOcurr) => {
        // For each item, print it out and add a space
        textLine += `${eventOcurr.eventKey} `;
      });
      dataOutput.write(`${textLine}\n`);
    }
  });
  console.log(`Finished the prepareItemsetInput of ${this.name}`);
  callback();
};


/**
 * It translates the output from the itemset mining algorithms
 * replacing event keys into event names
 */
PatternDatasetObject.prototype.translateItemsetOutput = function (callback) {
  const rl = readline.createInterface({ input: fs.createReadStream(this.filenames.itemSetOutput) });

  // All the output is redirected to a new file
  const dataOutput = fs.createWriteStream(this.filenames.itemSetOutputTranslated, { flags: 'w' });

  // For each line in the output, split it by spaces (default separation)
  rl.on('line', (line) => {
    // when all the numbers in the seq have been processed, we will just print the rest as it is
    let seqProcessed = false;
    line.split(' ').forEach((seqItem) => {
      if (seqProcessed) {
        // the seq was processed, just print out the rest of characters
        dataOutput.write(seqItem);
      } else if (isNaN(seqItem)) {
        // Not a number, we are at the end of the seq, print the rest of the line
        dataOutput.write(`:${seqItem}`);
        seqProcessed = true;
      } else if (!isNaN(seqItem)) {
        // the only possible condition is being an index for eventset, but still test for number
        // use eventSent to retrieve the event's name
        dataOutput.write(this.eventSet[parseInt(seqItem, 10)]);
      }
    });
    // line finished, add new line
    dataOutput.write('\n');
  });

  // Triggered when input has been consumed
  rl.on('close', () => {
    callback();
  });
};

/**
 * Runs the frequent sequential pattern mining algorithm
 * called PrefixSpan.
 * Takes inputFile as the input and stores the output of the algorithm in OutputFile
 * @param {String} inputFile 
 * @param {String} outputFile
 * @param {int} minimum support
 */
PatternDatasetObject.prototype.itemPatApriori = function (minSupport, callback) {
  console.log(`itemPatApriori started at ${new Date().toUTCString()}`);
  const algoName = 'Apriori';
  const extraParams = `${minSupport.toString()}%`;
  runSPMF(algoName, this.filenames.itemSet, this.filenames.itemSetOutput, extraParams,
    (err) => {
      if (err) console.log(err);
      console.log(`itemPatApriori finished at ${new Date().toUTCString()}`);
      callback();
    });
};

PatternDatasetObject.prototype.runItemPatternMining = function (runCallback) {
  const patternDataset = this;
  async.waterfall([
    function (callback) {
      patternDataset.prepareItemsetInput(callback);
    },
    function (callback) {
      patternDataset.itemPatApriori(2, callback);
    },
    function (callback) {
      patternDataset.translateItemsetOutput(callback);
    },
  ], (err) => {
    if (err) console.log(`The following error was triggered during runItemPatternMining(): ${err}`);
    runCallback(`Itemset${patternDataset.name}`, patternDataset.filenames.itemSetOutputTranslated);
  });
};

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
 */
PatternDatasetObject.prototype.prepareSequenceInput = function (callback) {
  console.log(`Starting the prepareSequenceInput of ${this.name}`);
  const dataOutput = fs.createWriteStream(this.filenames.seqSet, { flags: 'w' });

  const seqIndexList = Object.keys(this.patternArray);
  seqIndexList.forEach((seqIndex) => {
    // If the sequence only has one item, ignore
    if (this.patternArray[seqIndex].length !== 1) {
      // For each sequence in the pattern array just print it out as a line
      let textLine = '';
      this.patternArray[seqIndex].forEach((eventOcurr) => {
        // For each item, print it out and add a space and a -1 followed by another space
        textLine += `${eventOcurr.eventKey} -1 `;
      });
      // each line ends with a -2 (NO SPACE!!!)
      dataOutput.write(`${textLine}-2\n`);
    }
  });
  console.log(`Finished the prepareSequenceInput of ${this.name}`);
  callback();
};

/**
 * It translates the output from the sequence mining algorithms
 * replacing event keys into event names
 * 
 */
PatternDatasetObject.prototype.translateSequenceOutput = function (callback) {
  const rl = readline.createInterface({ input: fs.createReadStream(this.filenames.seqSetOutput) });

  // All the output is redirected to a new file
  const dataOutput = fs.createWriteStream(this.filenames.seqSetOutputTranslated, { flags: 'w' });

  // For each line in the output, split it by spaces (default separation)
  rl.on('line', (line) => {
    // keep track if the item is the first one in its set, to delimit them with brackets
    let firstItemInSet = true;
    // when all the numbers in the seq have been processed, we will just print the rest as it is
    let seqProcessed = false;
    console.log(line);

    line.split(' ').forEach((seqItem) => {
      if (seqProcessed) {
        // the seq was processed, just print out the rest of characters
        dataOutput.write(seqItem);
      } else if (isNaN(seqItem)) {
        // Not a number, we are at the end of the seq, print the rest of the line
        dataOutput.write(seqItem);
        seqProcessed = true;
      } else if (seqItem === '-1') {
        // the item is an itemset separator
        dataOutput.write(']');
        firstItemInSet = true;
      } else if (!isNaN(seqItem)) {
        // the only possible condition is being an index for eventset, but still test for number
        // is part of an item, add it to an itemset by printing starting brackets or comma
        if (firstItemInSet) dataOutput.write('[');
        else dataOutput.write(',');
        firstItemInSet = false;
        // use eventSent to retrieve the event's name
        dataOutput.write(this.eventSet[parseInt(seqItem, 10)]);
      }
    });
    // line finished, add new line
    dataOutput.write('\n');
  });

  // Triggered when input has been consumed
  rl.on('close', () => {
    callback();
  });
};

/**
 * Runs the frequent sequential pattern mining algorithm
 * called PrefixSpan.
 * Takes inputFile as the input and stores the output of the algorithm in OutputFile
 * @param {String} inputFile 
 * @param {String} outputFile
 * @param {int} minimum support
 */
PatternDatasetObject.prototype.seqPatPrefixSpan = function (minSupport, callback) {
  console.log(`seqPatPrefixSpan started at ${new Date().toUTCString()}`);
  const algoName = 'PrefixSpan';
  const extraParams = `${minSupport.toString()}%`;
  runSPMF(algoName, this.filenames.seqSet, this.filenames.seqSetOutput, extraParams,
    (err) => {
      if (err) console.log(err);
      console.log(`seqPatPrefixSpan finished at ${new Date().toUTCString()}`);
      callback();
    });
};

PatternDatasetObject.prototype.runSequencePatternMining = function (runCallback) {
  const patternDataset = this;
  async.waterfall([
    function (callback) {
      patternDataset.prepareSequenceInput(callback);
    },
    function (callback) {
      patternDataset.seqPatPrefixSpan(2, callback);
    },
    function (callback) {
      patternDataset.translateSequenceOutput(callback);
    },
  ], (err) => {
    if (err) console.log(`The following error was triggered during runSequencePatternMining(): ${err}`);
    runCallback(`Seq${patternDataset.name}`, patternDataset.filenames.seqSetOutputTranslated);
  });
};

/**
 * Given a list of result titles, creates an array of sequences of events.
 * TODO the format of this array is yet to be defined.
 * At the moment it will be:
 * MasterArray[UserEpisodePair[OrderedEvents]]
 * where UserEpisodePair is a hash of the _id object from the results in the database
 */
function createPatternDataset(resultTitleList, callback, itemsetCallback, sequenceCallback) {
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
    patternDataset.storePatternDatasetInfo();
    patternDataset.runItemPatternMining(itemsetCallback);
    patternDataset.runSequencePatternMining(sequenceCallback);
  });
}

module.exports.initialisePatternInterface = initialisePatternInterface;
module.exports.createPatternDataset = createPatternDataset;
