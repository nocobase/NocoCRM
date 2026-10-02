import type { WorkflowHandlerContext } from '@nocobase/app-plugin-workflow';

// The handoff condition: a record changing hands, which goes to its new
// owner; every other event goes to the activity's participants.
export function run({ input }: WorkflowHandlerContext): boolean {
  return input.event === 'assigned';
}
