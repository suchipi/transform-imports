var vm = require("vm");
var acorn = require("acorn");
var createFakeModuleEnvironment = require("./createFakeModuleEnvironment");

function wrapCode(code, includeArgs) {
  // Verify original code is valid syntax before putting it in the
  // function wrapper (this will throw and reject the Promise)
  acorn.parse(code, { ecmaVersion: 2018 });

  var codeWithReturn = "return " + code.trim();
  var worksWithReturn = true;
  try {
    acorn.parse("(function() {" + codeWithReturn + "})", { ecmaVersion: 2018 });
  } catch (err) {
    worksWithReturn = false;
  }

  var wrapperParams = [
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname"
  ];
  if (includeArgs) {
    wrapperParams.push("args");
  }

  return [
    "(function(" + wrapperParams.join(", ") + ") {",
    worksWithReturn ? codeWithReturn : code,
    "})"
  ].join("\n");
}

module.exports = function executeCode(requestBody) {
  return new Promise(function(resolve, reject) {
    var functionString = requestBody.functionString;
    var args = requestBody.args == null ? [] : requestBody.args;
    var codeString = requestBody.codeString;
    var requireFrom = requestBody.requireFrom;

    var code;
    var includeArgs = false;
    if (typeof functionString === "string") {
      code =
        "(" + functionString + ").apply(null, " + JSON.stringify(args) + ");";
    } else if (typeof codeString === "string") {
      code = codeString;
      includeArgs = true;
    }

    var wrappedCode = wrapCode(code, includeArgs);
    var env = createFakeModuleEnvironment(requireFrom);

    var userFunc = vm.runInThisContext(wrappedCode);
    var result;
    if (includeArgs) {
      result = userFunc(
        env.exports,
        env.require,
        env.module,
        env.__filename,
        env.__dirname,
        args
      );
    } else {
      result = userFunc(
        env.exports,
        env.require,
        env.module,
        env.__filename,
        env.__dirname
      );
    }

    resolve(result);
  });
};
