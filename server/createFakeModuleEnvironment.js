var Module = require("module");
var path = require("path");
var makeRequireFunction = require("./makeRequireFunction");

module.exports = function createFakeModuleEnvironment(requireFrom) {
  if (requireFrom && requireFrom[requireFrom.length - 1] === path.sep) {
    // Trim off trailing slash
    requireFrom = requireFrom.slice(0, -1);
  }
  var dirname = requireFrom || process.cwd();
  var filename = path.join(dirname, "this-file-doesnt-actually-exist.js");

  var mod = new Module(".", null);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(filename);

  var req = makeRequireFunction(mod);
  req.main = mod;

  var exps = {};
  mod.exports = exps;

  return {
    exports: exps,
    require: req,
    module: mod,
    __filename: filename,
    __dirname: dirname
  };
};
