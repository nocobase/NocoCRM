import type { WorkflowHandlerContext } from '@nocobase/app-plugin-workflow';

// The submitted condition: a submission, rather than a withdrawal.
export function run({ input }: WorkflowHandlerContext): boolean {
  return input.event === 'pending';
}
