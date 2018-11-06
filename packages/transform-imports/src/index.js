const traverse = require("@babel/traverse").default;
const recast = require("recast");
const babelParser = require("@babel/parser");
const importsVisitor = require("imports-visitor");

module.exports = function transformImports(code, callback, options = {}) {
  const parser = options.parser || {
    parse(code, parserOptions) {
      return babelParser.parse(code, {
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
          // "decorators",
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
          // "pipelineOperator",
          "nullishCoalescingOperator",
        ],
        ...parserOptions,
      });
    },
  };

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
