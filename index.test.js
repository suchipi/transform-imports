const cases = require("jest-in-case");
const createServer = require("./server");
const createClient = require("./client");

describe("run-on-server", () => {
  let app;
  let server;
  beforeAll(done => {
    app = createServer();
    server = app.listen(7325, done);
  });

  afterAll(() => {
    server.close();
  });

  const runOnServer = createClient("http://localhost:7325");
  cases(
    "runOnServer",
    async ({ code, args, expected }) => {
      expect(await runOnServer(code, args)).toEqual(expected);
    },
    {
      "arrow function without block body": {
        code: () => 5,
        expected: 5
      },
      "arrow function without block body with args": {
        code: (a, b, c) => [a, b, c].map(x => x * 2),
        args: [1, 2, 3],
        expected: [2, 4, 6]
      },
      "arrow function with block body": {
        code: () => {
          return 5;
        },
        expected: 5
      },
      "arrow function with block body with args": {
        code: (a, b, c) => {
          return [a, b, c].map(x => x * 2);
        },
        args: [1, 2, 3],
        expected: [2, 4, 6]
      },
      "function expression": {
        code: function() {
          return 5;
        },
        expected: 5
      },
      "function expression with args": {
        code: function(a, b, c) {
          return [a, b, c].map(x => x * 2);
        },
        args: [1, 2, 3],
        expected: [2, 4, 6]
      },
      "function declaration": {
        code: (() => {
          function foo() {
            return 5;
          }

          return foo;
        })(),
        expected: 5
      },
      "function declaration with args": {
        code: (() => {
          function foo(a, b, c) {
            return [a, b, c].map(x => x * 2);
          }

          return foo;
        })(),
        args: [1, 2, 3],
        expected: [2, 4, 6]
      },
      "string (bare expression)": {
        code: "5",
        expected: 5
      },
      "string (bare expression) with args": {
        code: "args.map(x => x * 2)",
        args: [1, 2, 3],
        expected: [2, 4, 6]
      },
      "string (statement)": {
        code: "const foo = 5",
        expected: null
      },
      "string (statement) with args": {
        code: "const foo = args",
        expected: null
      }
    }
  );
});
