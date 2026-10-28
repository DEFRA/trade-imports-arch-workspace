import { createElement } from 'react'
import { Box } from 'ink'
import { Spinner } from '@inkjs/ui'

export const LoadingScreen = ({ message }) =>
  createElement(Box, { flexDirection: 'column', padding: 1 }, createElement(Spinner, { label: message }))
