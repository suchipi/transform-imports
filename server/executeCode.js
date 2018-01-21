const vm = require("vm");

module.exports = function executeCode(requestBody) {
  return new Promise(function(resolve, reject) {
    var functionString = requestBody.functionString;
    var args = requestBody.args == null ? [] : requestBody.args;
    var codeString = requestBody.codeString;

    var code;
    if (typeof functionString === "string") {
      code =
        "(" + functionString + ").apply(null, " + JSON.stringify(args) + ");";
    } else if (typeof codeString === "string") {
      code = codeString;
    }

    resolve(vm.runInThisContext(code));
  });
};
