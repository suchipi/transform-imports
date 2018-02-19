// @flow
const transformImports = require("./transformImports");

module.exports = function rewrite(
  code: string,
  sampleImport: string,
  newImport: string
): string {
  let output = "";
  transformImports(sampleImport, ([sampleDef]) => {
    transformImports(newImport, ([newDef]) => {
      output = transformImports(code, (imports) => {
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
    });
  });

  return output;
};
