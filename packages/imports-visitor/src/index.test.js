const cases = require("jest-in-case");
const babel = require("@babel/core");
const importsVisitor = require("./index");

const clean = (str) =>
  str
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

function transformImports(code, callback) {
  return babel.transform(code, {
    babelrc: false,
    configFile: false,
    plugins: [
      "@babel/plugin-syntax-flow",
      "@babel/plugin-syntax-dynamic-import",
      () => ({
        visitor: {
          Program(path) {
            const imports = [];
            path.traverse(importsVisitor, { imports });
            callback(imports);
          },
        },
      }),
    ],
  }).code;
}

cases(
  "basic parsing works",
  ({ code, imports }) => {
    transformImports(code, (actualImports) => {
      imports.forEach((importDef, index) => {
        Object.keys(importDef).forEach((key) => {
          expect(actualImports[index]).toHaveProperty(key, importDef[key]);
        });
      });
    });
  },
  [
    {
      name: "with import declarations",
      code: `
        import foo from "bar";
        import { zoop, zow as zip } from "zeeoop";
        import * as star from "shooting-stars";
        import "foo";
      `,
      imports: [
        {
          source: "bar",
          variableName: "foo",
          importedExport: {
            name: "default",
            isImportedAsCJS: false,
          },
          kind: "value",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zoop",
          importedExport: {
            name: "zoop",
            isImportedAsCJS: false,
          },
          kind: "value",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zip",
          importedExport: {
            name: "zow",
            isImportedAsCJS: false,
          },
          kind: "value",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "shooting-stars",
          variableName: "star",
          importedExport: {
            name: "*",
            isImportedAsCJS: false,
          },
          kind: "value",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "foo",
          variableName: null,
          importedExport: {
            name: "*",
            isImportedAsCJS: false,
          },
          kind: "value",
          isDynamicImport: false,
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
          importedExport: {
            name: "*",
            isImportedAsCJS: true,
          },
          kind: "value",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zoop",
          importedExport: {
            name: "zoop",
            isImportedAsCJS: true,
          },
          kind: "value",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zip",
          importedExport: {
            name: "zow",
            isImportedAsCJS: true,
          },
          kind: "value",
          isDynamicImport: false,
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
          importedExport: {
            name: "*",
            isImportedAsCJS: true,
          },
          kind: "value",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "bar",
          variableName: null,
          importedExport: {
            name: "bar",
            isImportedAsCJS: true,
          },
          kind: "value",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "some-array",
          variableName: null,
          importedExport: {
            name: null,
            isImportedAsCJS: true,
          },
          kind: "value",
          isDynamicImport: false,
          path: expect.any(Object),
        },
      ],
    },
    {
      name: "Flow support",
      code: `
        import type { Something } from "somewhere";
        import typeof SomethingElse from "somewhere-else";
        import { type Foo } from "foo";
        import Bar, { typeof Baz } from "bar";
      `,
      imports: [
        {
          source: "somewhere",
          variableName: "Something",
          importedExport: {
            name: "Something",
            isImportedAsCJS: false,
          },
          kind: "type",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "somewhere-else",
          variableName: "SomethingElse",
          importedExport: {
            name: "default",
            isImportedAsCJS: false,
          },
          kind: "typeof",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "foo",
          variableName: "Foo",
          importedExport: {
            name: "Foo",
            isImportedAsCJS: false,
          },
          kind: "type",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "bar",
          variableName: "Bar",
          importedExport: {
            name: "default",
            isImportedAsCJS: false,
          },
          kind: "value",
          isDynamicImport: false,
          path: expect.any(Object),
        },
        {
          source: "bar",
          variableName: "Baz",
          importedExport: {
            name: "Baz",
            isImportedAsCJS: false,
          },
          kind: "typeof",
          isDynamicImport: false,
          path: expect.any(Object),
        },
      ],
    },
    {
      name: "Dynamic imports",
      code: `
        const importPromise = import("something");
        import("something-else").then((mod) => {
          console.log(mod.default);
        });
      `,
      imports: [
        {
          source: "something",
          variableName: null,
          importedExport: {
            name: "*",
            isImportedAsCJS: false,
          },
          kind: "value",
          isDynamicImport: true,
          path: expect.any(Object),
        },
        {
          source: "something-else",
          variableName: null,
          importedExport: {
            name: "*",
            isImportedAsCJS: false,
          },
          kind: "value",
          isDynamicImport: true,
          path: expect.any(Object),
        },
      ],
    },
  ]
);

cases(
  "path node type",
  ({ code, type }) => {
    transformImports(code, (imports) => {
      expect(imports[0].path.node.type).toBe(type);
    });
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
    {
      name: "flow type import declaration - default specifier",
      code: `import type foo from "bar";`,
      type: "ImportDefaultSpecifier",
    },
    {
      name: "flow type import declaration - named specifier",
      code: `import type { foo } from "bar";`,
      type: "ImportSpecifier",
    },
    // This worked in Babel 6 but doesn't in 7. I don't think it's valid flow syntax anyway.
    // {
    //   name: "flow type import declaration - star specifier",
    //   code: `import type * as foo from "bar";`,
    //   type: "ImportNamespaceSpecifier",
    // },
    {
      name: "flow typeof import declaration - default specifier",
      code: `import typeof foo from "bar";`,
      type: "ImportDefaultSpecifier",
    },
    {
      name: "flow typeof import declaration - named specifier",
      code: `import typeof { foo } from "bar";`,
      type: "ImportSpecifier",
    },
    {
      name: "flow typeof import declaration - star specifier",
      code: `import typeof * as foo from "bar";`,
      type: "ImportNamespaceSpecifier",
    },
    {
      name: "dynamic import",
      code: `import("foo")`,
      type: "Import",
    },
  ]
);

cases(
  "remove method",
  ({ code, output, index, error }) => {
    if (error) {
      expect(() => {
        transformImports(code, (imports) => {
          imports[index || 0].remove();
        });
      }).toThrowError();
    } else {
      const actualOutput = transformImports(code, (imports) => {
        imports[index || 0].remove();
      });
      expect(clean(actualOutput)).toBe(clean(output));
    }
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
      index: 1,
    },
    {
      name: "import declaration - star specifier with default export",
      code: `import bar, * as foo from "bar";`,
      output: `import bar from "bar";`,
      index: 1,
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
    {
      name: "dynamic import - bare",
      code: `import("foo")`,
      error: true,
    },
  ]
);

cases(
  "forking",
  ({ code, output, index, insert }) => {
    const actualOutput = transformImports(code, (imports) => {
      const importDef = imports[index || 0];
      importDef.fork({ insert });
    });

    expect(clean(actualOutput)).toBe(clean(output));
  },
  [
    {
      name: "import declaration - lone default specifier",
      code: `import foo from "bar";`,
      output: `import foo from "bar";`,
    },
    {
      name: "import declaration - lone named specifier",
      code: `import { foo } from "bar";`,
      output: `import { foo } from "bar";`,
    },
    {
      name: "import declaration - lone star specifier",
      code: `import * as foo from "bar";`,
      output: `import * as foo from "bar";`,
    },
    {
      name: "import declaration - default specifier with named specifier",
      code: `import foo, { bar } from "bar";`,
      output: `
        import { bar } from "bar";
        import foo from "bar";
      `,
    },
    {
      name: "import declaration - default specifier with star specifier",
      code: `import foo, * as bar from "bar";`,
      output: `
        import * as bar from "bar";
        import foo from "bar";
      `,
    },
    {
      name: "import declaration - two named specifiers",
      code: `import { foo, bar } from "bar";`,
      output: `
        import { bar } from "bar";
        import { foo } from "bar";
      `,
    },
    {
      name: "import declaration - named specifier with default specifier",
      code: `import foo, { bar } from "bar";`,
      output: `
        import foo from "bar";
        import { bar } from "bar";
      `,
      index: 1,
    },
    {
      name: "import declaration - star specifier with default export",
      code: `import bar, * as foo from "bar";`,
      output: `
        import bar from "bar";
        import * as foo from "bar";
      `,
      index: 1,
    },
    {
      name: "require call",
      code: `const foo = require("bar");`,
      output: `const foo = require("bar");`,
    },
    {
      name: "destructured require call - lone",
      code: `const { foo } = require("bar");`,
      output: `const { foo } = require("bar");`,
    },
    {
      name: "destructured require call - not lone",
      code: `const { foo, bar } = require("bar");`,
      output: `
        const { bar } = require("bar");
        const { foo } = require("bar");
      `,
    },
    {
      name: "import declaration - lone default specifier (before)",
      code: `import foo from "bar";`,
      insert: "before",
      output: `import foo from "bar";`,
    },
    {
      name: "import declaration - lone named specifier (before)",
      code: `import { foo } from "bar";`,
      insert: "before",
      output: `import { foo } from "bar";`,
    },
    {
      name: "import declaration - lone star specifier (before)",
      code: `import * as foo from "bar";`,
      insert: "before",
      output: `import * as foo from "bar";`,
    },
    {
      name:
        "import declaration - default specifier with named specifier (before)",
      code: `import foo, { bar } from "bar";`,
      insert: "before",
      output: `
        import foo from "bar";
        import { bar } from "bar";
      `,
    },
    {
      name:
        "import declaration - default specifier with star specifier (before)",
      code: `import foo, * as bar from "bar";`,
      insert: "before",
      output: `
        import foo from "bar";
        import * as bar from "bar";
      `,
    },
    {
      name: "import declaration - two named specifiers (before)",
      code: `import { foo, bar } from "bar";`,
      insert: "before",
      output: `
        import { foo } from "bar";
        import { bar } from "bar";
      `,
    },
    {
      name:
        "import declaration - named specifier with default specifier (before)",
      code: `import foo, { bar } from "bar";`,
      insert: "before",
      output: `
        import { bar } from "bar";
        import foo from "bar";
      `,
      index: 1,
    },
    {
      name: "import declaration - star specifier with default export (before)",
      code: `import bar, * as foo from "bar";`,
      insert: "before",
      output: `
        import * as foo from "bar";
        import bar from "bar";
      `,
      index: 1,
    },
    {
      name: "require call (before)",
      code: `const foo = require("bar");`,
      insert: "before",
      output: `const foo = require("bar");`,
    },
    {
      name: "destructured require call - lone (before)",
      code: `const { foo } = require("bar");`,
      insert: "before",
      output: `const { foo } = require("bar");`,
    },
    {
      name: "destructured require call - not lone (before)",
      code: `const { foo, bar } = require("bar");`,
      insert: "before",
      output: `
        const { foo } = require("bar");
        const { bar } = require("bar");
      `,
    },
    {
      name: "dynamic import (no-op)",
      code: `import("foo").then(console.log.bind(console));`,
      output: `import("foo").then(console.log.bind(console));`,
    },
    {
      name: "bare import (no-op)",
      code: `import "foo";`,
      output: `import "foo";`,
    },
  ]
);

cases(
  "changing source",
  ({ code, output, index }) => {
    const actualOutput = transformImports(code, (imports) => {
      const importDef = imports[index || 0];
      const ret = (importDef.source = "new-source");
      expect(ret).toBe("new-source");
    });
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
      index: 1,
    },
    {
      name: "import declaration - star specifier with default export",
      code: `import bar, * as foo from "bar";`,
      output: `
        import bar from "bar";
        import * as foo from "new-source";
      `,
      index: 1,
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
    {
      name: "dynamic import",
      code: `import("foo").then(console.log.bind(console));`,
      output: `import("new-source").then(console.log.bind(console));`,
    },
    {
      name: "bare import",
      code: `import "foo"`,
      output: `import "new-source";`,
    },
  ]
);

cases(
  "changing variableName",
  ({ code, output, index, error }) => {
    if (error) {
      expect(() => {
        transformImports(code, (imports) => {
          imports[index || 0].variableName = "newVar";
        });
      }).toThrowError();
    } else {
      const actualOutput = transformImports(code, (imports) => {
        const importDef = imports[index || 0];
        const ret = (importDef.variableName = "newVar");
        expect(ret).toBe("newVar");
      });

      expect(clean(actualOutput)).toBe(clean(output));
    }
  },
  [
    {
      name: "import declaration - lone default specifier",
      code: `import foo from "bar";`,
      output: `import newVar from "bar";`,
    },
    {
      name: "import declaration - lone named specifier",
      code: `import { foo } from "bar";`,
      output: `import { foo as newVar } from "bar";`,
    },
    {
      name: "import declaration - lone star specifier",
      code: `import * as foo from "bar";`,
      output: `import * as newVar from "bar";`,
    },
    {
      name: "import declaration - default specifier with named specifier",
      code: `import foo, { bar } from "bar";`,
      output: `import newVar, { bar } from "bar";`,
    },
    {
      name: "import declaration - default specifier with star specifier",
      code: `import foo, * as bar from "bar";`,
      output: `import newVar, * as bar from "bar";`,
    },
    {
      name: "import declaration - two named specifiers",
      code: `import { foo, bar } from "bar";`,
      output: `import { foo as newVar, bar } from "bar";`,
    },
    {
      name: "import declaration - named specifier with default specifier",
      code: `import foo, { bar } from "bar";`,
      output: `import foo, { bar as newVar } from "bar";`,
      index: 1,
    },
    {
      name: "import declaration - star specifier with default export",
      code: `import bar, * as foo from "bar";`,
      output: `import bar, * as newVar from "bar";`,
      index: 1,
    },
    {
      name: "require call",
      code: `const foo = require("bar");`,
      output: `const newVar = require("bar");`,
    },
    {
      name: "destructured require call - lone",
      code: `const { foo } = require("bar");`,
      output: `const { foo: newVar } = require("bar");`,
    },
    {
      name: "destructured require call - not lone",
      code: `const { foo, bar } = require("bar");`,
      output: `const { foo: newVar, bar } = require("bar");`,
    },
    {
      name: "dynamic import",
      code: `const promise = import("foo");`,
      error: true,
    },
    {
      name: "bare import",
      code: `import "foo"`,
      error: true,
    },
  ]
);

cases(
  "changing importedExport",
  ({ code, importedExport, output, index, error }) => {
    if (error) {
      expect(() => {
        transformImports(code, (imports) => {
          imports[index || 0].importedExport = importedExport;
        });
      }).toThrowError();
    } else {
      const actualOutput = transformImports(code, (imports) => {
        const importDef = imports[index || 0];
        const ret = (importDef.importedExport = importedExport);
        expect(ret).toEqual(importedExport);
      });

      expect(clean(actualOutput)).toBe(clean(output));
    }
  },
  [
    // Changing default import into things
    {
      name: "default import -> default import (no effect)",
      code: `import foo from "foo";`,
      importedExport: { name: "default", isImportedAsCJS: false },
      output: `import foo from "foo";`,
    },
    {
      name: "default import -> star import",
      code: `import foo from "foo";`,
      importedExport: { name: "*", isImportedAsCJS: false },
      output: `import * as foo from "foo";`,
    },
    {
      name: "default import -> named import",
      code: `import foo from "foo";`,
      importedExport: { name: "bar", isImportedAsCJS: false },
      output: `import { bar as foo } from "foo";`,
    },
    {
      name: "default import -> star import (CJS)",
      code: `import foo from "foo";`,
      importedExport: { name: "*", isImportedAsCJS: true },
      output: `const foo = require("foo");`,
    },
    {
      name: "default import -> named import (CJS)",
      code: `import foo from "foo";`,
      importedExport: { name: "bar", isImportedAsCJS: true },
      output: `const { bar: foo } = require("foo");`,
    },

    // Changing named import into things
    {
      name: "named import -> default import",
      code: `import { foo } from "foo";`,
      importedExport: { name: "default", isImportedAsCJS: false },
      output: `import foo from "foo";`,
    },
    {
      name: "named import -> star import",
      code: `import { foo } from "foo";`,
      importedExport: { name: "*", isImportedAsCJS: false },
      output: `import * as foo from "foo";`,
    },
    {
      name: "named import -> named import",
      code: `import { foo } from "foo";`,
      importedExport: { name: "bar", isImportedAsCJS: false },
      output: `import { bar as foo } from "foo";`,
    },
    {
      name: "named import -> named import (same name)",
      code: `import { foo } from "foo";`,
      importedExport: { name: "foo", isImportedAsCJS: false },
      output: `import { foo } from "foo";`,
    },
    {
      name: "named import -> star import (CJS)",
      code: `import { foo } from "foo";`,
      importedExport: { name: "*", isImportedAsCJS: true },
      output: `const foo = require("foo");`,
    },
    {
      name: "named import -> named import (CJS)",
      code: `import { foo } from "foo";`,
      importedExport: { name: "bar", isImportedAsCJS: true },
      output: `const { bar: foo } = require("foo");`,
    },

    // Changing star import into things
    {
      name: "star import -> default import",
      code: `import * as foo from "foo";`,
      importedExport: { name: "default", isImportedAsCJS: false },
      output: `import foo from "foo";`,
    },
    {
      name: "star import -> star import (no effect)",
      code: `import * as foo from "foo";`,
      importedExport: { name: "*", isImportedAsCJS: false },
      output: `import * as foo from "foo";`,
    },
    {
      name: "star import -> named import",
      code: `import * as foo from "foo";`,
      importedExport: { name: "bar", isImportedAsCJS: false },
      output: `import { bar as foo } from "foo";`,
    },
    {
      name: "star import -> star import (CJS)",
      code: `import * as foo from "foo";`,
      importedExport: { name: "*", isImportedAsCJS: true },
      output: `const foo = require("foo");`,
    },
    {
      name: "star import -> named import (CJS)",
      code: `import * as foo from "foo";`,
      importedExport: { name: "bar", isImportedAsCJS: true },
      output: `const { bar: foo } = require("foo");`,
    },

    // Changing star import (CJS) into things
    {
      name: "star import (CJS) -> default import",
      code: `const foo = require("foo");`,
      importedExport: { name: "default", isImportedAsCJS: false },
      output: `import foo from "foo";`,
    },
    {
      name: "star import (CJS) -> star import",
      code: `const foo = require("foo");`,
      importedExport: { name: "*", isImportedAsCJS: false },
      output: `import * as foo from "foo";`,
    },
    {
      name: "star import (CJS) -> named import",
      code: `const foo = require("foo");`,
      importedExport: { name: "bar", isImportedAsCJS: false },
      output: `import { bar as foo } from "foo";`,
    },
    {
      name: "star import (CJS) -> star import (CJS) (no effect)",
      code: `const foo = require("foo");`,
      importedExport: { name: "*", isImportedAsCJS: true },
      output: `const foo = require("foo");`,
    },
    {
      name: "star import (CJS) -> named import (CJS)",
      code: `const foo = require("foo");`,
      importedExport: { name: "foo", isImportedAsCJS: true },
      output: `const { foo } = require("foo");`,
    },

    // Changing named import (CJS) into things
    {
      name: "named import (CJS) -> default import",
      code: `const { foo } = require("foo");`,
      importedExport: { name: "default", isImportedAsCJS: false },
      output: `import foo from "foo";`,
    },
    {
      name: "named import (CJS) -> star import",
      code: `const { foo } = require("foo");`,
      importedExport: { name: "*", isImportedAsCJS: false },
      output: `import * as foo from "foo";`,
    },
    {
      name: "named import (CJS) -> named import",
      code: `const { foo } = require("foo");`,
      importedExport: { name: "bar", isImportedAsCJS: false },
      output: `import { bar as foo } from "foo";`,
    },
    {
      name: "named import (CJS) -> star import (CJS)",
      code: `const { foo } = require("foo");`,
      importedExport: { name: "*", isImportedAsCJS: true },
      output: `const foo = require("foo");`,
    },
    {
      name: "named import (CJS) -> named import (CJS)",
      code: `const { foo } = require("foo");`,
      importedExport: { name: "bar", isImportedAsCJS: true },
      output: `const { bar: foo } = require("foo");`,
    },
    {
      name: "named import (CJS) -> named import (CJS) (same name)",
      code: `const { foo } = require("foo");`,
      importedExport: { name: "foo", isImportedAsCJS: true },
      output: `const { foo } = require("foo");`,
    },
    // Dynamic import and bare import can't change
    {
      name: "dynamic import",
      code: `import("foo").then((fooMod) => fooMod.default())`,
      error: true,
    },
    {
      name: "bare import",
      code: `import "foo";`,
      error: true,
    },
  ]
);

cases(
  "changing named export via variableName and importedExport",
  ({ code, newName, output, index }) => {
    const actualOutput = transformImports(code, (imports) => {
      const importDef = imports[index || 0];
      importDef.variableName = newName;
      importDef.importedExport.name = newName;
    });
    expect(clean(actualOutput)).toBe(clean(output));
  },
  [
    {
      name: "import statement",
      code: `import { foo } from "foo";`,
      newName: "bar",
      output: `import { bar } from "foo";`,
    },
    {
      name: "require statement",
      code: `const { foo } = require("foo");`,
      newName: "bar",
      output: `const { bar } = require("foo");`,
    },
  ]
);

cases(
  "changing kind",
  ({ code, kind, output, index, error }) => {
    if (error) {
      expect(() => {
        transformImports(code, (imports) => {
          imports[index || 0].kind = kind;
        });
      }).toThrowError();
    } else {
      const actualOutput = transformImports(code, (imports) => {
        const importDef = imports[index || 0];
        const ret = (importDef.kind = kind);
        expect(ret).toBe(kind);
      });

      expect(clean(actualOutput)).toBe(clean(output));
    }
  },
  [
    {
      name: "import declaration - lone default specifier - type",
      code: `import foo from "bar";`,
      kind: "type",
      output: `import type foo from "bar";`,
    },
    {
      name: "import declaration - lone default specifier - typeof",
      code: `import foo from "bar";`,
      kind: "typeof",
      output: `import typeof foo from "bar";`,
    },
    {
      name: "import declaration - lone default specifier - value",
      code: `import type foo from "bar";`,
      kind: "value",
      output: `import foo from "bar";`,
    },
    {
      name: "import declaration - lone named specifier - type",
      code: `import { foo } from "bar";`,
      kind: "type",
      output: `import type { foo } from "bar";`,
    },
    {
      name: "import declaration - lone named specifier - typeof",
      code: `import { foo } from "bar";`,
      kind: "typeof",
      output: `import typeof { foo } from "bar";`,
    },
    {
      name: "import declaration - lone named specifier - value",
      code: `import type { foo } from "bar";`,
      kind: "value",
      output: `import { foo } from "bar";`,
    },
    {
      name: "import declaration - lone star specifier - type",
      code: `import * as foo from "bar";`,
      kind: "type",
      output: `import type * as foo from "bar";`,
    },
    {
      name: "import declaration - lone star specifier - typeof",
      code: `import * as foo from "bar";`,
      kind: "typeof",
      output: `import typeof * as foo from "bar";`,
    },
    // This worked in Babel 6 but doesn't in 7. I don't think it's valid flow syntax anyway.
    // {
    //   name: "import declaration - lone star specifier - value",
    //   code: `import type * as foo from "bar";`,
    //   kind: "value",
    //   output: `import * as foo from "bar";`,
    // },
    {
      name:
        "import declaration - default specifier with named specifier - type",
      code: `import foo, { bar } from "bar";`,
      kind: "type",
      output: `
        import { bar } from "bar";
        import type foo from "bar";
      `,
    },
    {
      name:
        "import declaration - default specifier with named specifier - typeof",
      code: `import foo, { bar } from "bar";`,
      kind: "typeof",
      output: `
        import { bar } from "bar";
        import typeof foo from "bar";
      `,
    },
    {
      name:
        "import declaration - default specifier with named specifier - value",
      code: `import typeof foo, { bar } from "bar";`,
      kind: "value",
      output: `
        import typeof { bar } from "bar";
        import foo from "bar";
      `,
    },
    {
      name: "import declaration - default specifier with star specifier - type",
      code: `import foo, * as bar from "bar";`,
      kind: "type",
      output: `
        import * as bar from "bar";
        import type foo from "bar";
      `,
    },
    {
      name:
        "import declaration - default specifier with star specifier - typeof",
      code: `import foo, * as bar from "bar";`,
      kind: "typeof",
      output: `
        import * as bar from "bar";
        import typeof foo from "bar";
      `,
    },
    {
      name:
        "import declaration - default specifier with star specifier - value",
      code: `import type foo, * as bar from "bar";`,
      kind: "value",
      output: `
        import type * as bar from "bar";
        import foo from "bar";
      `,
    },
    {
      name: "import declaration - two named specifiers - type",
      code: `import { foo, bar } from "bar";`,
      kind: "type",
      output: `
        import { bar } from "bar";
        import type { foo } from "bar";
      `,
    },
    {
      name: "import declaration - two named specifiers - typeof",
      code: `import { foo, bar } from "bar";`,
      kind: "typeof",
      output: `
        import { bar } from "bar";
        import typeof { foo } from "bar";
      `,
    },
    {
      name: "import declaration - two named specifiers - value",
      code: `import type { foo, bar } from "bar";`,
      kind: "value",
      output: `
        import type { bar } from "bar";
        import { foo } from "bar";
      `,
    },
    {
      name:
        "import declaration - named specifier with default specifier - type",
      code: `import foo, { bar } from "bar";`,
      kind: "type",
      output: `
        import foo from "bar";
        import type { bar } from "bar";
      `,
      index: 1,
    },
    {
      name:
        "import declaration - named specifier with default specifier - typeof",
      code: `import foo, { bar } from "bar";`,
      kind: "typeof",
      output: `
        import foo from "bar";
        import typeof { bar } from "bar";
      `,
      index: 1,
    },
    {
      name:
        "import declaration - named specifier with default specifier - value",
      code: `import type foo, { bar } from "bar";`,
      kind: "value",
      output: `
        import type foo from "bar";
        import { bar } from "bar";
      `,
      index: 1,
    },
    {
      name: "import declaration - star specifier with default export - type",
      code: `import bar, * as foo from "bar";`,
      kind: "type",
      output: `
        import bar from "bar";
        import type * as foo from "bar";
      `,
      index: 1,
    },
    {
      name: "import declaration - star specifier with default export - typeof",
      code: `import bar, * as foo from "bar";`,
      kind: "typeof",
      output: `
        import bar from "bar";
        import typeof * as foo from "bar";
      `,
      index: 1,
    },
    {
      name: "import declaration - star specifier with default export - value",
      code: `import type bar, * as foo from "bar";`,
      kind: "value",
      output: `
        import type bar from "bar";
        import * as foo from "bar";
      `,
      index: 1,
    },
    {
      name: "require call - type",
      code: `const foo = require("bar");`,
      kind: "type",
      output: `import type * as foo from "bar";`,
    },
    {
      name: "require call - typeof",
      code: `const foo = require("bar");`,
      kind: "typeof",
      output: `import typeof * as foo from "bar";`,
    },
    {
      name: "require call - value (no change)",
      code: `const foo = require("bar");`,
      kind: "value",
      output: `const foo = require("bar");`,
    },
    {
      name: "destructured require call - lone - type",
      code: `const { foo } = require("bar");`,
      kind: "type",
      output: `import type { foo } from "bar";`,
    },
    {
      name: "destructured require call - lone - typeof",
      code: `const { foo } = require("bar");`,
      kind: "typeof",
      output: `import typeof { foo } from "bar";`,
    },
    {
      name: "destructured require call - lone - value (no change)",
      code: `const { foo } = require("bar");`,
      kind: "value",
      output: `const { foo } = require("bar");`,
    },
    {
      name: "destructured require call - not lone - type",
      code: `const { foo, bar } = require("bar");`,
      kind: "type",
      output: `
        const { bar } = require("bar");
        import type { foo } from "bar";
      `,
    },
    {
      name: "destructured require call - not lone - typeof",
      code: `const { foo, bar } = require("bar");`,
      kind: "typeof",
      output: `
        const { bar } = require("bar");
        import typeof { foo } from "bar";
      `,
    },
    {
      name: "destructured require call - not lone - value (no change)",
      code: `const { foo, bar } = require("bar");`,
      kind: "value",
      output: `const { foo, bar } = require("bar");`,
    },
    {
      name: "dynamic import",
      code: `Promise.all([import("foo"), import("bar")]).then(load);`,
      kind: "type",
      error: true,
    },
    {
      name: "bare import",
      code: `import "foo";`,
      kind: "type",
      error: true,
    },
  ]
);
