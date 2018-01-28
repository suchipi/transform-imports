const cases = require("jest-in-case");
const path = require("path");
const createServer = require("../server");
const createClient = require("../client");

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
    "basic calls and I/O",
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

  cases(
    "require",
    async ({ code, args, expected }) => {
      expect(await runOnServer(code, args)).toEqual(expected);
    },
    {
      "requiring a relative js file": {
        code: `require("./fixtures/fixture.js")`,
        expected: "this is fixtures/fixture.js"
      },
      "requiring a relative json file": {
        code: `require("./fixtures/fixture.json")`,
        expected: {
          this: ["is", "test", "json"]
        }
      },
      "requiring a js package from an immediate node_modules dir": {
        code: `require("fake-module")`,
        expected: "this is a fake module"
      },
      "requiring a js package from a parent's node_modules dir": {
        code: `typeof require("acorn").parse`,
        expected: "function"
      }
    }
  );

  describe("exports", () => {
    it("is empty", async () => {
      expect(await runOnServer(`exports`)).toEqual({});
    });

    it("is the same as module.exports", async () => {
      expect(await runOnServer(`exports === module.exports`)).toBe(true);
    });

    it("doesn't blow up if you add an export", async () => {
      await runOnServer(`exports.foo = "foo"`);
    });

    it("doesn't keep added exports between runs", async () => {
      await runOnServer(`exports.foo = "foo"`);
      expect(await runOnServer(`exports.foo`)).toBe(null);
    });
  });

  describe("__filename and __dirname", () => {
    it("are fake based on process.cwd() of the server", async () => {
      expect(await runOnServer(`__dirname`)).toBe(process.cwd());
      expect(await runOnServer(`__filename`)).toBe(
        path.join(process.cwd(), "this-file-doesnt-actually-exist.js")
      );
    });
  });

  describe("module", () => {
    it("acts like a normal module object", async () => {
      expect(await runOnServer(`module.id`)).toBeDefined();
      expect(await runOnServer(`module.exports`)).toBeDefined();
    });
  });

  describe("where to require from", () => {
    it("defaults to process.cwd when not specified", async () => {
      expect(await runOnServer(`__dirname`)).toBe(process.cwd());
      expect(await runOnServer(`__filename`)).toBe(
        path.join(process.cwd(), "this-file-doesnt-actually-exist.js")
      );
      expect(await runOnServer(`require("./fixtures/fixture.js")`)).toBe(
        "this is fixtures/fixture.js"
      );
      expect(await runOnServer(`require("fake-module")`)).toBe(
        "this is a fake module"
      );
    });

    it("can be overriden", async () => {
      const where = path.resolve(__dirname, "..");

      expect(await runOnServer(`__dirname`, [], { requireFrom: where })).toBe(
        where
      );
      expect(await runOnServer(`__filename`, [], { requireFrom: where })).toBe(
        path.join(where, "this-file-doesnt-actually-exist.js")
      );

      expect(
        runOnServer(`require("fake-module")`, [], { requireFrom: where })
      ).rejects.toBeTruthy();

      expect(
        await runOnServer(`require("./test/fixtures/fixture.js")`, [], {
          requireFrom: where
        })
      ).toBe("this is fixtures/fixture.js");
    });

    it("overrides fine with a trailing slash", async () => {
      const where = path.resolve(__dirname, "..");
      const whereWithSlash = where + "/";

      expect(
        await runOnServer(`__dirname`, [], { requireFrom: whereWithSlash })
      ).toBe(where);
      expect(
        await runOnServer(`__filename`, [], { requireFrom: whereWithSlash })
      ).toBe(path.join(where, "this-file-doesnt-actually-exist.js"));

      expect(
        runOnServer(`require("fake-module")`, [], {
          requireFrom: whereWithSlash
        })
      ).rejects.toBeTruthy();

      expect(
        await runOnServer(`require("./test/fixtures/fixture.js")`, [], {
          requireFrom: whereWithSlash
        })
      ).toBe("this is fixtures/fixture.js");
    });
  });
});
