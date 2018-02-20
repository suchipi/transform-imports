// @flow

export type Config = {
  files: Array<string>,
  matchSourceRegExp?: RegExp,
  matchSourceFile?: string, // absolute path
  matchVariableName?: RegExp,
  matchImportedExportName?: RegExp,
  setSource?: string,
  setVariableName?: string,
  setImportedExportName?: string,
  convertToImport?: boolean,
  convertToRequire?: boolean,
};

module.exports = function process(config: Config) {};
