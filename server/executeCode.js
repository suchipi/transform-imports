const vm = require("vm");
const mod = require("module");

function hasSyntaxError(code) {
  // We use runInNewContext to parse the code, but we don't actually run any of
  // it yet (we just put it in an unused function body). There's an early return
  // to guard against the user inserting eg. "}) console.log('executed')" as
  // code.
  try {
    vm.runInNewContext("(function(){return;" + code + "});");
    return false;
  } catch (err) {
    return true;
  }
}

function wrapCode(code) {
  // If the code can be written as an expression, then return that expression.
  if (!hasSyntaxError("return " + code.trim() + "")) {
    return mod.wrap("return " + code.trim() + "");
  } else {
    return mod.wrap(code);
  }
}

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

    const wrappedCode = wrapCode(code);

    resolve(
      vm.runInThisContext(wrappedCode)(
        exports,
        require,
        module,
        __filename,
        __dirname
      )
    );
  });
};
