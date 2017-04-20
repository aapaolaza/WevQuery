//mongo ucivitdb saveXmlQueryresults.js > Case1.json
//When extracting the data, remember to delete the undefined, and the Nan from the json.
function printXmlQuery() {
  var xmlQueryResults = db.xmlQuery.find({ "value.xmlQueryCounter": { $ne: 0 } });
  print("[");
  while (xmlQueryResults.hasNext()) {
    printjson(xmlQueryResults.next());
    print(",");
  }
  print("]");

}
printXmlQuery();