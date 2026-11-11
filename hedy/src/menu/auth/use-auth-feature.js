import { authRows, runAuth } from '../../commands/auth.js'
import { ResultScreen } from '../common/result-screen.js'
import { SCREENS } from '../screens.js'

export const useAuthFeature = ({
  setScreen,
  setScreenData,
  showLoading,
  showErrors,
  navigateToMain,
  env,
  workspaceRoot,
  checkCredentials = () => runAuth({ env, workspaceRoot })
}) => {
  const handleMainMenuSelect = async () => {
    showLoading('Checking the Jira and Confluence credentials')
    try {
      setScreenData({ rows: authRows(await checkCredentials()) })
      setScreen(SCREENS.AUTH_RESULT)
    } catch (error) {
      showErrors(error)
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
