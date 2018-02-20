const cases = require("jest-in-case");
const rewrite = require("./rewrite");

const clean = (str) =>
  str
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

cases(
  "rewrites matching imports",
  ({ code, sampleImport, newImport, output }) => {
    const actual = rewrite(code, sampleImport, newImport);
    expect(clean(actual)).toEqual(clean(output));
  },
  [
    {
      name: "fork prop types from react",
      code: `
        import React, { PropTypes } from "react";
      `,
      sampleImport: `import { PropTypes } from "react";`,
      newImport: `import PropTypes from "prop-types";`,
      output: `
        import React from "react";
        import PropTypes from "prop-types";
      `,
    },
  ]
);
