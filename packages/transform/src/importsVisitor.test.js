import importsVisitor from "../src/importsVisitor";
import * as babel from "babel-core";
import cases from "jest-in-case";

const compile = (plugin, code) => {
  const result = babel.transform(code, { plugins: [plugin] });
  return result.code;
};

cases(
  "basic parsing works",
  ({ code, imports }) => {
    const actualImports = [];
    const plugin = () => ({
      visitor: {
        Program(path) {
          path.traverse(importsVisitor, { imports: actualImports });
        },
      },
    });
    compile(plugin, code);
    imports.forEach((importDef, index) => {
      expect(actualImports[index]).toEqual(expect.objectContaining(importDef));
    });
  },
  [
    {
      name: "with import declarations",
      code: `
        import foo from "bar";
        import { zoop, zow as zip } from "zeeoop";
      `,
      imports: [
        {
          source: "bar",
          variableName: "foo",
          exportName: "default",
          // path: expect.any(Object),
          remove: expect.any(Function),
        },
        {
          source: "zeeoop",
          variableName: "zoop",
          exportName: "zoop",
          // path: expect.any(Object),
          remove: expect.any(Function),
        },
        {
          source: "zeeoop",
          variableName: "zip",
          exportName: "zow",
          // path: expect.any(Object),
          remove: expect.any(Function),
        },
      ],
    },
    {
      name: "With require calls",
      code: `
        const foo = require("bar");
        const { zoop, zow: zip } = require("zeeoop");
      `,
      imports: [
        {
          source: "bar",
          variableName: "foo",
          exportName: "default",
          // path: expect.any(Object),
          remove: expect.any(Function),
        },
        {
          source: "zeeoop",
          variableName: "zoop",
          exportName: "zoop",
          // path: expect.any(Object),
          remove: expect.any(Function),
        },
        {
          source: "zeeoop",
          variableName: "zip",
          exportName: "zow",
          // path: expect.any(Object),
          remove: expect.any(Function),
        },
      ],
    },
  ]
);
