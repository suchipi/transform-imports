const path = require("path");
const fs = require("fs");
const babel = require("babel-core");
const rimraf = require("rimraf");

const macroPath = path.resolve(__dirname, "..", "..", "client.macro");
const outputPath = path.join(process.cwd(), "run-on-server-id-mappings.js");

const transform = (code) => {
  rimraf.sync(outputPath);
  const result = babel.transform(code, { plugins: ["macros"] });
  const output = fs.readFileSync(outputPath, "utf-8");
  rimraf.sync(outputPath);
  return {
    code: result.code,
    output,
  };
};

const runMacroOnCode = (makeCode) => {
  delete require.cache[macroPath];
  const code = makeCode(macroPath);
  return transform(code);
};

module.exports = runMacroOnCode;
