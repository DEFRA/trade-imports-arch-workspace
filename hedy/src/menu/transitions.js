import { toHedyErrors } from '../errors.js'
import { faultContextOf } from '../fault-context.js'
import { SCREENS } from './screens.js'

/**
 * Returns showLoading(message), which sets the loading message and shows the
 * loading screen, and showErrors(error), which sets the screen data to
 * { errors } from toHedyErrors(error) and shows the error screen. A fault in
 * hedy holds its triage report, built from faultContext().
 *
 * @param {{
 *   setScreen: (screen: string) => void, setScreenData: (screenData: object) => void,
 *   setLoadingMessage: (message: string) => void, faultContext?: () => ReturnType<typeof faultContextOf>
 * }} setters
 * @returns {{ showLoading: (message: string) => void, showErrors: (error: unknown) => void }}
 */
export const createTransitions = ({ setScreen, setScreenData, setLoadingMessage, faultContext = () => faultContextOf() }) => ({
  showLoading: (message) => {
    setLoadingMessage(message)
    setScreen(SCREENS.LOADING)
  },
  showErrors: (error) => {
    setScreenData({ errors: toHedyErrors(error, faultContext()) })
    setScreen(SCREENS.ERROR)
  }
})
