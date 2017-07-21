var stackedChart = createStackedChartFunctions();


function createStackedChartFunctions() {

  var stackedChartObject = {};


  var stackedChartGraph;
  const stackedChartId = "generalGraph";

  //http://nvd3.org/examples/multiBar.html
  //Using text as x axis
  //http://stackoverflow.com/questions/23727627/nvd3-line-chart-with-string-values-on-x-axis
  stackedChartObject.nvdStackedChart = function (stackedChartData) {
    var generalOverviewData = stackedChartData.generalOverviewData;
    var urlIndexes = stackedChartData.urlIndexes;

    console.log("nvdStackedChart() start");
    nv.addGraph(function () {
      stackedChartGraph = nv.models.multiBarChart();
      //to get the possible values for the ticks, I create a list of all possible url index numbers
      var urlNumberList = Array.apply(null, { length: urlIndexes.length }).map(Number.call, Number)
      //This results in [0,1,2,3,... urlIndexes.length]

      /*chart.xAxis
          .tickFormat(d3.format(',f'));*/
      stackedChartGraph.xAxis.axisLabel('Hover over the bars to see the URL');
      stackedChartGraph.xAxis.tickValues(urlNumberList)
        .tickFormat(function (d) {
          return urlIndexes[d]
        });

      stackedChartGraph.yAxis
        .tickFormat(d3.format(',.1f'));

      d3.select("svg").attr("id", stackedChartId)
        .datum(generalOverviewData)
        .transition().duration(500)
        .call(stackedChartGraph);

      nv.utils.windowResize(stackedChartGraph.update);
      stackedChartGraph.update
      return stackedChartGraph;
    });
  }

  stackedChartObject.nvdStackedChartErase = function () {
    $("#generalGraph").empty();
  }

  stackedChartObject.update = function () {
    stackedChartGraph.update();
  }

  return stackedChartObject;
}
