import { pageRows, runPage } from '../../commands/confluence/page.js'
import { renderPublish, runPublish } from '../../commands/confluence/publish.js'
import { runAction } from '../../run-action.js'
import { ConfirmScreen } from '../common/confirm-screen.js'
import { InputScreen } from '../common/input-screen.js'
import { MenuScreen } from '../common/menu-screen.js'
import { ResultScreen } from '../common/result-screen.js'
import { SCREENS } from '../screens.js'

const pageResultProps = ({ page, reference }, navigateToMain) => ({
  title: page.title,
  rows: pageRows(page),
  text: page.body,
  wholeText: { command: `hedy confluence page ${reference}`, whole: 'page' },
  onReturn: navigateToMain
})

const confluenceLineOf = (existing) =>
  existing === undefined
    ? 'holds no page with this title; the publisher will create it'
    : `holds the page at ${existing.url}; the publisher will update it`

const publishConfirmProps = ({ facts, onConfirm, onCancel }) => ({
  title: 'Publish a page',
  rows: [
    ['Page', facts.page],
    ['Title', facts.title],
    ['Space', facts.space],
    ['Confluence', confluenceLineOf(facts.existing)]
  ],
  question: 'Publish the page?',
  onConfirm,
  onCancel
})

/**
 * Returns the Confluence group's routes and the main menu's select handler.
 * io is { stdout, stderr, setExitCode }. detach() leaves Ink and returns
 * settle(code). A publish the person confirms calls detach() before the
 * publisher runs, prints the outcome through runAction as the command
 * prints it, and gives settle the exit code runAction sets.
 */
export const useConfluenceFeature = ({
  setScreen,
  setScreenData,
  showLoading,
  showErrors,
  navigateToMain,
  env,
  workspaceRoot,
  io,
  detach,
  readPage = ({ reference }) => runPage({ reference, env, workspaceRoot }),
  publishPage = ({ page, confirm }) => runPublish({ page, env, workspaceRoot, stderr: io.stderr, confirm })
}) => {
  const readAndShowPage = async (reference) => {
    showLoading('Reading the page')
    try {
      const page = await readPage({ reference })
      setScreenData({ page, reference })
      setScreen(SCREENS.CONFLUENCE_PAGE_RESULT)
    } catch (error) {
      showErrors(error)
    }
  }

  const askToPublish = (facts, { leaveInk }) => new Promise((resolve) => {
    setScreenData({
      facts,
      onConfirm: () => {
        leaveInk()
        resolve(true)
      },
      onCancel: () => resolve(false)
    })
    setScreen(SCREENS.CONFLUENCE_PUBLISH_CONFIRM)
  })

  const showUnsentOutcome = (outcome) => outcome.status === 'rejected' ? showErrors(outcome.reason) : navigateToMain()

  const printOutcome = (outcome) => runAction(
    () => outcome.status === 'rejected' ? Promise.reject(outcome.reason) : outcome.value,
    { render: renderPublish, ...io }
  )

  const publishAndReport = async (page) => {
    showLoading('Checking the page')
    let settle
    const confirm = (facts) => askToPublish(facts, { leaveInk: () => { settle = detach() } })
    const [outcome] = await Promise.allSettled([publishPage({ page, confirm })])
    if (settle === undefined) showUnsentOutcome(outcome)
    else settle(await printOutcome(outcome))
  }

  const handleConfluenceSelect = (value) => {
    if (value === 'back') navigateToMain()
    else setScreen(value === 'page' ? SCREENS.CONFLUENCE_PAGE_INPUT : SCREENS.CONFLUENCE_PUBLISH_INPUT)
  }

  const handleMainMenuSelect = () => setScreen(SCREENS.CONFLUENCE_MENU)

  const routes = {
    [SCREENS.CONFLUENCE_MENU]: {
      component: MenuScreen,
      props: {
        title: 'Confluence',
        subtitle: 'Choose what to do',
        items: [
          { label: 'Read a page', value: 'page' },
          { label: 'Publish a docs page', value: 'publish' },
          { label: 'Back', value: 'back' }
        ],
        onSelect: handleConfluenceSelect
      }
    },
    [SCREENS.CONFLUENCE_PAGE_INPUT]: {
      component: InputScreen,
      props: {
        title: 'Confluence',
        subtitle: 'Read a page',
        label: 'Page id, URL or share link',
        placeholder: '123456',
        onSubmit: readAndShowPage,
        onCancel: navigateToMain
      }
    },
    [SCREENS.CONFLUENCE_PAGE_RESULT]: {
      component: ResultScreen,
      props: (screenData) => pageResultProps(screenData, navigateToMain)
    },
    [SCREENS.CONFLUENCE_PUBLISH_INPUT]: {
      component: InputScreen,
      props: {
        title: 'Confluence',
        subtitle: 'Publish a docs page',
        label: 'Page path',
        placeholder: 'docs/systems/<system>/<folder>/<page>.md',
        onSubmit: publishAndReport,
        onCancel: navigateToMain
      }
    },
    [SCREENS.CONFLUENCE_PUBLISH_CONFIRM]: {
      component: ConfirmScreen,
      props: publishConfirmProps
    }
  }

  return { routes, handleMainMenuSelect }
}
