# ImportDefinition class

There are several different patterns for writing an import/require in JS. Each of these patterns can be represented by a "subtype delegate". When you create an `ImportDefinition`, a subtype delegate appropriate to the pattern is created based on the path you passed in, and all method calls and property `get`/`set`s on that `ImportDefinition` are forwarded to the subtype delegate.

The subtype delegates are defined as classes in this folder.

Here's a list of all the patterns, a name for each, the node type of the path passed in that goes with each, and the name of the subtype delegate for each.

| Code                              | Name                  | Node Type                  | Subtype Delegate Name |
| --------------------------------- | --------------------- | -------------------------- | --------------------- |
| `const foo = require("bar");`     | Normal require        | `VariableDeclarator`       | `NormalRequire`       |
| `const { foo } = require("bar");` | Desctructured require | `ObjectProperty`           | `DestructuredRequire` |
| `import foo from "bar";`          | Default import        | `ImportDefaultSpecifier`   | `DefaultImport`       |
| `import { foo } from "bar";`      | Named import          | `ImportSpecifier`          | `NamedImport`         |
| `import * as foo from "bar";`     | Namespace import      | `ImportNamespaceSpecifier` | `NamespaceImport`     |
| `import("bar")`                   | Dynamic import        | `Import`                   | `DynamicImport`       |
| `import "bar";`                   | Bare import           | `ImportDeclaration`        | `BareImport`          |

The following patterns have been identified but aren't supported yet. We should really add these:

| Code                                  | Name                      | Node Type | Subtype Delegate Name |
| ------------------------------------- | ------------------------- | --------- | --------------------- |
| `const foo = require("bar").default;` | Member property require   | ???       | ???                   |
| `require("bar");`                     | Bare require (statement)  | ???       | ???                   |
| `require("bar")`                      | Bare require (expression) | ???       | ???                   |
