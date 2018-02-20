const traverse = require("babel-traverse").default;
const recast = require("recast");
const babylon = require("babylon");
const importsVisitor = require("imports-visitor");

const parser = {
  parse(code, options) {
    return babylon.parse(code, {
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      plugins: [
        // "estree",
        "jsx",
        "flow",
        "flowComments",
        // "typescript",
        "doExpressions",
        "objectRestSpread",
        "decorators",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "asyncGenerators",
        "functionBind",
        "functionSent",
        "dynamicImport",
        "numericSeparator",
        "optionalChaining",
        "importMeta",
        "bigInt",
        "optionalCatchBinding",
        "throwExpressions",
        "pipelineOperator",
        "nullishCoalescingOperator",
      ],
      ...options,
    });
  },
};

module.exports = function transformImports(code, callback) {
  const ast = recast.parse(code, { parser });

  traverse(ast, {
    enter(path) {
      if (path.isProgram()) {
        const imports = [];
        path.traverse(importsVisitor, { imports });
        callback(imports);
      }
    },
  });

  return recast.print(ast).code;
};
