import { toHedyErrors } from '../errors.js'
import { SCREENS } from './screens.js'

/**
 * Returns showLoading(message), which sets the loading message and shows the
 * loading screen, and showErrors(error), which sets the screen data to
 * { errors } from toHedyErrors(error) and shows the error screen.
 *
 * @param {{ setScreen: (screen: string) => void, setScreenData: (screenData: object) => void, setLoadingMessage: (message: string) => void }} setters
 * @returns {{ showLoading: (message: string) => void, showErrors: (error: unknown) => void }}
 */
export const createTransitions = ({ setScreen, setScreenData, setLoadingMessage }) => ({
  showLoading: (message) => {
    setLoadingMessage(message)
    setScreen(SCREENS.LOADING)
  },
  showErrors: (error) => {
    setScreenData({ errors: toHedyErrors(error) })
    setScreen(SCREENS.ERROR)
  }
})
