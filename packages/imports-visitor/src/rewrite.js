// @flow
const babel = require("babel-core");
const importsVisitor = require("./index");

const transform = (code, callback) => {
  const plugin = () => ({
    visitor: {
      Program(path) {
        const imports = [];
        path.traverse(importsVisitor, { imports });
        callback(imports);
      },
    },
  });
  const result = babel.transform(code, { plugins: [plugin] });
  return result.code;
};

module.exports = function rewrite(
  code: string,
  sampleImport: string,
  newImport: string
): string {
  let sampleDef;
  let newDef;
  transform(sampleImport, (imports) => {
    sampleDef = imports[0];
  });
  transform(newImport, (imports) => {
    newDef = imports[0];
  });

  return transform(code, (imports) => {
    imports.forEach((importDef) => {
      if (
        importDef.source === sampleDef.source &&
        importDef.variableName === sampleDef.variableName &&
        importDef.importedExport.name === sampleDef.importedExport.name &&
        importDef.importedExport.isImportedAsCJS ===
          sampleDef.importedExport.isImportedAsCJS
      ) {
        importDef.source = newDef.source;
        importDef.variableName = newDef.variableName;
        importDef.importedExport = newDef.importedExport;
      }
    });
  });
};
