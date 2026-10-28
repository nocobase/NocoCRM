import { entities } from '../providers/crm/schema.js';

// The paths these routes own, which the guard (context.ts) is installed on.
export const WORKSPACE_PATHS = [
  'workspace',
  'systemSettings',
  'demoData',
  'approvalLifecycle',
  'approverRule',
  'geography',
  'search',
  'dashboard',
  'decisions',
  'notices',
  'aiAgents',
  'attachments',
  'mailTimeline',
  'colleagues',
  'searchAnswers',
  'duplicateCheck',
];

// Shared by route authorization and the plugin's external-effects guard.
export const CRM_PATHS = [
  ...entities,
  'comments',
  'plans',
  'signals',
  'whatsapp',
  ...WORKSPACE_PATHS,
];
