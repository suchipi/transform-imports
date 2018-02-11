// @flow
import * as React from "react";

type Props = {
  children?: React.Node,
  style?: Object,
};

export default class OutputDisplay extends React.Component<Props> {
  _el: ?HTMLElement;

  componentDidUpdate() {
    this._highlight();
  }

  _highlight() {
    if (this._el != null) {
      global.hljs.highlightBlock(this._el);
    }
  }

  render() {
    const { children, style } = this.props;

    return (
      <code
        ref={(el) => {
          this._el = el;
          this._highlight();
        }}
        className="lang-js"
        style={style}
      >
        {children}
      </code>
    );
  }
}
