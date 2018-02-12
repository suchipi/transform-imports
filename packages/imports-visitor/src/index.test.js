import importsVisitor from "./index";
import * as babel from "babel-core";
import cases from "jest-in-case";

const compile = (plugin, code) => {
  const result = babel.transform(code, { plugins: [plugin] });
  return result.code;
};

const getImports = (code) => {
  const imports = [];
  const plugin = () => ({
    visitor: {
      Program(path) {
        path.traverse(importsVisitor, { imports });
      },
    },
  });
  compile(plugin, code);
  return imports;
};

cases(
  "basic parsing works",
  ({ code, imports }) => {
    const actualImports = getImports(code);
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
        import * as star from "shooting-stars";
      `,
      imports: [
        {
          source: "bar",
          variableName: "foo",
          exportName: "default",
          isCJSDefaultImport: false,
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zoop",
          exportName: "zoop",
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zip",
          exportName: "zow",
          path: expect.any(Object),
        },
        {
          source: "shooting-stars",
          variableName: "star",
          exportName: "*",
          path: expect.any(Object),
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
          isCJSDefaultImport: true,
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zoop",
          exportName: "zoop",
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zip",
          exportName: "zow",
          path: expect.any(Object),
        },
      ],
    },
    {
      name: "Partial parsing of dynamic requires",
      code: `
        const foo = require(something);
        const { bar: { baz } } = require("bar");
        const [ bla ] = require("some-array");
      `,
      imports: [
        {
          source: null,
          variableName: "foo",
          exportName: "default",
          path: expect.any(Object),
        },
        {
          source: "bar",
          variableName: null,
          exportName: "bar",
          path: expect.any(Object),
        },
        {
          source: "some-array",
          variableName: null,
          exportName: null,
          path: expect.any(Object),
        },
      ],
    },
  ]
);

cases(
  "path node type",
  ({ code, type }) => {
    const imports = getImports(code);
    expect(imports[0].path.node.type).toBe(type);
  },
  [
    {
      name: "import declaration - default specifier",
      code: `import foo from "bar";`,
      type: "ImportDefaultSpecifier",
    },
    {
      name: "import declaration - named specifier",
      code: `import { foo } from "bar";`,
      type: "ImportSpecifier",
    },
    {
      name: "import declaration - star specifier",
      code: `import * as foo from "bar";`,
      type: "ImportNamespaceSpecifier",
    },
    {
      name: "require call",
      code: `const foo = require("bar");`,
      type: "VariableDeclarator",
    },
    {
      name: "require call (destructured)",
      code: `const { foo } = require("bar");`,
      type: "ObjectProperty",
    },
  ]
);

cases(
  "remove method",
  ({ code, output, removalIndex }) => {
    const imports = [];
    const plugin = () => ({
      visitor: {
        Program(path) {
          path.traverse(importsVisitor, { imports });
          imports[removalIndex || 0].remove();
        },
      },
    });
    const actualOutput = compile(plugin, code);
    expect(actualOutput).toBe(output);
  },
  [
    {
      name: "import declaration - lone default specifier",
      code: `import foo from "bar";`,
      output: ``,
    },
    {
      name: "import declaration - lone named specifier",
      code: `import { foo } from "bar";`,
      output: ``,
    },
    {
      name: "import declaration - lone star specifier",
      code: `import * as foo from "bar";`,
      output: ``,
    },
    {
      name: "import declaration - default specifier with named specifier",
      code: `import foo, { bar } from "bar";`,
      output: `import { bar } from "bar";`,
    },
    {
      name: "import declaration - default specifier with star specifier",
      code: `import foo, * as bar from "bar";`,
      output: `import * as bar from "bar";`,
    },
    {
      name: "import declaration - two named specifiers",
      code: `import { foo, bar } from "bar";`,
      output: `import { bar } from "bar";`,
    },
    {
      name: "import declaration - named specifier with default specifier",
      code: `import foo, { bar } from "bar";`,
      output: `import foo from "bar";`,
      removalIndex: 1,
    },
    {
      name: "import declaration - star specifier with default export",
      code: `import bar, * as foo from "bar";`,
      output: `import bar from "bar";`,
      removalIndex: 1,
    },
    {
      name: "require call",
      code: `const foo = require("bar");`,
      output: ``,
    },
    {
      name: "destructured require call - lone",
      code: `const { foo } = require("bar");`,
      output: ``,
    },
    {
      name: "destructured require call - not lone",
      code: `const { foo, bar } = require("bar");`,
      output: `const { bar } = require("bar");`,
    },
  ]
);

cases(
  "changing source",
  ({ code, output, changeIndex }) => {
    const imports = [];
    const plugin = () => ({
      visitor: {
        Program(path) {
          path.traverse(importsVisitor, { imports });
          const importDef = imports[changeIndex || 0];
          importDef.source = "new-source";
        },
      },
    });

    const clean = (str) =>
      str
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");

    const actualOutput = compile(plugin, code);
    expect(clean(actualOutput)).toBe(clean(output));
  },
  [
    {
      name: "import declaration - lone default specifier",
      code: `import foo from "bar";`,
      output: `import foo from "new-source";`,
    },
    {
      name: "import declaration - lone named specifier",
      code: `import { foo } from "bar";`,
      output: `import { foo } from "new-source";`,
    },
    {
      name: "import declaration - lone star specifier",
      code: `import * as foo from "bar";`,
      output: `import * as foo from "new-source";`,
    },
    {
      name: "import declaration - default specifier with named specifier",
      code: `import foo, { bar } from "bar";`,
      output: `
        import { bar } from "bar";
        import foo from "new-source";
      `,
    },
    {
      name: "import declaration - default specifier with star specifier",
      code: `import foo, * as bar from "bar";`,
      output: `
        import * as bar from "bar";
        import foo from "new-source";
      `,
    },
    {
      name: "import declaration - two named specifiers",
      code: `import { foo, bar } from "bar";`,
      output: `
        import { bar } from "bar";
        import { foo } from "new-source";
      `,
    },
    {
      name: "import declaration - named specifier with default specifier",
      code: `import foo, { bar } from "bar";`,
      output: `
        import foo from "bar";
        import { bar } from "new-source";
      `,
      changeIndex: 1,
    },
    {
      name: "import declaration - star specifier with default export",
      code: `import bar, * as foo from "bar";`,
      output: `
        import bar from "bar";
        import * as foo from "new-source";
      `,
      changeIndex: 1,
    },
    {
      name: "require call",
      code: `const foo = require("bar");`,
      output: `const foo = require("new-source");`,
    },
    {
      name: "destructured require call - lone",
      code: `const { foo } = require("bar");`,
      output: `const { foo } = require("new-source");`,
    },
    {
      name: "destructured require call - not lone",
      code: `const { foo, bar } = require("bar");`,
      output: `
        const { bar } = require("bar");
        const { foo } = require("new-source");
      `,
    },
  ]
);
