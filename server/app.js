var createServer = require("./index");

createServer().listen(3000, function() {
  console.log("Server is running on port 3000");
});
