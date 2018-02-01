const cases = require("jest-in-case");
const path = require("path");
const createServer = require("../server");
const createClient = require("../client");

describe("run-on-server", () => {
  let app;
  let server;
  let runOnServer;

  const startServer = (serverConfig = undefined, port = 7325) => {
    return new Promise((resolve) => {
      app = createServer(serverConfig);
      runOnServer = createClient(`http://localhost:${port}`);
      server = app.listen(port, resolve);
    });
  };

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  cases(
    "basic calls and I/O",
    async ({ code, args, expected }) => {
      await startServer();
      expect(await runOnServer(code, args)).toEqual(expected);
    },
    {
      "arrow function without block body": {
        code: () => 5,
        expected: 5,
      },
      "arrow function without block body with args": {
        code: (a, b, c) => [a, b, c].map((x) => x * 2),
        args: [1, 2, 3],
        expected: [2, 4, 6],
      },
      "async arrow function without block body": {
        code: async () => await Promise.resolve(5),
        expected: 5,
      },
      "async arrow function without block body with args": {
        code: async (a, b, c) => await Promise.resolve([a, b, c]),
        args: [1, 2, 3],
        expected: [1, 2, 3],
      },
      "arrow function with block body": {
        code: () => {
          return 5;
        },
        expected: 5,
      },
      "arrow function with block body with args": {
        code: (a, b, c) => {
          return [a, b, c].map((x) => x * 2);
        },
        args: [1, 2, 3],
        expected: [2, 4, 6],
      },
      "async arrow function with block body": {
        code: async () => {
          const number = await Promise.resolve(5);
          return number;
        },
        expected: 5,
      },
      "async arrow function with block body with args": {
        code: async (a, b, c) => {
          const array = await Promise.resolve([a, b, c]);
          return array;
        },
        args: [1, 2, 3],
        expected: [1, 2, 3],
      },
      "function expression": {
        code: function() {
          return 5;
        },
        expected: 5,
      },
      "function expression with args": {
        code: function(a, b, c) {
          return [a, b, c].map((x) => x * 2);
        },
        args: [1, 2, 3],
        expected: [2, 4, 6],
      },
      "async function expression": {
        code: async function() {
          return await Promise.resolve(5);
        },
        expected: 5,
      },
      "async function expression with args": {
        code: async function(a, b, c) {
          return await Promise.resolve(a + b + c);
        },
        args: [1, 2, 3],
        expected: 6,
      },
      "function declaration": {
        code: (() => {
          function foo() {
            return 5;
          }

          return foo;
        })(),
        expected: 5,
      },
      "function declaration with args": {
        code: (() => {
          function foo(a, b, c) {
            return [a, b, c].map((x) => x * 2);
          }

          return foo;
        })(),
        args: [1, 2, 3],
        expected: [2, 4, 6],
      },
      "async function declaration": {
        code: (() => {
          async function foo() {
            return await Promise.resolve(5);
          }

          return foo;
        })(),
        expected: 5,
      },
      "async function declaration with args": {
        code: (() => {
          async function foo(a, b, c) {
            const doubled = await Promise.resolve([a, b, c].map((x) => x * 2));
            return doubled;
          }

          return foo;
        })(),
        args: [1, 2, 3],
        expected: [2, 4, 6],
      },
      "string (bare expression)": {
        code: "5",
        expected: 5,
      },
      "string (bare expression) with args": {
        code: "args.map(x => x * 2)",
        args: [1, 2, 3],
        expected: [2, 4, 6],
      },
      "string (statement)": {
        code: "const foo = 5",
        expected: null,
      },
      "string (statement) with args": {
        code: "const foo = args",
        expected: null,
      },
    }
  );

  cases(
    "require",
    async ({ code, args, expected }) => {
      await startServer();
      expect(await runOnServer(code, args)).toEqual(expected);
    },
    {
      "requiring a relative js file": {
        code: `require("./fixtures/fixture.js")`,
        expected: "this is fixtures/fixture.js",
      },
      "requiring a relative json file": {
        code: `require("./fixtures/fixture.json")`,
        expected: {
          this: ["is", "test", "json"],
        },
      },
      "requiring a js package from an immediate node_modules dir": {
        code: `require("fake-module")`,
        expected: "this is a fake module",
      },
      "requiring a js package from a parent's node_modules dir": {
        code: `typeof require("acorn").parse`,
        expected: "function",
      },
    }
  );

  describe("exports", () => {
    beforeEach(startServer);

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
    beforeEach(startServer);

    it("are fake based on process.cwd() of the server", async () => {
      expect(await runOnServer(`__dirname`)).toBe(process.cwd());
      expect(await runOnServer(`__filename`)).toBe(
        path.join(process.cwd(), "this-file-doesnt-actually-exist.js")
      );
    });
  });

  describe("module", () => {
    beforeEach(startServer);

    it("acts like a normal module object", async () => {
      expect(await runOnServer(`module.id`)).toBeDefined();
      expect(await runOnServer(`module.exports`)).toBeDefined();
    });
  });

  describe("where to require from", () => {
    it("defaults to process.cwd when not specified", async () => {
      await startServer();

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

    describe("overriding the requireFrom", () => {
      let where;
      beforeEach(() => {
        where = path.resolve(__dirname, "..");
        return startServer({ requireFrom: where });
      });

      it("can be overriden", async () => {
        expect(await runOnServer(`__dirname`)).toBe(where);
        expect(await runOnServer(`__filename`)).toBe(
          path.join(where, "this-file-doesnt-actually-exist.js")
        );

        expect(runOnServer(`require("fake-module")`)).rejects.toBeTruthy();

        expect(await runOnServer(`require("./test/fixtures/fixture.js")`)).toBe(
          "this is fixtures/fixture.js"
        );
      });
    });

    describe("overriding the requireFrom with a trailing slash", () => {
      let where;
      beforeEach(() => {
        where = path.resolve(__dirname, "..");
        return startServer({ requireFrom: where + "/" });
      });

      it("works fine", async () => {
        expect(await runOnServer(`__dirname`)).toBe(where);
        expect(await runOnServer(`__filename`)).toBe(
          path.join(where, "this-file-doesnt-actually-exist.js")
        );

        expect(runOnServer(`require("fake-module")`)).rejects.toBeTruthy();

        expect(await runOnServer(`require("./test/fixtures/fixture.js")`)).toBe(
          "this is fixtures/fixture.js"
        );
      });
    });
  });

  describe("id mappings", () => {
    describe("when the server is not configured with id mappings", () => {
      beforeEach(startServer);

      it("errors if you try to make a request using an id", () => {
        return expect(runOnServer({ id: "foo" })).rejects.toBeTruthy();
      });
    });

    describe("when the server is configured with id mappings", () => {
      beforeEach(() => {
        return startServer({
          idMappings: {
            returnArgs: "args",
            returnArgsFn: (...args) => args,
          },
        });
      });

      it("errors if you try to make a request using a string", () => {
        return expect(runOnServer(`args`, [1, 2, 3])).rejects.toBeTruthy();
      });

      it("errors if you try to make a request using a function", () => {
        return expect(runOnServer((...args) => args)).rejects.toBeTruthy();
      });

      describe("when you make a request using an id", () => {
        it("finds and executes the function referenced by that id (string)", async () => {
          const result = await runOnServer({ id: "returnArgs" }, [1, 2, 3]);
          expect(result).toEqual([1, 2, 3]);
        });

        it("finds and executes the function referenced by that id (function)", async () => {
          const result = await runOnServer({ id: "returnArgsFn" }, [1, 2, 3]);
          expect(result).toEqual([1, 2, 3]);
        });
      });
    });
  });
});
