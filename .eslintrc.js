module.exports = {
  extends: ["unobtrusive", "unobtrusive/flowtype", "unobtrusive/import"],
  env: {
    node: true,
    jest: true,
  },
  globals: {
    Promise: false,
  },
};
