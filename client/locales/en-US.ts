import type { LocaleResource } from '@nocobase/i18n';
import { crmEn } from './crm/index.js';

import authUi from '../extensions/nocobase-auth-ui/locales/en-US.js';

const messages = {
  crm: crmEn,
  'auth.welcome': 'Welcome back',
  'auth.loginDescription': 'Sign in with your username or email and password.',
  'auth.forgotTitle': 'Forgot password',
  'auth.forgotDescription':
    'Enter your email and we will send a reset link if the account exists.',
  'auth.resetDescription': 'Choose a new password for your account.',
  'status.loading': 'Loading',
  'status.loadingPage': 'Loading page',
  'status.loadingSettings': 'Loading settings',
  'status.loadingDev': 'Loading dev tools',
  'status.denied': 'Access denied',
  'status.pageFailed': 'Unable to load page',
  'status.retry': 'Retry',
  // Display text of the CRM's AI tools (server/ai/tools), keyed by their
  // English source text as the AI Employee plugin requires.
  'Search CRM records': 'Search CRM records',
  'Finds leads, accounts, contacts, opportunities, activities and approvals the current user may read, a page at a time.':
    'Finds leads, accounts, contacts, opportunities, activities and approvals the current user may read, a page at a time.',
  'Read a CRM record': 'Read a CRM record',
  'Reads one record in full, with its change history, related records and what the current user may do to it.':
    'Reads one record in full, with its change history, related records and what the current user may do to it.',
  'Create a CRM record': 'Create a CRM record',
  'Creates a lead, account, contact, opportunity, activity or approval once the user confirms the values.':
    'Creates a lead, account, contact, opportunity, activity or approval once the user confirms the values.',
  'Update a CRM record': 'Update a CRM record',
  'Changes the fields of an existing record once the user confirms the new values.':
    'Changes the fields of an existing record once the user confirms the new values.',
  'Delete a CRM record': 'Delete a CRM record',
  'Deletes one record once the user confirms; it cannot be undone.':
    'Deletes one record once the user confirms; it cannot be undone.',
  'Convert a lead': 'Convert a lead',
  'Turns a lead into an account and a contact, optionally with an opportunity, once the user confirms.':
    'Turns a lead into an account and a contact, optionally with an opportunity, once the user confirms.',
  'Decide on an approval': 'Decide on an approval',
  'Submits, withdraws, approves or rejects an approval request once the user confirms.':
    'Submits, withdraws, approves or rejects an approval request once the user confirms.',
  'List CRM users': 'List CRM users',
  'Lists the users who hold a CRM role, with their ids, so a record can be given an owner or an approver by name.':
    'Lists the users who hold a CRM role, with their ids, so a record can be given an owner or an approver by name.',
  'navigation.brandHome': 'NocoCRM home',
  'navigation.brandApps': 'NocoBase applications',
  'routeOverlay.close': 'Close',
  'status.deniedDescription': 'You do not have permission to access {{label}}.',
  'status.routeFailedDescription':
    'Route {{label}} from {{packageName}} could not be loaded.',
  shell: {
    workspace: 'AI application workspace',
    buildFreely: 'AI builds freely.',
    reliability: '<brand>NocoBase</brand> keeps it reliable.',
  },
  surface: {
    backToApp: 'Back to app',
    loading: 'Loading {{title}}',
    navigation: '{{title}} navigation',
    page: '{{title}} page',
  },
  settings: {
    title: 'Settings',
    emptyTitle: 'No settings available',
    emptyDescription:
      'No enabled plugin contributes a settings page you have access to.',
  },
  dev: {
    componentExamples: 'Component examples',
    title: 'Dev tools',
    emptyTitle: 'No dev tools available',
    emptyDescription:
      'No enabled plugin contributes a dev page you have access to.',
  },
  home: {
    title: 'Start building your application',
    description:
      'Describe what you need to your AI Agent, then build pages, data models, and business workflows.',
  },

  appearance: {
    title: 'Appearance',
    mode: 'Color mode',
    preset: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    themes: { default: 'Spacious', compact: 'Compact' },
  },
  app: {
    title: 'NocoCRM',
  },
  actions: {
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    language: 'Language',
  },
  notices: {
    serverLocaleFallback:
      'The server does not support this language, so server messages will use English.',
    languageChangeFailed:
      'Unable to complete the language change. Please try again.',
  },
  account: {
    signOutFailed: 'Unable to sign out. Please try again.',
    openMenu: 'Open account menu',
    fallback: 'Account',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
  },
  navigation: {
    home: 'Overview',
    open: 'Open navigation',
    close: 'Close navigation',
    expand: 'Expand navigation',
    collapse: 'Collapse navigation',
    label: 'Application navigation',
    breadcrumb: 'Breadcrumb',
    back: 'Back',
  },
};

const enUS: typeof authUi & typeof messages = { ...authUi, ...messages };

/**
 * The shape every locale of this application follows, derived from the English wording above.
 *
 * Anything a plugin does not translate falls back to this namespace, so a term defined here is reused everywhere
 * without each plugin repeating it.
 */
export type AppResource = LocaleResource<typeof enUS>;

export default enUS;
