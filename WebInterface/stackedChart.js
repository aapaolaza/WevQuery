/**
 * https://bl.ocks.org/mbostock/3886208
 */

function loadGeneralGraph(csvFilePath) {

  var verticalAxis = "Occurrences";

  $("#generalGraph").empty()
  var svg = d3.select("svg").attr("id", "generalGraph"),
    margin = { top: 20, right: 20, bottom: 30, left: 40 },
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scaleBand()
    .rangeRound([0, width])
    .paddingInner(0.05)
    .align(0.1);

  var y = d3.scaleLinear()
    .rangeRound([height, 0]);

  var z = d3.scaleOrdinal()
    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

  d3.csv(csvFilePath, function (d, i, columns) {
    for (i = 1, t = 0; i < columns.length; ++i) t += d[columns[i]] = +d[columns[i]];
    d.total = t;
    return d;
  }, function (error, data) {
    if (error) throw error;

    var keys = data.columns.slice(1);

    data.sort(function (a, b) { return b.total - a.total; });
    x.domain(data.map(function (d) { return d.State; }));
    y.domain([0, d3.max(data, function (d) { return d.total; })]).nice();
    z.domain(keys);

    g.append("g")
      .selectAll("g")
      .data(d3.stack().keys(keys)(data))
      .enter().append("g")
      .attr("fill", function (d) { return z(d.key); })
      .selectAll("rect")
      .data(function (d) { return d; })
      .enter().append("rect")
      .attr("x", function (d) { return x(d.data.State); })
      .attr("y", function (d) { return y(d[1]); })
      .attr("height", function (d) { return y(d[0]) - y(d[1]); })
      .attr("width", x.bandwidth());

    g.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(null, "s"))
      .append("text")
      .attr("x", 2)
      .attr("y", y(y.ticks().pop()) + 0.5)
      .attr("dy", "0.32em")
      .attr("fill", "#000")
      .attr("font-weight", "bold")
      .attr("text-anchor", "start")
      .text(verticalAxis);

    var legend = g.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "end")
      .selectAll("g")
      .data(keys.slice().reverse())
      .enter().append("g")
      .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
      .attr("x", width - 19)
      .attr("width", 19)
      .attr("height", 19)
      .attr("fill", z);

    legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9.5)
      .attr("dy", "0.32em")
      .text(function (d) { return d; });
  });
}

/**
 * The following only works for version 3 of d3js
 */
function loadGeneralGraphClickable(csvFilePath) {
  var margin = { top: 20, right: 20, bottom: 30, left: 40 },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
    .rangeRound([height, 0]);

  var color = d3.scale.ordinal()
    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format(".2s"));

  var svg = d3.select("svg").attr("id", "generalGraph")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var active_link = "0"; //to control legend selections and hover
  var legendClicked; //to control legend selections
  var legendClassArray = []; //store legend classes to select bars in plotSingle()
  var y_orig; //to store original y-posn

  d3.csv(csvFilePath, function (error, data) {
    if (error) throw error;

    color.domain(d3.keys(data[0]).filter(function (key) { return key !== "State"; }));

    data.forEach(function (d) {
      var mystate = d.State; //add to stock code
      var y0 = 0;
      //d.ages = color.domain().map(function(name) { return {name: name, y0: y0, y1: y0 += +d[name]}; });
      d.ages = color.domain().map(function (name) { return { mystate: mystate, name: name, y0: y0, y1: y0 += +d[name] }; });
      d.total = d.ages[d.ages.length - 1].y1;

    });

    data.sort(function (a, b) { return b.total - a.total; });

    x.domain(data.map(function (d) { return d.State; }));
    y.domain([0, d3.max(data, function (d) { return d.total; })]);

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end");
    //.text("Population");

    var state = svg.selectAll(".state")
      .data(data)
      .enter().append("g")
      .attr("class", "g")
      .attr("transform", function (d) { return "translate(" + "0" + ",0)"; });
    //.attr("transform", function(d) { return "translate(" + x(d.State) + ",0)"; })

    state.selectAll("rect")
      .data(function (d) {
        return d.ages;
      })
      .enter().append("rect")
      .attr("width", x.rangeBand())
      .attr("y", function (d) { return y(d.y1); })
      .attr("x", function (d) { //add to stock code
        return x(d.mystate)
      })
      .attr("height", function (d) { return y(d.y0) - y(d.y1); })
      .attr("class", function (d) {
        classLabel = d.name.replace(/\s/g, ''); //remove spaces
        return "class" + classLabel;
      })
      .style("fill", function (d) { return color(d.name); });

    state.selectAll("rect")
      .on("mouseover", function (d) {

        var delta = d.y1 - d.y0;
        var xPos = parseFloat(d3.select(this).attr("x"));
        var yPos = parseFloat(d3.select(this).attr("y"));
        var height = parseFloat(d3.select(this).attr("height"))

        d3.select(this).attr("stroke", "blue").attr("stroke-width", 0.8);

        svg.append("text")
          .attr("x", xPos)
          .attr("y", yPos + height / 2)
          .attr("class", "tooltip")
          .text(d.name + ": " + delta);

      })
      .on("mouseout", function () {
        svg.select(".tooltip").remove();
        d3.select(this).attr("stroke", "pink").attr("stroke-width", 0.2);

      })


    var legend = svg.selectAll(".legend")
      .data(color.domain().slice().reverse())
      .enter().append("g")
      //.attr("class", "legend")
      .attr("class", function (d) {
        legendClassArray.push(d.replace(/\s/g, '')); //remove spaces
        return "legend";
      })
      .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

    //reverse order to match order in which bars are stacked    
    legendClassArray = legendClassArray.reverse();

    legend.append("rect")
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color)
      .attr("id", function (d, i) {
        return "id" + d.replace(/\s/g, '');
      })
      .on("mouseover", function () {

        if (active_link === "0") d3.select(this).style("cursor", "pointer");
        else {
          if (active_link.split("class").pop() === this.id.split("id").pop()) {
            d3.select(this).style("cursor", "pointer");
          } else d3.select(this).style("cursor", "auto");
        }
      })
      .on("click", function (d) {

        if (active_link === "0") { //nothing selected, turn on this selection
          d3.select(this)
            .style("stroke", "black")
            .style("stroke-width", 2);

          active_link = this.id.split("id").pop();
          plotSingle(this);

          //gray out the others
          for (i = 0; i < legendClassArray.length; i++) {
            if (legendClassArray[i] != active_link) {
              d3.select("#id" + legendClassArray[i])
                .style("opacity", 0.5);
            }
          }

        } else { //deactivate
          if (active_link === this.id.split("id").pop()) {//active square selected; turn it OFF
            d3.select(this)
              .style("stroke", "none");

            active_link = "0"; //reset

            //restore remaining boxes to normal opacity
            for (i = 0; i < legendClassArray.length; i++) {
              d3.select("#id" + legendClassArray[i])
                .style("opacity", 1);
            }

            //restore plot to original
            restorePlot(d);

          }

        } //end active_link check


      });

    legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function (d) { return d; });

    function restorePlot(d) {

      state.selectAll("rect").forEach(function (d, i) {
        //restore shifted bars to original posn
        d3.select(d[idx])
          .transition()
          .duration(1000)
          .attr("y", y_orig[i]);
      })

      //restore opacity of erased bars
      for (i = 0; i < legendClassArray.length; i++) {
        if (legendClassArray[i] != class_keep) {
          d3.selectAll(".class" + legendClassArray[i])
            .transition()
            .duration(1000)
            .delay(750)
            .style("opacity", 1);
        }
      }

    }

    function plotSingle(d) {

      class_keep = d.id.split("id").pop();
      idx = legendClassArray.indexOf(class_keep);

      //erase all but selected bars by setting opacity to 0
      for (i = 0; i < legendClassArray.length; i++) {
        if (legendClassArray[i] != class_keep) {
          d3.selectAll(".class" + legendClassArray[i])
            .transition()
            .duration(1000)
            .style("opacity", 0);
        }
      }

      //lower the bars to start on x-axis
      y_orig = [];
      state.selectAll("rect").forEach(function (d, i) {

        //get height and y posn of base bar and selected bar
        h_keep = d3.select(d[idx]).attr("height");
        y_keep = d3.select(d[idx]).attr("y");
        //store y_base in array to restore plot
        y_orig.push(y_keep);

        h_base = d3.select(d[0]).attr("height");
        y_base = d3.select(d[0]).attr("y");

        h_shift = h_keep - h_base;
        y_new = y_base - h_shift;

        //reposition selected bars
        d3.select(d[idx])
          .transition()
          .ease("bounce")
          .duration(1000)
          .delay(750)
          .attr("y", y_new);

      })

    }

  });
}


//http://nvd3.org/examples/multiBar.html
//Using text as x axis
//http://stackoverflow.com/questions/23727627/nvd3-line-chart-with-string-values-on-x-axis
function nvdStackedChart(generalOverviewData,urlIndexes){
  console.log("nvdStackedChart() start");
  nv.addGraph(function() {
    var chart = nv.models.multiBarChart();

    //to get the possible values for the ticks, I create a list of all possible url index numbers
    var urlNumberList = Array.apply(null, {length: urlIndexes.length}).map(Number.call, Number)
    //This results in [0,1,2,3,... urlIndexes.length]

    chart.xAxis
        .tickFormat(d3.format(',f'));
    /*chart.xAxis.tickValues(urlNumberList)
      .tickFormat(function(d){
        return urlIndexes[d]
    });*/

    chart.yAxis
        .tickFormat(d3.format(',.1f'));

    d3.select("svg").attr("id", "generalGraph")
        .datum(generalOverviewData)
        .transition().duration(500)
        .call(chart);

    nv.utils.windowResize(chart.update);

    return chart;
  });
}

function nvdStackedChartOrig(data){
  console.log("nvdStackedChartOrig() start");
  nv.addGraph(function() {
    var chart = nv.models.multiBarChart();

    chart.xAxis
        .tickFormat(d3.format(',f'));

    chart.yAxis
        .tickFormat(d3.format(',.1f'));

    d3.select("svg").attr("id", "generalGraph")
        .datum(data)
        .transition().duration(500)
        .call(chart);

    nv.utils.windowResize(chart.update);

    return chart;
  });

}

/**
 * Random data generator
 */
var data = function() {
  return stream_layers(3,10+Math.random()*100,.1).map(function(data, i) {
    return {
      key: 'Stream' + i,
      values: data
    };
  });
}

/* Inspired by Lee Byron's test data generator. */
function stream_layers(n, m, o) {
  if (arguments.length < 3) o = 0;
  function bump(a) {
    var x = 1 / (.1 + Math.random()),
        y = 2 * Math.random() - .5,
        z = 10 / (.1 + Math.random());
    for (var i = 0; i < m; i++) {
      var w = (i / m - y) * z;
      a[i] += x * Math.exp(-w * w);
    }
  }
  return d3.range(n).map(function() {
      var a = [], i;
      for (i = 0; i < m; i++) a[i] = o + o * Math.random();
      for (i = 0; i < 5; i++) bump(a);
      return a.map(stream_index);
    });
}

/* Another layer generator using gamma distributions. */
function stream_waves(n, m) {
  return d3.range(n).map(function(i) {
    return d3.range(m).map(function(j) {
        var x = 20 * j / m - i / 3;
        return 2 * x * Math.exp(-.5 * x);
      }).map(stream_index);
    });
}

function stream_index(d, i) {
  return {x: i, y: Math.max(0, d)};
}
