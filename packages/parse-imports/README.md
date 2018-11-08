# `parse-imports`

There are a lot of different ways to import or require a module in JavaScript.

If you're writing tooling using Babel or another JS parser and you want to find all the imports/requires in a file, **it's surprisingly hard**, due to the high number of ways to import something.

Consider the below code snippet. Every line imports or requires a module:

```js
import foo from "bar";
import { foo } from "bar";
import { foo as baz } from "bar";
import * as foo from "bar";
import "bar";
import("bar").then(run, handleError);
import(foo).then(run, handleError);
export { foo } from "bar";
export { foo as baz } from "bar";
export { foo, bar, baz, qux as woo } from "bar";
export * from "mod";
export foo from "bar";
export * as baz from "bar";
const foo = require("bar");
const { foo } = require("bar");
const { foo: bar } = require("bar");
const foo = require("bar").default;  
require("bar");
const entries = { bar: require("bar") };
const entries = { bar: require(foo) };
```

This module provides an interface on top of Babel that makes imports/requires easier to work with.

The idea is this: every import or require in a file can be represented by an object with a few properties on it. This idea is similar to how AST nodes work in Babel.

We'll call these objects "**ImportDef**"s. Every **ImportDef** is this shape:

```ts
interface ImportDef {
  type: string;
  moduleRequest: string | null;
  localName: string | null;
  importName: string | null;
  exportName: string | null;
}
```

By aggregating all imports to this interface, it becomes possible to work with them.

Below are various code examples and the `ImportDef`s they parse to.

## ECMAScript Modules: `import` statements

| Code                                   | `type`                                  | `moduleRequest` | `localName`               | `importName`              |
| -------------------------------------- | --------------------------------------- | --------------- | ------------------------- | ------------------------- |
| `import foo from "bar";`               | `DefaultImport`                         | `"bar"`         | `"foo"`                   | `"default"`               |
| `import { foo } from "bar";`           | `NamedImport`                           | `"bar"`         | `"foo"`                   | `"foo"`                   |
| `import { foo as baz } from "bar";`    | `NamedImport`                           | `"bar"`         | `"baz"`                   | `"foo"`                   |
| `import { foo, bar, baz } from "bar";` | Three separate `NamedImport` ImportDefs | `"bar"`         | `"foo"`, `"bar"`, `"baz"` | `"foo"`, `"bar"`, `"baz"` |
| `import * as foo from "bar";`          | `NamespaceImport`                       | `"bar"`         | `"foo"`                   | `"*"`                     |
| `import "bar";`                        | `BareImport`                            | `"bar"`         | `null`                    | `null`                    |

## ECMAScript Modules: dynamic `import()`

| Code            | `type`          | `moduleRequest` | `localName` | `importName` |
| --------------- | --------------- | --------------- | ----------- | ------------ |
| `import("bar")` | `DynamicImport` | `"bar"`         | `null`      | `"*"`        |
| `import(foo)`   | `DynamicImport` | `null`          | `null`      | `"*"`        |

## ECMAScript Modules: `export` statements

| Code                                | `type`            | `moduleRequest` | `localName` | `importName` | `exportName` |
| ----------------------------------- | ----------------- | --------------- | ----------- | ------------ | ------------ |
| `export { foo } from "bar";`        | `NamedExport`     | `"bar"`         | `null`      | `"foo"`      | `"foo"`      |
| `export { foo as baz } from "bar";` | `NamedExport`     | `"bar"`         | `null`      | `"foo"`      | `"baz"`      |
| `export * from "mod";`              | `NamespaceExport` | `"bar"`         | `null`      | `"*"`        | `null`       |

## ECMAScript Modules: Proposed `export` statements

| Code                          | `type`            | `moduleRequest` | `localName` | `importName` | `exportName` |
| ----------------------------- | ----------------- | --------------- | ----------- | ------------ | ------------ |
| `export foo from "bar";`      | `DefaultExport`   | `"bar"`         | `null`      | `default`    | `"foo"`      |
| `export * as baz from "bar";` | `NamespaceExport` | `"bar"`         | `null`      | `"*"`        | `"baz"`      |

## CommonJS Modules: `require` patterns

| Code                                        | `type`                                          | `moduleRequest` | `localName`               | `importName`                                       |
| ------------------------------------------- | ----------------------------------------------- | --------------- | ------------------------- | -------------------------------------------------- |
| `const foo = require("bar");`               | `NormalRequire`                                 | `"bar"`         | `"foo"`                   | `"default"` or `"*"` depending on `foo.__esModule` |
| `const { foo } = require("bar");`           | `DestructuredRequire`                           | `"bar"`         | `"foo"`                   | `"foo"`                                            |
| `const { foo, bar, baz } = require("bar");` | Three separate `DestructuredRequire` ImportDefs | `"bar"`         | `"foo"`, `"bar"`, `"baz"` | `"foo"`, `"bar"`, `"baz"`                          |
| `const { foo: bar } = require("bar");`      | `DestructuredRequire`                           | `"bar"`         | `"bar"`                   | `"foo"`                                            |
| `const foo = require("bar").default;`       | `MemberPropertyRequire`                         | `"bar"`         | `"foo"`                   | `"default"`                                        |
| `require("bar");`                           | `BareRequireStatement`                          | `"bar"`         | `null`                    | `null`                                             |
| `require("bar")`                            | `RequireExpression`                             | `"bar"`         | `null`                    | `null`                                             |
| `require(foo)`                              | `RequireExpression`                             | `null`          | `null`                    | `null`                                             |
