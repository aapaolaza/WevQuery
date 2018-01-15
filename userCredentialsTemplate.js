//OPTIONAL: For functions using email notifications
var email = {};
email.service="gmail"
email.user= "user"
email.password="password"

// Authentication to the Web application
var userList = {};
userList["user"] = "password"

// authentication to the REST service
var restUsers = {};

module.exports.email = email;
module.exports.userList = userList;
module.exports.restUsers = restUsers;
module.exports.restSecret = "SecretToSignRESTTokensWith"