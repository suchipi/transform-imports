const fetchPonyfill = require("fetch-ponyfill");
const fetch = fetchPonyfill().fetch;

module.exports = function createClient(url) {
  return function runOnServer(fnOrString, args) {
    let body;
    if (typeof fnOrString === "function") {
      body = JSON.stringify({
        functionString: fnOrString.toString(),
        args
      });
    } else if (typeof fnOrString === "string") {
      body = JSON.stringify({
        codeString: fnOrString,
        args
      });
    } else {
      throw new Error(
        "Expected either a function or string, but received: " +
          typeof fnOrString
      );
    }

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body
    })
      .then(response => response.json())
      .then(response => {
        if (response.success) {
          return response.result;
        } else {
          const error = new Error();
          Object.defineProperty(error, "name", {
            writable: true,
            enumerable: false,
            configurable: true,
            value: response.err.name
          });
          Object.defineProperty(error, "message", {
            writable: true,
            enumerable: false,
            configurable: true,
            value: response.err.message
          });
          Object.defineProperty(error, "stack", {
            writable: true,
            enumerable: false,
            configurable: true,
            value: response.err.stack
          });

          throw error;
        }
      });
  };
};
