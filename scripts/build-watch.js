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
    "--kill-others",
    pkgsWithSrc
      .map(
        (pkgPath) =>
          "'" +
          [
            bin("babel"),
            "-w",
            path.join(pkgPath, "src"),
            "-d",
            path.join(pkgPath, "dist"),
            "--ignore",
            "*.test.js",
          ].join(" ") +
          "'"
      )
      .join(" "),
  ].join(" ")
);
