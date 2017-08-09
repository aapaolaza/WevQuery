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

let mongoDAO;

function initialisePatternInterface(globalMongoDAO) {
  mongoDAO = globalMongoDAO;
}


// I have seen that using execFile is more efficient, as it doesn't spawn a shell terminal. To be tested


/**
 * Runs the SPMF algorithm indicated by algoName.
 * inputFile and oututFile needs to be defined.
 * extraParams can be used to specify further paramenters for the execution, null otherwise
 * 
 * @param {String} algoName
 * @param {String} inputFile
 * @param {String} outputFile
 * @param {String} extraParams
 */
function runSPMF(algoName, inputFile, outputFile, extraParams) {

  let parameters = algoName;
  parameters += " " + inputFile;
  parameters += " " + outputFile;

  if (extraParams) {
    parameters += ` ${extraParams}`;
  }
  let spmfProcess = exec('java -jar ./spmf.jar run ' + parameters,
    // it might be necessary to remove the `.jar` from the file
    function (error, stdout, stderr) {
      console.log('Output -> ' + stdout);
      if (error !== null) {
        console.log("Error -> " + error);
      }
    });
}

/**
 * Runs the frequent sequential pattern mining algorithm
 * called PrefixSpan.
 * Takes inputFile as the input and stores the output of the algorithm in OutputFile
 * Example: java - jar spmf.jar run PrefixSpan contextPrefixSpan.txt output.txt 50%
 * @param {String} inputFile 
 * @param {String} outputFile
 * @param {int} minimum support
 */
function seqPatPrefixSpan(inputFile, outputFile, minSupport) {
  const algoName = "PrefixSpan";
  let extraParams = `${minSupport.toString()} %`;
  runSPMF(algoName, inputFile, outputFile, extraParams);
}


/**
 * patternDatasetObject provides the functionality to initialise and prepare a set of arrays
 * with information from a given set of results
 * TODO: decide on the behaviour of this algorithm when events
 * taking place during a behaviour are considered, as well as overlapping behaviours
 */

function PatternDatasetObject() {
  /** Array with the list of user/episode pairs
    * and the corresponding event sequences */
  this.patternArray = [];

  /**
    * The indexes employed in patternArray are hash keys of the _id
    * field in the database. This list contains the translation of the
    * hash into the _id object
    */
  this.patternArrayIndexList = [];

  /**
   * Rather than storing the whole event information, a code will be employed
   * to minimise the dataset size. This array contains the directory of events
   */
  this.eventSet = [];
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
  return crypto.createHash("sha256").update(data).digest("base64");
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
      this.eventSet.push(eventKey);
      eventKey = this.eventSet.length;
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
 * Given a list of result titles, creates an array of sequences of events.
 * TODO the format of this array is yet to be defined.
 * At the moment it will be:
 * MasterArray[UserEpisodePair[OrderedEvents]]
 * where UserEpisodePair is a hash of the _id object from the results in the database
 */
function preparePatternDataset(resultTitleList, callback) {
  const patternDataset = new PatternDatasetObject();
  // It might look like a callback hell, but I am just using nested async.each functions
  // only the lowest level callback will be called from within the algorithm.
  // The rest of callbacks will be called from within callback functions

  // For each resultTitle
  async.each(resultTitleList, function (resultTitle, resultTitleCallback) {
    // retrieve result collection data
    mongoDAO.getXmlQueryData(resultTitle, function (err, title, resultData) {
      if (err) return console.error(`preparePatternDataset: getXmlQueryData() ERROR connecting to DB ${err}`);
      // For each user/episode pair item in the result collection
      async.each(resultData, function (resultItem, resultItemCallback) {
        // Initialise the corresponding episode
        const patternArrayIndex = patternDataset.initialiseEpisode(resultItem._id);

        // For each behaviour occurrence in the user/episode
        async.each(resultItem.value.xmlQuery, function (resultOccurr, resultOccurrCallback) {
          // resultOcurr is an array of 1 to many items, a single timestamp needs to be defined
          const timestampms = resultOccurr[0];
          // if a purging of all other overlapping events needs to be scheduled, this is place to store the corresponding timestamps
          // For the time being, I will just take the first timestamp
          // for (var index = 0; index < resultOccurr.length; index++) {
          //   var resultOcurrItem = resultOccurr[index];
          //   timestampms
          // }
          patternDataset.pushPatternItem(patternArrayIndex, timestampms, resultTitle);
          // trigger the lowest level callback
          resultOccurrCallback();
        }, function (err) {
          // all resultOccurrCallback ended or there was an error
          if (err) console.log('A resultOccurr could not be processed');
          resultItemCallback();
        });
      }, function (err) {
        // all resultListCallbacks ended or there was an error
        if (err) console.log('A resultItem could not be processed');
        resultTitleCallback();
      });
    });
  }, function (err) {
    // all resultListCallbacks ended or there was an error
    if (err) console.log('A resultTitle could not be processed');
    console.log('All result titles from the following list have been processed:');
    console.log(resultTitleList);
    callback(null, patternDataset);
  });
}


module.exports.initialisePatternInterface = initialisePatternInterface;
module.exports.preparePatternDataset = preparePatternDataset;
