import { createElement } from 'react'
import { Box, Text } from 'ink'
import { renderFaultReport } from '../../fault-report.js'
import { ReturnPrompt } from './result-screen.js'

const errorLine = ({ code, message }) =>
  createElement(
    Text,
    null,
    createElement(Text, { bold: true, color: 'red' }, code),
    ` ${message}`
  )

const reportBlock = (report) =>
  createElement(Box, { flexDirection: 'column', marginTop: 1, marginLeft: 2 }, createElement(Text, { dimColor: true }, renderFaultReport(report)))

const errorEntry = (error, index) =>
  createElement(
    Box,
    { key: `error-${index}`, flexDirection: 'column' },
    errorLine(error),
    error.report === undefined ? null : reportBlock(error.report)
  )

export const ErrorScreen = ({ errors, onReturn }) =>
  createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    createElement(Box, { marginBottom: 1 }, createElement(Text, { bold: true, color: 'red' }, 'Something went wrong')),
    ...errors.map(errorEntry),
    onReturn ? createElement(ReturnPrompt, { onReturn }) : null
  )
