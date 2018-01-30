/* @flow */
const Module = require("module");
const path = require("path");
const makeRequireFunction = require("./makeRequireFunction");

type ModuleEnvironment = {
  exports: typeof exports,
  require: typeof require,
  module: typeof module,
  __filename: string,
  __dirname: string,
};

module.exports = function createFakeModuleEnvironment(
  requireFrom: ?string
): ModuleEnvironment {
  if (requireFrom && requireFrom[requireFrom.length - 1] === path.sep) {
    // Trim off trailing slash
    requireFrom = requireFrom.slice(0, -1);
  }
  const dirname = requireFrom || process.cwd();
  const filename = path.join(dirname, "this-file-doesnt-actually-exist.js");

  const mod = new Module(".", null);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(filename);

  const req = makeRequireFunction(mod);
  req.main = mod;

  const exps = {};
  mod.exports = exps;

  return {
    exports: exps,
    require: req,
    module: mod,
    __filename: filename,
    __dirname: dirname,
  };
};
