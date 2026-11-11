import { createElement, useEffect, useState } from 'react'
import { Text } from 'ink'
import { ErrorScreen } from '../menu/common/error-screen.js'
import { LoadingScreen } from '../menu/common/loading-screen.js'
import { SCREENS } from '../menu/screens.js'
import { createTransitions } from '../menu/transitions.js'

/**
 * Renders one feature hook's routes for a test. The harness holds the screen
 * id, the screen data and the loading message in state, calls useFeature on
 * every render with setScreen, setScreenData, showLoading, showErrors,
 * navigateToMain and the options, calls onMount with the feature after the
 * first render, and renders the loading screen, the error screen with
 * screenData.errors, or the route for the current screen. A screen with no
 * route renders "unknown:<id>".
 *
 * @param {{
 *   useFeature: (parameters: object) => { routes: Record<string, { component: Function, props: object | ((screenData: object) => object) }> },
 *   initialScreen: string,
 *   options?: object,
 *   navigateToMain?: () => void,
 *   onMount?: (feature: object) => void
 * }} props
 */
export const FeatureHarness = ({ useFeature, initialScreen, options = {}, navigateToMain = () => {}, onMount }) => {
  const [screen, setScreen] = useState(initialScreen)
  const [screenData, setScreenData] = useState({})
  const [loadingMessage, setLoadingMessage] = useState('')
  const { showLoading, showErrors } = createTransitions({ setScreen, setScreenData, setLoadingMessage })
  const feature = useFeature({ setScreen, setScreenData, showLoading, showErrors, navigateToMain, ...options })

  useEffect(() => {
    onMount?.(feature)
  }, [])

  if (screen === SCREENS.LOADING) return createElement(LoadingScreen, { key: screen, message: loadingMessage })
  if (screen === SCREENS.ERROR) {
    return createElement(ErrorScreen, { key: screen, errors: screenData.errors ?? [], onReturn: navigateToMain })
  }
  const route = feature.routes[screen]
  if (route === undefined) return createElement(Text, null, `unknown:${screen}`)
  const props = typeof route.props === 'function' ? route.props(screenData) : route.props
  return createElement(route.component, { key: screen, ...props })
}
