const path = require("path");
const fs = require("fs");
const { oneLine, stripIndent } = require("common-tags");
const { createMacro, MacroError } = require("babel-plugin-macros");
const t = require("babel-types");
const generate = require("babel-generator").default;
const TextBuffer = require("text-buffer");
const md5 = require("md5");
const codeFrame = require("babel-code-frame");
const supportsColor = require("supports-color");

module.exports = createMacro(runOnServerMacro, { configName: "runOnServer" });

function runOnServerMacro({ references, state, babel, config }) {
  const outputPath =
    (config && config.outputPath) ||
    path.join(process.cwd(), "run-on-server-id-mappings.js");

  const outputContent = t.expressionStatement(
    t.assignmentExpression(
      "=",
      t.memberExpression(t.identifier("module"), t.identifier("exports")),
      t.objectExpression([])
    )
  );

  const addedMappings = {};
  function addMapping(id, expressionNode) {
    if (addedMappings[id]) {
      return;
    }
    const newProperty = t.objectProperty(t.stringLiteral(id), expressionNode);
    outputContent.expression.right.properties.push(newProperty);
    addedMappings[id] = true;
  }

  function getSourceForNode(node) {
    const { start, end } = node.loc;
    const range = new TextBuffer.Range(
      [start.line - 1, start.column],
      [end.line - 1, end.column]
    );
    const source = state.file.code;
    return new TextBuffer(source).getTextInRange(range);
  }

  function getCodeFrame(node) {
    return codeFrame(
      state.file.code,
      node.loc.start.line,
      node.loc.start.column,
      {
        highlightCode: Boolean(supportsColor.stderr),
      }
    );
  }

  const referenceNames = {};

  // `references` are references to createClient, not runOnServer. We need
  // to find references to runOnServer.
  references.default.forEach((createClientReference) => {
    let createClientFunctionName = "createClient";
    if (createClientReference.isIdentifier()) {
      createClientFunctionName = createClientReference.node.name;
      referenceNames[createClientFunctionName] = true;
    }

    // createClient Identifier -> CallExpression -> VariableDeclarator
    const declarator = createClientReference.parentPath.parentPath;
    if (!declarator.isVariableDeclarator()) {
      throw new MacroError(
        oneLine`
          The result of calling ${createClientFunctionName} was not saved to a
          variable.
        ` +
          "\n" +
          getCodeFrame(createClientReference.node) +
          "\n" +
          oneLine`
            Saving the result of ${createClientFunctionName} to a variable
            is the only supported way to use the run-on-server macro.
          ` +
          "\n" +
          stripIndent`
            For example, try:
          ` +
          `\n  const runOnServer = ${createClientFunctionName}("http://somewhere:3000");`
      );
    }

    const id = declarator.get("id");
    if (!id.isIdentifier()) {
      throw new MacroError(
        oneLine`
          The result of calling ${createClientFunctionName} was saved to a
          variable, but that variable was created in an unexpected way.
        ` +
          "\n" +
          getCodeFrame(id.node) +
          "\n" +
          oneLine`
            The only variable declaration forms supported by
            the run-on-server macro are:
          ` +
          "\n  " +
          stripIndent`
              const runOnServer = ${createClientFunctionName}("http://somewhere:3000");
            OR
              let runOnServer = ${createClientFunctionName}("http://somewhere:3000");
            OR
              var runOnServer = ${createClientFunctionName}("http://somewhere:3000");
          `
      );
    }

    const bindings = id.scope.bindings[id.node.name];
    if (bindings == null) {
      // They made a runOnServer function but aren't using it anywhere yet.
      return;
    }

    const runOnServerPaths = bindings.referencePaths;
    const runOnServerFunctionName = id.node.name;
    runOnServerPaths.forEach((referencePath) => {
      // Handle module.exports = runOnServer, { foo: runOnServer }, etc.
      if (!referencePath.parentPath.isCallExpression()) {
        throw new MacroError(
          oneLine`
            ${runOnServerFunctionName} was referenced in a way where it wasn't
            a direct variable call.
          ` +
            "\n" +
            getCodeFrame(referencePath.node) +
            "\n" +
            oneLine`
              This is not supported- the only form of referencing
              ${runOnServerFunctionName} supported by the run-on-server macro is
              calling it directly, eg:
            ` +
            `\n  ${runOnServerFunctionName}("args", [1, 2, 3]);`
        );
      }

      const callExpression = referencePath.parentPath;
      const code = callExpression.get("arguments")[0];
      // Handle runOnServer();
      if (code == null) {
        throw new MacroError(
          oneLine`
            ${runOnServerFunctionName} was called without any arguments.
            This is not a valid use of the run-on-server library, and is
            therefore not understood by the run-on-server macro.
          ` +
            "\n" +
            getCodeFrame(callExpression.node) +
            "\n" +
            oneLine`
              ${runOnServerFunctionName} expects to be called with a string or
              function as the first argument (the code to be executed), and
              optionally an array as the second argument (the arguments to pass
              to the executed code). For example:
            ` +
            "\n" +
            `  ${runOnServerFunctionName}("console.log('hi')");\n` +
            "OR\n" +
            `  ${runOnServerFunctionName}(() => console.log("hi"));\n` +
            "OR\n" +
            `  ${runOnServerFunctionName}((a, b, c) => a + b + c, [1, 2, 3]);\n` +
            "OR\n" +
            `  ${runOnServerFunctionName}("args[0] + args[1] + args[2]", [1, 2, 3]);\n`
        );
      }

      // Handle irregular cases like runOnServer(2 + 2)
      if (
        !(
          code.isTemplateLiteral() ||
          code.isStringLiteral() ||
          code.isArrowFunctionExpression() ||
          code.isFunctionExpression() ||
          code.isIdentifier()
        )
      ) {
        throw new MacroError(
          oneLine`
            The ${runOnS}
          `

          // "Found a situation where runOnServer was called and the first " +
          //   "argument was not a template literal, string literal, arrow " +
          //   "function expression, function expression, or identifier " +
          //   "referring to one of those. These are the only forms supported " +
          //   "by the run-on-server macro."
        );
      }

      // Handle eg. runOnServer(`${foo}`)
      if (code.isTemplateLiteral() && code.node.expressions.length > 0) {
        throw new MacroError(
          "Found a template literal with embedded expressions being passed " +
            "to runOnServer. This is not supported. Instead of doing this, " +
            "use the `args` argument within the template literal string to " +
            "reference the optional array that can be passed as the second " +
            "argument to runOnServer."
        );
      }

      if (code.isIdentifier() && code.scope.bindings[code.node.name]) {
        const binding = code.scope.bindings[code.node.name];
        // Handle eg:
        // let foo = function(one) {};
        // foo = function(two) {};
        // runOnServer(foo);
        if (!binding.constant) {
          throw new Error(
            "Attempted to pass a variable into runOnServer, but the " +
              "variable being passed in was reassigned at some point in " +
              "the program, which the runOnServer macro cannot handle."
          );
        }

        // Handle eg:
        // function foo() {}
        // runOnServer(foo)
        if (binding.path.isFunctionDeclaration()) {
          const functionDeclaration = binding.path.node;
          const functionExpression = t.functionExpression(
            functionDeclaration.id,
            functionDeclaration.params,
            functionDeclaration.body,
            functionDeclaration.generator,
            functionDeclaration.async
          );

          const source = getSourceForNode(functionDeclaration);
          const codeId = md5(source);
          addMapping(codeId, JSON.parse(JSON.stringify(functionExpression)));
          code.replaceWith(
            t.objectExpression([
              t.objectProperty(t.identifier("id"), t.stringLiteral(codeId)),
            ])
          );

          return;
        } else if (
          binding.path.isVariableDeclarator() &&
          binding.path.node.init != null
        ) {
          if (
            code.isTemplateLiteral() ||
            code.isStringLiteral() ||
            code.isArrowFunctionExpression() ||
            code.isFunctionExpression()
          ) {
            // TODO
          }
        } else {
          throw new MacroError(
            "Found a situation where runOnServer was called with a " +
              "variable as the first argument, and that variable was not a " +
              "function or string defined in the same file. This is not " +
              "supported by the runOnServer macro."
          );
        }
      }

      const source = getSourceForNode(code.node);
      const codeId = md5(source);
      addMapping(codeId, JSON.parse(JSON.stringify(code.node)));
      code.replaceWith(
        t.objectExpression([
          t.objectProperty(t.identifier("id"), t.stringLiteral(codeId)),
        ])
      );
    });
  });

  if (references.default.length > 0 && Object.keys(referenceNames).length > 0) {
    const program = references.default[0].findParent((parentPath) =>
      parentPath.isProgram()
    );
    if (program != null) {
      Object.keys(referenceNames).forEach((referenceName) => {
        const newImport = t.variableDeclaration("var", [
          t.variableDeclarator(
            t.identifier(referenceName),
            t.callExpression(t.identifier("require"), [
              t.stringLiteral("run-on-server/client"),
            ])
          ),
        ]);
        program.unshiftContainer("body", newImport);
      });
    }
  }

  const comment =
    "\n" +
    stripIndent`
      This file was generated by the run-on-server babel macro. It should not
      be edited by hand.
      
      If you want to output this file to a different location, you can
      configure the macro by creating a file named \`babel-plugin-macros.config.js\`
      in the root of your project with the following content:
      
      const path = require("path");
      module.exports = {
        runOnServer: {
          outputPath: path.resolve(__dirname, "somewhere", "else.js")
        }
      };
    ` +
    "\n";

  const output = generate(t.program([outputContent]), {
    auxiliaryCommentBefore: comment,
    filename: __filename,
  });
  fs.writeFileSync(outputPath, output.code);
}
