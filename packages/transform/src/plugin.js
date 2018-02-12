import importsVisitor from "imports-visitor";

export default function runOnServerPlugin({ types: t }) {
  return {
    name: "run-on-server",
    visitor: {
      Program(path, state) {
        const imports = [];
        path.traverse(importsVisitor, { imports });
        console.log(imports);
      },
    },
  };
}
