# run-on-server

`run-on-server` provides a way to run arbitrary JavaScript code from a client (browser, node, etc) on a remote server (node) via HTTP.

## Usage

serverside:

```js
const createServer = require("run-on-server/server");

const app = createServer();
// createServer returns an express app

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
```

clientside:

```js
const createClient = require("run-on-server/client");

const runOnServer = createClient("http://localhost:3000");

// You can pass a function...
runOnServer(() => {
  // This code gets executed server-side in the global context
  console.log(process.version);
});

// ...or a string:
runOnServer(`console.log(process.version)`);

// runOnServer returns a Promise:
runOnServer(() => {
  return 4;
}).then(response => {
  console.log(response); // 4
});

// When using a function, you can pass arguments in as a second argument:
runOnServer(
  (a, b) => {
    return a + b;
  },
  [3, 4]
).then(response => {
  console.log(response); // 7
});

// Async functions are also supported:
runOnServer(async () => {
  const value = await Promise.resolve(55);
  return value + 2;
}).then(response => {
  console.log(response); // 57
});
```

## Limitations

* JSON is used as the transport mechanism. As such, the return value from the server and any arguments passed from the client must be JSON-serializable.
* When passing a function to `runOnServer`, the function source code is executed as-is server-side. This means that if you attempt to reference any local variables from the client in the function, the server will not be able to see them. To work around this, pass local variables in as function arguments via `runOnServer`'s second argument.

## Warnings

This effectively gives the client serverside `eval`, so treat this with the same caution you'd treat `eval`.

## Installation

With npm:

```
npm install run-on-server
```

or with yarn:

```
yarn add run-on-server
```

## JS API Documentation

### `createServer() => ExpressApplication`

The `createServer` function is obtained from the module `run-on-server/server`. When called, it returns an [Express Application](http://expressjs.com/en/api.html#app) configured to respond to JSON HTTP `POST`s on `/`. You can call its `listen` method to run it on an HTTP port or Unix Socket, or you can pass it into another express app's `app.use` method to mount it at an arbitrary route. See the [Express documentation](<(http://expressjs.com/en/api.html#app)>) for more information.

```js
const createServer = require("run-on-server/server");

const app = createServer();
```

### `createClient(url: string) => Function`

The `createClient` function is obtained from the module `run-on-server/client`. When called, it returns a `runOnServer` function configured with the specified url.

```js
const createClient = require("run-on-server/client");

const runOnServer = createClient("http://localhost:3000");
```

### `runOnServer(code: Function | string, args: ?Array<any>) => Promise<any>`

The `runOnServer` function is obtained by calling `createClient`. It can be called with either a function or string, and an optional array of arguments to pass to the function (when using a function). It returns a Promise.

```js
runOnServer(`console.log("hello, world!")`);

runOnServer(() => {
  return 5;
}).then(response => {
  console.log(response); // 5
});

runOnServer(async () => {
  const someNumber = await Promise.resolve(62);
  return someNumber + 5;
}).then(response => {
  console.log(response); // 67
});

runOnServer(
  (one, two, three) => {
    return one + two + three;
  },
  [1, 2, 3]
).then(response => {
  console.log(response); // 6
});
```

* If the function or code string passed to `runOnServer` returns a value, it must be JSON-serializable.
* If an arguments array is passed in as the second argument to `runOnServer`, it must be JSON-serializable.
* If the serverside code throws an Error, the Promise returned from `runOnServer` will reject with an Error with the same name, message, and stack as the serverside error.

## HTTP JSON API Documentation

This documentation is for the HTTP JSON API that the express app returned from `createServer` serves. Normally, you will not need to worry about how this works, because the client abstracts that information away. However, it may be useful to know how it works in some circumstances.

### POST `/`

Runs the code specified as JSON in the request body. The request body should take one of these two forms:

```js
{
  functionString: string,
  args: ?Array<any>
}
```

or:

```js
{
  codeString: string,
}
```

In the first form, the `functionString` should be the entire source code of a function, for instance:

```json
{
  "functionString": "function() { console.log(\"Hello\"); }"
}
```

In the second form, the `codeString` should be any valid JavaScript code string, for instance:

```json
{
  "codeString": "console.log(\"Hello\");"
}
```

`args` is optional in the first form, and is not used in the second form.

The response will contain JSON in the body which takes this form:

```js
{
  success: true,
  result: any,
} | {
  success: false,
  err: {
    name: string,
    message: string,
    stack: string,
  },
}
```

That is, the response will always have a boolean `success` property, and when `success` is true, it will also contain a `result` property which contains the return/resolve value of the executed code. When `success` is false, the response will contain an `err` property containing the name, message, and stack of the error which occurred serverside.

When the code executes successfully, the response code will be 200. When an error occurs, the response code will be 500.

## Related Work

`run-on-server` was inspired by [karma-server-side](https://github.com/featurist/karma-server-side).
