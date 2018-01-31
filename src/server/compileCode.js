/* @flow */
const vm = require("vm");
const acorn = require("acorn");
import type { ModuleEnvironment } from "../types";

module.exports = function compileCode(
  codeString: string,
  args: ?Array<mixed>
): (env: ModuleEnvironment) => mixed {
  // Verify original code is valid syntax before wrapping it
  acorn.parse(codeString, { ecmaVersion: 2018 });

  const codeWithReturn = "return " + codeString.trim();
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
    "__dirname",
  ];

  if (args != null) {
    wrapperParams.push("args");
  }

  const wrappedCode = [
    `(function(${wrapperParams.join(", ")}) {`,
    worksWithReturn ? codeWithReturn : codeString,
    "})",
  ].join("\n");

  const codeFunction = vm.runInThisContext(wrappedCode);

  return function runCode(env: ModuleEnvironment) {
    if (args != null) {
      return codeFunction(
        env.exports,
        env.require,
        env.module,
        env.__filename,
        env.__dirname,
        args
      );
    } else {
      return codeFunction(
        env.exports,
        env.require,
        env.module,
        env.__filename,
        env.__dirname
      );
    }
  };
};
