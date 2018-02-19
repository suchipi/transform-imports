const t = require("babel-types");

class ImportDefinition {
  constructor(path) {
    this.path = path;
  }

  inspect() {
    return `ImportDefinition { variableName: "${this.variableName}", source: "${
      this.source
    }", importedExport: { name: "${
      this.importedExport.name
    }", isImportedAsCJS: ${this.importedExport.isImportedAsCJS} } }`;
  }

  get path() {
    return this._path;
  }
  set path(newPath) {
    const isValidPath =
      newPath.isVariableDeclarator() || // const `foo = require("bar")`;
      newPath.isObjectProperty() || // const { `foo` } = require("bar");
      newPath.isImportDefaultSpecifier() || // import `foo` from "bar";
      newPath.isImportSpecifier() || // import `{ foo }` from "bar";
      newPath.isImportNamespaceSpecifier(); // import `* as foo` from "bar";

    if (!isValidPath) {
      throw new Error(
        "Attempted to set the path of an ImportDefinition to an invalid path type: " +
          newPath.type
      );
    }

    // Define path as a non-enumerable property because otherwise the tests
    // freeze up when we try to print it on failure which is really annoying
    if (this._path != null) {
      this._path = newPath;
    } else {
      Object.defineProperty(this, "_path", {
        value: newPath,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
  }

  get source() {
    function getSourceForVariableDeclarator(declaratorPath) {
      const arg = declaratorPath.get("init").get("arguments")[0];
      if (arg.isStringLiteral() || arg.isLiteral()) {
        return arg.node.value;
      } else {
        return null;
      }
    }

    const path = this.path;

    if (
      path.isImportDefaultSpecifier() ||
      path.isImportNamespaceSpecifier() ||
      path.isImportSpecifier()
    ) {
      return path.parentPath.node.source.value;
    } else if (path.isVariableDeclarator()) {
      return getSourceForVariableDeclarator(path);
    } else if (path.isObjectProperty()) {
      return getSourceForVariableDeclarator(path.parentPath.parentPath);
    }

    return null;
  }
  set source(newSource) {
    this.fork();
    const path = this.path;
    if (
      path.isImportDefaultSpecifier() ||
      path.isImportNamespaceSpecifier() ||
      path.isImportSpecifier()
    ) {
      const importDeclaration = path.parentPath;
      importDeclaration.node.source = t.stringLiteral(newSource);
    } else if (path.isVariableDeclarator()) {
      path.node.init.arguments[0] = t.stringLiteral(newSource);
    } else if (path.isObjectProperty()) {
      const declarator = path.findParent((parent) =>
        parent.isVariableDeclarator()
      );
      declarator.node.init.arguments[0] = t.stringLiteral(newSource);
    }

    return newSource;
  }

  get importedExport() {
    const path = this.path;

    let def;

    if (path.isImportDefaultSpecifier()) {
      def = { name: "default", isImportedAsCJS: false };
    } else if (path.isImportNamespaceSpecifier()) {
      def = { name: "*", isImportedAsCJS: false };
    } else if (path.isImportSpecifier()) {
      def = { name: path.node.imported.name, isImportedAsCJS: false };
    } else if (path.isVariableDeclarator() && path.get("id").isIdentifier()) {
      def = { name: "*", isImportedAsCJS: true };
    } else if (path.isObjectProperty() && path.get("key").isIdentifier()) {
      def = { name: path.node.key.name, isImportedAsCJS: true };
    } else {
      def = { name: null, isImportedAsCJS: true };
    }

    const self = this;
    return {
      get name() {
        return def.name;
      },
      set name(newName) {
        return (self.importedExport = {
          name: newName,
          isImportedAsCJS: def.isImportedAsCJS,
        });
      },
      get isImportedAsCJS() {
        return def.isImportedAsCJS;
      },
      set isImportedAsCJS(newValue) {
        return (self.importedExport = {
          name: def.name,
          isImportedAsCJS: newValue,
        });
      },
    };
  }
  set importedExport(newValue) {
    const { name, isImportedAsCJS } = newValue;
    const current = this.importedExport;
    if (name === current.name && isImportedAsCJS === current.isImportedAsCJS) {
      return;
    }

    // We don't technically need to always fork here, but it's just less to
    // think about if we do.
    this.fork();
    const path = this.path;
    const statement = path.findParent((parent) => parent.isStatement());

    if (isImportedAsCJS === false) {
      let newSpecifier;
      if (name === "*") {
        newSpecifier = t.importNamespaceSpecifier(
          t.identifier(this.variableName)
        );
      } else if (name === "default") {
        newSpecifier = t.importDefaultSpecifier(
          t.identifier(this.variableName)
        );
      } else {
        newSpecifier = t.importSpecifier(
          t.identifier(this.variableName),
          t.identifier(name)
        );
      }

      statement.insertAfter(
        t.importDeclaration([newSpecifier], t.stringLiteral(this.source))
      );
      const newDeclaration = statement.parentPath.get(statement.listKey)[
        statement.key + 1
      ];
      this.remove();
      this.path = newDeclaration.get("specifiers")[0];
    } else {
      let id;
      if (name === "*") {
        id = t.identifier(this.variableName);
      } else {
        const key = name;
        const value = this.variableName;
        id = t.objectPattern([
          t.objectProperty(
            t.identifier(name),
            t.identifier(this.variableName),
            false,
            key === value
          ),
        ]);
      }

      statement.insertAfter(
        t.variableDeclaration("const", [
          t.variableDeclarator(
            id,
            t.callExpression(t.identifier("require"), [
              t.stringLiteral(this.source),
            ])
          ),
        ])
      );
      const newDeclaration = statement.parentPath.get(statement.listKey)[
        statement.key + 1
      ];
      this.remove();
      if (name === "*") {
        this.path = newDeclaration.get("declarations")[0];
      } else {
        this.path = newDeclaration
          .get("declarations")[0]
          .get("id")
          .get("properties")[0];
      }
    }

    return newValue;
  }

  get variableName() {
    const path = this.path;

    if (
      path.isImportDefaultSpecifier() ||
      path.isImportNamespaceSpecifier() ||
      path.isImportSpecifier()
    ) {
      return path.node.local.name;
    } else if (path.isVariableDeclarator() && path.get("id").isIdentifier()) {
      return path.node.id.name;
    } else if (path.isObjectProperty() && path.get("value").isIdentifier()) {
      return path.node.value.name;
    }

    return null;
  }
  set variableName(newName) {
    const path = this.path;

    if (path.isImportDefaultSpecifier() || path.isImportNamespaceSpecifier()) {
      path.node.local = t.identifier(newName);
    } else if (path.isImportSpecifier()) {
      path.replaceWith(
        t.importSpecifier(
          t.identifier(newName),
          t.identifier(path.node.imported.name)
        )
      );
    } else if (path.isVariableDeclarator()) {
      path.node.id = t.identifier(newName);
    } else if (path.isObjectProperty()) {
      const key = t.identifier(path.node.key.name);
      const value = t.identifier(newName);
      path.replaceWith(
        t.objectProperty(key, value, false, key.name === value.name)
      );
    }

    return null;
  }

  remove() {
    const statementSiblings = this.path.parentPath.get(this.path.listKey);
    if (statementSiblings.length === 1) {
      // We're the only VariableDeclarator/ImportSpecifier/ObjectProperty within
      // our parent VariableDeclaration/ImportDeclaration/ObjectPattern, so
      // just removing ourselves would leave an invalid parent. Remove our
      // parent statement instead.
      this.path.findParent((parent) => parent.isStatement()).remove();
    } else {
      this.path.remove();
    }
  }

  // Separate this import specifier from others so that it can be changed
  // without affecting others.
  // Eg if you have:
  //   import { foo, bar } from "blah";
  // and call fork() on the ImportDefinition for foo, you'll get:
  //   import { foo } from "blah";
  //   import { bar } from "blah";
  fork({ insert = "after" } = {}) {
    const path = this.path;
    const importSiblings = this._getImportSiblings();
    if (importSiblings.length === 1) {
      // We're already alone, so no need to fork.
      return;
    }

    let insertionMethod;
    let insertionOffset;
    if (insert === "before") {
      insertionMethod = "insertBefore";
      insertionOffset = -1;
    } else {
      insertionMethod = "insertAfter";
      insertionOffset = 1;
    }

    if (
      path.isImportDefaultSpecifier() ||
      path.isImportNamespaceSpecifier() ||
      path.isImportSpecifier()
    ) {
      const importDeclaration = path.parentPath;

      importDeclaration[insertionMethod](
        t.importDeclaration([path.node], t.stringLiteral(this.source))
      );
      const newDeclaration = importDeclaration.parentPath.get(
        importDeclaration.listKey
      )[importDeclaration.key + insertionOffset];
      this.path = newDeclaration.get("specifiers")[0];
      path.remove();
    } else if (path.isObjectProperty()) {
      const declarator = path.findParent((parent) =>
        parent.isVariableDeclarator()
      );
      const declaration = declarator.parentPath;
      declaration[insertionMethod](
        t.variableDeclaration(declaration.node.kind, [
          t.variableDeclarator(
            t.objectPattern([path.node]),
            t.callExpression(t.identifier("require"), [
              t.stringLiteral(this.source),
            ])
          ),
        ])
      );
      const newDeclaration = declaration.parentPath.get(declaration.listKey)[
        declaration.key + insertionOffset
      ];
      this.path = newDeclaration
        .get("declarations")[0]
        .get("id")
        .get("properties")[0];
      path.remove();
    }
  }

  // Returns the paths to all import definitions that are part of the same
  // statement as this import definition.
  // For example, in this code:
  //   const { foo, bar } = require("blah");
  // foo and bar are import siblings.
  // And in this code:
  //   import bloo, { qux, qaz } from "quick";
  // bloo, qux, and qaz are siblings.
  _getImportSiblings() {
    const path = this.path;
    if (path.isVariableDeclarator()) {
      // Even though VariableDeclarators are siblings within a
      // VariableDeclaration, they can be modified as independent imports.
      return [path];
    } else if (
      path.isImportDefaultSpecifier() ||
      path.isImportNamespaceSpecifier() ||
      path.isImportSpecifier() ||
      path.isObjectProperty()
    ) {
      return path.parentPath.get(path.listKey);
    }
  }
}

module.exports = ImportDefinition;
