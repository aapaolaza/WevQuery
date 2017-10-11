
/**
 * Adds the functionality for the left Menu elements.
 */

const queryCatalogLeftMenu = createQueryCatalogLeftMenuFunctions();

function createQueryCatalogLeftMenuFunctions() {

  const patternDefaultMinLength = 2;
  const patternDefaultMinSupport = 2;
  const patternDefaultMinConf = 2;

  const queryCatalogLeftMenuObject = {};

  queryCatalogLeftMenuObject.leftMenuInitialise = function () {

    //Hide and show the left menu, to give more space
    $("span.hideLeftMenu", "#leftMenu").click(function () {
      //Once the animation ends, it triggers the updateLeftMenu and changes icons
      $("#leftMenuContent", "#leftMenu").toggle(
        {
          duration: "400",
          easing: "swing",
          //start: updateLeftMenu,
          complete: function () {
            queryCatalogLeftMenu.updateLeftMenu();
            //Update the icon to reflect its functionality
            if ($("#leftMenuContent", "#leftMenu").is(':visible'))
              $("span.hideLeftMenu", "#leftMenu").removeClass("glyphicon-wrench").addClass("glyphicon-menu-hamburger");
            else
              $("span.hideLeftMenu", "#leftMenu").removeClass("glyphicon-menu-hamburger").addClass("glyphicon-wrench");
          }
        });
    });


    $("#updateQueryResults").click(function () {
      console.log("Clicked on update queries");
      queryCatalogConnection.requestCompletedQueries();
    });

    $("#updateQueryCatalog").click(function () {
      console.log("Clicked on update Catalog");
      queryCatalogConnection.requestCatalogQueries();
    });

    $("#updateQueryRunning").click(function () {
      console.log("Clicked on update running");
      queryCatalogConnection.requestRunningQueries();
    });


    $("#queryResultsTable").tablesorter({
      headers: {
        // number columns need to be declared so sorting works
        2: { sorter: 'digit' }
      }
    }).bind("sortEnd", function (e, t) {
      queryCatalogLeftMenu.updateOptionsMenu();
    });

    $("#queryCatalogTable").tablesorter({
      headers: {
        // number columns need to be declared so sorting works (columns start at '0')
        2: { sorter: 'digit' },
        3: { sorter: 'digit' }
      }
    }).bind("sortEnd", function (e, t) {
      queryCatalogLeftMenu.updateOptionsMenu();
    });


    //To improve usability, left Menu options are toggabble
    //Toggling the lists will immediately remove any highlighted rows
    $("#toggleQueryResults").click(function () {
      $("#queryResultsTable").fadeToggle({
        duration: "400",
        easing: "linear",
        start: queryCatalogLeftMenu.updateLeftMenu,
        complete: queryCatalogLeftMenu.updateLeftMenu
      });
      $("tr.active", "#queryResultsList").removeClass("active");
      $("#queryResultsTitle").toggleClass("up");
      $("#queryResultsTitle span").toggleClass("glyphicon-option-vertical");
    });

    $("#toggleQueryCatalog").click(function () {
      $("#queryCatalogTable").fadeToggle({
        duration: "400",
        easing: "linear",
        start: queryCatalogLeftMenu.updateLeftMenu,
        complete: queryCatalogLeftMenu.updateLeftMenu
      });
      $("tr.active", "#queryCatalogList").removeClass("active");
      $("#queryCatalogTitle").toggleClass("up");
      $("#queryCatalogTitle span").toggleClass("glyphicon-option-vertical");
    });

    $("#toggleQueryRunning").click(function () {
      $("#queryRunningList").fadeToggle({
        duration: "400",
        easing: "linear",
        start: queryCatalogLeftMenu.updateLeftMenu,
        complete: queryCatalogLeftMenu.updateLeftMenu
      });
      $("#queryRunningTitle").toggleClass("up");
      $("#queryRunningTitle span").toggleClass("glyphicon-option-vertical");
    });

    //queryResultsOptions functionality

    $("#closeResultsOptions", "#queryResultsOptions").click(function () {
      $("tr.active", "#queryResultsList").removeClass("active");
      $("#queryResultsOptions").hide();
    });

    $("#highLightResults", "#queryResultsOptions").click(function () {
      $("tr.active", "#queryResultsList").toggleClass("alert-warning");
    });

    $("#loadResults", "#queryResultsOptions").click(function () {
      // Add code to load the results to the analysis panel
    });

    $("#downloadResults", "#queryResultsOptions").click(function () {
      // Add code to load the results to the analysis panel
      downloadQueryResults(
        $("tr.active", "#queryResultsList").attr("queryTitle"));
    });

    $("#deleteResults", "#queryResultsOptions").click(function () {
      // Add code to delete the query from the DB
      queryCatalogLeftMenu.deleteQueryResults(
        $("tr.active", "#queryResultsList").attr("queryTitle"));
    });

    /**
     * queryCatalogOptions functionality
     */
    $("#closeCatalogOptions", "#queryCatalogOptions").click(function () {
      $("tr.active", "#queryCatalogList").removeClass("active");
      $("#queryCatalogOptions").hide();
    });

    $("#showCatalogQueryResults", "#queryCatalogOptions").click(function () {
      queryCatalogConnection.requestQueryResultList(
        $("tr.active", "#queryCatalogList").attr("queryTitle"));
    });

    $("#runCatalogQuery", "#queryCatalogOptions").click(function () {
      queryCatalogLeftMenu.runQueryCatalog("", false,
        $("tr.active", "#queryCatalogList").attr("queryTitle"),
        $("tr.active", "#queryCatalogList").attr("queryData"));
    });
    $("#runCatalogQueryStrict", "#queryCatalogOptions").click(function () {
      // Add code to run the query
      queryCatalogLeftMenu.runQueryCatalog("", true,
        $("tr.active", "#queryCatalogList").attr("queryTitle"),
        $("tr.active", "#queryCatalogList").attr("queryData"));

    });

    $("#editCatalogQuery", "#queryCatalogOptions").click(function () {
      // Add code to load the results to the analysis panel
      queryCatalogLeftMenu.editQueryCatalog($("tr.active", "#queryCatalogList")
        .attr("queryData"));
    });

    $("#deleteCatalogQuery", "#queryCatalogOptions").click(function () {
      queryCatalogLeftMenu.deleteQueryCatalog(
        $("tr.active", "#queryCatalogList").attr("queryTitle"));
    });

    //Left menu tab listeners
    //Simple function to add reaction to the selection of a tab in the left menu
    $('a[data-toggle="tab"]', '.leftMenuTabs').on('shown.bs.tab', function (e) {
      //Updates the size of the left menu
      queryCatalogLeftMenu.updateLeftMenu();
    });
  }


  /**
 * Given a list of query names, it udpates the query list
 */
  queryCatalogLeftMenuObject.updateCompletedQueries = function (queryList) {
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
    queryCatalogLeftMenu.updateLeftMenu();
  }

  /**
   * Given a list of query objects from db, it udpates the query Catalog list
   * It includes the elapsed time, if available
   */
  queryCatalogLeftMenuObject.updateCatalogQueries = function (queryList) {
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
    queryCatalogLeftMenu.updateLeftMenu();
  }

  /**
   * Given a list of running query names, it udpates the query progress list
   *
   
   */
  queryCatalogLeftMenuObject.updateRunningQueries = function (queryList) {
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
    queryCatalogLeftMenu.updateLeftMenu();
  }

  /**
    * To be called everytime the leftMenu is updated.
    * The analysis panel will adapt to the leftMenu's width.
    * The sortable tables need udpating.
    */
  queryCatalogLeftMenuObject.updateLeftMenu = function () {

    var marginLeft = $("#leftMenuContent").width() + 30;
    //if the content is hidden, it will still have width, override it with the parent width
    if (!$("#leftMenuContent").is(':visible'))
      marginLeft = $("#leftMenu").width() + 30;

    $("#infoMainPanel").animate({
      //marginLeft: $("#leftMenu").width() + 30,
      marginLeft: marginLeft,//It needs to refer to the inner content
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
      queryCatalogLeftMenu.positionOptions($("tr.active", "#queryResultsList"), "queryResultsOptions");
    });

    $("td", "#queryCatalogList").click(function () {
      //Highlight selected row
      $("tr.active", "#queryCatalogList").removeClass("active");
      $(this).parent("tr").addClass("active");
      //Open options menu
      $("#queryCatalogOptions").show();
      queryCatalogLeftMenu.positionOptions($("tr.active", "#queryCatalogList"), "queryCatalogOptions");
    });
    queryCatalogLeftMenu.updateOptionsMenu();
  }

  /**
   * If there is any event that modifies the tables, I need to update the options menus accordingly
   */
  queryCatalogLeftMenuObject.updateOptionsMenu = function () {
    if ($("#queryResultsTable").is(":visible")) {
      if ($("tr.active", "#queryResultsTable").length > 0) {
        $("#queryResultsOptions").show();
        queryCatalogLeftMenu.positionOptions($("tr.active", "#queryResultsList"), "queryResultsOptions");
      }
      else
        $("#queryResultsOptions").hide();
    }
    else
      $("#queryResultsOptions").hide();

    if ($("#queryCatalogList").is(":visible")) {
      if ($("tr.active", "#queryCatalogList").length > 0) {
        $("#queryCatalogOptions").show();
        queryCatalogLeftMenu.positionOptions($("tr.active", "#queryCatalogList"), "queryCatalogOptions");
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
  queryCatalogLeftMenuObject.positionOptions = function (parentElement, optionsMenuID) {
    // console.log("moving " + optionsMenuID + " under ");
    // console.log(parentElement);
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
  queryCatalogLeftMenuObject.downloadQueryResults = function (queryTitle) {
    queryCatalogConnection.requestQueryData(queryTitle);
  }

  /**
   * Deletes the selected query from the results
   */
  queryCatalogLeftMenuObject.deleteQueryResults = function (resultTitle) {
    $("p", "#dialog-confirm").text("To retrieve these results you will have to run the query again.");

    var confirmDialog = $("#dialog-confirm").dialog({
      title: "Delete the results for " + resultTitle + "?",
      resizable: false,
      height: "auto",
      width: 400,
      modal: true,
      buttons: {
        "Confirm": function () {
          queryCatalogConnection.requestQueryResultsDeletion(resultTitle);
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
  queryCatalogLeftMenuObject.deleteQueryCatalog = function (queryTitle) {
    $("p", "#dialog-confirm").text("You will lose the stored infromation regarding this query.");

    var confirmDialog = $("#dialog-confirm").dialog({
      title: "Delete the Catalog for " + queryTitle + "?",
      resizable: false,
      height: "auto",
      width: 400,
      modal: true,
      buttons: {
        "Confirm": function () {
          queryCatalogConnection.requestQueryCatalogDeletion(queryTitle);
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
  queryCatalogLeftMenuObject.runQueryCatalog = function (email, isQueryStrict, queryTitle, queryData) {
    queryCatalogConnection.requestExecuteQuery(email, isQueryStrict, queryTitle, queryData);
    if (isQueryStrict)
      genericFunctions.showToast("The query " + queryTitle + " is now running in strict mode");
    else
      genericFunctions.showToast("The query " + queryTitle + " is now running in non strict mode");
  }

  /**
   * Edit Catalog item. Stores the selected queryData in a cookie, and opens the query creation window
   */
  queryCatalogLeftMenuObject.editQueryCatalog = function (queryData) {
    localStorage["queryXMLData"] = queryData;

    window.location.replace("./queryCreation.html");
  }

  /***************** PATTERN TAB ******************/

  /**
   * Initialises the patern Analysis tab in the left column.
   * TODO: retrieve a set of previously selected results from the cookies
   */
  queryCatalogLeftMenuObject.initPatternTab = function () {

    // initialise the URL input
    initMultiURLInput();

    // Request the information to fill in the template event node information
    queryCatalogConnection.requestTemplateEventInfo();

    // Selection of designer made patterns
    $("#patternInputList").sortable();
    $("#sortable").disableSelection();


    var patternAddInputButton = $("#patternAddInputButton");
    //Initialises the "add input" functionality
    $(patternAddInputButton).text("Add another input");
    $(patternAddInputButton).prepend($("<span>", { class: "glyphicon glyphicon-plus" }));

    //initialises the "toggling" behaviours of the button
    $(patternAddInputButton).click(function () {
      $(this).text("Cancel pattern input");
      $(this).prepend($("<span>", { class: "glyphicon glyphicon-remove" }));
      queryCatalogLeftMenu.selectResultFromInterface();
    });

    //Functionality for the "clear input list" button
    $("#patternClearInputButton").click(function () {
      genericFunctions.showConfirmDialog("Clear input list",
        "Are you sure you want to clear the list of inputs?",
        function () {
          $("#patternInputList").empty();
        })
    });

    //When an algorithm type is selected, update the corresponding options
    $("input[name='algoType']").on("change", showPatternAlgorithmOptions);

    // Set the default values for all parameters
    $("#patternAlgoOptions #patternMinLengthOptionInput input").val(patternDefaultMinLength);
    $("#patternAlgoOptions #patternMinLengthOptionInput span.description")
      .text(`Minimum length threshold (def:${patternDefaultMinLength})`);

    $("#patternAlgoOptions #patternMinSupportOptionInput input").val(patternDefaultMinSupport);
    $("#patternAlgoOptions #patternMinSupportOptionInput span.description")
      .text(`Minimum support threshold (def:${patternDefaultMinSupport})`);

    $("#patternAlgoOptions #patternMinConfidenceOptionInput input").val(patternDefaultMinConf);
    $("#patternAlgoOptions #patternMinConfidenceOptionInput span.description")
      .text(`Minimum confidence threshold (def:${patternDefaultMinConf})`);

    //Functions for buttons at the bottom

    // when "run" is clicked, take the text for all the existing inputs
    // and pass it on to the patternMining functions
    $("#patternRunButton").click(function () {
      patternRunAlgorithm();
    });
  }

  /**
   * Init the URL selection "chosen" input
   */

  function initMultiURLInput() {

    loadURLList($("#urlMultiSelector"));

    $("#urlMultiSelector").chosen({
      disable_search_threshold: 10,
      placeholder_text_multiple: "select the URLS to be considered",
      no_results_text: "Oops, nothing found!",
      width: "95%"
    }).change(() => { queryCatalogLeftMenu.updateLeftMenu() });
  }

  /**
   * This function takes a multioption object as a parameter
   * and loads a series of URL values.
   * 
   * At the moment, this code is just loading a set of static URLS.
   * Making it dynamic would just require requesting distinct URLs from the server
   */
  function loadURLList(multiOptionTarget) {

    urlList = ['http://www.cs.manchester.ac.uk/',
      'http://www.cs.manchester.ac.uk/study/undergraduate/visit-us/',
      'http://www.cs.manchester.ac.uk/study/postgraduate-research/']

    urlList.forEach((urlItem) => {
      $(multiOptionTarget).append('<option>' + urlItem + '</option>');
    });
    $(multiOptionTarget).trigger('chosen:updated');
  }

  /**
   * Given a nodeObject with a list of 
   * nodeTypes and nodeIDs
   */
  queryCatalogLeftMenuObject.fillTemplateEventInterface = function (nodeList) {
    console.log(nodeList);
    // Selection of template patterns

    var patternTemplateEvents = $("#patternTemplateEvents");
    patternTemplateEvents.empty();

    //retrieve list of all available events
    const eventList = nodeList.events;

    eventList.forEach((eventObj) => {
      let patternTemplateEventObj = $("<label>", { class: "btn btn-primary" });
      patternTemplateEventObj.text(eventObj);
      patternTemplateEventObj.append(
        $("<input>", {
          type: 'checkbox',
          name: "options",
          value: eventObj,
          //autocomplete: "off"
        })
      );
      patternTemplateEvents.append(patternTemplateEventObj);
    });


    var patternTemplateNodeTypes = $("#patternTemplateNodeTypes");
    patternTemplateNodeTypes.empty();
    //retrieve list of all available node types
    const nodeTypeList = nodeList.nodeTypes;

    nodeTypeList.forEach((nodeTypeObj) => {
      let patternTemplateNodeTypeObj = $("<label>", { class: "btn btn-primary" });
      patternTemplateNodeTypeObj.text(nodeTypeObj);
      patternTemplateNodeTypeObj.append(
        $("<input>", {
          type: 'checkbox',
          name: "options",
          value: nodeTypeObj,
          //autocomplete: "off"
        })
      );
      patternTemplateNodeTypes.append(patternTemplateNodeTypeObj);
    });


    var patternTemplateNodeIds = $("#patternTemplateNodeIds");
    patternTemplateNodeIds.empty();

    //retrieve list of all available node IDs
    const nodeIDList = nodeList.nodeIDs;

    nodeIDList.forEach((nodeIDObj) => {
      patternTemplateNodeIds.append($("<li>").text(nodeIDObj));
    });
  }


  /**
   * Activates the selection step of a result to be added to the pattern input pool
   */
  queryCatalogLeftMenuObject.selectResultFromInterface = function () {
    var patternAddInputButton = $("#patternAddInputButton");

    //update the label for the button
    $(patternAddInputButton).text("Stop adding inputs");
    $(patternAddInputButton).prepend($("<span>", { class: "glyphicon glyphicon-remove" }));

    //Toggle the functionality of the adding inputs button
    $(patternAddInputButton).click(function () {
      queryCatalogLeftMenu.cancelSelectResultFromInterface();
    });

    //Highlight the selectable results, the css class will include hovering feedback actions
    $(".resultsTable tbody tr").addClass("selectableResult");
    $(".resultsTable tbody tr").on("click", selectResultAsPatternInput);
  }

  /**
   * Deactivates the selection step of a result to be added to the pattern input pool
   */
  queryCatalogLeftMenuObject.cancelSelectResultFromInterface = function () {
    var patternAddInputButton = $("#patternAddInputButton");

    //update the labels on the button
    $(patternAddInputButton).text("Add another input");
    $(patternAddInputButton).prepend($("<span>", { class: "glyphicon glyphicon-plus" }));

    //Toggle the functionality of the adding inputs button
    $(patternAddInputButton).click(function () {
      queryCatalogLeftMenu.selectResultFromInterface();
    });

    $(".resultsTable tbody tr").removeClass("selectableResult");

    $(".resultsTable tbody tr").off("click", selectResultAsPatternInput);
  }

  /**
   * Action to be triggered when a result is selected as an input for the pattern pool
   */
  var selectResultAsPatternInput = function (e) {
    var clickedresult = this;
    var resultTitle = $(clickedresult).attr("id");
    console.log("click received for result " + resultTitle);

    //Check if input is already in the list
    var inputInUse = false
    $("#patternInputList li").each(function () {
      console.log($(this).text());
      if ($(this).text() == resultTitle) {
        genericFunctions.showToast("This input has already been selected.");
        inputInUse = true;
      }
    });

    if (!inputInUse) {
      $("#patternInputList").append($("<li>", { class: "list-group-item" }).text(resultTitle));
      genericFunctions.showToast(resultTitle + " selected");
      console.log(resultTitle + " selected");
    }
  }

  /**
   * Fill in the corresponding options to the various pattern algorithms.
   * When an algorithm type is selected, the corresponding options change.
   * Defaults will be loaded, so the user do not need to change them.
   * A default algorithm will also be selected
   */
  function showPatternAlgorithmOptions() {
    // First hide all the options, we will disclose them if necessary
    $("#patternAlgoOptions .input-group").hide();

    // Hide the container as well if all options are unchecked
    if (!$("input[name='algoType']:checked").length)
      $("#patternAlgoOptions").slideUp();

    // process all selected algorithm types
    $("input[name='algoType']:checked").each((index, inputItem) => {
      switch ($(inputItem).val()) {
        case "freqItemSet":
          $("#patternAlgoOptions #patternMinLengthOptionInput").show();
          $("#patternAlgoOptions #patternMinSupportOptionInput").show();

          break;
        case "assocRule":
          $("#patternAlgoOptions #patternMinLengthOptionInput").show();
          $("#patternAlgoOptions #patternMinSupportOptionInput").show();
          $("#patternAlgoOptions #patternMinConfidenceOptionInput").show();

          break;
        case "seqPattern":
          $("#patternAlgoOptions #patternMinLengthOptionInput").show();
          $("#patternAlgoOptions #patternMinSupportOptionInput").show();

          break;
        default:
          console.log("Unknown option selected, probably none?")
          break;
      }
    });
    //if it's the first selection, disclose the element
    if (!$("#patternAlgoOptions").is(':visible'))
      $("#patternAlgoOptions").slideDown();
  }

  /**
   * Helper function that creates a minimum support input element
   * DEPRECATED: I am trying instead with static inputs that are disclosed as necessary
   */
  function createMinSupportInput() {
    var minSupportOptionInput = $("<div>", { class: "input-group" });
    minSupportOptionInput.append(
      $("<span>", { class: "input-group-addon" })
        .text("Minimum support threshold")
    );
    minSupportOptionInput.append(
      $("<input>", { type: "text", class: "form-control", "aria-label": "minimum support threshold value in percentage" })
    );
    minSupportOptionInput.append(
      $("<span>", { class: "input-group-addon" }).text("%")
    );
    return (minSupportOptionInput);
  }

  /**
   * To be triggered when the user clicks on the "run" option
   */
  function patternRunAlgorithm() {

    let urlList = $("#urlMultiSelector").val();
    // Get all the template events.

    let eventList = [];
    $('#patternTemplateEvents label.active input').each(
      (index, item) => {
        eventList.push($(item).val());
      });

    let nodeNameList = [];
    $('#patternTemplateNodeTypes label.active input').each(
      (index, item) => {
        nodeNameList.push($(item).val());
      });

    $('#patternTemplateNodeIds li').each(
      (index, item) => {
        nodeNameList.push($(item).text());
      });

    // generate the result names combining the name and event
    // If there are no events selected, no template event will be added
    // nodeType_event && nodeId_event
    let resultTitleList = [];    
    nodeNameList.forEach((idItem) => {
      eventList.forEach((eventItem) => {
        resultTitleList.push(`${eventItem}_${idItem}`)
      });
    });

    // Get all the results from the input selection list
    $("#patternInputList li").each((index, item) => {
      resultTitleList.push($(item).text());
    });

    let algoTypeList = [];        
    // Get all the algorithm types to run
    $('#patternAlgoTypes label.active input').each(
      (index, item) => {
        algoTypeList.push($(item).val());
      });

    const minLength = $("#patternAlgoOptions #patternMinLengthOptionInput input").val();
    const minSupport = $("#patternAlgoOptions #patternMinSupportOptionInput input").val();
    const minConf = $("#patternAlgoOptions #patternMinConfidenceOptionInput input").val();

    if (resultTitleList.length !== 0 && urlList &&
      minLength !== "" && minSupport !== "" && minConf !== "" && algoTypeList.length!=0)
      queryCatalogConnection.requestPreparePatternDataset({ resultTitleList, urlList, algoTypeList, minLength, minSupport, minConf });
    else
      notifyUser("Inputs, URLs or additional options are missing");
  }

  return queryCatalogLeftMenuObject;
}