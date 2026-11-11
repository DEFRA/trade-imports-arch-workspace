import { createElement } from 'react'
import { render as inkRender } from 'ink'
import { EXIT } from '../exit-codes.js'
import { mount, unmount } from './ink-control.js'
import { MainMenu } from './main-menu.js'

/**
 * Mounts the main menu with the given streams and resolves to the exit code
 * once Ink exits: EXIT.OK when no run left Ink, else the code the detached
 * run gave settle. detach() unmounts Ink and returns settle(code). overrides
 * reach the menu's props last.
 */
export const launchMenu = async ({ env, workspaceRoot, stdout, stdin, stderr, setExitCode, render = inkRender, overrides = {} }) => {
  let detachedRun
  const detach = () => {
    unmount()
    const run = Promise.withResolvers()
    detachedRun = run.promise
    return run.resolve
  }
  const menu = createElement(MainMenu, { env, workspaceRoot, io: { stdout, stderr, setExitCode }, detach, ...overrides })
  await mount(menu, { render, stdout, stdin, stderr }).waitUntilExit()
  unmount()
  return detachedRun === undefined ? EXIT.OK : detachedRun
}
