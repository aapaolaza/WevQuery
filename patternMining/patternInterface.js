/**
 * Makes use of spmf.jar to launch various pattern mining algorithms
 */

var exec = require('child_process').exec;
//I have seen that using execFile is more efficient, as it doesn't spawn a shell terminal. To be tested

/**
 * Runs the frequent sequential pattern mining algorithm
 * called PrefixSpan.
 * Takes inputFile as the input and stores the output of the algorithm in OutputFile
 * Example: java - jar spmf.jar run PrefixSpan contextPrefixSpan.txt output.txt 50%
 * @param {String} inputFile 
 * @param {String} outputFile
 * @param {int} minimum support
 */
function seqPat_PrefixSpan(inputFile, outputFile, minSupport) {
  const algoName = "PrefixSpan";
  var extraParams = minSupport.toString() + "%";
  runSPMF(algoName, inputFile, outputFile, extraParams);
}

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

  var parameters = algoName;
  parameters += " " + inputFile;
  parameters += " " + outputFile;
  
  if (extraParams)
    parameters += " " + extraParams;

  var spmfProcess = exec('java -jar ./spmf.jar run ' + parameters,
    //it might be necessary to remove the `.jar` from the file
    function (error, stdout, stderr) {
      console.log('Output -> ' + stdout);
      if (error !== null) {
        console.log("Error -> " + error);
      }
    });
}




  module.exports = child;


