
var analysis = createAnalysisFunctions();


function createAnalysisFunctions() {

  var analysisObject = {};

  /**
   * Called when the page is loaded. Runs all the initialisation functions
   * 
   */
  analysisObject.initialiseInterface = function () {

    genericFunctions.initTabHeader();
    //initTabHeader has already determined if we need to show the results from a particular collection
    //the name of the collection to show is in genericFunctions.getActiveResults()

    analysis.updateStackedChart();
    analysis.updateSunburst();
    analysis.updateSankey();
  }

  /**
   * Shows a general overview of the results, with the provided data
   */

  //http://spin.js.org/

  var spinnerOptions = {
    lines: 9, // The number of lines to draw
    length: 9, // The length of each line
    width: 5, // The line thickness
    radius: 14, // The radius of the inner circle
    color: '#EE3124', // #rgb or #rrggbb or array of colors
    speed: 1.9, // Rounds per second
    trail: 40, // Afterglow percentage
    className: 'spinner', // The CSS class to assign to the spinner
    position: 'relative'
  };

  var spinnerStackedChart;
  const stackedChartDataKey = "stackedChartDataKey_"+genericFunctions.getActiveResults();
  analysisObject.updateStackedChart = function () {
    var stackedChartData = sessionStorage.getItem(stackedChartDataKey);

    if (stackedChartData === null) {
      spinnerStackedChart = new Spinner(spinnerOptions).spin(document.getElementById("generalGraphLoadingSpin"));
      $("#generalGraphLoadingSpin p").show();
      console.log("starting spin");
      analysisConnection.requestStackedChartData(genericFunctions.getActiveResults());
    }
    else
      analysis.stackedChartDataReceived($.parseJSON(stackedChartData));
  }

  analysisObject.refreshStackedChart = function () {
    sessionStorage.removeItem(stackedChartDataKey);
    stackedChart.nvdStackedChartErase();
    analysis.updateStackedChart();
  }


  analysisObject.stackedChartDataReceived = function (stackedChartData) {
    if (spinnerStackedChart != null) {
      spinnerStackedChart.stop();
      $("#generalGraphLoadingSpin p").hide();
    }
    console.log("stackedChartDataReceived()");
    sessionStorage.setItem(stackedChartDataKey, JSON.stringify(stackedChartData));

    stackedChart.nvdStackedChart(stackedChartData);

    //For some reason the chart takes more space than it should
    //any interaction triggering an update fixes it.
    setTimeout(function () {
      stackedChart.update();
    }, 1500);
  }

  var spinnerSunBurst;
  const sunburstDataKey = "sunburstDataKey_"+genericFunctions.getActiveResults();

  analysisObject.updateSunburst = function () {
    var sunburstData = sessionStorage.getItem(sunburstDataKey);
    if (sunburstData === null) {
      spinnerSunBurst = new Spinner(spinnerOptions).spin(document.getElementById("sequenceCountGraphLoadingSpin"));
      $("#sequenceCountGraphLoadingSpin p").show();
      analysisConnection.requestSunburstData(genericFunctions.getActiveResults());
    }
    else
      analysis.sunburstDataReceived($.parseJSON(sunburstData));
  }

  analysisObject.refreshSunburst = function () {
    sessionStorage.removeItem(sunburstDataKey);
    sunburstErase();
    analysis.updateSunburst();
  }

  analysisObject.sunburstDataReceived = function (sunburstData) {
    if (spinnerSunBurst != null) {
      spinnerSunBurst.stop();
      $("#sequenceCountGraphLoadingSpin p").hide();
    }
    sessionStorage.setItem(sunburstDataKey, JSON.stringify(sunburstData));
    sunburstGraph(sunburstData);
  }

  var spinnerSankey;
  const sankeyDataKey = "sankeyDataKey_"+genericFunctions.getActiveResults();

  analysisObject.updateSankey = function () {
    var sankeyData = sessionStorage.getItem(sankeyDataKey);
    if (sankeyData === null) {
      spinnerSankey = new Spinner(spinnerOptions).spin(document.getElementById("sankeyGraphLoadingSpin"));
      $("#sankeyGraphLoadingSpin p").show();

      analysisConnection.requestSankeyData(genericFunctions.getActiveResults());
    }
    else
      analysis.sankeyDataReceived($.parseJSON(sankeyData));
  }

  analysisObject.refreshSankey = function () {
    sessionStorage.removeItem(sankeyDataKey);
    sankeyDiagramErase()
    analysis.updateSankey();
  }

  analysisObject.sankeyDataReceived = function (transitionObject) {
    if (spinnerSankey != null) {
      spinnerSankey.stop();
      $("#sankeyGraphLoadingSpin p").hide();
    }
    sessionStorage.setItem(sankeyDataKey, JSON.stringify(transitionObject));
    sankeyDiagram("sankeyGraph", transitionObject);
  }

  /**
   * Debugging purposes. Prints out all mouse interaction
   */
  analysisObject.debugMouseMove = function () {
    $("body").mousemove(function (event) {
      var pageCoords = "( " + event.pageX + ", " + event.pageY + " )";
      var clientCoords = "( " + event.clientX + ", " + event.clientY + " )";
      console.log("( event.pageX, event.pageY ) : " + pageCoords);
      console.log("( event.clientX, event.clientY ) : " + clientCoords);
      console.log("Hovering over: " + event.target.nodeName + " " + event.target.id);
    });
  }

  return analysisObject;
}
