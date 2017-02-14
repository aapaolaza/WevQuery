/**
 * Called when the page is loaded. Runs all the initialisation functions
 * 
 */
function initialiseInterface() {
  requestCompletedQueries();
  requestHistoryQueries();
  requestRunningQueries();
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
    $(".title", newFinishedQueryObject).text(queryObject.title);
    $(".date", newFinishedQueryObject).text(queryObject.readableDate.split("T")[0]);
    $(".numberOfObjects", newFinishedQueryObject).text(queryObject.count);
    $("#queryResultsList").append(newFinishedQueryObject);
    //$('#queryResultsList tr:last').after(newFinishedQueryObject);
    newFinishedQueryObject.show();
  });
  updateLeftMenu();
}

/**
 * Given a list of query objects from db, it udpates the query history list
 * It includes the elapsed time, if available
 */
function updateHistoryQueries(queryList) {
  //Empty the list
  $(".queryHistoryItem", "#queryHistoryList").remove();
  //Fill the list with the received items
  queryList.forEach(function (queryObject, index) {
    console.log("Filling newHistoryQueryObject");

    var newHistoryQueryObject = $("#queryHistoryItemTemplate").clone();
    newHistoryQueryObject.removeAttr("id");
    $(".title", newHistoryQueryObject).text(queryObject.title);
    $(".date", newHistoryQueryObject).text(queryObject.readableDate.split("T")[0]);

    if (queryObject.processtimems > -1)
      $(".processTime", newHistoryQueryObject).text(queryObject.processtimems);
    else
      $(".processTime", newHistoryQueryObject).text("NA");
    $(".numberOfObjects", newHistoryQueryObject).text(queryObject.count);
    $(".queryData", newHistoryQueryObject).text(queryObject.queryXML);

    $("#queryHistoryList").append(newHistoryQueryObject);
    //$('#queryHistoryList tr:last').after(newHistoryQueryObject);

    newHistoryQueryObject.show();
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
    marginLeft: $("#leftMenu").width() + 15,
    opacity: 1
  }, 200);
  $("#queryResultsTable").trigger("update");
  $("#queryHistoryTable").trigger("update");

  //Add option menu when user clicks on a row
  $("td", "#queryResultsList").click(function () {
    //Highlight selected row
    $("tr.active", "#queryResultsList").removeClass("active");
    $(this).parent("tr").addClass("active");
    //Open options menu
    $("#queryResultsOptions").show();
    positionOptions($("tr.active", "#queryResultsList"), "queryResultsOptions");
  });

  $("td", "#queryHistoryList").click(function () {
    //Highlight selected row
    $("tr.active", "#queryHistoryList").removeClass("active");
    $(this).parent("tr").addClass("active");
    //Open options menu
    $("#queryHistoryOptions").show();
    positionOptions($("tr.active", "#queryHistoryList"), "queryHistoryOptions");
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

  if ($("#queryHistoryList").is(":visible")) {
    if ($("tr.active", "#queryHistoryList").length > 0) {
      $("#queryHistoryOptions").show();
      positionOptions($("tr.active", "#queryHistoryList"), "queryHistoryOptions");
    }
    else
      $("#queryHistoryOptions").hide();
  }
  else
    $("#queryHistoryOptions").hide();
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
 * Deletes the selected query from the history
 */
function deleteQueryHistory(queryTitle) {
  $("p", "#dialog-confirm").text("You will lose the stored infromation regarding this query.");

  var confirmDialog = $("#dialog-confirm").dialog({
    title: "Delete the history for " + queryTitle + "?",
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: {
      "Confirm": function () {
        requestQueryHistoryDeletion(queryTitle);
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
 * Run the given query from history
 */
function runQueryHistory(email, isQueryStrict, queryTitle, queryData) {
  requestExecuteQuery(email, isQueryStrict, queryTitle, queryData);
  if (isQueryStrict)
    showToast("The query " + queryTitle + " is now running in strict mode");
  else
    showToast("The query " + queryTitle + " is now running in non strict mode");
}

/**
 * Edit history item. Sotres teh selected queryData in a cookie, and opens a new window
 */
function editQueryHistory(queryData) {
  setCookie("queryXMLData", queryData, 1);
  var win = window.open('./queryCreation.html', '_blank');
  if (win) {
    //Browser has allowed it to be opened
    win.focus();
  } else {
    //Browser has blocked it
    alert('Please allow popups for this website');
  }
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

/**
 * Shows a toast to the user, temporarily showing some information
 */
function showToast(message) {
  var x = document.getElementById("toastbar")
  x.className = "show";
  x.textContent = message;
  setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);
}

/**
 * Shows a generic error message with the given title and message, with only one button
 */
function showErrorMessage(title, message) {
  $("p", "#dialog-confirm").text(message);

  var confirmDialog = $("#dialog-confirm").dialog({
    title: title,
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: {
      Close: function () {
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

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  var expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}