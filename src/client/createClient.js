/* @flow */
const fetchPonyfill = require("fetch-ponyfill");
const fetch = fetchPonyfill().fetch;
import type { APIResponse, RunOnServer } from "../types";

module.exports = function createClient(url: string): RunOnServer {
  return function runOnServer(
    code: Function | string | { id: string },
    args: ?Array<any>
  ) {
    let body: string;
    if (typeof code === "function") {
      body = JSON.stringify({
        functionString: code.toString(),
        args,
      });
    } else if (typeof code === "string") {
      body = JSON.stringify({
        codeString: code,
        args,
      });
    } else if (
      typeof code === "object" &&
      code != null &&
      typeof code.id === "string"
    ) {
      body = JSON.stringify({
        codeId: code.id,
        args,
      });
    } else {
      throw new Error(
        "Expected either a function, string, or code id, but received: " +
          typeof code
      );
    }

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    })
      .then((response) => response.json())
      .then((response: APIResponse) => {
        if (response.success) {
          return response.result;
        } else {
          const error = new Error();
          Object.defineProperty(error, "name", {
            writable: true,
            enumerable: false,
            configurable: true,
            value: response.err.name,
          });
          Object.defineProperty(error, "message", {
            writable: true,
            enumerable: false,
            configurable: true,
            value: response.err.message,
          });
          Object.defineProperty(error, "stack", {
            writable: true,
            enumerable: false,
            configurable: true,
            value: response.err.stack,
          });

          throw error;
        }
      });
  };
};
