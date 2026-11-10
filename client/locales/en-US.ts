import fileUi from '../extensions/nocobase-file-component-ui/locales/en-US.js';
import type { LocaleResource } from '@nocobase/i18n';

import { crmEn } from './crm/index.js';
import systemEnUS from './system/en-US.js';

const enUS = {
  // The template's own copy: the shell, the sign-in pages, shared components and the homepage. Keep it in
  // `./system/` so a template upgrade can replace it without touching the application's copy below.
  ...systemEnUS,
  ...fileUi,
  settings: {
    ...systemEnUS.settings,
    usersDescription:
      'Manage accounts, roles and sessions. New accounts start with Member selected; you can replace or remove it. Accounts without roles retain account basics only.',
  },
  // The application's copy goes here, one group per feature. A shared group such as `navigation` is extended by
  // spreading the system one first, `navigation: { ...systemEnUS.navigation, orders: 'Orders' }`, since a group
  // written here replaces the system group of the same name rather than merging with it.
  // The CRM's own copy, in its namespace (`crm`).
  crm: crmEn,
  'navigation.brandHome': 'NocoCRM home',
  'navigation.brandApps': 'NocoBase applications',
  app: { ...systemEnUS.app, title: 'NocoCRM' },
  // The sign-in page's right side (client/pages/auth/activity-panel.tsx):
  // one customer's way from a lead to a closed deal. Sample content.
  // The UI Library's flow diagram (client/components/flow-diagram.tsx), which
  // the approval process page draws with.
  flowDiagram: {
    ...systemEnUS.flowDiagram,
    empty: 'No states to display.',
    loading: 'Laying out the diagram…',
    failed: 'Unable to lay out this diagram.',
    nodeHelp: 'Press Enter or Space to select a state.',
    edgeHelp: 'Press Enter or Space to select a transition.',
  },
  loginActivity: {
    heading: 'From the first lead to the signed deal.',
    description:
      'Your AI sales team follows up every lead and opportunity, prepares every meeting and every approval, and you make the call.',
    phases: { lead: 'Lead', deal: 'Opportunity', won: 'Closed' },
    participants: {
      rep: 'Sophie Bennett',
      leadAgent: 'AI lead follow-up',
      prepAgent: 'AI task assistant',
      dealAgent: 'AI opportunity follow-up',
      approvalAgent: 'AI approval review',
      manager: 'Daniel Brooks',
      customer: 'Emma Walsh',
    },
    capabilities: {
      capture: 'AI capture',
      followUp: 'AI follow-up',
      pipeline: 'Pipeline',
      prep: 'Task preparation',
      mail: 'Mail',
      approval: 'Approvals',
    },
    timeline: 'Timeline',
    lead: {
      kind: 'Lead',
      title: 'Emma Walsh / Northwind Logistics',
      need: 'Fleet dispatch, 200 trucks · from an email',
      grade: 'Grade A',
    },
    deal: {
      kind: 'Opportunity',
      title: 'Fleet dispatch platform (Enterprise)',
      company: 'Northwind Logistics',
      amount: '$48,000',
      owner: 'Sophie Bennett',
      won: 'Won',
    },
    leadStatuses: { new: 'New', working: 'Working', converted: 'Converted' },
    stages: {
      qualification: 'Qualification',
      proposal: 'Proposal',
      negotiation: 'Negotiation',
      won: 'Won',
    },
    steps: {
      captured: { who: 'AI', what: 'organised the lead out of an email' },
      leadFollowUp: {
        who: 'AI follow-up',
        what: 'grade A, call today at 3 pm',
      },
      converted: {
        who: 'Sophie Bennett',
        what: 'converted the lead into an opportunity',
      },
      prepared: {
        who: 'AI',
        what: "prepared tomorrow's demo on their own routes",
      },
      replied: {
        who: 'Emma Walsh',
        what: 'could we pay 60 days after the invoice?',
      },
      dealFollowUp: {
        who: 'AI follow-up',
        what: 'on to negotiation; 60 days needs approval',
      },
      reviewed: { who: 'AI review', what: 'approve on conditions' },
      approved: { who: 'Daniel Brooks', what: 'approved the 60-day terms' },
      won: { who: 'Sophie Bennett', what: 'the signed contract is back' },
    },
  },
  // A list's Filters menu and its chips (client/components/filter-menu.tsx).
  listToolbar: {
    filters: 'Filters',
    filtersApplied: 'Filters ({{count}} applied)',
    removeFilter: 'Remove the {{name}} filter',
    clear: 'Clear filters',
    keyword: 'Keyword',
    noMatches: 'No matches',
    searchPeople: 'Search people',
  },
  navigation: { ...systemEnUS.navigation, home: 'Overview' },
};

/**
 * The shape every locale of this application follows, derived from the English wording above.
 *
 * Anything a plugin does not translate falls back to this namespace, so a term defined here is reused everywhere
 * without each plugin repeating it.
 */
export type AppResource = LocaleResource<typeof enUS>;

export default enUS;
