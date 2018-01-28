const vm = require("vm");
const acorn = require("acorn");
const createFakeModuleEnvironment = require("./createFakeModuleEnvironment");

function wrapCode(code, includeArgs) {
  // Verify original code is valid syntax before putting it in the
  // function wrapper (this will throw and reject the Promise)
  acorn.parse(code, { ecmaVersion: 2018 });

  const codeWithReturn = "return " + code.trim();
  let worksWithReturn = true;
  try {
    acorn.parse("(function() {" + codeWithReturn + "})", { ecmaVersion: 2018 });
  } catch (err) {
    worksWithReturn = false;
  }

  const wrapperParams = [
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
    `(function(${wrapperParams.join(", ")}) {`,
    worksWithReturn ? codeWithReturn : code,
    "})"
  ].join("\n");
}

module.exports = function executeCode(requestBody) {
  return new Promise(function(resolve, reject) {
    const { functionString, codeString, requireFrom } = requestBody;
    const args = requestBody.args == null ? [] : requestBody.args;

    let code;
    let includeArgs = false;
    if (typeof functionString === "string") {
      code = `(${functionString}).apply(null, ${JSON.stringify(args)});`;
    } else if (typeof codeString === "string") {
      code = codeString;
      includeArgs = true;
    }

    const wrappedCode = wrapCode(code, includeArgs);
    const env = createFakeModuleEnvironment(requireFrom);

    const userFunc = vm.runInThisContext(wrappedCode);
    let result;
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
