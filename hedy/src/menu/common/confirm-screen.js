import { createElement } from 'react'
import { Box, Text } from 'ink'
import { ConfirmInput } from '@inkjs/ui'
import { RowsAndText } from './result-screen.js'

export const ConfirmScreen = ({ title, rows = [], text = '', question, onConfirm, onCancel }) =>
  createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    createElement(Box, { marginBottom: 1 }, createElement(Text, { bold: true, color: 'cyan' }, title)),
    createElement(RowsAndText, { rows, text }),
    createElement(
      Box,
      { marginTop: 1 },
      createElement(Text, null, `${question} `),
      createElement(ConfirmInput, { defaultChoice: 'cancel', onConfirm, onCancel })
    ),
    createElement(
      Box,
      { marginTop: 1 },
      createElement(Text, { color: 'gray' }, 'Press y to confirm, or n or Enter to go back')
    )
  )
