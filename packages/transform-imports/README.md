# transform-imports

An API that makes it easy to transform imports and require calls.

## Usage

```js
import transformImports from "transform-imports";

const code = `
  import Foo from "foo";
  import Bar from "bar";
`;

const newCode = transformImports(code, (importDefs) => {
  importDefs.forEach((importDef) => {
    if (importDef.source === "bar") {
      importDef.source = "something-new";
    }
  });
});

console.log(newCode);
// Logs:
// import Foo from "foo";
// import Foo from "something-new";
```

`transformImports` calls its callback with an Array of `ImportDefinition` objects, which have this shape:

```ts
class ImportDefinition {
  variableName: ?string;
  source: ?string;
  importedExport: {
    name: string,
    isImportedAsCJS: boolean,
  };
  kind: "value" | "type" | "typeof",
  isDynamicImport: boolean,
  path: NodePath;

  remove(): void;
  fork(?{ insert: "before" | "after" }): void;
}
```

You can change the values of the properties on the `ImportDefinition` or call the methods on it to change the underlying import/require statement.

Each `ImportDefinition` is associated with a single import; that is, `import { red, blue } from "colors"` contains two `ImportDefinitions` (one for `red` and one for `blue`).

Here's an example of what some different imports/requires parse into:

```js
import * as React from "react";
// Becomes...
ImportDefinition {
  variableName: "React",
  source: "react",
  importedExport: {
    name: "*",
    isImportedAsCJS: false,
  },
  kind: "value",
  isDynamicImport: false,
};

import traverse from "babel-traverse";
// Becomes...
ImportDefinition {
  variableName: "traverse",
  source: "babel-traverse",
  importedExport: {
    name: "default",
    isImportedAsCJS: false,
  },
  kind: "value",
  isDynamicImport: false,
};

import MyClass, { SOME_CONSTANT } from "my-library";
// Becomes...
ImportDefinition {
  variableName: "MyClass",
  source: "my-library",
  importedExport: {
    name: "default",
    isImportedAsCJS: false,
  },
  kind: "value",
  isDynamicImport: false,
};
// and
ImportDefinition {
  variableName: "SOME_CONSTANT",
  source: "my-library",
  importedExport: {
    name: "SOME_CONSTANT",
    isImportedAsCJS: false,
  },
  kind: "value",
  isDynamicImport: false,
};

const PropTypes = require("prop-types");
// Becomes...
ImportDefinition {
  variableName: "PropTypes",
  source: "prop-types",
  importedExport: {
    name: "*",
    isImportedAsCJS: true,
  },
  kind: "value",
  isDynamicImport: false,
};

const { darken, lighten } = require("polished");
// Becomes...
ImportDefinition {
  variableName: "darken",
  source: "polished",
  importedExport: {
    name: "darken",
    isImportedAsCJS: true,
  },
  kind: "value",
  isDynamicImport: false,
};
// and
ImportDefinition {
  variableName: "lighten",
  source: "polished",
  importedExport: {
    name: "lighten",
    isImportedAsCJS: true,
  },
  kind: "value",
  isDynamicImport: false,
};

import type {Node} from "./node";
// Becomes...
ImportDefinition {
  variableName: "Node",
  source: "./node",
  importedExport: {
    name: "Node",
    isImportedAsCJS: false,
  },
  kind: "type",
  isDynamicImport: false,
};

import "something";
// Becomes...
ImportDefinition {
  variableName: null,
  source: "something",
  importedExport: {
    name: "*",
    isImportedAsCJS: false,
  },
  kind: "value",
  isDynamicImport: false,
};

import("something").then((somethingModule) => somethingModule.default());
// Becomes...
ImportDefinition {
  variableName: null,
  source: "something",
  importedExport: {
    name: "*",
    isImportedAsCJS: false,
  },
  kind: "value",
  isDynamicImport: true,
};
```

Here's some more in-depth documentation explaining what each property means/does. In each example, `importDef` refers to an `ImportDefinition` object as passed to the `transformImports` callback.

### `variableName`

This refers to the name of the variable that was created by the import. For example, in `import MyThing from "./overThere";`, it would be `MyThing`.

If you change this string, then the variable name in the code will change. So doing this:

```js
importDef.variableName = "MyOtherThing";
```

would change the code into:

```js
import MyOtherThing from "./overThere";
```

When dealing with named imports, this only refers to the name of the local variable created. To also change the name of the variable that is being imported, change `importedExport.name`:

```js
// Given this code:
import { red } from "./colors";

// Doing this:
importDef.variableName = "blue";

// Would only change the code to this:
import { red as blue } from "./colors";

// But doing this:
importDef.variableName = "blue";
importDef.importedExport.name = "blue";

// Would change the code to this:
import { blue } from "blue";
```

Changing `variableName` does not rename references to the variable:

```js
// Given this code:
import MyThing from "./overThere";

MyThing.isCool();

// Doing this:
importDef.variableName = "MyOtherThing";

// Would change the code to this:
import MyOtherThing from "./overThere";

MyThing.isCool();
```

If you want to also change references to the variable, you can use the babel Scope object found at `importDef.path.scope`.

> NOTE: An `ImportDefinition` referring to a dynamic import (`import("foo")`) or bare import (`import "foo";`) has no `variableName`, and attempting to set the `variableName` will throw an Error.

### `source`

This refers to the string indicating which file or package this import was obtained from. So for `const Theme = require("../theme")`, it would be `"../theme"`.

If you change this string, then the import's source will change.

```js
// Given this code:
import Something from "../somewhere";

// Doing this:
importDef.source = "../somewhereElse";

// Would change the code to this:
import Something from "../somewhereElse";
```

Note that the source string always reflects the source string found in the source code. If you would like to find the absolute path to a given imported file, you will need to use another package, like `eslint-import-resolver-node` or `eslint-import-resolver-webpack`:

```js
const fileLocation = "/Users/suchipi/Code/my-project/something.js"; // Get this from babel, jscodeshift, etc

const { resolve } = require("eslint-import-resolver-webpack");
const { found, path } = resolve(importDef.source, fileLocation, {
  /* import resolver config goes here */
});
```

For more info, see [the eslint-plugin-import Resolver spec](https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/README.md).

### `importedExport.name`

This refers to the name of the export that is being imported into the file where the code associated with this `ImportDefinition` is.

For example, given two files `one.js` and `two.js`:

```js
// one.js

const Chunky = "chunky";
const Bacon = "bacon";

export { Chunky, Bacon };
```

```js
// two.js

import { Chunky as BaconStyle } from "./one";

console.log(BaconStyle);
```

The value of `importedExport.name` for the import in `two.js` would be `Chunky`.

If you change this string, then which export you pull in from `two.js` would change:

```js
// If you did this:
importDef.importedExport.name = "default";

// Then it would change into a default import:
import BaconStyle from "./one";

// If you did this:
importDef.importedExport.name = "*";

// Then it would change into a namespace import:
import * as BaconStyle from "./one";

// If you did anything else:
importDef.importedExport.name = "Bacon";

// Then it would change which named export is imported:
import { Bacon as BaconStyle } from "./one";
```

> NOTE: Attempting to change `importedExport.name` on an `ImportDefinition` referring to a dynamic import (`import("foo")`) or bare import (`import "foo";`) will throw an Error.

### `importedExport.isImportedAsCJS`

This refers to the whether the import is using CommonJS or not. Changing this to `true` will change an import statement into a require call, and changing this to `false` will change a require call into an import statement.

```js
// Given this code:
import Default from "somewhere";
import * as Star from "somewhere-else";
import { Named } from "somewhere-else-else";

// If you did this to each ImportDefinition:
importDef.importedExport.isImportedAsCJS = true;

// Then the code would change into this:
const { default: Default } = require("somewhere");
const Star = require("somewhere-else");
const { Named } = require("somewhere-else-else");

// Likewise, given this code:
const All = require("all");
const { Some, Members } = require("members");

// If you did this to each ImportDefinition:
importDef.importedExport.isImportedAsCJS = false;

// Then the code would change into this:
import * as All from "all";
import { Some, Members } from "members";
```

Note that in `const Foo = require("foo")`, `importedExport.name` is `"*"`, not `"default"` like might be expected. This is because `"*"` is the most accurate representation of the way CommonJS imports work in most compilation pipelines.

> NOTE: Attempting to change `importedExport.isImportedAsCJS` on an `ImportDefinition` referring to a dynamic import (`import("foo")`) or bare import (`import "foo";`) will throw an Error.

### `kind`

This value indicates whether the import is a flow type/typeof import, or if it is a normal import (a value import). Possible values are `"type"`, `"typeof"`, and `"value"`. Changing this value will change the import into a type, typeof, or value import.

```js
// Given this code:
import Default from "somewhere";
import * as Star from "somewhere-else";
import { Named } from "somewhere-else-else";

// If you did this to each ImportDefinition:
importDef.kind = "type";

// Then the code would change into this:
import type Default from "somewhere";
import type * as Star from "somewhere-else";
import type { Named } from "somewhere-else-else";

// Likewise, if you did this to each ImportDefinition:
importDef.kind = "typeof";

// Then the code would change into this:
import typeof Default from "somewhere";
import typeof * as Star from "somewhere-else";
import typeof { Named } from "somewhere-else-else";
```

If you change a require call's kind into type or typeof, then it will turn into an import statement according to the rules established when changing `importedExport.isImportedAsCJS`:

```js
// Given this code:
const All = require("all");
const { Some, Members } = require("members");

// If you did this to each ImportDefinition:
importDef.kind = "type";

// Then the code would change into this:
import type * as All from "all";
import type { Some, Members } from "members";
```

> NOTE: Attempting to change `kind` on an `ImportDefinition` referring to a dynamic import (`import("foo")`) or bare import (`import "foo";`) will throw an Error.

### `isDynamicImport`

Whether the import is a dynamic import (`import("something")`).

This property is not writable.

### `remove()`

Calling this method removes the import specifier associated with this `ImportDefinition` from the source code.

```js
// Given this code:
import * as Everything from "everything";

Everything.isAwesome();

// Doing this:
importDef.remove();

// Would change the code to this:
Everything.isAwesome();
```

If the `ImportDefinition` refers to an import that is not alone in its import/require statement, then only it will be removed:

```js
// Given this code:
import { One, Two } from "every-number";

console.log(One < Two);

// Doing this to the ImportDefinition referring to `One`:
importDef.remove();

// Would change the code to this:
import { Two } from "every-number";

console.log(One < Two);
```

> NOTE: Attempting to call `remove()` on an `ImportDefinition` referring to a dynamic import (`import()`) will throw an Error.

### `fork()`

Calling this method will split an import specifier away from its related specifiers into its own statement:

```js
// Given this code:
import { One, Two } from "every-number";

// Doing this to the ImportDefinition referring to `One`:
importDef.fork();

// Would change the code to this:
import { Two } from "every-number";
import { One } from "every-number";
```

Note that the new import/require declaration is inserted _after_ the existing one by default. To change this behavior, call `fork` with `{ insert: "before" }`:

```js
// Given this code:
import { One, Two } from "every-number";

// Doing this to the ImportDefinition referring to `One`:
importDef.fork({ insert: "before" });

// Would change the code to this:
import { One } from "every-number";
import { Two } from "every-number";
```

`fork()` is automatically called when you change properties of an `ImportDefinition` such that it cannot remain with its sibling specifiers in the same statement anymore:

```js
// Given this code:
import { One, Two } from "every-number";

// Doing this to the ImportDefinition referring to `One`:
importDef.source = "most-numbers";

// Would change the code to this:
import { Two } from "every-number";
import { One } from "most-numbers";
```

## Usage with jscodeshift

`transform-imports` uses [recast](https://github.com/benjamn/recast), so untouched source styling is preserved. This means that it's suitable for usage in jscodeshift:

```js
// An example jscodeshift transform module that turns
//   import React, { PropTypes } from "react";
// into
//   import * as React from "react";
//   import PropTypes from "prop-types";
const transformImports = require("transform-imports");

module.exports = function (fileInfo, api, options) {
  return transformImports(fileInfo.source, (importDefs) => {
    importDefs.forEach((importDef) => {
      if (importDef.source !== "react") {
        return;
      }

      if (
        importDef.importedExport.name === "default" &&
        importDef.importedExport.isImportedAsCJS === false
      ) {
        importDef.fork({ insert: "before" });
        importDef.importedExport.name = "*";
      }

      if (
        importDef.variableName === "PropTypes" &&
        importDef.importedExport.name === "PropTypes"
      ) {
        importDef.importedExport.name = "default";
        importDef.source = "prop-types";
      }
    });
  });
};
```
