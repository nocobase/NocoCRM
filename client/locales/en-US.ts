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
  // Display text of the CRM's AI skills (ai/skills/<name>): the title and
  // description of each SKILL.md, keyed by that English text as the AI
  // Employee plugin requires; the Chinese is SKILL-zh.md's.
  'Lead follow-up': 'Lead follow-up',
  'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".',
  'Opportunity follow-up': 'Opportunity follow-up',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".',
  'Approval review': 'Approval review',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".',
  'Task preparation': 'Task preparation',
  "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.":
    "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.",
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
