const cases = require("jest-in-case");
const babelParser = require("@babel/parser");
const transformImports = require("./index");

const clean = (str) =>
  str
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

cases(
  "transformImports",
  ({ code, action, output }) => {
    const actualOutput = transformImports(code, action);
    expect(clean(actualOutput)).toBe(clean(output));
  },
  [
    {
      name: "extract PropTypes from React and change React to star import",
      code: `
        import React, { PropTypes } from "react";
        import App from "./App";

        console.log(  "this is unrelated" );
      `,
      action: (imports) => {
        imports.filter((def) => def.source === "react").forEach((def) => {
          if (
            def.importedExport.name === "default" &&
            def.importedExport.isImportedAsCJS === false
          ) {
            def.fork({ insert: "before" });
            def.importedExport.name = "*";
          }

          if (
            def.variableName === "PropTypes" &&
            def.importedExport.name === "PropTypes"
          ) {
            def.importedExport.name = "default";
            def.source = "prop-types";
          }
        });
      },
      output: `
        import * as React from "react";
        import PropTypes from "prop-types";
        import App from "./App";

        console.log(  "this is unrelated" );
      `,
    },
    {
      name: "Change named import into type import",
      code: `
        import { Something } from "somewhere";
      `,
      action: (imports) => {
        imports[0].kind = "type";
      },
      output: `
        import type { Something } from "somewhere";
      `,
    },
  ]
);

test("custom parser", () => {
  const actualOutput = transformImports(
    `
    const foo = require("hi");
    `,
    (imports) => {
      imports[0].source = "hello";
    },
    { parser: babelParser }
  );

  expect(clean(actualOutput)).toBe(
    clean(
      `
      const foo = require("hello");
      `
    )
  );
});
