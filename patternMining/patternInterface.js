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

// The support and conf parameter is given as a %
const defaultSupport = 2;
const defaultConf = 2;
const defaultMinLength = 2;

// the separator to be used between sequences is just a space
// Using it as a variable make it explicit, avoiding accidental deletions
const seqSeparator = ' ';

// names for the various algorithms
// they correspond to the values employed for the interface in queryCatalog
const freqItemSet = 'freqItemSet';
const seqPattern = 'seqPattern';
const assocRule = 'assocRule';


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
    (spmfError, stdout, stderr) => {
      /* console.log(`Output -> ${stdout}`);
      console.log(`SPMFError -> ${stderr}`);
      console.log(spmfError); */

      if (spmfError) {
        console.log(`SPMFError -> ${stderr}`);
        console.log(spmfError);
      }
      callback(spmfError);
    });
}

/**
 * patternDatasetObject provides the functionality to initialise and prepare a set of arrays
 * with information from a given set of results
 * TODO: decide on the behaviour of this algorithm when events
 * taking place during a behaviour are considered, as well as overlapping behaviours
 */

function PatternDatasetObject(name, resultList) {
  this.name = name;
  this.resultList = resultList;

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
    itemSetRuleOutput: `./${folderName}/${resultsFolderName}/${this.name}ItemsetFPGrowth.txt`,
    itemSetRuleOutputTranslated: `./${folderName}/${resultsFolderName}/${this.name}ItemsetFPGrowthTranslated.txt`,
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
  function (patternArrayIndex, timestampms, lastTimestampms, eventName) {
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
      { timestampms, lastTimestampms, eventKey },
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
 * Optionally, an extension can be added to the filename
 */
PatternDatasetObject.prototype.storePatternDatasetInfo = function (optionalParam) {
  let filename = `./${folderName}/${resultsFolderName}/${this.name}info`;
  if (optionalParam) filename += optionalParam;
  filename += '.json';
  fs.writeFile(filename, JSON.stringify(this, null, 2), 'utf-8');
};


/**
 * given a patternObjectList and an output file,
 * it outputs the pattern objects ranked decreasingly according to their support value.
 * 
 * @param {*} patternObjectList containing a list of pattern Objects.
 * Each pattern object contains a supportValue, and a stringValue with the pattern output value.
 * 
 * @param {*} outputFile 
 */
function sortAndPrintOutput(patternObjectList, outputFile, mainCallback) {
  // Sort the list decreasingly with regards to the support value
  patternObjectList.sort((a, b) => b.supportValue - a.supportValue);

  console.log(`sortAndPrintOutput for output ${outputFile}`);
  const dataOutput = fs.createWriteStream(outputFile, { flags: 'w' });
  async.eachSeries(patternObjectList, (patternObject, asyncCallback) => {
    dataOutput.write(`${patternObject.stringValue} \n`, asyncCallback);
  }, (asyncErr) => {
    dataOutput.end();
    mainCallback(asyncErr);
  });
}

/**
 * Given a PatternDataset object, it creates a textfile
 * suitable to be used as input for pattern mining
 * algorithms looking for frequent itemsets.
 * The input should be formatted as a text file 
 * in which each line corresponds to a set of items
 * 
 */
PatternDatasetObject.prototype.prepareItemsetInput = function (mainCallback) {
  console.log(`Starting the prepareItemsetInput of ${this.name}`);
  const dataOutput = fs.createWriteStream(this.filenames.itemSet, { flags: 'w' });

  const seqIndexList = Object.keys(this.patternArray);

  async.eachSeries(seqIndexList, (seqIndex, asyncCallback) => {
    // If the sequence only has one item, ignore
    if (this.patternArray[seqIndex].length !== 1) {
      // For each sequence in the pattern array just print it out as a line
      let textLine = '';
      this.patternArray[seqIndex].forEach((eventOcurr) => {
        // For each item, print it out and add a space
        textLine += `${eventOcurr.eventKey}${seqSeparator}`;
      });
      dataOutput.write(`${textLine}\n`, asyncCallback);
    } else {
      // callback so it doesn't get stuck if there is an empty item
      asyncCallback();
    }
  }, (asyncErr) => {
    if (asyncErr) console.log(`prepareItemsetInput() ERROR ${asyncErr}`);
    else console.log(`Finished the prepareItemsetInput of ${this.name}`);
    dataOutput.end();
    mainCallback(asyncErr);
  });
};


/**
 * It translates the output from the itemset mining algorithms
 * replacing event keys into event names
 */
PatternDatasetObject.prototype.translateItemsetOutput = function (minLength, callback) {
  const rl = readline.createInterface({ input: fs.createReadStream(this.filenames.itemSetOutput) });

  const patternOutList = [];
  // For each line in the output, split it by spaces (default separation)
  rl.on('line', (line) => {
    // when all the numbers in the seq have been processed, we will just print the rest as it is
    let seqProcessed = false;
    let stringValue = '';
    let supportValue;
    let itemLength = 0;

    line.split(' ').forEach((seqItem) => {
      if (seqItem === '') {
        // some outputs might contain 2 spaces, breaking the parse
        // In that case, do nothing
      } else if (seqProcessed && !isNaN(seqItem)) {
        // the seq was processed, retrieve the last number, refering to the support
        stringValue += seqItem;
        supportValue = parseInt(seqItem, 10);
      } else if (seqItem === '#SUP:') {
        // List of elements finished, the support value comes next
        stringValue += `:${seqItem}${seqSeparator}`;
        seqProcessed = true;
      } else if (!isNaN(seqItem)) {
        // the only remaining condition is being a number to be used as
        // index for eventset, but still test for number for security
        // use eventSent to retrieve the event's name
        stringValue += `[${this.eventSet[parseInt(seqItem, 10)]}]`;
        itemLength += 1;
      }
    });
    // line finished, add to patternOutList ONLY if the seq length is long enough
    if (itemLength >= minLength) patternOutList.push({ stringValue, supportValue });
  });

  // Triggered when input has been consumed
  rl.on('close', () => {
    sortAndPrintOutput(patternOutList, this.filenames.itemSetOutputTranslated, callback);
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

PatternDatasetObject.prototype.runItemPatternMining =
  function (minSupport, minLength, runCallback) {
    const patternDataset = this;
    async.waterfall([
      (asyncCallback) => {
        patternDataset.prepareItemsetInput(asyncCallback);
      },
      (asyncCallback) => {
        let supportVal = defaultSupport;
        if (minSupport && parseInt(minSupport, 10)) supportVal = parseInt(minSupport, 10);

        patternDataset.itemPatApriori(supportVal, asyncCallback);
      },
      (asyncCallback) => {
        let lengthVal = defaultMinLength;
        if (minLength && parseInt(minLength, 10)) lengthVal = parseInt(minLength, 10);

        patternDataset.translateItemsetOutput(lengthVal, asyncCallback);
      },
    ], (err) => {
      if (err) console.log(`The following error was triggered during runItemPatternMining(): ${err}`);
      runCallback(`Itemset${patternDataset.name}`, patternDataset.filenames.itemSetOutputTranslated);
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
PatternDatasetObject.prototype.itemRuleFPGrowth = function (minSupport, minConf, callback) {
  console.log(`itemRuleFPGrowth started at ${new Date().toUTCString()}`);
  const algoName = 'FPGrowth_association_rules';
  const extraParams = `${minSupport.toString()}% ${minConf.toString()}%`;
  runSPMF(algoName, this.filenames.itemSet, this.filenames.itemSetRuleOutput, extraParams,
    (err) => {
      if (err) console.log(err);
      console.log(`itemRuleFPGrowth finished at ${new Date().toUTCString()}`);
      callback();
    });
};


/**
 * It translates the output from the itemset mining algorithms
 * replacing event keys into event names
 */
PatternDatasetObject.prototype.translateItemRuleOutput = function (minLength, callback) {
  const rl = readline.createInterface({ input: fs.createReadStream(this.filenames.itemSetRuleOutput) });

  const patternOutList = [];
  // For each line in the output, split it by spaces (default separation)
  rl.on('line', (line) => {
    // when all the numbers in the seq have been processed
    // get the support value
    let seqProcessed = false;
    // Once the support value has been retrieved, print the rest as it comes
    let stopInterpret = false;

    let stringValue = '';
    let supportValue;
    let itemLength = 0;

    line.split(' ').forEach((seqItem) => {
      if (seqItem === '') {
        // some outputs might contain 2 spaces, breaking the parse
        // In that case, do nothing
      } else if (seqItem === '==>') {
        // rule arrow, print as it comes
        stringValue += seqItem;
      } else if (stopInterpret) {
        // Special case for rules. There is a CONFIDENCE result
        // after teh support. Once the support value has been stored,
        // just print the rest of the output as it comes
        stringValue += seqItem;
      } else if (seqProcessed && !isNaN(seqItem)) {
        // the seq was processed, retrieve the last number, refering to the support
        stringValue += seqItem;
        supportValue = parseInt(seqItem, 10);
        // All processed, stop interpreting
        stopInterpret = true;
      } else if (seqItem === '#SUP:') {
        // List of elements finished, the support value comes next
        stringValue += `:${seqItem}${seqSeparator}`;
        seqProcessed = true;
      } else if (!isNaN(seqItem)) {
        // the only remaining condition is being a number to be used as
        // index for eventset, but still test for number for security
        // use eventSent to retrieve the event's name
        stringValue += `[${this.eventSet[parseInt(seqItem, 10)]}]`;
        itemLength += 1;
      }
    });
    // line finished, add to patternOutList ONLY if the seq length is long enough
    if (itemLength >= minLength) patternOutList.push({ stringValue, supportValue });
  });

  // Triggered when input has been consumed
  rl.on('close', () => {
    sortAndPrintOutput(patternOutList, this.filenames.itemSetRuleOutputTranslated, callback);
  });
};

PatternDatasetObject.prototype.runItemRuleMining =
  function (minSupport, minConf, minLength, runCallback) {
    const patternDataset = this;
    async.waterfall([
      (asyncCallback) => {
        patternDataset.prepareItemsetInput(asyncCallback);
      },
      (asyncCallback) => {
        let supportVal = defaultSupport;
        if (minSupport && parseInt(minSupport, 10)) supportVal = parseInt(minSupport, 10);

        let confVal = defaultConf;
        if (minConf && parseInt(minConf, 10)) confVal = parseInt(minConf, 10);

        patternDataset.itemRuleFPGrowth(supportVal, confVal, asyncCallback);
      },
      (asyncCallback) => {
        let lengthVal = defaultMinLength;
        if (minLength && parseInt(minLength, 10)) lengthVal = parseInt(minLength, 10);
        patternDataset.translateItemRuleOutput(lengthVal, asyncCallback);
      },
    ], (err) => {
      if (err) console.log(`The following error was triggered during runItemRuleMining(): ${err}`);
      runCallback(`ItemRule${patternDataset.name}`, patternDataset.filenames.itemSetRuleOutputTranslated);
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
PatternDatasetObject.prototype.prepareSequenceInput = function (mainCallback) {
  console.log(`Starting the prepareSequenceInput of ${this.name}`);
  const dataOutput = fs.createWriteStream(this.filenames.seqSet, { flags: 'w' });

  const seqIndexList = Object.keys(this.patternArray);

  async.eachSeries(seqIndexList, (seqIndex, asyncCallback) => {
    // If the sequence only has one item, ignore
    if (this.patternArray[seqIndex].length !== 1) {
      // For each sequence in the pattern array just print it out as a line
      let textLine = '';
      this.patternArray[seqIndex].forEach((eventOcurr) => {
        // For each item, print it out and add a space and a -1 followed by another space
        textLine += `${eventOcurr.eventKey} -1 `;
      });
      dataOutput.write(`${textLine}-2\n`, asyncCallback);
    } else {
      // callback so it doesn't get stuck
      asyncCallback();
    }
  }, (asyncErr) => {
    if (asyncErr) console.log(`prepareItemsetInput() ERROR ${asyncErr}`);
    else console.log(`Finished the prepareItemsetInput of ${this.name}`);
    dataOutput.end();
    mainCallback(asyncErr);
  });
};

/**
 * It translates the output from the sequence mining algorithms
 * replacing event keys into event names
 * 
 */
PatternDatasetObject.prototype.translateSequenceOutput = function (minLength, callback) {
  const rl = readline.createInterface({ input: fs.createReadStream(this.filenames.seqSetOutput) });

  const patternOutList = [];

  // For each line in the output, split it by spaces (default separation)
  rl.on('line', (line) => {
    // keep track if the item is the first one in its set, to delimit them with brackets
    let firstItemInSet = true;
    // when all the numbers in the seq have been processed, we will just print the rest as it is
    let seqProcessed = false;
    let stringValue = '';
    let supportValue;
    let itemLength = 0;

    line.split(' ').forEach((seqItem) => {
      if (seqItem === '') {
        // some outputs might contain 2 spaces, breaking the parse
        // In that case, do nothing
      } else if (seqProcessed && !isNaN(seqItem)) {
        // the seq was processed, retrieve the last number, refering to the support
        stringValue += seqItem;
        supportValue = parseInt(seqItem, 10);
      } else if (seqItem === '#SUP:') {
        // List of elements finished, the support value comes next
        stringValue += `:${seqItem}${seqSeparator}`;
        seqProcessed = true;
      } else if (seqItem === '-1') {
        // the item is an itemset separator
        stringValue += ']';
        firstItemInSet = true;
        itemLength += 1;
      } else if (!isNaN(seqItem)) {
        // the only remaining condition is being a number to be used as
        // index for eventset, but still test for number for security
        // use eventSent to retrieve the event's name
        // Depending if it is the first part of an item or not,
        // add it to an itemset by printing starting brackets or comma
        if (firstItemInSet) stringValue += '[';
        else stringValue += ',';
        firstItemInSet = false;
        // use eventSent to retrieve the event's name
        stringValue += `${this.eventSet[parseInt(seqItem, 10)]}${seqSeparator}`;
      }
    });
    // line finished, add to patternOutList ONLY if the seq length is long enough
    if (itemLength >= minLength) patternOutList.push({ stringValue, supportValue });
  });

  // Triggered when input has been consumed
  rl.on('close', () => {
    sortAndPrintOutput(patternOutList, this.filenames.seqSetOutputTranslated, callback);
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

PatternDatasetObject.prototype.runSequencePatternMining =
  function (minSupport, minLength, runCallback) {
    const patternDataset = this;
    async.waterfall([
      (asyncCallback) => {
        patternDataset.prepareSequenceInput(asyncCallback);
      },
      (asyncCallback) => {
        let supportVal = defaultSupport;
        if (minSupport && parseInt(minSupport, 10)) supportVal = parseInt(minSupport, 10);
        patternDataset.seqPatPrefixSpan(supportVal, asyncCallback);
      },
      (asyncCallback) => {
        let lengthVal = defaultMinLength;
        if (minLength && parseInt(minLength, 10)) lengthVal = parseInt(minLength, 10);
        patternDataset.translateSequenceOutput(lengthVal, asyncCallback);
      },
    ], (err) => {
      if (err) console.log(`The following error was triggered during runSequencePatternMining(): ${err}`);
      runCallback(`Seq${patternDataset.name}`, patternDataset.filenames.seqSetOutputTranslated);
    });
  };

/**
 * Given the resultList used as input, it removes all the colliding events.
 * The first inputs have priority.
 * Template events are always atomic, so they will not be computed
 */
PatternDatasetObject.prototype.computeTemporalClashes = function (mainCallback) {
  // For each result input
  // this.resultList
  // const testResultList = [];
  async.eachSeries(this.resultList, (resultItem, resultCallback) => {
    // Get the eventKey corresponding to the result
    const targetKey = this.eventSet.indexOf(resultItem);

    // For each sequence
    const seqIndexList = Object.keys(this.patternArray);
    async.each(seqIndexList, (seqIndex, seqCallback) => {
      // create a pointer to the array to shorten the code
      const seqPointer = this.patternArray[seqIndex];
      // Check each element
      for (let index = 0; index < seqPointer.length; index += 1) {
        // If a eventKey corresponding to the result input is found
        if (seqPointer[index].eventKey === targetKey) {
          // remove following events with a timestamp smaller than result's last timestamp
          // This code will automatically remove the next index as long as its timestamp 
          // is smaller than the target's. No need to update the index, as after deletion
          // it will always point to the next existing item 
          while ((index + 1) < seqPointer.length
            && seqPointer[index + 1].timestampms < seqPointer[index].lastTimestampms) {
            console.log(`computeTemporalClashes() ${seqIndex}: deleting ${seqPointer[index + 1].timestampms}`);
            seqPointer.splice([index + 1], 1);
          }
          /* Test code replicating behaviour with an example array
          testArray = [5,4,3,2,4,6,3,4,8]
          for (let index = 0; index < testArray.length; index += 1) {
            while (testArray[index + 1] < testArray[index]) {
              testArray.splice([index + 1], 1);
            }
          }
          */
        }
      }
      seqCallback();
    }, (asyncErr) => {
      if (asyncErr) console.log(`computeTemporalClashes() ERROR ${asyncErr}`);
      else console.log(`Finished the computeTemporalClashes of ${resultItem}`);
      resultCallback(asyncErr);
    });
  }, (err) => {
    if (err) console.log(`computeTemporalClashes() ERROR ${err}`);
    else console.log(`Finished the computeTemporalClashes of ${this.name}`);
    mainCallback(err);
  });
};

/**
 * Given a list of result titles, creates an array of sequences of events.
 * TODO the format of this array is yet to be defined.
 * At the moment it will be:
 * MasterArray[UserEpisodePair[OrderedEvents]]
 * where UserEpisodePair is a hash of the _id object from the results in the database
 */
function createPatternDataset(patternOptions,
  callback, patternFinishedCallback) {

  const patternDataset = new PatternDatasetObject(new Date().getTime(),
    patternOptions.resultTitleList);
  // It might look like a callback hell, but I am just using nested async.each functions
  // only the lowest level callback will be called from within the algorithm.
  // The rest of callbacks will be called from within callback functions

  // Before starting to process all the patterns, I will initialise the eventSet
  // each event is named after the title of its collection
  // This order is important!!! This is the priority queue for the resolution of temporal clashes
  patternOptions.resultTitleList.forEach((resultTitle) => {
    patternDataset.eventSet.push(resultTitle);
  });

  // For each resultTitle
  async.each(patternOptions.resultTitleList, (resultTitle, resultTitleCallback) => {
    // retrieve result collection data
    mongoDAO.getXmlQueryData(resultTitle, patternOptions.urlList, (err, title, resultData) => {
      if (err) return console.error(`createPatternDataset: getXmlQueryData() ERROR connecting to DB ${err}`);
      // For each user/episode pair item in the result collection
      async.each(resultData, (resultItem, resultItemCallback) => {
        // Initialise the corresponding episode
        const patternArrayIndex = patternDataset.initialiseEpisode(resultItem._id);

        // For each behaviour occurrence in the user/episode
        async.each(resultItem.value.xmlQuery, (resultOccurr, resultOccurrCallback) => {
          // resultOcurr is an array of 1 to many items, the first and last timestamp will be stored
          const timestampms = resultOccurr[0].timestampms;
          // if a purging of all other overlapping events needs to be scheduled,
          // this is the place to store the corresponding timestamps
          // For the time being, I will just take the first and last timestamp
          const lastTimestampms = resultOccurr[resultOccurr.length - 1].timestampms;

          patternDataset.pushPatternItem(patternArrayIndex, timestampms, lastTimestampms, resultTitle);
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
    console.log(patternOptions.resultTitleList);
    console.log(`There were ${patternDataset.patternArray.length} arrays`);
    callback(null, patternDataset);
    patternDataset.storePatternDatasetInfo();

    // temporal clashes might end up being a parameter
    patternDataset.computeTemporalClashes(() => {
      patternDataset.storePatternDatasetInfo('TempTrimmed');
      // Run the algorithms inluded in the options parameter
      if (patternOptions.algoTypeList.indexOf(freqItemSet) > -1) {
        patternDataset.runItemPatternMining(patternOptions.minSupport,
          patternOptions.minLength, patternFinishedCallback);
      }
      if (patternOptions.algoTypeList.indexOf(seqPattern) > -1) {
        patternDataset.runSequencePatternMining(patternOptions.minSupport,
          patternOptions.minLength, patternFinishedCallback);
      }
      if (patternOptions.algoTypeList.indexOf(assocRule) > -1) {
        patternDataset.runItemRuleMining(patternOptions.minSupport, patternOptions.minConf,
          patternOptions.minLength, patternFinishedCallback);
      }
    });
  });
}

module.exports.initialisePatternInterface = initialisePatternInterface;
module.exports.createPatternDataset = createPatternDataset;
