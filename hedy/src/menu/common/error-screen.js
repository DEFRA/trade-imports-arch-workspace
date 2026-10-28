import { createElement } from 'react'
import { Box, Text } from 'ink'
import { ReturnPrompt } from './result-screen.js'

const errorLine = ({ code, message }, index) =>
  createElement(
    Text,
    { key: `error-${index}` },
    createElement(Text, { bold: true, color: 'red' }, code),
    ` ${message}`
  )

export const ErrorScreen = ({ errors, onReturn }) =>
  createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    createElement(Box, { marginBottom: 1 }, createElement(Text, { bold: true, color: 'red' }, 'Something went wrong')),
    ...errors.map(errorLine),
    onReturn ? createElement(ReturnPrompt, { onReturn }) : null
  )
