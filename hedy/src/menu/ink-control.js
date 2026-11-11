import { render as inkRender } from 'ink'

let current

/**
 * Unmounts the instance mounted before, renders the element through render
 * with the given streams, exit on Ctrl+C and the console left unpatched,
 * records the new instance and returns it.
 */
export const mount = (element, { render = inkRender, stdout, stdin, stderr } = {}) => {
  unmount()
  current = render(element, { stdout, stdin, stderr, exitOnCtrlC: true, patchConsole: false })
  return current
}

export const unmount = () => {
  if (current === undefined) return
  current.unmount()
  current = undefined
}

export const getCurrent = () => current
