//To call: sankeyDiagram("sankeyGraph");

/**
 * Given a container ID and a data object containing the transitions,
 * it plots a sankey diagram. The data object has to contain two lists:
 * nodes: A list of labels for the transitions
 * "nodes":[{"name":"Agricultural 'waste'"},{"name":"Bio-conversion"}]
 * links: A list of weighed transitions, referencing the index of the labels
 * "links":[{"source":0,"target":1,"value":124.729},{"source":1,"target":2,"value":0.597}]
 */
function sankeyDiagram(containerID, dataObject) {
  var margin = { top: 1, right: 1, bottom: 6, left: 1 },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  var formatNumber = d3.format(",.0f"),
    format = function (d) { return formatNumber(d) + " occurrences"; },
    color = d3.scale.category20();

  var svg = d3.select("#" + containerID).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var sankey = d3.sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .size([width, height]);

  var path = sankey.link();

  sankey
    .nodes(dataObject.nodes)
    .links(dataObject.links)
    .layout(32);

  var link = svg.append("g").selectAll(".link")
    .data(dataObject.links)
    .enter().append("path")
    .attr("class", "link")
    .attr("d", path)
    .style("stroke-width", function (d) { return Math.max(1, d.dy); })
    .sort(function (a, b) { return b.dy - a.dy; });

  link.append("title")
    .text(function (d) { return d.source.name + " → " + d.target.name + "\n" + format(d.value); });

  var node = svg.append("g").selectAll(".node")
    .data(dataObject.nodes)
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
    .call(d3.behavior.drag()
      .origin(function (d) { return d; })
      .on("dragstart", function () { this.parentNode.appendChild(this); })
      .on("drag", dragmove));

  node.append("rect")
    .attr("height", function (d) { return d.dy; })
    .attr("width", sankey.nodeWidth())
    .style("fill", function (d) { return d.color = color(d.name.replace(/ .*/, "")); })
    .style("stroke", function (d) { return d3.rgb(d.color).darker(2); })
    .append("title")
    .text(function (d) { return d.name + "\n" + format(d.value); });

  node.append("text")
    .attr("x", -6)
    .attr("y", function (d) { return d.dy / 2; })
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function (d) { return d.name; })
    .filter(function (d) { return d.x < width / 2; })
    .attr("x", 6 + sankey.nodeWidth())
    .attr("text-anchor", "start");

  function dragmove(d) {
    d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
    sankey.relayout();
    link.attr("d", path);
  }

}