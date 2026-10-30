import type { ApplicationServiceProviderConstructor } from '@nocobase/app-server/application';

import CrmProvider from './crm/index.js';
import CrmAgentsProvider from './crm-agents/index.js';
import LifecycleProvider from './lifecycles.js';
import DemoModeProvider from './demo-mode.js';
import SubmissionProvider from './submission.js';

// Application change: the template's user-roles provider is replaced by the
// CRM's own role scope, registered by CrmProvider (server/providers/crm/user-roles.ts).
const serviceProviders: readonly ApplicationServiceProviderConstructor[] = [
  // Operation keys on standard writes (template 1.0.0-beta.84).
  SubmissionProvider,
  DemoModeProvider,
  // The record lifecycles' runtime, which the CRM's approvals move by.
  LifecycleProvider,
  CrmProvider,
  CrmAgentsProvider,
];

export default serviceProviders;
