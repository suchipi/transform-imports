const ImportDefinition = require("./ImportDefinition");

// Gathers all imports and requires and pushes them into the `this.imports`
// array passed via the second argument to traverse.
// Example usage:
// visitor: {
//   Program(path) {
//     const imports = [];
//     path.traverse(importsVisitor, { imports });
//     console.log(imports);
//   },
// },
const importsVisitor = {
  ImportDeclaration(path, state) {
    const specifiers = path.get("specifiers");
    if (specifiers.length === 0) {
      this.imports.push(new ImportDefinition(path));
    } else {
      specifiers.forEach((specifier) => {
        this.imports.push(new ImportDefinition(specifier));
      });
    }
  },
  VariableDeclarator(path, state) {
    if (
      !(
        path.get("init").isCallExpression() &&
        path.get("init").get("callee").isIdentifier() &&
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
  "Import|ImportExpression"(path, state) {
    this.imports.push(new ImportDefinition(path));
  },
};

module.exports = importsVisitor;
