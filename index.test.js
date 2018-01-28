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
      "async arrow function without block body": {
        code: async () => await Promise.resolve(5),
        expected: 5
      },
      "async arrow function without block body with args": {
        code: async (a, b, c) => await Promise.resolve([a, b, c]),
        args: [1, 2, 3],
        expected: [1, 2, 3]
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
      "async arrow function with block body": {
        code: async () => {
          const number = await Promise.resolve(5);
          return number;
        },
        expected: 5
      },
      "async arrow function with block body with args": {
        code: async (a, b, c) => {
          const array = await Promise.resolve([a, b, c]);
          return array;
        },
        args: [1, 2, 3],
        expected: [1, 2, 3]
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
      "async function expression": {
        code: async function() {
          return await Promise.resolve(5);
        },
        expected: 5
      },
      "async function expression with args": {
        code: async function(a, b, c) {
          return await Promise.resolve(a + b + c);
        },
        args: [1, 2, 3],
        expected: 6
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
      "async function declaration": {
        code: (() => {
          async function foo() {
            return await Promise.resolve(5);
          }

          return foo;
        })(),
        expected: 5
      },
      "async function declaration with args": {
        code: (() => {
          async function foo(a, b, c) {
            const doubled = await Promise.resolve([a, b, c].map(x => x * 2));
            return doubled;
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
