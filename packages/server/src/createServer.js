/* @flow */
const express = require("express");
const bodyParser = require("body-parser");
const stripAnsi = require("strip-ansi");
const handleRequest = require("./handleRequest");
import type {
  $Application,
  // eslint-disable-next-line no-unused-vars
  $Request,
  $Response,
} from "express";
import type { ServerConfig, APIRequest, APIResponse } from "run-on-server/types";

module.exports = function createServer(
  serverConfig: ?ServerConfig
): $Application {
  const app = express();
  app.use(bodyParser.json());

  app.post(
    "/",
    (req: { /* :: ...$Request, */ body: APIRequest }, res: $Response) => {
      handleRequest(req.body, serverConfig)
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
                name: stripAnsi(err.name),
                message: stripAnsi(err.message),
                stack: stripAnsi(err.stack),
              },
            }: APIResponse)
          );
        });
    }
  );

  return app;
};
