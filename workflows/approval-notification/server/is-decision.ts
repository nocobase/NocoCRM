import type { WorkflowHandlerContext } from '@nocobase/app-plugin-workflow';

// The decided condition: an approval or a rejection, which goes to the
// applicant; a submission or a withdrawal goes to the approver.
export function run({ input }: WorkflowHandlerContext): boolean {
  return input.event === 'approved' || input.event === 'rejected';
}
