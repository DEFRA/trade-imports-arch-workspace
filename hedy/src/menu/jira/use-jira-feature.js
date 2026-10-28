import { createPlanRows, runCreate } from '../../commands/jira/create.js'
import { describePlanRows, runDescribe } from '../../commands/jira/describe.js'
import { rowValueText, writeOutcomeRows } from '../../commands/jira/plan.js'
import { runSearch } from '../../commands/jira/search.js'
import { runTicket, ticketRows } from '../../commands/jira/ticket.js'
import { toHedyErrors } from '../../errors.js'
import { ConfirmScreen } from '../common/confirm-screen.js'
import { InputScreen } from '../common/input-screen.js'
import { MenuScreen } from '../common/menu-screen.js'
import { ResultScreen } from '../common/result-screen.js'
import { SCREENS } from '../screens.js'
import { previewOf } from '../text-preview.js'

const PREVIEW_LINES = 20

const ticketResultProps = (issue) => {
  const { text, hiddenLines } = previewOf(issue.description || '(no description)', PREVIEW_LINES)
  return {
    title: `${issue.key}  ${issue.summary}`,
    rows: ticketRows(issue),
    text,
    note: hiddenLines > 0 ? `${hiddenLines} more lines. Run hedy jira ticket ${issue.key} to read the whole description.` : ''
  }
}

const searchResultProps = ({ issues, truncated }) => ({
  title: 'Issues',
  rows: issues.map(({ key, status, summary }) => [key, `${rowValueText(status)}  ${summary}`]),
  text: issues.length === 0 ? 'No issues match the query.' : '',
  note: truncated ? 'More issues match. Run hedy jira search with a higher --max to read them.' : ''
})

const planPreviewText = (description) => {
  const { text, hiddenLines } = previewOf(description, PREVIEW_LINES)
  return hiddenLines > 0 ? `${text}\n(${hiddenLines} more lines)` : text
}

export const useJiraFeature = ({
  setScreen,
  setScreenData,
  setLoadingMessage,
  navigateToMain,
  env,
  workspaceRoot,
  readIssue = ({ key }) => runTicket({ key, env, workspaceRoot }),
  searchIssues = ({ jql, max }) => runSearch({ jql, max, env, workspaceRoot }),
  createIssue = ({ from, confirm }) => runCreate({ from, confirm, env, workspaceRoot }),
  describeIssue = ({ key, from, confirm }) => runDescribe({ key, from, confirm, env, workspaceRoot })
}) => {
  const loadThenShow = async ({ message, load, screen, dataOf }) => {
    setLoadingMessage(message)
    setScreen(SCREENS.LOADING)
    try {
      setScreenData(dataOf(await load()))
      setScreen(screen)
    } catch (error) {
      setScreenData({ errors: toHedyErrors(error) })
      setScreen(SCREENS.ERROR)
    }
  }

  const readTicket = (key) => loadThenShow({
    message: `Reading ${key}`,
    load: () => readIssue({ key }),
    screen: SCREENS.JIRA_TICKET_RESULT,
    dataOf: (issue) => ({ issue })
  })

  const search = (jql) => loadThenShow({
    message: 'Searching Jira',
    load: () => searchIssues({ jql, max: 20 }),
    screen: SCREENS.JIRA_SEARCH_RESULT,
    dataOf: (found) => ({ found })
  })

  const planWrite = ({ message, write, request, screen }) => loadThenShow({
    message,
    load: () => write(request),
    screen,
    dataOf: (plan) => ({ plan, request })
  })

  const confirmWrite = ({ message, write, request, plan, screen }) => loadThenShow({
    message,
    load: () => write({ ...request, confirm: plan.planId }),
    screen,
    dataOf: (outcome) => ({ outcome })
  })

  const openItem = (value) => {
    const inputScreens = {
      ticket: SCREENS.JIRA_TICKET_INPUT,
      search: SCREENS.JIRA_SEARCH_INPUT,
      create: SCREENS.JIRA_CREATE_INPUT,
      describe: SCREENS.JIRA_DESCRIBE_KEY_INPUT
    }
    if (value === 'back') navigateToMain()
    else setScreen(inputScreens[value])
  }

  const keepKeyForFile = (key) => {
    setScreenData({ key })
    setScreen(SCREENS.JIRA_DESCRIBE_FILE_INPUT)
  }

  const inputRoute = (screen, { subtitle, label, placeholder, onSubmit }) => ({
    [screen]: {
      component: InputScreen,
      props: (screenData) => ({
        key: screen,
        title: 'Jira',
        subtitle,
        label,
        placeholder,
        onSubmit: (value) => onSubmit(value, screenData),
        onCancel: navigateToMain
      })
    }
  })

  const confirmRoute = ({ title, planRows, question, message, write, resultScreen }) => ({
    component: ConfirmScreen,
    props: ({ plan, request }) => ({
      title,
      rows: planRows(plan),
      text: planPreviewText(plan.description),
      question,
      onConfirm: () => confirmWrite({ message, write, request, plan, screen: resultScreen }),
      onCancel: navigateToMain
    })
  })

  const outcomeRoute = (title) => ({
    component: ResultScreen,
    props: ({ outcome }) => ({ title, rows: writeOutcomeRows(outcome), onReturn: navigateToMain })
  })

  const routes = {
    [SCREENS.JIRA_MENU]: {
      component: MenuScreen,
      props: {
        title: 'Jira',
        subtitle: 'Choose what to do',
        items: [
          { label: 'Read an issue', value: 'ticket' },
          { label: 'Search issues', value: 'search' },
          { label: 'Create an issue from a manifest', value: 'create' },
          { label: "Replace an issue's description", value: 'describe' },
          { label: 'Back', value: 'back' }
        ],
        onSelect: openItem
      }
    },
    ...inputRoute(SCREENS.JIRA_TICKET_INPUT, {
      subtitle: 'Read an issue',
      label: 'Issue key',
      placeholder: 'EUDPA-123',
      onSubmit: readTicket
    }),
    [SCREENS.JIRA_TICKET_RESULT]: {
      component: ResultScreen,
      props: ({ issue }) => ({ ...ticketResultProps(issue), onReturn: navigateToMain })
    },
    ...inputRoute(SCREENS.JIRA_SEARCH_INPUT, {
      subtitle: 'Search issues',
      label: 'JQL query',
      placeholder: 'project = EUDPA ORDER BY created DESC',
      onSubmit: search
    }),
    [SCREENS.JIRA_SEARCH_RESULT]: {
      component: ResultScreen,
      props: ({ found }) => ({ ...searchResultProps(found), onReturn: navigateToMain })
    },
    ...inputRoute(SCREENS.JIRA_CREATE_INPUT, {
      subtitle: 'Create an issue from a manifest',
      label: 'Manifest path',
      placeholder: '.claude/workareas/jira/<slug>/ticket.json',
      onSubmit: (from) => planWrite({
        message: 'Reading the manifest',
        write: createIssue,
        request: { from },
        screen: SCREENS.JIRA_CREATE_CONFIRM
      })
    }),
    [SCREENS.JIRA_CREATE_CONFIRM]: confirmRoute({
      title: 'Create an issue',
      planRows: createPlanRows,
      question: 'Create the issue?',
      message: 'Creating the issue',
      write: createIssue,
      resultScreen: SCREENS.JIRA_CREATE_RESULT
    }),
    [SCREENS.JIRA_CREATE_RESULT]: outcomeRoute('Create an issue'),
    ...inputRoute(SCREENS.JIRA_DESCRIBE_KEY_INPUT, {
      subtitle: "Replace an issue's description",
      label: 'Issue key',
      placeholder: 'EUDPA-123',
      onSubmit: keepKeyForFile
    }),
    ...inputRoute(SCREENS.JIRA_DESCRIBE_FILE_INPUT, {
      subtitle: "Replace an issue's description",
      label: 'Description file',
      placeholder: '.claude/workareas/jira/<key>/description.jira.txt',
      onSubmit: (from, { key }) => planWrite({
        message: `Reading ${key}`,
        write: describeIssue,
        request: { key, from },
        screen: SCREENS.JIRA_DESCRIBE_CONFIRM
      })
    }),
    [SCREENS.JIRA_DESCRIBE_CONFIRM]: confirmRoute({
      title: 'Replace the description',
      planRows: describePlanRows,
      question: 'Replace the description?',
      message: 'Replacing the description',
      write: describeIssue,
      resultScreen: SCREENS.JIRA_DESCRIBE_RESULT
    }),
    [SCREENS.JIRA_DESCRIBE_RESULT]: outcomeRoute('Replace the description')
  }

  const handleMainMenuSelect = () => setScreen(SCREENS.JIRA_MENU)

  return { routes, handleMainMenuSelect }
}
