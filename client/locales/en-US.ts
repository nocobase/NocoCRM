import type { LocaleResource } from '@nocobase/i18n';
import { crmEn } from './crm/index.js';

const enUS = {
  crm: crmEn,
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
    themes: { default: 'Default', compact: 'Compact' },
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
  auth: {
    brand: 'NocoBase',
    panel: {
      label: 'About this application',
      eyebrow: 'AI-native application platform',
      heading: 'Let AI build freely.\nNocoBase keeps it\nreliable.',
      body: 'Give AI a flexible frontend framework to shape each experience, while NocoBase secures the data, permissions, workflows and governance underneath.',
      frontendTitle: 'AI-native frontend',
      frontendBody: 'Compose interfaces freely on a flexible framework.',
      foundationTitle: 'NocoBase foundation',
      foundationBody:
        'Reliable data, access control, workflows and governance.',
      footer: 'Freedom above. Confidence below.',
    },
    login: {
      title: 'Welcome back',
      description: 'Sign in with your username or email and password.',
      identifier: 'Username or email',
      password: 'Password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      submit: 'Sign in',
      submitting: 'Signing in…',
      forgot: 'Forgot password?',
      register: 'Sign up',
    },
    register: {
      title: 'Create an account',
      description: 'Create an account to get started.',
      name: 'Name',
      username: 'Username',
      email: 'Email',
      password: 'Password',
      confirm: 'Confirm password',
      mismatch: "Passwords don't match.",
      submit: 'Create account',
      submitting: 'Creating account…',
      haveAccount: 'Already have an account?',
      signIn: 'Sign in',
    },
    forgot: {
      title: 'Forgot password',
      description:
        'Enter your email and we will send a reset link if the account exists.',
      email: 'Email',
      sent: 'If the account exists, a reset link has been sent.',
      submit: 'Send reset link',
      submitting: 'Sending…',
      remember: 'Remember your password?',
      signIn: 'Sign in',
    },
    reset: {
      title: 'Reset password',
      description: 'Choose a new password for your account.',
      password: 'New password',
      confirm: 'Confirm new password',
      invalid: 'This password reset link is invalid or has expired.',
      mismatch: "Passwords don't match.",
      submit: 'Reset password',
      submitting: 'Resetting…',
      back: 'Return to',
      signIn: 'sign in',
    },
  },
  navigation: {
    home: 'Overview',
    open: 'Open navigation',
    close: 'Close navigation',
    expand: 'Expand navigation',
    collapse: 'Collapse navigation',
    label: 'Application navigation',
    breadcrumb: 'Breadcrumb',
  },
};

/**
 * The shape every locale of this application follows, derived from the English wording above.
 *
 * Anything a plugin does not translate falls back to this namespace, so a term defined here is reused everywhere
 * without each plugin repeating it.
 */
export type AppResource = LocaleResource<typeof enUS>;

export default enUS;
