
// startup functions when jQuery is loaded
$(() => {
  $('body').append($('<div>', { id: 'toastbar' }));
});


function createGenericFunctions() {

  const genericFunctionsObject = {};

  genericFunctionsObject.resultTabCookie = 'resultTabs';
  genericFunctionsObject.patternTabCookie = 'patternTabs';

  genericFunctionsObject.initTabHeader = function () {
    genericFunctions.addTabHeader();
    genericFunctions.fillResultTabs();
    genericFunctions.fillPatternTabs();
    genericFunctions.updateActiveTab();
  };

  genericFunctionsObject.resetTabHeader = function () {
    $('#pageHeader').remove();
    genericFunctions.initTabHeader();
  };

  /**
   * Adds the tab header to the page, under the "body" tag
   */
  genericFunctionsObject.addTabHeader = function () {

    //navbar options: fixed (navbar-fixed-top), static (navbar-static-top), default (leave only default class)
    var $rootNavBar = $('<nav>', { class: 'navbar navbar-default navbar-fixed-top', id: 'pageHeader' });

    //inner container for the tab bar, can be container-fluid, so more elements fit inside
    var $tabBarContainer = $('<div>', { class: 'container-fluid' });
    $rootNavBar.append($tabBarContainer);

    //tabHeader, can have the name and logo
    var $tabHeader = $('<div>', { class: 'navbar-header' });

    $tabHeader.append($('<img>', {
      src: './res/WevQueryLogoNoText.png',
      style: 'padding-top:5px',
      alt: 'WevQuery tool logo'
    }));

    $tabHeader.append($('<img>', {
      src: './res/WevQueryText.png',
      style: 'padding-top:10px',
      alt: 'WevQuery tool name'
    }));

    $tabBarContainer.append($tabHeader);

    //navigation tab bar, with links to the various pages
    var $navigationTabBar = $('<div>', { class: 'navbar-collapse collapse' });
    $tabBarContainer.append($navigationTabBar);

    var $navTabList = $('<ul>', { class: 'nav navbar-nav', id: 'tabPages' });
    $navigationTabBar.append($navTabList);

    var $queryCreationTab = $('<li>', { class: 'queryCreation' });
    $queryCreationTab.append($('<a>', { href: './queryCreation.html' }).text('Query Creation'));
    $navTabList.append($queryCreationTab);

    var $catalogTab = $('<li>', { class: 'queryCatalog' });
    $catalogTab.append($('<a>', { href: './queryCatalog.html' }).text('Query Catalog'));
    $navTabList.append($catalogTab);

    var $resultsTab = $('<li>', { class: 'analysis' });
    $resultsTab.append($('<a>', { href: './analysis.html' }).text('Results'));
    $navTabList.append($resultsTab);


    /**
     * Set of tabs appearing to the right. I will use them for notifications and messages.
     * For example, reminders for taking part in WevQuery's evaluation will appear here.
     */
    const $navTabListRight = $('<ul>', { class: 'nav navbar-nav navbar-right' });
    $navigationTabBar.append($navTabListRight);

    // At the moment we don't need the feedback options
    /** They will be added back in the final version 
    // List of tabs for the right
    var $queryCreationReminder = $('<li>');
    $queryCreationReminder.append($('<a>', { href: './queryCreation.html' })
      .text('Creating a new Query? Click here'));
    $navTabListRight.append($queryCreationReminder);

    // Additional buttons to set to the right
    var $loginNavButton = $('<button>', { class: 'btn navbar-btn navbar-right' })
      .text('Login/Logout');
    $navTabListRight.append($loginNavButton);
    */

    $('body').prepend($rootNavBar);
  };

  /**
   * Checks the available result tabs from the cookies, and creates the corresponding tabs
   * where the appropriate results will be stored
   */
  genericFunctionsObject.fillResultTabs = function () {
    const resultTabList = genericFunctions.getActiveResultList();

    resultTabList.forEach((resultName) => {
      const $genericResultTab = $('<li>', { class: 'analysis closeable ' + resultName });
      // The order in which these elements are added is relevant!! the closeResults must go first
      $genericResultTab.append($('<span>', { class: 'glyphicon glyphicon-remove closeResults' })
        .click(() => {
          // When "closeResults" is clicked the tab is deleted from the list
          $('ul#tabPages li.' + resultName).remove();
          genericFunctions.removeActiveResult(resultName);
        }));

      $genericResultTab.append($('<a>', { href: './analysis.html?' + resultName })
        .text(resultName));

      $('ul#tabPages').append($genericResultTab);
    });
  };


  /**
   * Checks the available pattern tabs from the cookies, and creates the corresponding tabs
   */
  genericFunctionsObject.fillPatternTabs = function () {
    const patternTabList = genericFunctions.getPatternResultList();

    Object.keys(patternTabList).forEach((patternName) => {
      const $genericPatternTab = $('<li>', { class: `pattern closeable ${patternName}` })
        .mousedown((event) => {
          if (event.which === 2) genericFunctions.patternRemoveResult(patternName);
        });

      // The order in which these elements are added is relevant!! the closeResults must go first
      $genericPatternTab.append($('<span>', { class: 'glyphicon glyphicon-remove closeResults' })
        .click(() => {
          // When "closeResults" is clicked the tab is deleted from the list
          genericFunctions.patternRemoveResult(patternName);
        }));

      $genericPatternTab.append($('<a>', { href: `./patternView.html?${patternName}` })
        .text(patternName));

      $('ul#tabPages').append($genericPatternTab);
    });
  };

  function patternCloseTab(patternName) {
    patternRemoveResult(patternName);
  }

  /**
   * Once the tab header has been built, it updates the currently active tab
   */
  genericFunctionsObject.updateActiveTab = function () {


    //Get current URL (only the webpage filename)
    var url = window.location.pathname.split('/')[window.location.pathname.split('/').length - 1];

    switch (url) {
      case 'queryCreation.html':
        $('li.queryCreation', 'ul#tabPages').addClass('active');
        $('li.queryCreation', 'ul#tabPages').find('a').attr('aria-expanded', 'true');
        break;

      case 'queryCatalog.html':
        $('li.queryCatalog', 'ul#tabPages').addClass('active');
        $('li.queryCatalog', 'ul#tabPages').find('a').attr('aria-expanded', 'true');
        break;

      // In the particular case of "analysis", the result being analysed needs to be determined
      case 'analysis.html':
        //The result is stored in the hash of the link
        var activeResultTitle = genericFunctions.getURLHash();
        if (activeResultTitle !== '') {
          $('li.analysis.' + activeResultTitle, 'ul#tabPages').addClass('active');
          $('li.analysis.' + activeResultTitle, 'ul#tabPages').find('a').attr('aria-expanded', 'true');
        }
        else {
          $('li.analysis', 'ul#tabPages').addClass('active');
          $('li.analysis', 'ul#tabPages').find('a').attr('aria-expanded', 'true');
        }
        break;

      // In the particular case of "patternView", the result being analysed needs to be determined
      case 'patternView.html': {
        // The result is stored in the hash of the link
        const activePatternTitle = genericFunctions.getURLHash();
        if (activePatternTitle !== '') {
          $('li.pattern.' + activePatternTitle, 'ul#tabPages').addClass('active');
          $('li.pattern.' + activePatternTitle, 'ul#tabPages').find('a').attr('aria-expanded', 'true');
        } else {
          $('li.pattern', 'ul#tabPages').addClass('active');
          $('li.pattern', 'ul#tabPages').find('a').attr('aria-expanded', 'true');
        }
        break;
      }
      default:
        break;
    }
  };

  /**
   * Helper function to retrieve the active result to be shown
   */
  genericFunctionsObject.getURLHash = function () {
    if (window.location.search.split('?')[1])
      return (window.location.search.split('?')[1]);
    else
      return '';
  };

  /**
  * Helper function to retrieve the active results
  */
  genericFunctionsObject.getActiveResultList = function () {
    const resultList = localStorage[genericFunctions.resultTabCookie];
    if (resultList)
      return (JSON.parse(resultList));
    else
      return [];
  };

  /**
   * Helper function to add another active result to the tab list
   */
  genericFunctionsObject.addActiveResult = function (resultTitle) {
    var resultTabList = genericFunctions.getActiveResultList();

    if (resultTabList.indexOf(resultTitle) == -1)
      resultTabList.push(resultTitle);

    localStorage[genericFunctions.resultTabCookie] = JSON.stringify(resultTabList);
  };

  /**
   * Helper function to remove an active result to be shown
   */
  genericFunctionsObject.removeActiveResult = function (resultTitle) {
    var resultTabList = genericFunctions.getActiveResultList();
    resultTabList.splice(resultTitle, 1);

    localStorage[genericFunctions.resultTabCookie] = JSON.stringify(resultTabList);
  };


  /**
  * Helper function to retrieve the active results
  */
  genericFunctionsObject.getPatternResultList = function () {
    let patternresultListCookie = localStorage[genericFunctions.patternTabCookie];
    if (patternresultListCookie)
      return (JSON.parse(patternresultListCookie));
    else
      return {};
  };

  /**
   * When pattern Results data are received, a new tab will open,
   * showing the results.
   */
  genericFunctionsObject.addPatternResult = function (patternData) {
    console.log(`addPatternResult() adding ${patternData.title} to the tab list`);
    const patternTabList = genericFunctions.getPatternResultList();
    console.log(patternData);

    if (Object.keys(patternTabList).indexOf(patternData.title) === -1) {
      patternTabList[patternData.title] = patternData.results;
    }

    localStorage[genericFunctions.patternTabCookie] = JSON.stringify(patternTabList);
  };

  genericFunctionsObject.patternRemoveResult = function (patternTitle) {

    $(`ul#tabPages li.${patternTitle}`).remove();

    let patternTabList = genericFunctions.getPatternResultList();
    delete patternTabList[patternTitle];

    localStorage[genericFunctions.patternTabCookie] = JSON.stringify(patternTabList);
  };

  /**
  * Shows a toast to the user, temporarily showing some information
  */
  genericFunctionsObject.showToast = function (message) {
    var x = document.getElementById('toastbar')
    x.className = 'show';
    x.textContent = message;
    setTimeout(function () { x.className = x.className.replace('show', ''); }, 3000);
  }

  /**
   * Shows a generic error message with the given title and message, with only one button
   */
  genericFunctionsObject.showErrorMessage = function (title, message) {
    $('p', '#dialog-confirm').text(message);

    var confirmDialog = $('#dialog-confirm').dialog({
      title: title,
      resizable: false,
      height: 'auto',
      width: 400,
      modal: true,
      buttons: {
        Close: function () {
          confirmDialog.dialog('close');
        }
      },
      //The only purpose of the following code is to find the newly generated "close window" element, and fix the icon
      //Clashes between bootstrap and jquery-ui break it by default
      open: function () {
        $(this).closest('.ui-dialog')
          .find('.ui-dialog-titlebar-close')
          .removeClass('ui-dialog-titlebar-close')
          .html("<span class='glyphicon glyphicon-remove' onclick='confirmDialog.dialog( 'close');'></span>");

      },
    });
    confirmDialog.show();
  }

  /**
   * Given a title, a message to show, a function, and an optional parameter,
   * shows a dialog asking the user to confirm the execution of the given function
   */
  genericFunctionsObject.showConfirmDialog = function (title, text, func, param) {
    $('p', '#dialog-confirm').text(text);

    var confirmDialog = $('#dialog-confirm').dialog({
      title: title,
      resizable: false,
      height: 'auto',
      width: 400,
      modal: true,
      buttons: {
        'Confirm': function () {
          func(param);
          confirmDialog.dialog('close');
        },
        Cancel: function () {
          confirmDialog.dialog('close');
        }
      },
      // The only purpose of the following code is to find the newly
      // generated "close window" element, and fix the icon
      // Clashes between bootstrap and jquery-ui break it by default
      open: function () {
        $(this).closest('.ui-dialog')
          .find('.ui-dialog-titlebar-close')
          .removeClass('ui-dialog-titlebar-close')
          .html("<span class='glyphicon glyphicon-remove' onclick='confirmDialog.dialog( 'close');'></span>");
      },
    });
  };

  return genericFunctionsObject;
}

const genericFunctions = createGenericFunctions();
