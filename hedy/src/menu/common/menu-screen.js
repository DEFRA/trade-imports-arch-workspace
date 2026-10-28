import { createElement } from 'react'
import { Box, Text } from 'ink'
import { Select } from '@inkjs/ui'

export const MenuScreen = ({ title, subtitle, items, onSelect }) =>
  createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    createElement(Box, { marginBottom: 1 }, createElement(Text, { bold: true, color: 'cyan' }, title)),
    subtitle ? createElement(Text, { color: 'gray' }, subtitle) : null,
    createElement(
      Box,
      { marginTop: 1 },
      createElement(Select, { options: items, visibleOptionCount: items.length, onChange: onSelect })
    )
  )
