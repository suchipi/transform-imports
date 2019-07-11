// https://github.com/suchipi/transform-imports/issues/5

const transformImports = require("./index");

test("issue #5 regression", () => {
  const code = `/* eslint-disable react/prop-types */

import PropTypes from 'prop-types'
import React from 'react'
import { CustomToolTipContent } from './CustomToolTip'

import {BarChart, CartesianGrid, Tooltip, Bar, ResponsiveContainer, XAxis, YAxis} from 'recharts'


class HistoryBarChart extends React.Component {

    render() {
        const {dataProvider, barKey, tickLine, xAxisLine, yAxisLine, xAxisKey, tickFormatter} = this.props

        return (

            <ResponsiveContainer height={220}>
                <BarChart
                    data={dataProvider}
                    margin={{top: 5, bottom: 5}}>
                    <XAxis tickLine={tickLine} axisLine={yAxisLine} dataKey={xAxisKey} />
                    <YAxis tickLine={tickLine} axisLine={xAxisLine} tickFormatter={tickFormatter} />
                    <CartesianGrid vertical={false} />
                    <Tooltip cursor={false} animationDuration={0} content={<CustomToolTipContent formatter={this.props.formatter} unhandled />} />
                    <Bar dataKey={barKey} fillOpacity={0.4} fill="#4b87ff" stroke="#4b87ff" />
                </BarChart>
            </ResponsiveContainer>
        )
    }
}


HistoryBarChart.displayName = 'History Bar Chart'

HistoryBarChart.propTypes = {
    barKey: PropTypes.string,
    xAxisKey: PropTypes.string,
    xAxisLine: PropTypes.bool,
    yAxisLine: PropTypes.bool,
    tickLine: PropTypes.bool,
    tickFormatter: PropTypes.func,
    formatter: PropTypes.func,
    dataProvider: PropTypes.array
}

HistoryBarChart.defaultProps = {
    formatter: (x) => { return x },
    xAxisLine: true,
    yAxisLine: true,
    tickLine: true,
}

HistoryBarChart.contextTypes = {
    muiTheme: PropTypes.object
}

export default HistoryBarChart
  `;

  expect(() => {
    transformImports(code, (imports) => {}, {});
  }).not.toThrowError();
});
