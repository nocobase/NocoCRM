import type { WorkflowHandlerContext } from '@nocobase/app-plugin-workflow';

// The shouldNotify condition: whether the administrator left this
// workflow's messages on. A missing parameter counts as off, as the
// former `parameters.notify === true` expression did.
export function run({ parameters }: WorkflowHandlerContext): boolean {
  return parameters.notify === true;
}
