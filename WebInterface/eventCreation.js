
/** When the user presses in the 'plus' sign of the 'New event'' object, a new event will be created.
 * This event won't have an ID (the ID will be set when it)
*/

/**
 * This function takes a multioption object as a parameter
 * and loads a series of event values.
 * TODO: rather than static, the values should be retrieved from the xsd 
 */
function loadEventNames(multiOptionTarget) {
  console.log("loading event names");
  $.get('eventseq.xsd', function (eventSeqTemplate) {
    console.log("xml schema loaded");
    /*The usual jquery selectors work for xml, but I was having problems with xml schema.
    Instead, I will use Xpath: http://api.jquery.com/category/selectors/#XPath_Selectors*/
    //$(eventSeqTemplate).find("[name='eventType'] returns the eventType node, where all the event names are defined.
    //Look for the root (schema), then look for the list with the name attribute I want (eventType),
    //then go down one node (restriction) and then get all values from elements with the name enumeration
    result = eventSeqTemplate.evaluate("/*[local-name()='schema']/*[@name='eventType']/*[local-name()='restriction']/*[local-name()='enumeration']/@value",
      eventSeqTemplate, null, 0, null);
    while (eventNameItem = result.iterateNext()) {
      $(multiOptionTarget).append('<option>' + eventNameItem.value + '</option>');
    }
    $(multiOptionTarget).trigger('chosen:updated');
  });
}

/**
 * Similar to *loadEventNames*, it looks for all context type names,
 * and loads them into the given node.
 */
function loadContextTypes(selectElement) {
  console.log("loading event names");
  $.get('eventseq.xsd', function (eventSeqTemplate) {
    console.log("xml schema loaded");
    result = eventSeqTemplate.evaluate("/*[local-name()='schema']/*[@name='contextType']/*[local-name()='restriction']/*[local-name()='enumeration']/@value",
      eventSeqTemplate, null, 0, null);

    //remove previously existing values, and add placeholder
    $(selectElement).empty();
    $(selectElement).append("<option value='' selected disabled>Please select</option>");

    while (eventNameItem = result.iterateNext()) {
      $(selectElement).append('<option>' + eventNameItem.value + '</option>');
    }
  });
}

/**
 * Similar to *loadContextTypes*, it looks for all context type values.
 * IS NOT FINISHED!! We would still need to query the context of the page to retrieve all possible values for the various context types.
 */
function loadContextValues(selectElement) {
  console.log("loading event names");
  $.get('eventseq.xsd', function (eventSeqTemplate) {
    console.log("xml schema loaded");
    result = eventSeqTemplate.evaluate("/*[local-name()='schema']/*[@name='contextType']/*[local-name()='restriction']/*[local-name()='enumeration']/@value",
      eventSeqTemplate, null, 0, null);
    while (eventNameItem = result.iterateNext()) {
      $(multiOptionTarget).append('<option>' + eventNameItem.value + '</option>');
    }
  });
}

/**
 * When the user introduces a context option, it gets processed, and a new input row is added.
 * This function receives the *eventContextTable* element as a parameter
 */
function addContext(eventContextTable) {
  console.log("Adding new context option");

  //1. get the values from the last row and reset the options, for possible new input
  var lastRow = $(eventContextTable).find('tr:last');
  var contextType = $("select[name='contextType']", lastRow).find(":selected").text();
  var contextvalue = $("input[name='contextValue']", lastRow).val();
  
  //2. Check if input is correct, if not, break
  if ($("select[name='contextType']", lastRow).find(":disabled").text().indexOf(contextType) !== -1){
    $("select[name='contextType']", lastRow).fadeIn(200).fadeOut(200).fadeIn(200).fadeOut(200).fadeIn(200);
    return (false);
  }
  if(contextvalue===""){
    $("input[name='contextValue']", lastRow).placeholder='Content cannot be empty';
    // Change background
    $("input[name='contextValue']", lastRow).css('background-color', '#FF6347');
    // Wait 1 seconds, then remove the css attribute
    setTimeout(function(){           
      $("input[name='contextValue']", lastRow).css('background-color', '');
    }, 500);
    return (false);
  }
  
  //3. reset options for reuse
  $("select[name='contextType']", lastRow)[0].selectedIndex = 0;
  $("input[name='contextValue']", lastRow).val('');

  // 4. Add them as a new row before the last one.
  $(eventContextTable).find('tr:last').prev().after('<tr> <td>' + contextType + '</td> <td>' + contextvalue 
    + '</td> <td><span class="removeContext glyphicon glyphicon-minus" aria-hidden="true"></span></td> </tr>');

  //5. add the corresponding listener, so each row can be deleted:
  $(".removeContext").click(function(){
    console.log("removing context option");
    this.closest("tr").remove();
  });
}

function addEventTemplate() {
  var valid = true;
  allFields.removeClass("ui-state-error");

  valid = valid && checkLength(name, "username", 3, 16);
  valid = valid && checkLength(email, "email", 6, 80);
  valid = valid && checkLength(password, "password", 5, 16);

  valid = valid && checkRegexp(name, /^[a-z]([0-9a-z_\s])+$/i, "Username may consist of a-z, 0-9, underscores, spaces and must begin with a letter.");
  valid = valid && checkRegexp(email, emailRegex, "eg. ui@jquery.com");
  valid = valid && checkRegexp(password, /^([0-9a-zA-Z])+$/, "Password field only allow : a-z 0-9");

  if (valid) {
    $("#users tbody").append("<tr>" +
      "<td>" + name.val() + "</td>" +
      "<td>" + email.val() + "</td>" +
      "<td>" + password.val() + "</td>" +
      "</tr>");
    dialog.dialog("close");
  }
  return valid;
}

function updateTips(t) {
  tips
    .text(t)
    .addClass("ui-state-highlight");
  setTimeout(function () {
    tips.removeClass("ui-state-highlight", 1500);
  }, 500);
}

function checkLength(o, n, min, max) {
  if (o.val().length > max || o.val().length < min) {
    o.addClass("ui-state-error");
    updateTips("Length of " + n + " must be between " +
      min + " and " + max + ".");
    return false;
  } else {
    return true;
  }
}

function checkRegexp(o, regexp, n) {
  if (!(regexp.test(o.val()))) {
    o.addClass("ui-state-error");
    updateTips(n);
    return false;
  } else {
    return true;
  }
}

/**
 * To be called when an event is dragged from the palette to the ordered area.
 * Will set a unique ID for that event. Possibly some additional tasks as well.
 */
function addEventToOrderedList() {

}

/**
 * To be called when a new temporal constraint is to be created.
 * It shows a dialog that contains the various necessary options.
 */
function addTemporalConstraint() {

}