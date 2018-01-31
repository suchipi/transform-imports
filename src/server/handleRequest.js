/* @flow */
const createFakeModuleEnvironment = require("./createFakeModuleEnvironment");
const parseRequest = require("./parseRequest");
const compileCode = require("./compileCode");
import type { APIRequest, ServerConfig } from "../types";

module.exports = function handleRequest(
  requestBody: APIRequest,
  serverConfig: ?ServerConfig
): Promise<mixed> {
  return new Promise((resolve, reject) => {
    const { code, args } = parseRequest(requestBody);
    const runCode = compileCode(code, args);

    const requireFrom = serverConfig && serverConfig.requireFrom;
    const env = createFakeModuleEnvironment(requireFrom);

    const result = runCode(env);
    resolve(result);
  });
};
