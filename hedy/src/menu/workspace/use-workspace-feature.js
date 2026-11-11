import { checkRows, checkSummary, runWorkspaceCheck } from '../../commands/workspace/check.js'
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
      const result = await checkWorkspace()
      setScreenData({ title: checkSummary(result), rows: checkRows(result) })
      setScreen(SCREENS.WORKSPACE_RESULT)
    } catch (error) {
      showErrors(error)
    }
  }

  const routes = {
    [SCREENS.WORKSPACE_RESULT]: {
      component: ResultScreen,
      props: ({ title, rows }) => ({ title, rows, onReturn: navigateToMain })
    }
  }

  return { routes, handleMainMenuSelect }
}
