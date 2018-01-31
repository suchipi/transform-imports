/* @flow */
import type { APIRequest } from "../types";

module.exports = function parseRequest(
  requestBody: APIRequest
): { code: string, args: ?Array<any> } {
  const { functionString, codeString } = requestBody;

  let args = requestBody.args == null ? [] : requestBody.args;
  let code;
  if (typeof functionString === "string") {
    code = `(${functionString}).apply(null, ${JSON.stringify(args)});`;
    args = null;
  } else if (typeof codeString === "string") {
    code = codeString;
  } else {
    throw new Error(
      "The code must be specified via either functionString or codeString"
    );
  }

  return { code, args };
};
