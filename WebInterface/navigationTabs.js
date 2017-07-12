
/**
 * Adds the tab header to the page, under the "body" tag
 */
function addTabHeader() {
  //Get current URL (only the webpage filename)
  var url = window.location.pathname.split("/")[window.location.pathname.split("/").length - 1];

  //navbar options: fixed (navbar-fixed-top), static (navbar-static-top), default (leave only default class)
  var $rootNavBar = $("<nav>", { class: "navbar navbar-default navbar-fixed-top pageheader" });

  //inner container for the tab bar, can be container-fluid
  var $tabBarContainer = $("<div>", { class: "container" });
  $rootNavBar.append($tabBarContainer);

  //tabHeader, can have the name and logo
  var $tabHeader = $("<div>", { class: "navbar-header" });

  $tabHeader.append($("<img>", {src: "./res/WevQueryLogoNoText.png",style:"padding-top:5px",alt: "WevQuery tool logo"}));
  $tabHeader.append($("<img>", {src: "./res/WevQueryText.png",style:"padding-top:10px",alt: "WevQuery tool name"}));

  $tabBarContainer.append($tabHeader);

  //navigation tab bar, with links to the various pages
  var $navigationTabBar = $("<div>", { class: "navbar-collapse collapse" });
  $tabBarContainer.append($navigationTabBar);

  var $navTabList = $("<ul>", { class: "nav navbar-nav" });
  $navigationTabBar.append($navTabList);

  var $queryCreationTab = $("<li>");
  $queryCreationTab.append($("<a>", { href: "./queryCreation.html" }).text("Query Creation"));
  $navTabList.append($queryCreationTab);

  var $catalogTab = $("<li>");
  $catalogTab.append($("<a>", { href: "./queryCatalog.html" }).text("Query Catalog"));
  $navTabList.append($catalogTab);

  var $resultsTab = $("<li>");
  $resultsTab.append($("<a>", { href: "./analysis.html" }).text("Results"));
  $navTabList.append($resultsTab);

  var $navTabListRight = $("<ul>", { class: "nav navbar-nav navbar-right webpageTabs" });

  switch (url) {
    case "queryCreation.html":
      $queryCreationTab.addClass("active");
      $("<a>", $queryCreationTab).attr("aria-expanded", "true");
      break;

    case "queryCatalog.html":
      $catalogTab.addClass("active");
      $("<a>", $catalogTab).attr("aria-expanded", "true");
      break;

    case "analysis.html":
      $resultsTab.addClass("active");
      $("<a>", $resultsTab).attr("aria-expanded", "true");
      break;

    default:
      break;
  }


  $("body").prepend($rootNavBar);
}