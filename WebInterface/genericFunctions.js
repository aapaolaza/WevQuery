



var genericFunctions = createGenericFunctions();

//startup functions when jQuery is loaded
$(function () {
  $("body").append($("<div>", { id: "toastbar" }));
});


function createGenericFunctions() {

  var genericFunctionsObject = {};

  genericFunctionsObject.resultTabCookie = "resultTabs";

  genericFunctionsObject.initTabHeader = function () {
    genericFunctions.addTabHeader();
    genericFunctions.addResultTabs();
    genericFunctions.updateActiveTab();

  }

  /**
   * Adds the tab header to the page, under the "body" tag
   */
  genericFunctionsObject.addTabHeader = function () {

    //navbar options: fixed (navbar-fixed-top), static (navbar-static-top), default (leave only default class)
    var $rootNavBar = $("<nav>", { class: "navbar navbar-default navbar-fixed-top", id: "pageheader" });

    //inner container for the tab bar, can be container-fluid
    var $tabBarContainer = $("<div>", { class: "container" });
    $rootNavBar.append($tabBarContainer);

    //tabHeader, can have the name and logo
    var $tabHeader = $("<div>", { class: "navbar-header" });

    $tabHeader.append($("<img>", { src: "./res/WevQueryLogoNoText.png", style: "padding-top:5px", alt: "WevQuery tool logo" }));
    $tabHeader.append($("<img>", { src: "./res/WevQueryText.png", style: "padding-top:10px", alt: "WevQuery tool name" }));

    $tabBarContainer.append($tabHeader);

    //navigation tab bar, with links to the various pages
    var $navigationTabBar = $("<div>", { class: "navbar-collapse collapse" });
    $tabBarContainer.append($navigationTabBar);

    var $navTabList = $("<ul>", { class: "nav navbar-nav", id: "tabPages" });
    $navigationTabBar.append($navTabList);

    var $queryCreationTab = $("<li>", { class: "queryCreation" });
    $queryCreationTab.append($("<a>", { href: "./queryCreation.html" }).text("Query Creation"));
    $navTabList.append($queryCreationTab);

    var $catalogTab = $("<li>", { class: "queryCatalog" });
    $catalogTab.append($("<a>", { href: "./queryCatalog.html" }).text("Query Catalog"));
    $navTabList.append($catalogTab);

    var $resultsTab = $("<li>", { class: "analysis" });
    $resultsTab.append($("<a>", { href: "./analysis.html" }).text("Results"));
    $navTabList.append($resultsTab);


    /**
     * Set of tabs appearing to the right. I will use them for notifications and messages.
     * For example, reminders for taking part in WevQuery's evaluation will appear here.
     */
    var $navTabListRight = $("<ul>", { class: "nav navbar-nav navbar-right" });
    $navigationTabBar.append($navTabListRight);

    //List of tabs for the right
    var $queryCreationReminder = $("<li>");
    $queryCreationReminder.append($("<a>", { href: "./queryCreation.html" }).text("Creating a new Query? Click here"));
    $navTabListRight.append($queryCreationReminder);

    //Additional buttons to set to the right
    var $loginNavButton = $("<button>", { class: "btn navbar-btn navbar-right" }).text("Login/Logout");
    $navTabListRight.append($loginNavButton);

    $("body").prepend($rootNavBar);
  }

  /**
   * Checks the available result tabs from the cookies, and creates the corresponding tabs
   * where the appropriate results will be stored
   */
  genericFunctionsObject.addResultTabs = function () {
    var resultTabList = genericFunctions.getActiveResults();

    /*TEST */
    resultTabList = ["eics_case1_10s", "Q1"];
    resultTabList.forEach(function (resultName) {
      var $genericResultTab = $("<li>", { class: "analysis " + resultName });
      $genericResultTab.append($("<a>", { href: "./analysis.html?" + resultName }).text(resultName));
      $("ul#tabPages").append($genericResultTab);
    });
  }

  /**
   * Once the tab header has been built, it updates the currently active tab
   */
  genericFunctionsObject.updateActiveTab = function () {


    //Get current URL (only the webpage filename)
    var url = window.location.pathname.split("/")[window.location.pathname.split("/").length - 1];

    switch (url) {
      case "queryCreation.html":
        $("li.queryCreation", "ul#tabPages").addClass("active");
        $("li.queryCreation", "ul#tabPages").find("a").attr("aria-expanded", "true");
        break;

      case "queryCatalog.html":
        $("li.queryCatalog", "ul#tabPages").addClass("active");
        $("li.queryCatalog", "ul#tabPages").find("a").attr("aria-expanded", "true");
        break;

      //In the particular case of "analysis", the result being analysed needs to be determined
      case "analysis.html":
        //The result is stored in the hash of the link
        var activeResultTitle = genericFunctions.getActiveResults();
        if (activeResultTitle != "") {
          $("li.analysis." + activeResultTitle, "ul#tabPages").addClass("active");
          $("li.analysis." + activeResultTitle, "ul#tabPages").find("a").attr("aria-expanded", "true");
        }
        else {
          $("li.analysis", "ul#tabPages").addClass("active");
          $("li.analysis", "ul#tabPages").find("a").attr("aria-expanded", "true");
        }
        break;

      default:
        break;
    }

  }

  /**
   * Helper function to retrieve the active results to be shown
   */
  genericFunctionsObject.getActiveResults = function () {
    if (window.location.search.split("?")[1])
      return (window.location.search.split("?")[1]);
    else
      return "";
  }

  /**
   * Helper function to add another active result to be shown
   */
  genericFunctionsObject.addActiveResult = function (resultTitle) {
    var resultTabList = JSON.parse(genericFunctions.getCookie(genericFunctions.resultTabCookie));
    resultTabList.push(resultTitle);

    genericFunctions.setCookie(genericFunctions.resultTabCookie,
      JSON.stringify(resultTabList));
  }

  /**
   * Helper function to remove an active result to be shown
   */
  genericFunctionsObject.removeActiveResult = function (resultTitle) {
    var resultTabList = JSON.parse(genericFunctions.getCookie(genericFunctions.resultTabCookie));
    resultTabList.splice(resultTitle, 1);

    genericFunctions.setCookie(genericFunctions.resultTabCookie,
      JSON.stringify(resultTabList));
  }

  /**
   * Cookie setting helper
   */
  genericFunctionsObject.setCookie = function (cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }


  /**
   * Cookie getting helper
   */
  genericFunctionsObject.getCookie = function (cname) {
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

  /**
  * Shows a toast to the user, temporarily showing some information
  */
  genericFunctionsObject.showToast = function (message) {
    var x = document.getElementById("toastbar")
    x.className = "show";
    x.textContent = message;
    setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);
  }

  /**
   * Shows a generic error message with the given title and message, with only one button
   */
  genericFunctionsObject.showErrorMessage = function (title, message) {
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

  return genericFunctionsObject;
}

