/**
 * Requests all the information to fill in the interface
 */
function initialiseValues() {
  console.log("initialising interface");
  requestDatabaseName();
  requestDatabaseCollection();
  requestDatabaseIndexes();

  $("#databaseEventList").append("<div>Loading event counts</div>");
  requestDatabaseEventCount();

  $("#databaseUserList").append("<div>Loading user event counts</div>");
  requestDatabaseUsers();
}


function fillDatabaseName(dbName) {
  $("#databaseName").text(dbName);
}

/**
 * Fills in the indexList with the provided list
 */
function fillIndexList(indexList) {
  indexList.forEach(function (indexObject) {
    $("#databaseIndexList").append("<div>" + indexObject + "</div>");
  });
}


/**
 * Fills in the collection list with the provided array of collection objects
 * Each object in the array contains the name of the collection and its count of documents
 */
function fillCollectionList(collectionList) {
  collectionList.forEach(function (collectionObject) {
    $("#databaseCollectionList").append("<div>" + collectionObject.name
      + ":" + collectionObject.count + "</div>");
  });
}

/**
 * Receives a list of events, with a name and a count.
 * @param {array} eventList 
 */
function fillEventCountList(eventCountList) {
  $("#databaseEventList").empty();
  eventCountList.forEach(function (eventObject) {
    $("#databaseEventList").append("<div>" + eventObject.name + ":" + eventObject.count + "</div>");
  });
}

/**
 * Receives a list of users. For each user, there is a name and a list of event,
 * with a name and a count for each.
 * @param {array} eventList 
 */
function fillUsersList(userList) {
  $("#databaseUserList").empty();
  userList.forEach(function (userObject) {
    var userElement = $(document.createElement('details'));
    userElement.append("<summary>" + userObject.name + "</summary>");
    userObject.eventList.forEach(function (eventObject) {
      userElement.append("<div>" + eventObject.name + ":" + eventObject.count + "</div>");
    });
    $("#databaseUserList").append(userElement);
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
  confirmDialog.show();
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