
/** When the user presses in the 'plus' sign of the 'New event'' object, a new event will be created.
 * This event won't have an ID (the ID will be set when it)
*/

function addNewEvent(){

  var event = $("<li class='eventTemplate eventTemplateDraggable'><div class='title'> Event template <span class='dragIcon' aria-hidden='true' aria-label='Move Event'></span></div> <p> Events:</p><p class='eventList'></p><p> Occurrence:</p><p class='occurrence'></p><p> Context</p><p class='contextItem'></p></li>");

  $('.title', event).attr('id','a1234');  // set the attribute
  $('.eventList', event).text("mousemove,mouseout");  // set the attribute 
  
  $('body').append(e); // put it into the DOM
}

/**
 * To be called when an event is dragged from the palette to the ordered area.
 * Will set a unique ID for that event. Possibly some additional tasks as well.
 */
function addEventToOrderedList(){

}

/**
 * To be called when a new temporal constraint is to be created.
 * It shows a dialog that contains the various necessary options.
 */
function addTemporalConstraint(){
  
}