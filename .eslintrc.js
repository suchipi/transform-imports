module.exports = {
  extends: [
    "unobtrusive",
    "unobtrusive/flowtype",
    "unobtrusive/import",
    "unobtrusive/react",
  ],
  env: {
    node: true,
    jest: true,
  },
  globals: {
    Promise: false,
  },
};
