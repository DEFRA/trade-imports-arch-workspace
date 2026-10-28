import { createPlanRows, runCreate } from '../../commands/jira/create.js'
import { describePlanRows, runDescribe } from '../../commands/jira/describe.js'
import { issueKeySchema } from '../../commands/jira/issue-key.js'
import { rowValueText, writeOutcomeRows } from '../../commands/jira/plan.js'
import { runSearch } from '../../commands/jira/search.js'
import { runTicket, ticketRows } from '../../commands/jira/ticket.js'
import { ConfirmScreen } from '../common/confirm-screen.js'
import { InputScreen } from '../common/input-screen.js'
import { MenuScreen } from '../common/menu-screen.js'
import { ResultScreen } from '../common/result-screen.js'
import { SCREENS } from '../screens.js'

const ticketResultProps = (issue) => ({
  title: `${issue.key}  ${issue.summary}`,
  rows: ticketRows(issue),
  text: issue.description || '(no description)',
  wholeText: { command: `hedy jira ticket ${issue.key}`, whole: 'description' }
})

const searchResultProps = ({ issues, truncated }) => ({
  title: 'Issues',
  rows: issues.map(({ key, status, summary }) => [key, `${rowValueText(status)}  ${summary}`]),
  text: issues.length === 0 ? 'No issues match the query.' : '',
  note: truncated ? 'More issues match. Run hedy jira search with a higher --max to read them.' : ''
})

export const useJiraFeature = ({
  setScreen,
  setScreenData,
  showLoading,
  showErrors,
  navigateToMain,
  env,
  workspaceRoot,
  readIssue = ({ key }) => runTicket({ key: issueKeySchema.parse(key), env, workspaceRoot }),
  searchIssues = ({ jql, max }) => runSearch({ jql, max, env, workspaceRoot }),
  createIssue = ({ from, confirm }) => runCreate({ from, confirm, env, workspaceRoot }),
  describeIssue = ({ key, from, confirm }) => runDescribe({ key: issueKeySchema.parse(key), from, confirm, env, workspaceRoot })
}) => {
  const loadThenShow = async ({ message, load, screen, dataOf }) => {
    showLoading(message)
    try {
      setScreenData(dataOf(await load()))
      setScreen(screen)
    } catch (error) {
      showErrors(error)
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
        title: 'Jira',
        subtitle,
        label,
        placeholder,
        onSubmit: (value) => onSubmit(value, screenData),
        onCancel: navigateToMain
      })
    }
  })

  const confirmRoute = ({ title, planRows, dryRunCommand, question, message, write, resultScreen }) => ({
    component: ConfirmScreen,
    props: ({ plan, request }) => ({
      title,
      rows: planRows(plan),
      text: plan.description,
      wholeText: { command: dryRunCommand(request), whole: 'plan' },
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
      dryRunCommand: ({ from }) => `hedy jira create --from ${from}`,
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
      dryRunCommand: ({ key, from }) => `hedy jira describe ${key} --from ${from}`,
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
