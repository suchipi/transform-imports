/* @flow */
import type { APIRequest, IDMappings } from "../types";

module.exports = function parseRequest(
  requestBody: APIRequest,
  idMappings: ?IDMappings
): { code: string, args: ?Array<any> } {
  const { functionString, codeString, codeId } = requestBody;

  let args = requestBody.args == null ? [] : requestBody.args;
  let code;

  if (idMappings == null) {
    if (codeId != null) {
      throw new Error(
        "Cannot use codeId unless idMappings are configured. Please pass the " +
          "idMappings into createServer's config object."
      );
    }

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
  } else {
    if (functionString != null || codeString != null) {
      throw new Error(
        "Cannot use functionString or codeString when idMappings have been " +
          "configured. If you do not want to use idMappings, remove it from " +
          "createServer's config object. Otherwise, please verify that you are " +
          "calling runOnServer with { id } objects in your runtime code " +
          "instead of strings or functions."
      );
    }
    if (codeId == null || idMappings[codeId] == null) {
      throw new Error("An invalid code id was passed to the server");
    }

    const mappedCode = idMappings[codeId];
    if (typeof mappedCode === "function") {
      code = `(${mappedCode.toString()}).apply(null, ${JSON.stringify(args)});`;
      args = null;
    } else if (typeof mappedCode === "string") {
      code = mappedCode;
    } else {
      throw new Error(
        `An id mapping for ${codeId} was found, but it was not valid. ` +
          "id mapping values should be either functions or strings."
      );
    }
  }

  return { code, args };
};
