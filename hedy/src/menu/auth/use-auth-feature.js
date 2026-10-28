import { authRows, runAuth } from '../../commands/auth.js'
import { toHedyErrors } from '../../errors.js'
import { ResultScreen } from '../common/result-screen.js'
import { SCREENS } from '../screens.js'

export const useAuthFeature = ({
  setScreen,
  setScreenData,
  setLoadingMessage,
  navigateToMain,
  env,
  workspaceRoot,
  checkCredentials = () => runAuth({ env, workspaceRoot })
}) => {
  const handleMainMenuSelect = async () => {
    setLoadingMessage('Checking the Jira and Confluence credentials')
    setScreen(SCREENS.LOADING)
    try {
      setScreenData({ rows: authRows(await checkCredentials()) })
      setScreen(SCREENS.AUTH_RESULT)
    } catch (error) {
      setScreenData({ errors: toHedyErrors(error) })
      setScreen(SCREENS.ERROR)
    }
  }

  const routes = {
    [SCREENS.AUTH_RESULT]: {
      component: ResultScreen,
      props: ({ rows }) => ({ title: 'Credentials', rows, onReturn: navigateToMain })
    }
  }

  return { routes, handleMainMenuSelect }
}
