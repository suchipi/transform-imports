const path = require("path");
const fs = require("fs");
const { exec } = require("shelljs");
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

exec(
  [
    bin("concurrently"),
    "--raw",
    pkgsWithSrc
      .map(
        (pkgPath) =>
          "'" +
          [
            bin("babel"),
            "-w",
            path.resolve(__dirname, "..", pkgPath, "src"),
            "-d",
            path.resolve(__dirname, "..", pkgPath, "dist"),
          ].join(" ") +
          "'"
      )
      .join(" "),
  ].join(" ")
);
