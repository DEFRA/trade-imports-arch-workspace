import { createElement } from 'react'
import { Box, Text } from 'ink'
import { TextInput } from '@inkjs/ui'

export const InputScreen = ({ title, subtitle, label, placeholder = '', onSubmit, onCancel }) => {
  const submitTrimmed = (value) => {
    const trimmed = value.trim()
    if (trimmed === '') onCancel()
    else onSubmit(trimmed)
  }

  return createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    createElement(Box, { marginBottom: 1 }, createElement(Text, { bold: true, color: 'cyan' }, title)),
    subtitle ? createElement(Box, { marginBottom: 1 }, createElement(Text, { color: 'gray' }, subtitle)) : null,
    createElement(
      Box,
      null,
      createElement(Text, null, `${label}: `),
      createElement(TextInput, { placeholder, onSubmit: submitTrimmed })
    ),
    createElement(
      Box,
      { marginTop: 1 },
      createElement(Text, { color: 'gray' }, 'Press Enter to submit, or leave the field blank to go back')
    )
  )
}
