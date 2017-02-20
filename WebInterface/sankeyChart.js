//Try the d3 instead
//https://bost.ocks.org/mike/sankey/

var width = 800,
  height = 600;
var data = {
  nodes:
  [
    { 'node': 1, 'name': 'Test 1' },
    { 'node': 2, 'name': 'Test 2' },
    { 'node': 3, 'name': 'Test 3' },
    { 'node': 4, 'name': 'Test 4' },
    { 'node': 5, 'name': 'Test 5' },
    { 'node': 6, 'name': 'Test 6' }
  ],
  links:
  [
    { 'source': 0, 'target': 1, 'value': 2295 },
    { 'source': 0, 'target': 5, 'value': 1199 },
    { 'source': 1, 'target': 2, 'value': 1119 },
    { 'source': 1, 'target': 5, 'value': 1176 },
    { 'source': 2, 'target': 3, 'value': 487 },
    { 'source': 2, 'target': 5, 'value': 632 },
    { 'source': 3, 'target': 4, 'value': 301 },
    { 'source': 3, 'target': 5, 'value': 186 }
  ]
};
nv.addGraph(function () {
  var chart = nv.models.sankeyChart()
    .width(width)
    .height(height)
    .units('elephants');
  d3.select('#sankey-chart-simple')
    .attr('width', width)
    .attr('height', height)
    .datum(data)
    .call(chart);
  return chart;
});
nv.addGraph(function () {
  var units = 'ducks';
  var chart = nv.models.sankeyChart()
    .width(width)
    .height(height)
    .format(function (d) {
      return formatNumber(d) + ' ' + units;
    })
    .linkTitle(function (d) {
      return d.source.name + ' ----> ' + d.target.name + '\n' + d.value + ' ' + units;
    })
    .nodeStyle({
      title: function (d) {
        return d.name + ': ' + d.value + ' ' + units;
      },
      fillColor: function (d) {
        return d3.rgb(d.color).brighter(2);
      },
      strokeColor: function (d) {
        return d3.rgb(d.color).darker(2);
      }
    })
    .nodeWidth(100)
    .nodePadding(200)
    .units('ducks')
    .center(function (node) {
      return node.dy
    });
  d3.select('#sankey-chart-advanced')
    .attr('width', width)
    .attr('height', height)
    .datum(data)
    .call(chart);
  return chart;
});