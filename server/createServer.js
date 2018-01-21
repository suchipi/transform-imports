var express = require("express");
var bodyParser = require("body-parser");
var executeCode = require("./executeCode");

module.exports = function createServer() {
  var app = express();
  app.use(bodyParser.json());

  app.post("/", function(req, res) {
    executeCode(req.body)
      .then(function(result) {
        res.status(200).send({
          success: true,
          result: result || null
        });
      })
      .catch(function(err) {
        res.status(500).send({
          success: false,
          err: {
            name: err.name,
            message: err.message,
            stack: err.stack
          }
        });
      });
  });

  return app;
};
