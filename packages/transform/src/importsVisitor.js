const t = require("babel-types");

// Gathers all imports and requires and pushes them into the `this.imports`
// array passed via the second argument to traverse.
const importsVisitor = {
  ImportDeclaration(path) {
    path.node.specifiers.forEach((specifier) => {
      this.imports.push({
        source: path.node.source.value,
        variableName: specifier.local.name,
        exportName:
          specifier.type === "ImportDefaultSpecifier"
            ? "default"
            : specifier.imported.name,
        // path,
        remove: () => {
          if (path.get("specifiers").length === 1) {
            path.remove();
          } else {
            specifier.remove();
          }
        },
      });
    });
  },
  VariableDeclarator(path) {
    if (
      !(
        path.get("init").isCallExpression() &&
        path
          .get("init")
          .get("callee")
          .isIdentifier() &&
        path.node.init.callee.name === "require"
      )
    ) {
      return;
    }

    if (path.get("id").isIdentifier()) {
      this.imports.push({
        source: path.node.init.arguments[0].value,
        variableName: path.node.id.name,
        exportName: "default",
        // path,
        remove: () => {
          if (path.parentPath.get("declarations").length === 1) {
            path.parentPath.remove();
          } else {
            path.remove();
          }
        },
      });
    } else if (path.get("id").isObjectPattern()) {
      path
        .get("id")
        .get("properties")
        .forEach((property) => {
          this.imports.push({
            source: path.node.init.arguments[0].value,
            variableName: property.node.value.name,
            exportName: property.node.key.name,
            // path: property,
            remove: () => {
              if (path.get("id").get("properties").length === 1) {
                path.remove();
              } else {
                property.remove();
              }
            },
          });
        });
    }
  },
};

export default importsVisitor;
