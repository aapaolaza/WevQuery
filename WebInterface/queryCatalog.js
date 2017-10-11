const queryCatalog = createqueryCatalogFunctions();


function createqueryCatalogFunctions() {

  const queryCatalogObject = {};

  /**
   * Lists the fields from the database to be hidden from the user
   * when listing the results
   */
  queryCatalogObject.omitInfo = ['_id', 'queryXML', 'operationID', 'datems', 'totalCount', 'microsecs_running', 'isTemplate'];

  /**
   * Variables to keep a copy of all retrieved queries
   */
  queryCatalogObject.globalQueryCatalogListIndex = [];
  queryCatalogObject.globalQueryCatalogList = [];


  /**
   * Called when the page is loaded. Runs all the initialisation functions
   * 
   */
  queryCatalogObject.initialiseInterface = function () {

    genericFunctions.initTabHeader();
    //  queryCatalogConnection.requestCatalogQueries();

    // queryCatalogConnection.requestCompletedQueries();
    queryCatalogConnection.requestCatalogQueries();
    queryCatalogConnection.requestRunningQueries();
    queryCatalogLeftMenu.initPatternTab();
  };


  /**
   * Takes a list of catalog items and populates the interface with them
   * @param {Array} queryCatalogList 
   */
  queryCatalogObject.updateCatalogQueriesDEPRECATED = function (queryCatalogList) {

    queryCatalogObject.saveQueryCatalogList(queryCatalogList);

    // Clone a new catalog button list, and fill it
    // If we add catalog categories, these can be used as headers, and various lists can be shown.
    const sideCatalogButtonList = $('#sideCatalogButtonList').clone();
    sideCatalogButtonList.removeAttr('id');
    sideCatalogButtonList.empty();

    // For the time being, all catalog options go to the same list.
    queryCatalogList.forEach(function (queryObject, index) {

      const buttonElement = $('<label>', { class: 'btn btn-primary' }).text(queryObject.title);
      buttonElement.append($('<input>', { type: 'checkbox', autocomplete: 'off' }));

      // When clicked, disclose its info in the main panel
      buttonElement.click(function () {
        /* WARNING! Bootstrap button "active" class is set after this listener,
        treat the class as the "previous state" */
        if ($(this).hasClass('active'))// If it WAS active, delete the result
          queryCatalog.removeCatalogQueryResults(queryObject.title);
        else// If it WASN'T active, add the result
          queryCatalogConnection.requestQueryResultList(queryObject.title);
      })

      // Add hovering action
      let description = queryObject.title;
      if (queryObject.description)
        description += ' ' + queryObject.description
      buttonElement.attr('title', description);

      sideCatalogButtonList.append(buttonElement);
    });

    $('.sidebar').append(sideCatalogButtonList);
    sideCatalogButtonList.show();
  }

  /**
   * Given a queryCatalogList, stores the queries in the global variable
   */
  queryCatalogObject.saveQueryCatalogList = function (queryCatalogList) {
    queryCatalogList.forEach(function (queryObject, index) {
      queryCatalog.globalQueryCatalogListIndex.push(queryObject.title);
      queryCatalog.globalQueryCatalogList.push(queryObject);
    });
  }
  /**
   * Given a query catalog title, retrieves the information from the global variable
   */
  queryCatalogObject.getQueryCatalogInfo = function (queryTitle) {
    return (queryCatalog.globalQueryCatalogList[queryCatalog.globalQueryCatalogListIndex.indexOf(queryTitle)]);
  }

  /**
  * Takes a query title and a list of its results and adds them to the main panel
  * @param {String} queryTitle
  * @param {Array} queryCatalogList 
  */
  queryCatalogObject.addCatalogQueryResults = function (queryTitle, queryResultList) {

    // If the element has been opened already, show a message to the user, and make it blink
    if ($('div#' + queryTitle, '#queryResultListContainer').length > 0) {
      $('div#' + queryTitle, '#queryResultListContainer').delay(100).fadeOut().fadeIn('slow');
      genericFunctions.showToast('The results for that query has already been shown');
      return;
    }
    // Clone a new query Results item and fill it
    // If we add catalog categories, these can be used as headers, and various lists can be shown.

    const queryResultsItem = $('#queryResultsItem').clone()
    // set the title as ID to be able to retrieve it
    queryResultsItem.attr('id', queryTitle);

    $('#queryResultListContainer').append(queryResultsItem);
    queryResultsItem.show();

    // h3 will serve as a toggle for the results.
    $('h3.queryResultTitle', queryResultsItem)
      .text(queryTitle)
      .prepend($('<span>', { class: 'glyphicon glyphicon-triangle-bottom toggleQueryResults' }))
      .append($('<span>', { class: 'glyphicon glyphicon-folder-close closeResults' }))
      .click(function () {
        const spanObject = $('span.toggleQueryResults', this);// keep the span to be modified in the toggle
        $('.queryInfoContainer', queryResultsItem).toggle(
          {
            duration: 0,
            // easing: "swing",
            complete: function () {
              if ($(this).is(':visible'))
                $(spanObject).removeClass('glyphicon-triangle-right').addClass('glyphicon-triangle-bottom');
              else
                $(spanObject).removeClass('glyphicon-triangle-bottom').addClass('glyphicon-triangle-right');
            }
          });
      });

    // Add closing results functionality
    $('h3.queryResultTitle .closeResults', queryResultsItem).click(function () {
      queryCatalog.removeCatalogQueryResults(queryTitle);
    });


    // Fill the query catalog table from the global variables
    $('.queryCatalogTable .table', queryResultsItem).empty();

    // retrieve the query information from the global variable
    const queryCatalogInfo = queryCatalog.getQueryCatalogInfo(queryTitle);

    // Feed the table header with the list of items from the first result
    const queryTableHeaderRow = $('<tr>');
    for (var property in queryCatalogInfo) {
      if (queryCatalogInfo.hasOwnProperty(property)) {
        if (queryCatalog.omitInfo.indexOf(property) == -1)// exclude unwanted fields
          $(queryTableHeaderRow).append($('<th>', { text: property }))
      }
    }
    $('.queryCatalogTable .table', queryResultsItem)
      .append($('<thead>').append(queryTableHeaderRow));

    // Add a single row, with the information for the query
    const queryTableBody = $('<tbody>')
    $('.queryCatalogTable .table', queryResultsItem)
      .append(queryTableBody);

    const rowObject = $('<tr>');
    queryTableBody.append(rowObject);
    // Same as header, loop through object and create row content
    for (var property in queryCatalogInfo) {
      if (queryCatalogInfo.hasOwnProperty(property)) {
        if (queryCatalog.omitInfo.indexOf(property) == -1)// exclude unwanted fields
          rowObject.append($('<th>', { text: queryCatalogInfo[property] }))
      }
    }


    // Fill the results table
    $('.resultsTable .table', queryResultsItem).empty();
    if (queryResultList.length > 0) {
      // Feed the table header with the list of items from the first result
      const tableHeaderRow = $('<tr>');

      // Add a first column to contain the "see results" icon
      $(tableHeaderRow).append($('<th>', { text: '' }));

      // from https://stackoverflow.com/questions/8312459/iterate-through-object-properties
      for (var property in queryResultList[0]) {
        if (queryResultList[0].hasOwnProperty(property)) {
          if (queryCatalog.omitInfo.indexOf(property) == -1)// exclude unwanted fields
            $(tableHeaderRow).append($('<th>', { text: property }))
        }
      }

      $('.resultsTable .table', queryResultsItem)
        .append($('<thead>').append(tableHeaderRow));


      const tableBody = $('<tbody>')
      $('.resultsTable .table', queryResultsItem)
        .append(tableBody);

      // For each result, add another item to the table. If no results are found, place a message instead
      queryResultList.forEach(function (resultObject, index) {
        const rowObject = $('<tr>');
        
        // add the result title as the id for this row
        rowObject.attr('id', resultObject.resultTitle);

        tableBody.append(rowObject);

        // Add the various interaction icons as the first column
        rowObject.append($('<th>', { class: 'resultOptions' })
          .append($('<span>', { class: 'glyphicon glyphicon-screenshot' })
            .click(function () {
              // When the icon is clicked, create a new tab and load the results there/
              genericFunctions.addActiveResult(resultObject.resultTitle);
              genericFunctions.resetTabHeader();
            })
          )
          .append($('<span>', { class: 'glyphicon glyphicon-trash' })
            .click(function () {
              queryCatalogLeftMenu.deleteQueryResults(resultObject.resultTitle);
            })
          )
        );

        // Same as header, loop through object and create row content
        for (const property in resultObject) {
          if (resultObject.hasOwnProperty(property)) {
            if (queryCatalog.omitInfo.indexOf(property) == -1)// exclude unwanted fields
              rowObject.append($('<th>', { text: resultObject[property] }))
          }
        }
      });
    }
    // If the result list is empty just show a message
    else {
      $('.resultsTable .table', queryResultsItem)
        .append($('<p>', { text: 'No results found for this query' }))
    }
  }


  /**
  * Given a query title remove its results from the main panel
  * @param {String} queryTitle
  */
  queryCatalogObject.removeCatalogQueryResults = function (queryTitle) {
    $('#' + queryTitle, '#queryResultListContainer').remove();
  }

  return queryCatalogObject;
}