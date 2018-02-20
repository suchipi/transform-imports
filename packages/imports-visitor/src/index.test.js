const cases = require("jest-in-case");
const babel = require("babel-core");
const importsVisitor = require("./index");

const clean = (str) =>
  str
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

function transformImports(code, callback) {
  return babel.transform(code, {
    plugins: [
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
        expect(actualImports[index]).toEqual(
          expect.objectContaining(importDef)
        );
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
      `,
      imports: [
        {
          source: "bar",
          variableName: "foo",
          importedExport: {
            name: "default",
            isImportedAsCJS: false,
          },
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zoop",
          importedExport: {
            name: "zoop",
            isImportedAsCJS: false,
          },
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zip",
          importedExport: {
            name: "zow",
            isImportedAsCJS: false,
          },
          path: expect.any(Object),
        },
        {
          source: "shooting-stars",
          variableName: "star",
          importedExport: {
            name: "*",
            isImportedAsCJS: false,
          },
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
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zoop",
          importedExport: {
            name: "zoop",
            isImportedAsCJS: true,
          },
          path: expect.any(Object),
        },
        {
          source: "zeeoop",
          variableName: "zip",
          importedExport: {
            name: "zow",
            isImportedAsCJS: true,
          },
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
          path: expect.any(Object),
        },
        {
          source: "bar",
          variableName: null,
          importedExport: {
            name: "bar",
            isImportedAsCJS: true,
          },
          path: expect.any(Object),
        },
        {
          source: "some-array",
          variableName: null,
          importedExport: {
            name: null,
            isImportedAsCJS: true,
          },
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
  ]
);

cases(
  "remove method",
  ({ code, output, index }) => {
    const actualOutput = transformImports(code, (imports) => {
      imports[index || 0].remove();
    });
    expect(clean(actualOutput)).toBe(clean(output));
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
  ]
);

cases(
  "changing source",
  ({ code, output, index }) => {
    const actualOutput = transformImports(code, (imports) => {
      const importDef = imports[index || 0];
      importDef.source = "new-source";
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
  ]
);

cases(
  "changing variableName",
  ({ code, output, index }) => {
    const actualOutput = transformImports(code, (imports) => {
      const importDef = imports[index || 0];
      importDef.variableName = "newVar";
    });

    expect(clean(actualOutput)).toBe(clean(output));
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
  ]
);

cases(
  "changing importedExport",
  ({ code, importedExport, output, index }) => {
    const actualOutput = transformImports(code, (imports) => {
      const importDef = imports[index || 0];
      importDef.importedExport = importedExport;
    });

    expect(clean(actualOutput)).toBe(clean(output));
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
