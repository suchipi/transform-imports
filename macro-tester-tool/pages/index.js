// @flow
import * as React from "react";
import debounce from "lodash/debounce";
import createClient from "../../client";
import Head from "next/head";
import Editor from "../components/Editor";
import ErrorDisplay from "../components/ErrorDisplay";
import OutputDisplay from "../components/OutputDisplay";

const runOnServer = createClient("http://localhost:3001");

const defaultInput = `// Edit this input to see what the macro would output below
import createClient from "run-on-server/client.macro";

const runOnServer = createClient("http://localhost:3001");

runOnServer("args", [1, 2, 3]);
`;

type State = {
  input: string,
  outputCode: string,
  outputIdMappings: string,
  error: ?Error,
};

export default class IndexPage extends React.Component<{||}, State> {
  state = {
    input: defaultInput,
    outputCode: "",
    outputIdMappings: "",
    error: null,
  };

  componentDidMount() {
    this._submit();
  }

  _handleEditorChange = (newValue: string) => {
    this.setState({ input: newValue });
    this._debouncedSubmit();
  };

  _submit = () => {
    runOnServer(
      `
      (() => {
        const inputCode = args[0];
        const runMacroOnCode = require("./runMacroOnCode");
  
        const { code, output } = runMacroOnCode((macroPath) => {
          return inputCode.replace("run-on-server/client.macro", macroPath);
        });
  
        return { code, output };
      })();
      `,
      [this.state.input]
    )
      .then(({ code, output }) => {
        this.setState({
          outputCode: code,
          outputIdMappings: output,
          error: null,
        });
      })
      .catch((error) => {
        this.setState({ error });
      });
  };

  _debouncedSubmit = debounce(this._submit, 100);

  render() {
    const { input, outputCode, outputIdMappings, error } = this.state;

    return (
      <React.Fragment>
        <Head>
          <title>run-on-server macro tester tool</title>
        </Head>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          }}
        >
          <Editor
            style={{
              resize: "none",
              width: "100%",
              flexGrow: 1,
              flexBasis: "50%",
              padding: "1em",
            }}
            value={input}
            onChange={this._handleEditorChange}
          />
          <pre
            style={{
              width: "100%",
              height: "50vh",
              flexGrow: 1,
              flexBasis: "50%",
              display: "flex",
              flexDirection: "row",
            }}
          >
            {error ? (
              <ErrorDisplay
                style={{ flexBasis: "100%", padding: "1em" }}
                error={error}
              />
            ) : (
              <React.Fragment>
                <OutputDisplay style={{ flexBasis: "100%", padding: "1em" }}>
                  {outputCode}
                </OutputDisplay>
                <OutputDisplay style={{ flexBasis: "100%", padding: "1em" }}>
                  {outputIdMappings}
                </OutputDisplay>
              </React.Fragment>
            )}
          </pre>
        </div>
      </React.Fragment>
    );
  }
}
