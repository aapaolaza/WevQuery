
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
  var contextType = $("#eventTemplateContextType").find(":selected").text();
  var contextvalue = $("#eventTemplateContextValue").val();
  
  //2. Check if input is correct, if not, break
  if ($("#eventTemplateContextType").find(":disabled").text().indexOf(contextType) !== -1){
    $("#eventTemplateContextType").fadeIn(200).fadeOut(200).fadeIn(200).fadeOut(200).fadeIn(200);
    return (false);
  }
  if(contextvalue===""){
    $("#eventTemplateContextValue").placeholder='Content cannot be empty';
    // Change background
    $("#eventTemplateContextValue").css('background-color', '#FF6347');
    // Wait 1 seconds, then remove the css attribute
    setTimeout(function(){           
      $("#eventTemplateContextValue").css('background-color', '');
    }, 500);
    return (false);
  }
  
  //3. reset options for reuse
  $("#eventTemplateContextType")[0].selectedIndex = 0;
  $("#eventTemplateContextValue").val('');

  // 4. Add them as a new row before the last one.
  $(eventContextTable).find('tr:last').prev().after("<tr> <td class='contextType'>" + contextType + "</td> <td class='contextValue'>" + contextvalue 
    + "</td> <td><span class='removeContext glyphicon glyphicon-minus' aria-hidden='true'></span></td> </tr>");

  //5. add the corresponding listener, so each row can be deleted:
  $(".removeContext").click(function(){
    console.log("removing context option");
    this.closest("tr").remove();
  });
}

function addEventTemplate() {

  //All elements within the form can be easily extracted, except from the table. using the following lines
  //console.log($('#eventTemplateForm').serialize())
  //$('#eventTemplateForm').serializeArray()
  //As I will have to create the div anyway, and I cannot retrieve the elements inside the table, I will just retrieve all of them manually.
  
  //event list
  var eventList = $("#eventMultiSelector","#eventTemplateForm").val();
  //occurrence
  var minOccurrence = $("input[name='minOccurrence']", "#eventTemplateForm").val();
  var maxOccurrence = $("input[name='maxOccurrence']", "#eventTemplateForm").val();
  //context options
  var contextTypeArray = [];
  $(".contextType", "#eventContextTable").each(function(index){
    contextTypeArray.push($(this).text());
  });
  
  var contextvalueArray = [];
  $(".contextValue", "#eventContextTable").each(function(index){
    contextvalueArray.push($(this).text());
  });

  //Check all inputs are correct.
  var valid = true;
  //at least one event
  valid = valid && eventList.length > 0;
  //minOccurence and maxOccurrence must be nonempty, as well as either a number, or "n"
  valid = valid && minOccurrence!=="" && (!isNaN(minOccurrence) ||minOccurrence==="n");
  valid = valid && maxOccurrence!=="" && (!isNaN(maxOccurrence) ||maxOccurrence==="n");
  //no need to check the context, as it can be empty
  
  if(!valid)
    return false;

  //Finally, create the div element for the event template, and append it to the palette
  var newEventObject = $("#newEventTemplate").clone();
  newEventObject.removeAttr("id");
  $(".eventList",newEventObject).val(eventList);
  $(".minOccurrence",newEventObject).val(minOccurrence);
  $(".maxOccurrence",newEventObject).val(maxOccurrence);

  if (contextTypeArray.length > 0){
     $(".contextTable",newEventObject).append("<tr> <th>name</th> <th>value</th> <td></td> </tr>");
    contextTypeArray.forEach(function(typeItem,index){
      var valueItem = contextvalueArray[index];
      $(".contextTable tr:last",newEventObject).after(
      "<tr> <td class='contextType'>" + typeItem + "</td> <td class='contextValue'>" + valueItem
      + "</td> <td><span class='removeContext glyphicon glyphicon-minus' aria-hidden='true'></span></td> </tr>");

      $(".contextTable",newEventObject).val(maxOccurrence);
    });
  }
  
  $("#eventPaletteArea").append(newEventObject);
  newEventObject.show();
  
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