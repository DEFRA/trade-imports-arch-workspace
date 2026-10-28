import { createElement, useRef } from 'react'
import { Box, Text } from 'ink'
import { ConfirmInput } from '@inkjs/ui'
import { RowsAndText } from './result-screen.js'

/**
 * Renders the rows and the text through RowsAndText, then the question with
 * cancel as the default. Only the first answer reaches onConfirm or
 * onCancel, and every key after it is ignored.
 */
export const ConfirmScreen = ({ title, rows = [], text = '', wholeText, question, onConfirm, onCancel }) => {
  const answered = useRef(false)
  const firstAnswerOnly = (answer) => () => {
    if (answered.current) return
    answered.current = true
    answer()
  }
  return createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    createElement(Box, { marginBottom: 1 }, createElement(Text, { bold: true, color: 'cyan' }, title)),
    createElement(RowsAndText, { rows, text, wholeText }),
    createElement(
      Box,
      { marginTop: 1 },
      createElement(Text, null, `${question} `),
      createElement(ConfirmInput, { defaultChoice: 'cancel', onConfirm: firstAnswerOnly(onConfirm), onCancel: firstAnswerOnly(onCancel) })
    ),
    createElement(
      Box,
      { marginTop: 1 },
      createElement(Text, { color: 'gray' }, 'Press y to confirm, or n or Enter to go back')
    )
  )
}
