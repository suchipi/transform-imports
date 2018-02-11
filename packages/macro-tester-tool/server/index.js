const express = require("express");
const cors = require("cors");

const createServer = require("run-on-server/server");

const app = express();
const server = createServer({ requireFrom: __dirname });

app.use(cors());
app.options("*", cors());

app.use(server);

app.listen(3001, () => {
  console.log("App is listening on port 3001");
});
