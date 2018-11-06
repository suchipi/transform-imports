const path = require("path");
const fs = require("fs");
const { exec } = require("shelljs");
const packageJson = require("../package.json");

const babelConfig = path.resolve(__dirname, "..", "babel.config.js");

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

exec(
  [
    bin("concurrently"),
    "--raw",
    "--kill-others",
    pkgsWithSrc
      .map(
        (pkgPath) =>
          "'" +
          [
            bin("babel"),
            "--config-file",
            JSON.stringify(babelConfig),
            "-w",
            path.join(pkgPath, "src"),
            "-d",
            path.join(pkgPath, "dist"),
            "--ignore",
            '"**/*.test.js"',
          ].join(" ") +
          "'"
      )
      .join(" "),
  ].join(" ")
);
