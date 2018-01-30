/* @flow */
const vm = require("vm");
const acorn = require("acorn");
const createFakeModuleEnvironment = require("./createFakeModuleEnvironment");
import type { APIRequest, ServerConfig } from "../types";

function wrapCode(code: string, includeArgs: boolean): string {
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
    "__dirname",
  ];
  if (includeArgs) {
    wrapperParams.push("args");
  }

  return [
    `(function(${wrapperParams.join(", ")}) {`,
    worksWithReturn ? codeWithReturn : code,
    "})",
  ].join("\n");
}

module.exports = function executeCode(
  requestBody: APIRequest,
  serverConfig: ?ServerConfig
): Promise<any> {
  return new Promise((resolve, reject) => {
    const { functionString, codeString } = requestBody;
    const requireFrom = serverConfig && serverConfig.requireFrom;
    const args = requestBody.args == null ? [] : requestBody.args;

    let code;
    let includeArgs = false;
    if (typeof functionString === "string") {
      code = `(${functionString}).apply(null, ${JSON.stringify(args)});`;
    } else if (typeof codeString === "string") {
      code = codeString;
      includeArgs = true;
    } else {
      throw new Error(
        "The code must be specified via either functionString or codeString"
      );
    }

    const wrappedCode = wrapCode(code, includeArgs);
    const env = createFakeModuleEnvironment(requireFrom);

    const userFunc: (
      exports: typeof exports,
      require: typeof require,
      module: typeof module,
      __filename: string,
      __dirname: string,
      args: ?Array<any>
    ) => any = vm.runInThisContext(wrappedCode);

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
