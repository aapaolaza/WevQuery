
const patternView = createPatternViewFunctions();


function createPatternViewFunctions() {

  const patternViewObject = {};

  patternViewObject.initialiseInterface = function () {
    genericFunctions.initTabHeader();
    patternView.initialisePatternResults();
  };


  patternViewObject.initialisePatternResults = function () {
    const patternTitle = genericFunctions.getURLHash();
    const patternResults = genericFunctions.getPatternResultList()[patternTitle];
    $('#patternResults').text(patternResults);
  };

  return patternViewObject;
}
