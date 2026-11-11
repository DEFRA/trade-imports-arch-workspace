import { checkRows, runWorkspaceCheck } from '../../commands/workspace/check.js'
import { ResultScreen } from '../common/result-screen.js'
import { SCREENS } from '../screens.js'

export const useWorkspaceFeature = ({
  setScreen,
  setScreenData,
  showLoading,
  showErrors,
  navigateToMain,
  env,
  workspaceRoot,
  checkWorkspace = () => runWorkspaceCheck({ env, workspaceRoot })
}) => {
  const handleMainMenuSelect = async () => {
    showLoading('Checking the workspace setup')
    try {
      setScreenData({ rows: checkRows(await checkWorkspace()) })
      setScreen(SCREENS.WORKSPACE_RESULT)
    } catch (error) {
      showErrors(error)
    }
  }

  const routes = {
    [SCREENS.WORKSPACE_RESULT]: {
      component: ResultScreen,
      props: ({ rows }) => ({ title: 'Workspace setup', rows, onReturn: navigateToMain })
    }
  }

  return { routes, handleMainMenuSelect }
}
