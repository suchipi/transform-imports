#!/usr/bin/env node
// @flow

const process = require("./process");
const argv = require("yargs")
  .option("files", {
    type: "string",
    describe: "glob of files to process",
  })
  .demandOption("files", "the files glob is required")
  .option("matchSourceRegExp", {
    type: "string",
    describe: "target imports whose source matches this Regular Expression",
  })
  .option("matchSourceFile", {
    type: "string",
    describe: "target imports whose source refers to this file",
  })
  .conflicts("matchSourceRegExp", "matchSourceFile")
  .option("matchVariableName", {
    type: "string",
    describe:
      "target imports whose variable name matches this Regular Expression",
  })
  .option("matchImportedExportName", {
    type: "string",
    describe:
      "target imports whose imported export name matches this Regular Expression",
  })
  .option("setSource", {
    type: "string",
    describe:
      "change the source for the targeted imports to the specified value",
  })
  .option("setVariableName", {
    type: "string",
    describe:
      "change the variable name for the targeted imports to the specified value",
  })
  .option("setImportedExportName", {
    type: "string",
    describe:
      "change which export to get from the file for the targeted imports",
  })
  .option("convertToImport", {
    type: "boolean",
    describe: "convert the targeted imports to ES2015 import statements",
  })
  .option("convertToRequire", {
    type: "boolean",
    describe: "convert the targeted imports to ES2015 import statements",
  });

export type Argv = {
  files: string, // glob
  matchSourceRegExp?: string, // RegExp source
  matchSourceFile?: string, // relative path
  matchVariableName?: string, // RegExp source
  matchImportedExportName?: string, // RegExp source
  setSource?: string,
  setVariableName?: string,
  setImportedExportName?: string,
  convertToImport?: boolean,
  convertToRequire?: boolean,
};

process(argv);