/**
 * Basic connection file, same for all client pages
 */


var urlarr = window.location.href.split("/");
var server = urlarr[0] + "//" + urlarr[2]
var socket = io.connect(server);

var logFile = [];


socket.on('messageToClient', function (data) {
  console.log(data);
  logFile.push(data.message);
  $("#connectionLog").text(logFile);
  notifyUser(data.message, data.isError);
});


/**
 * Notify user
 * If the received message is an error, it shows an error dialog
 * @param [string] message to show to the user
 * @param [boolean] indicates if the provided message should be treated as an error
 */
function notifyUser(message, isError) {
  if (isError){
    console.log("ERROR: notifying user:" + message)
    showErrorMessage("ERROR",message);
  }
  else{
    console.log("notifying user:" + message)
    showToast(message);
  }
  logFile.push(message);

  $("#connectionLog").html("<p>" + logFile.toString().replace(/,/g, "</p><p>") + "</p>");
}

/**
 * Addas a toggable log at the bottom of the page
 */
$(function () {
  var $logDiv = $("<div>", { id: "connectionLog" });
  var $logButton = $("<button>", { id: "connectionLogToggle" });
  $logButton.click(function () {
    $logDiv.toggle("slow");
  });
  $("body").append($logDiv);
  $("body").append($logButton);


  $logDiv.text("Log messages appear below");
  $logDiv.css("position", "fixed");
  $logDiv.css("z-index", "100");
  $logDiv.css("bottom", "0");
  $logDiv.css("left", "0");
  $logDiv.css("width", "100%");
  $logDiv.css("display", "none");

  $logButton.text("Show connection log");
  $logButton.css("position", "fixed");
  $logButton.css("z-index", "101");
  $logButton.css("bottom", "0");
  $logButton.css("right", "0");
});