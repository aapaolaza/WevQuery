
/** When the user presses in the 'plus' sign of the 'New event'' object, a new event will be created.
 * This event won't have an ID (the ID will be set when it)
*/

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