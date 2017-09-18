
const patternView = createPatternViewFunctions();


function createPatternViewFunctions() {
  const patternViewObject = {};

  let filterItemList = [];

  patternViewObject.initialiseInterface = function () {
    genericFunctions.initTabHeader();
    patternView.initialisePatternResults();
  };

  patternViewObject.initialisePatternResults = function () {
    const patternTitle = genericFunctions.getURLHash();
    const resultsText = genericFunctions.getPatternData(patternTitle);

    filterItemList = [];
    const seqItemRx = /\[(.*?)\]/g;

    resultsText.split('\n').forEach((resultSeq) => {
      if (resultSeq.trim()) {
        $('#patternResults').append($('<p>', { class: 'patternSeq' })
          .text(resultSeq.trim()));
      }

      // Extract all the existing items, and keep them in a list of uniques
      let nextItem;
      do {
        nextItem = seqItemRx.exec(resultSeq);
        if (nextItem && filterItemList.indexOf(nextItem[1]) === -1) {
          filterItemList.push(nextItem[1]);
        }
      }
      while (nextItem);
    });

    initPatternFilterControls();
  };

  function initPatternFilterControls() {
    const patternFilter = $('#patternFilter');
    patternFilter.empty();
    // retrieve list of all available node types

    filterItemList.forEach((filterItemObj) => {
      const patternFilterObj = $('<label>', { class: 'btn btn-primary active' });
      patternFilterObj.text(filterItemObj);
      patternFilterObj.append(
        $('<input>', {
          type: 'checkbox',
          'checked': 'checked',
          name: 'patternFilter',
          value: filterItemObj,
          // autocomplete: "off"
        }).on('change', updatePatternSelection));

      patternFilter.append(patternFilterObj);
    });

    // initialise pattern shortcuts
    // the button group needs to be enclosed in a row object so it can be horizontal
    const patternShortcuts = $('<div>', { class: 'row' })
      .append($('<div>', { class: 'btn-group colors' }));
    patternShortcuts.append(
      $('<button>', {
        id: 'patternFilterClear',
        type: 'button',
        class: 'btn btn-secondary',
        width: '50%',        
      }).text('Clear all')
        .click(() => {
          $("input[name='patternFilter']").attr('checked', false);
          $('#patternFilter label ').removeClass('active');
          updatePatternSelection();
        })
    );
    patternShortcuts.append(
      $('<button>', {
        id: 'patternFilterCheckAll',
        type: 'button',
        class: 'btn btn-secondary',
        width: '50%',
      }).text('Check all')
        .click(() => {
          $("input[name='patternFilter']").attr('checked', true);
          $('#patternFilter label ').addClass('active');
          updatePatternSelection();
        })
    );

    patternFilter.prepend(patternShortcuts);
  }

  /**
    * Checks the state of the pattern filters and only shows the patterns containing
    * at least one of the selected ones
    */
  function updatePatternSelection() {
    // console.log(`Updating pattern selection${$("label.active input[name='patternFilter']").val()}`);
    $('#patternResults .patternSeq').hide();
    $("label.active input[name='patternFilter']").each(
      (index, activeFilter) => {
        $('#patternResults .patternSeq').each(
          (index2, patternSeq) => {
            if ($(patternSeq).text().indexOf($(activeFilter).val()) > -1) {
              $(patternSeq).show();
            }
          });
      });
  }

  return patternViewObject;
}
