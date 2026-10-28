import { createElement, useState } from 'react'
import { useApp } from 'ink'
import { useAuthFeature } from './auth/use-auth-feature.js'
import { ErrorScreen } from './common/error-screen.js'
import { LoadingScreen } from './common/loading-screen.js'
import { MenuScreen } from './common/menu-screen.js'
import { useConfluenceFeature } from './confluence/use-confluence-feature.js'
import { useJiraFeature } from './jira/use-jira-feature.js'
import { SCREENS } from './screens.js'

const givenOnly = (functions) =>
  Object.fromEntries(Object.entries(functions).filter(([, given]) => given !== undefined))

const mainRoute = ({ handlers }) => ({
  [SCREENS.MAIN]: {
    component: MenuScreen,
    props: {
      title: 'hedy',
      subtitle: 'Choose what to do',
      items: [
        { label: 'Check the credentials', value: 'auth' },
        { label: 'Jira', value: 'jira' },
        { label: 'Confluence', value: 'confluence' },
        { label: 'Quit', value: 'quit' }
      ],
      onSelect: (value) => handlers[value]()
    }
  }
})

/**
 * Renders the menu for the current screen. io is { stdout, stderr,
 * setExitCode } and detach() leaves Ink for a long run; both go to the
 * Confluence hook. Each override of a hook's boundary function reaches its
 * hook only when given, so the hook's default applies otherwise. onQuit
 * defaults to Ink's exit.
 */
export const MainMenu = ({
  env,
  workspaceRoot,
  io,
  detach,
  initialScreen = SCREENS.MAIN,
  onQuit,
  checkCredentials,
  readIssue,
  searchIssues,
  createIssue,
  describeIssue,
  readPage,
  publishPage
}) => {
  const { exit } = useApp()
  const [screen, setScreen] = useState(initialScreen)
  const [screenData, setScreenData] = useState({})
  const [loadingMessage, setLoadingMessage] = useState('')

  const navigateToMain = () => {
    setScreen(SCREENS.MAIN)
    setScreenData({})
  }

  const shared = { setScreen, setScreenData, setLoadingMessage, navigateToMain, env, workspaceRoot }
  const auth = useAuthFeature({ ...shared, ...givenOnly({ checkCredentials }) })
  const jira = useJiraFeature({ ...shared, ...givenOnly({ readIssue, searchIssues, createIssue, describeIssue }) })
  const confluence = useConfluenceFeature({ ...shared, io, detach, ...givenOnly({ readPage, publishPage }) })

  if (screen === SCREENS.LOADING) return createElement(LoadingScreen, { key: screen, message: loadingMessage })
  if (screen === SCREENS.ERROR) {
    return createElement(ErrorScreen, { key: screen, errors: screenData.errors, onReturn: navigateToMain })
  }

  const routes = {
    ...auth.routes,
    ...jira.routes,
    ...confluence.routes,
    ...mainRoute({
      handlers: {
        auth: auth.handleMainMenuSelect,
        jira: jira.handleMainMenuSelect,
        confluence: confluence.handleMainMenuSelect,
        quit: onQuit ?? exit
      }
    })
  }
  const route = routes[screen]
  if (route === undefined) return null
  const props = typeof route.props === 'function' ? route.props(screenData) : route.props
  return createElement(route.component, { key: screen, ...props })
}
