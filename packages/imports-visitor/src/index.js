import * as t from "babel-types";

class ImportDefinition {
  constructor(path) {
    // Define path as a non-enumerable property because otherwise the tests
    // freeze up when we try to print it on failure which is really annoying
    Object.defineProperty(this, "path", {
      value: path,
      writable: true,
      configurable: true,
      enumerable: false,
    });
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
    const path = this.path;
    const list = this._getList();
    if (
      path.isImportDefaultSpecifier() ||
      path.isImportNamespaceSpecifier() ||
      path.isImportSpecifier()
    ) {
      const importDeclaration = path.parentPath;
      if (list.length === 1) {
        importDeclaration.node.source = t.stringLiteral(newSource);
      } else {
        importDeclaration.insertAfter(
          t.importDeclaration([path.node], t.stringLiteral(newSource))
        );
        const newPath = importDeclaration.parentPath.get(
          importDeclaration.listKey
        )[importDeclaration.key + 1];
        this.path = newPath;
        path.remove();
      }
    } else if (path.isVariableDeclarator()) {
      path.node.init.arguments[0] = t.stringLiteral(newSource);
    } else if (path.isObjectProperty()) {
      const declarator = path.findParent((parent) =>
        parent.isVariableDeclarator()
      );
      if (list.length === 1) {
        declarator.node.init.arguments[0] = t.stringLiteral(newSource);
      } else {
        const declaration = declarator.parentPath;
        declaration.insertAfter(
          t.variableDeclaration(declaration.node.kind, [
            t.variableDeclarator(
              t.objectPattern([path.node]),
              t.callExpression(t.identifier("require"), [
                t.stringLiteral(newSource),
              ])
            ),
          ])
        );
        const newPath = declaration.parentPath.get(declaration.listKey)[
          declaration.key + 1
        ];
        this.path = newPath;
        path.remove();
      }
    }
  }

  get exportName() {
    const path = this.path;

    if (path.isImportDefaultSpecifier()) {
      return "default";
    } else if (path.isImportNamespaceSpecifier()) {
      return "*";
    } else if (path.isImportSpecifier()) {
      return path.node.imported.name;
    } else if (path.isVariableDeclarator() && path.get("id").isIdentifier()) {
      return "default";
    } else if (path.isObjectProperty() && path.get("key").isIdentifier()) {
      return path.node.key.name;
    }

    return null;
  }

  get isCJSDefaultImport() {
    return this.exportName === "default" && this.path.isVariableDeclarator();
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

  remove() {
    const list = this._getList();
    if (list.length === 1) {
      this._getParentStatement().remove();
    } else {
      this.path.remove();
    }
  }

  _getList() {
    const path = this.path;
    if (
      path.isImportDefaultSpecifier() ||
      path.isImportNamespaceSpecifier() ||
      path.isImportSpecifier()
    ) {
      const declarationPath = path.parentPath;
      return declarationPath.get("specifiers");
    } else if (path.isVariableDeclarator()) {
      const declarationPath = path.parentPath;
      return declarationPath.get("declarations");
    } else if (path.isObjectProperty()) {
      const objectPattern = path.parentPath;
      return objectPattern.get("properties");
    }
  }

  _getParentStatement() {
    const path = this.path;
    if (
      path.isImportDefaultSpecifier() ||
      path.isImportNamespaceSpecifier() ||
      path.isImportSpecifier() ||
      path.isVariableDeclarator()
    ) {
      return path.parentPath;
    } else if (path.isObjectProperty()) {
      return path.parentPath.parentPath;
    }
  }
}

// Gathers all imports and requires and pushes them into the `this.imports`
// array passed via the second argument to traverse.
const importsVisitor = {
  ImportDeclaration(path, state) {
    path.get("specifiers").forEach((specifier) => {
      this.imports.push(new ImportDefinition(specifier));
    });
  },
  VariableDeclarator(path, state) {
    if (
      !(
        path.get("init").isCallExpression() &&
        path
          .get("init")
          .get("callee")
          .isIdentifier() &&
        path.get("init").get("callee").node.name === "require"
      )
    ) {
      return;
    }

    if (path.get("id").isObjectPattern()) {
      path
        .get("id")
        .get("properties")
        .forEach((property) => {
          this.imports.push(new ImportDefinition(property));
        });
    } else {
      this.imports.push(new ImportDefinition(path));
    }
  },
};

export default importsVisitor;
