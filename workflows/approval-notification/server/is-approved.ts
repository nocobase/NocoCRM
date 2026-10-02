import type { WorkflowHandlerContext } from '@nocobase/app-plugin-workflow';

// The approved condition: whether the approver approved.
export function run({ input }: WorkflowHandlerContext): boolean {
  return input.event === 'approved';
}
