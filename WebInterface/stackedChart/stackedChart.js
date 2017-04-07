var stackedChartObject;
const stackedChartId = "generalGraph";

//http://nvd3.org/examples/multiBar.html
//Using text as x axis
//http://stackoverflow.com/questions/23727627/nvd3-line-chart-with-string-values-on-x-axis
function nvdStackedChart(stackedChartData) {
  var generalOverviewData = stackedChartData.generalOverviewData;
  var urlIndexes = stackedChartData.urlIndexes;

  console.log("nvdStackedChart() start");
  nv.addGraph(function () {
    stackedChartObject = nv.models.multiBarChart();
    //to get the possible values for the ticks, I create a list of all possible url index numbers
    var urlNumberList = Array.apply(null, { length: urlIndexes.length }).map(Number.call, Number)
    //This results in [0,1,2,3,... urlIndexes.length]

    /*chart.xAxis
        .tickFormat(d3.format(',f'));*/
    stackedChartObject.xAxis.axisLabel('Hover over the bars to see the URL');
    stackedChartObject.xAxis.tickValues(urlNumberList)
      .tickFormat(function (d) {
        return urlIndexes[d]
      });

    stackedChartObject.yAxis
      .tickFormat(d3.format(',.1f'));

    d3.select("svg").attr("id",stackedChartId)
      .datum(generalOverviewData)
      .transition().duration(500)
      .call(stackedChartObject);

    nv.utils.windowResize(stackedChartObject.update);
    stackedChartObject.update
    return stackedChartObject;
  });
}

function nvdStackedChartErase(){
  $("#generalGraph").empty();
}