// @flow
import * as React from "react";

type Props = {
  value: string,
  onChange: (any) => void,
  style?: Object,
};

let AceEditor;

export default class Editor extends React.Component<Props> {
  _editor: any;
  _div: ?HTMLDivElement;

  componentDidMount() {
    // Require these here because we only want to load them clientside (and
    // componentDidMount doesn't run serverside).
    require("brace");
    require("brace/mode/javascript");
    require("brace/theme/monokai");
    AceEditor = require("react-ace").default;
    this.forceUpdate();
  }

  render() {
    const { value, onChange, style } = this.props;

    if (AceEditor == null) {
      return null;
    }

    return (
      <AceEditor
        mode="javascript"
        theme="monokai"
        value={value}
        onChange={onChange}
        style={style}
      />
    );
  }
}
