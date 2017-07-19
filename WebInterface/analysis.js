
/**
 * Called when the page is loaded. Runs all the initialisation functions
 * 
 */
function initialiseInterface() {

  genericFunctions.addTabHeader();

  requestCompletedQueries();
  requestCatalogQueries();
  requestRunningQueries();
  initPatternTab();

  updateGeneralOverview();
  updateSunburst();
  updateSankey();
}

/**
 * Given a list of query names, it udpates the query list
 */
function updateCompletedQueries(queryList) {
  //Empty the list
  $(".queryResultItem", "#queryResultsList").remove();
  //Fill the list with the received items
  queryList.forEach(function (queryObject, index) {
    var newFinishedQueryObject = $("#queryResultItemTemplate").clone();
    newFinishedQueryObject.removeAttr("id");

    //Add hovering action
    var description = queryObject.title;
    if (queryObject.description)
      description += " " + queryObject.description
    newFinishedQueryObject.attr("title", description);

    newFinishedQueryObject.attr("queryTitle", queryObject.title);
    $(".title", newFinishedQueryObject).text(queryObject.title);

    //Add icon indicating strictMode
    var $strictModeSpan = $("<span>", { "aria-hidden": "true", "class": "glyphicon" });
    if (queryObject.isStrictMode) {
      $strictModeSpan.addClass("glyphicon glyphicon-step-forward");
    } else {
      $strictModeSpan.addClass("glyphicon glyphicon-play");
    }
    $(".title", newFinishedQueryObject).prepend($strictModeSpan);

    $(".date", newFinishedQueryObject).text(queryObject.readableDate.split("T")[0]);
    $(".numberOfObjects", newFinishedQueryObject).text(queryObject.count);
    $("#queryResultsList").append(newFinishedQueryObject);
    //$('#queryResultsList tr:last').after(newFinishedQueryObject);
    newFinishedQueryObject.show();
  });
  updateLeftMenu();
}

/**
 * Given a list of query objects from db, it udpates the query Catalog list
 * It includes the elapsed time, if available
 */
function updateCatalogQueries(queryList) {
  //Empty the list
  $(".queryCatalogItem", "#queryCatalogList").remove();
  //Fill the list with the received items
  queryList.forEach(function (queryObject, index) {

    var newCatalogQueryObject = $("#queryCatalogItemTemplate").clone();
    newCatalogQueryObject.removeAttr("id");

    //Add hovering action
    var description = queryObject.title;
    if (queryObject.description)
      description += " " + queryObject.description
    newCatalogQueryObject.attr("title", description);

    newCatalogQueryObject.attr("queryTitle", queryObject.title);
    newCatalogQueryObject.attr("queryData", queryObject.queryXML);
    $(".title", newCatalogQueryObject).text(queryObject.title);
    $(".date", newCatalogQueryObject).text(queryObject.readableDate.split("T")[0]);

    if (queryObject.processtimems > -1)
      $(".processTime", newCatalogQueryObject).text(queryObject.processtimems);
    else
      $(".processTime", newCatalogQueryObject).text("NA");
    $(".numberOfObjects", newCatalogQueryObject).text(queryObject.count);

    $("#queryCatalogList").append(newCatalogQueryObject);
    //$('#queryCatalogList tr:last').after(newCatalogQueryObject);

    newCatalogQueryObject.show();
  });
  updateLeftMenu();
}

/**
 * Given a list of running query names, it udpates the query progress list
 *
 
 */
function updateRunningQueries(queryList) {
  //Empty the list
  $("#queryRunningList").empty();
  if (queryList.length == 0) {
    $("#queryRunningList").append("<div>No queries have been found</div>");
  }
  else {
    //Fill the list with the received items
    queryList.forEach(function (queryObject, index) {
      console.log("Adding a running query:");
      console.log(queryObject);
      var newRunningQueryObject = $("#queryRunningItemTemplate").clone();
      $(".title", newRunningQueryObject).text(queryObject.title);
      $(".step", newRunningQueryObject).text(queryObject.progress.split(":")[0]);
      $("progress", newRunningQueryObject).attr("value", queryObject.progress.split(":")[1]);
      $("#queryRunningList").append(newRunningQueryObject);
      newRunningQueryObject.show();
    });
  }
  updateLeftMenu();
}

/**
  * To be called everytime the leftMenu is updated.
  * The analysis panel will adapt to the leftMenu's width.
  * The sortable tables need udpating.
  */
function updateLeftMenu() {
  //$("#analysisPanel").css("margin-left", $("#leftMenu").width() + 15);
  $("#analysisPanel").animate({
    marginLeft: $("#leftMenuContent").width() + 30,
    opacity: 1
  }, 200);
  
  $("#queryResultsTable").trigger("update");
  $("#queryCatalogTable").trigger("update");

  //Add option menu when user clicks on a row
  $("td", "#queryResultsList").click(function () {
    //Highlight selected row
    $("tr.active", "#queryResultsList").removeClass("active");
    $(this).parent("tr").addClass("active");
    //Open options menu
    $("#queryResultsOptions").show();
    positionOptions($("tr.active", "#queryResultsList"), "queryResultsOptions");
  });

  $("td", "#queryCatalogList").click(function () {
    //Highlight selected row
    $("tr.active", "#queryCatalogList").removeClass("active");
    $(this).parent("tr").addClass("active");
    //Open options menu
    $("#queryCatalogOptions").show();
    positionOptions($("tr.active", "#queryCatalogList"), "queryCatalogOptions");
  });
  updateOptionsMenu();
}

/**
 * If there is any event that modifies the tables, I need to update the options menus accordingly
 */
function updateOptionsMenu() {
  if ($("#queryResultsTable").is(":visible")) {
    if ($("tr.active", "#queryResultsTable").length > 0) {
      $("#queryResultsOptions").show();
      positionOptions($("tr.active", "#queryResultsList"), "queryResultsOptions");
    }
    else
      $("#queryResultsOptions").hide();
  }
  else
    $("#queryResultsOptions").hide();

  if ($("#queryCatalogList").is(":visible")) {
    if ($("tr.active", "#queryCatalogList").length > 0) {
      $("#queryCatalogOptions").show();
      positionOptions($("tr.active", "#queryCatalogList"), "queryCatalogOptions");
    }
    else
      $("#queryCatalogOptions").hide();
  }
  else
    $("#queryCatalogOptions").hide();
}

/**
 * Uses JS UI position feature to place the options menu relative to an element http://jqueryui.com/position/#default
 * For some reason it doesn't work with tables?
 */
function positionOptions(parentElement, optionsMenuID) {
  console.log("moving " + optionsMenuID + " under ");
  console.log(parentElement);
  $("#" + optionsMenuID).position({
    of: parentElement,
    //where the element will fit with regards to the specified position
    my: "bottom top",//"center top",
    //where the element will be placed with regards to the parent
    at: "center bottom"
    //makes sure the element fits in the window if there is any overlap
    //collision: "fit"
  });
  //For some reason, the use of the above function sets the positioning to relative, which breaks the coordinates
  $("#" + optionsMenuID).css({ "position": "absolute" });
}

/**
 * Download the full content of the selected query from the results
 */
function downloadQueryResults(queryTitle) {
  requestQueryData(queryTitle);
}

/**
 * Deletes the selected query from the results
 */
function deleteQueryResults(queryTitle) {
  $("p", "#dialog-confirm").text("To retrieve these results you will have to run the query again.");

  var confirmDialog = $("#dialog-confirm").dialog({
    title: "Delete the results for " + queryTitle + "?",
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: {
      "Confirm": function () {
        requestQueryResultsDeletion(queryTitle);
        confirmDialog.dialog("close");
      },
      Cancel: function () {
        confirmDialog.dialog("close");
      }
    },
    //The only purpose of the following code is to find the newly generated "close window" element, and fix the icon
    //Clashes between bootstrap and jquery-ui break it by default
    open: function () {
      $(this).closest(".ui-dialog")
        .find(".ui-dialog-titlebar-close")
        .removeClass("ui-dialog-titlebar-close")
        .html("<span class='glyphicon glyphicon-remove' onclick='confirmDialog.dialog( 'close');'></span>");

    },
  });
}

/**
 * Deletes the selected query from the Catalog
 */
function deleteQueryCatalog(queryTitle) {
  $("p", "#dialog-confirm").text("You will lose the stored infromation regarding this query.");

  var confirmDialog = $("#dialog-confirm").dialog({
    title: "Delete the Catalog for " + queryTitle + "?",
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: {
      "Confirm": function () {
        requestQueryCatalogDeletion(queryTitle);
        confirmDialog.dialog("close");
      },
      Cancel: function () {
        confirmDialog.dialog("close");
      }
    },
    //The only purpose of the following code is to find the newly generated "close window" element, and fix the icon
    //Clashes between bootstrap and jquery-ui break it by default
    open: function () {
      $(this).closest(".ui-dialog")
        .find(".ui-dialog-titlebar-close")
        .removeClass("ui-dialog-titlebar-close")
        .html("<span class='glyphicon glyphicon-remove' onclick='confirmDialog.dialog( 'close');'></span>");

    },
  });
}


/**
 * Run the given query from Catalog
 */
function runQueryCatalog(email, isQueryStrict, queryTitle, queryData) {
  requestExecuteQuery(email, isQueryStrict, queryTitle, queryData);
  if (isQueryStrict)
    genericFunctions.showToast("The query " + queryTitle + " is now running in strict mode");
  else
    genericFunctions.showToast("The query " + queryTitle + " is now running in non strict mode");
}

/**
 * Edit Catalog item. Stores the selected queryData in a cookie, and opens the query creation window
 */
function editQueryCatalog(queryData) {
  genericFunctions.setCookie("queryXMLData", queryData, 1);

  window.location.replace("./queryCreation.html");
}

/**
 * Initialises the patern Analysis tab in the left column.
 * Takes the list of existing result titles from the database,
 * and add them as options.
 */
function initPatternTab() {

  requestCompletedQueriesTitles();

  $("#resultMultiSelector").chosen({
    disable_search_threshold: 10,
    placeholder_text_multiple: "select inputs",
    no_results_text: "Oops, nothing found!",
    width: "100%"
  }).change(function () {
    updateLeftMenu();
  });

}

/**
 * This function takes a multioption object as a parameter
 * and loads a a series of query result titles.
 */
function updateResultMultiChoice(titlesList) {
  console.log("loadResultNames() loading" + titlesList.length + " result title options");
  titlesList.forEach(function (titleItem) {
    $("#resultMultiSelector").append('<option>' + titleItem + '</option>');
  });
  $("#resultMultiSelector").trigger('chosen:updated');
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

var spinnerGeneralView;
const generalOverviewDataKey = "stackedChartKey";
function updateGeneralOverview() {
  var stackedChartData = sessionStorage.getItem(generalOverviewDataKey);

  if (stackedChartData === null) {
    spinnerGeneralView = new Spinner(spinnerOptions).spin(document.getElementById("generalGraphLoadingSpin"));
    $("#generalGraphLoadingSpin p").show();
    console.log("starting spin");
    requestAnalysisData();
  }
  else
    generalOverviewDataReceived($.parseJSON(stackedChartData));
}

function refreshGeneralOverview() {
  sessionStorage.removeItem(generalOverviewDataKey);
  nvdStackedChartErase();
  updateGeneralOverview();
}


function generalOverviewDataReceived(stackedChartData) {
  if (spinnerGeneralView != null) {
    spinnerGeneralView.stop();
    $("#generalGraphLoadingSpin p").hide();
  }
  sessionStorage.setItem(generalOverviewDataKey, JSON.stringify(stackedChartData));

  nvdStackedChart(stackedChartData);

  //For some reason the chart takes more space than it should
  //any interaction triggering an update fixes it.
  setTimeout(function () {
    stackedChartObject.update();
  }, 1500);
}

var spinnerSunBurst;
const sunburstDataKey = "sunburstDataKey";

function updateSunburst() {
  var sunburstData = sessionStorage.getItem(sunburstDataKey);
  if (sunburstData === null) {
    spinnerSunBurst = new Spinner(spinnerOptions).spin(document.getElementById("sequenceCountGraphLoadingSpin"));
    $("#sequenceCountGraphLoadingSpin p").show();
    requestAnalysisCount();
  }
  else
    sunburstDataReceived($.parseJSON(sunburstData));
}

function refreshSunburst() {
  sessionStorage.removeItem(sunburstDataKey);
  sunburstErase();
  updateSunburst();
}

function sunburstDataReceived(sunburstData) {
  if (spinnerSunBurst != null) {
    spinnerSunBurst.stop();
    $("#sequenceCountGraphLoadingSpin p").hide();
  }
  sessionStorage.setItem(sunburstDataKey, JSON.stringify(sunburstData));
  sunburstGraph(sunburstData);
}

var spinnerSankey;
const sankeyDataKey = "sankeyDataKey";

function updateSankey() {
  var sankeyData = sessionStorage.getItem(sankeyDataKey);
  if (sankeyData === null) {
    spinnerSankey = new Spinner(spinnerOptions).spin(document.getElementById("sankeyGraphLoadingSpin"));
    $("#sankeyGraphLoadingSpin p").show();

    requestAllEventTransitions();
  }
  else
    sankeyDataReceived($.parseJSON(sankeyData));
}

function refreshSankey() {
  sessionStorage.removeItem(sankeyDataKey);
  sankeyDiagramErase()
  updateSankey();
}

function sankeyDataReceived(transitionObject) {
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
function debugMouseMove() {
  $("body").mousemove(function (event) {
    var pageCoords = "( " + event.pageX + ", " + event.pageY + " )";
    var clientCoords = "( " + event.clientX + ", " + event.clientY + " )";
    console.log("( event.pageX, event.pageY ) : " + pageCoords);
    console.log("( event.clientX, event.clientY ) : " + clientCoords);
    console.log("Hovering over: " + event.target.nodeName + " " + event.target.id);
  });
}
