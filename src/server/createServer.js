/* @flow */
const express = require("express");
const bodyParser = require("body-parser");
const executeCode = require("./executeCode");
import type { $Application, $Request, $Response } from "express";
import type { ServerConfig, APIRequest, APIResponse } from "../types";

module.exports = function createServer(
  serverConfig: ?ServerConfig
): $Application {
  const app = express();
  app.use(bodyParser.json());

  app.post("/", (req: $Request & { body: APIRequest }, res: $Response) => {
    executeCode(req.body, serverConfig)
      .then((result) => {
        res.status(200).send(
          ({
            success: true,
            result: typeof result === "undefined" ? null : result,
          }: APIResponse)
        );
      })
      .catch((err: Error) => {
        res.status(500).send(
          ({
            success: false,
            err: {
              name: err.name,
              message: err.message,
              stack: err.stack,
            },
          }: APIResponse)
        );
      });
  });

  return app;
};
