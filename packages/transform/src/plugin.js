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
        path,
        kind: path.node.kind, // "type" or "value"
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
        path,
        kind: "value",
        remove: () => {
          if (path.parentPath.get("declarations").length === 1) {
            path.parentPath.remove();
          } else {
            path.remove();
          }
        },
        changeSource: (newSource) => {
          path.node.init.arguments[0] = t.StringLiteral;
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
            path: property,
            kind: "value",
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

export default function runOnServerPlugin({ types: t }) {
  return {
    name: "run-on-server",
    visitor: {
      Program(path, state) {
        const imports = [];
        path.traverse(importsVisitor, { imports });
        // console.log(imports);
        console.log(path.constructor.prototype);
      },
    },
  };
}
