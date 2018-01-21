var fetchPonyfill = require("fetch-ponyfill");
var fetch = fetchPonyfill().fetch;

module.exports = function createClient(url) {
  return function runOnServer(fnOrString, args) {
    var body;
    if (typeof fnOrString === "function") {
      body = JSON.stringify({
        functionString: fnOrString.toString(),
        args: args
      });
    } else if (typeof fnOrString === "string") {
      body = JSON.stringify({
        codeString: fnOrString
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
      body: body
    })
      .then(function(response) {
        return response.json();
      })
      .then(function(response) {
        if (response.success) {
          return response.result;
        } else {
          var error = new Error();
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
