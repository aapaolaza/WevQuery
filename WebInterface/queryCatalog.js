var queryCatalog = createqueryCatalogFunctions();

/**
 * Variables to keep a copy of all retrieved queries
 */
var globalQueryCatalogListIndex = [];
var globalQueryCatalogList = [];


function createqueryCatalogFunctions() {

  var queryCatalogObject = {};

  /**
   * Called when the page is loaded. Runs all the initialisation functions
   * 
   */
  queryCatalogObject.initialiseInterface = function () {

    genericFunctions.addTabHeader();
    queryCatalogConnection.requestCatalogQueries();
  }


  /**
   * Takes a list of catalog items and populates the interface with them
   * @param {Array} queryCatalogList 
   */
  queryCatalogObject.updateCatalogQueries = function (queryCatalogList) {

    queryCatalogObject.saveQueryCatalogList(queryCatalogList);

    //Clone a new catalog button list, and fill it
    //If we add catalog categories, these can be used as headers, and various lists can be shown.
    var sideCatalogButtonList = $("#sideCatalogButtonList").clone()
    sideCatalogButtonList.removeAttr("id");
    sideCatalogButtonList.empty();

    //For the time being, all catalog options go to the same list.
    queryCatalogList.forEach(function (queryObject, index) {

      var buttonElement = $("<label>", { class: "btn btn-primary" }).text(queryObject.title);
      buttonElement.append($("<input>", { type: "checkbox", autocomplete: "off" }));

      //When clicked, disclose its info in the main panel
      buttonElement.click(function () {
        /* WARNING! Bootstrap button "active" class is set after this listener,
        treat the class as the "previous state"*/
        if ($(this).hasClass("active"))//If it WAS active, delete the result
          queryCatalog.removeCatalogQueryResults(queryObject.title);
        else//If it WASN'T active, add the result
          queryCatalogConnection.requestQueryResultList(queryObject.title);
      })

      //Add hovering action
      var description = queryObject.title;
      if (queryObject.description)
        description += " " + queryObject.description
      buttonElement.attr("title", description);

      sideCatalogButtonList.append(buttonElement);
    });

    $(".sidebar").append(sideCatalogButtonList);
    sideCatalogButtonList.show();
  }

  /**
   * Given a queryCatalogList, stores the queries in the global variable
   */
  queryCatalogObject.saveQueryCatalogList = function (queryCatalogList) {
    queryCatalogList.forEach(function (queryObject, index) {
      globalQueryCatalogListIndex.push(queryObject.title);
      globalQueryCatalogList.push(queryObject);
    });
  }
  /**
   * Given a query catalog title, retrieves the information from the global variable
   */
  queryCatalogObject.getQueryCatalogInfo = function (queryTitle) {
    return (globalQueryCatalogList[globalQueryCatalogListIndex.indexOf(queryTitle)]);
  }

  /**
  * Takes a query title and a list of its results and adds them to the main panel
  * @param {String} queryTitle
  * @param {Array} queryCatalogList 
  */
  queryCatalogObject.addCatalogQueryResults = function (queryTitle, queryResultList) {

    //Clone a new query Results item and fill it
    //If we add catalog categories, these can be used as headers, and various lists can be shown.

    var queryResultsItem = $("#queryResultsItem").clone()
    //set the title as ID to be able to retrieve it
    queryResultsItem.attr("id", queryTitle);

    $("#queryResultListContainer").append(queryResultsItem);
    queryResultsItem.show();

    //h3 will serve as a toggle for the results.
    $("h3.queryResultTitle", queryResultsItem)
      .text(queryTitle)
      .prepend($("<span>", { class: "glyphicon glyphicon-triangle-bottom toggleQueryResults" }))
      .click(function () {
        var spanObject = $("span", this);//keep the span to be modified in the toggle
        $(".queryInfoContainer", queryResultsItem).toggle(
          {
            duration: 0,
            //easing: "swing",
            complete: function () {
              if ($(this).is(":visible"))
                $(spanObject).removeClass("glyphicon-triangle-right").addClass("glyphicon-triangle-bottom");
              else
                $(spanObject).removeClass("glyphicon-triangle-bottom").addClass("glyphicon-triangle-right");
            }
          });
      });

    //Fill the query catalog table from the global variables
    $(".queryCatalogTable .table", queryResultsItem).empty();

    //retrieve the query information from the global variable
    var queryCatalogInfo = queryCatalog.getQueryCatalogInfo(queryTitle);

    //Feed the table header with the list of items from the first result
    var queryTableHeaderRow = $("<tr>");
    for (var property in queryCatalogInfo) {
      if (queryCatalogInfo.hasOwnProperty(property)) {
        if (property != "_id")//exclude the db ID
          $(queryTableHeaderRow).append($("<th>", { text: property }))
      }
    }
    $(".queryCatalogTable .table", queryResultsItem)
      .append($("<thead>").append(queryTableHeaderRow));

    //Add a single row, with the information for the query
    var queryTableBody = $("<tbody>")
    $(".queryCatalogTable .table", queryResultsItem)
      .append(queryTableBody);

    var rowObject = $("<tr>");
    queryTableBody.append(rowObject);
    //Same as header, loop through object and create row content
    for (var property in queryCatalogInfo) {
      if (queryCatalogInfo.hasOwnProperty(property)) {
        if (property != "_id")//exclude the db ID
          rowObject.append($("<th>", { text: queryCatalogInfo[property] }))
      }
    }


    //Fill the results table
    $(".resultsTable .table", queryResultsItem).empty();
    if (queryResultList.length > 0) {
      //Feed the table header with the list of items from the first result
      var tableHeaderRow = $("<tr>");

      //from https://stackoverflow.com/questions/8312459/iterate-through-object-properties
      for (var property in queryResultList[0]) {
        if (queryResultList[0].hasOwnProperty(property)) {
          if (property != "_id")//exclude the db ID
            $(tableHeaderRow).append($("<th>", { text: property }))
        }
      }

      $(".resultsTable .table", queryResultsItem)
        .append($("<thead>").append(tableHeaderRow));


      var tableBody = $("<tbody>")
      $(".resultsTable .table", queryResultsItem)
        .append(tableBody);

      //For each result, add another item to the table. If no results are found, place a message instead
      queryResultList.forEach(function (resultObject, index) {
        var rowObject = $("<tr>");
        tableBody.append(rowObject);

        //Same as header, loop through object and create row content
        for (var property in resultObject) {
          if (resultObject.hasOwnProperty(property)) {
            if (property != "_id")//exclude the db ID
              rowObject.append($("<th>", { text: resultObject[property] }))
          }
        }
      });
    }
    //If the result list is empty just show a message
    else {
      $(".resultsTable .table", queryResultsItem)
        .append($("<p>", { text: "No results found for this query" }))
    }
  }


  /**
  * Given a query title remove its results from the main panel
  * @param {String} queryTitle
  */
  queryCatalogObject.removeCatalogQueryResults = function (queryTitle) {
    $("#" + queryTitle, "#queryResultListContainer").remove();
  }

  return queryCatalogObject;
}