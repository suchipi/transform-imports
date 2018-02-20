const path = require("path");
const fs = require("fs");
const { cd, rm, exec } = require("shelljs");
const chalk = require("chalk");
const packageJson = require("../package.json");

const bin = (name) =>
  path.resolve(__dirname, "..", "node_modules", ".bin", name);

const pkgsWithSrc = packageJson.workspaces
  .map((pkgPath) => {
    if (fs.existsSync(path.resolve(__dirname, "..", pkgPath, "src"))) {
      return pkgPath;
    } else {
      return null;
    }
  })
  .filter(Boolean);

pkgsWithSrc.forEach((pkgPath) => {
  console.log(chalk.blue(pkgPath));
  cd(path.resolve(__dirname, "..", pkgPath));
  rm("-rf", "dist/*");
  exec(`${bin("babel")} src -d dist --ignore *.test.js`);
});
