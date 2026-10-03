import {
  ConditionInstruction,
  defineWorkflow,
  RunInstruction,
  TerminateInstruction,
  type WorkflowSourceAst,
} from '@nocobase/app-plugin-workflow';

// Every message an approval sends. The CRM service commits the change
// (submission, withdrawal, decision) and starts this workflow with the
// event and its recipient; the workflow is the only sender, so each
// message leaves a run that shows whether it went out and why not.
const notify = (
  key: string,
  title: string,
  event: string,
  description: string,
) =>
  RunInstruction.create({
    key,
    title,
    description,
    config: {
      module: './server/notify',
      args: {
        recordId: '{{$input.approvalId}}',
        recipientId: '{{$input.recipientId}}',
        actorId: '{{$input.actorId}}',
        event,
        at: '{{$input.at}}',
      },
    },
    result: {
      type: 'object',
      required: ['queued'],
      properties: { queued: { type: 'boolean' } },
      additionalProperties: false,
    },
  });

const workflow: WorkflowSourceAst = defineWorkflow({
  title: 'Approval notifications',
  description:
    'Notifies the approver when a request is submitted or withdrawn, and the applicant when it is approved or rejected. Administrators can switch notifications off in the parameters.',
  inputSchema: {
    type: 'object',
    required: ['approvalId', 'event', 'recipientId', 'actorId', 'at'],
    properties: {
      approvalId: { type: 'string', minLength: 1 },
      // The approval's new status, which names the message to send.
      event: {
        type: 'string',
        enum: ['pending', 'withdrawn', 'approved', 'rejected'],
      },
      recipientId: { type: 'string', minLength: 1 },
      actorId: { type: 'string', minLength: 1 },
      at: { type: 'string', minLength: 1 },
      opportunityId: { type: ['string', 'null'] },
    },
    additionalProperties: false,
  },
  parameters: {
    notify: {
      type: 'boolean',
      title: 'Send notifications',
      description:
        'When off, no in-app notification is sent when a request is submitted, withdrawn, approved or rejected.',
      default: true,
    },
  },
  nodes: [
    ConditionInstruction.create({
      key: 'shouldNotify',
      title: 'Notifications on?',
      description:
        'Whether to send any approval notification, as the administrator parameter says.',
      config: { module: './server/notify-enabled' },
    }).branch({
      yes: [],
      no: [
        TerminateInstruction.create({
          key: 'skipNotification',
          title: 'No notification',
          description:
            'Notifications are off: this run sends nothing and ends normally.',
          config: { outcome: 'success' },
        }),
      ],
    }),
    ConditionInstruction.create({
      key: 'decided',
      title: 'A decision?',
      description:
        'Approval and rejection are decisions, sent to the applicant; submission and withdrawal go to the approver.',
      config: { module: './server/is-decision' },
    }).branch({
      yes: [
        ConditionInstruction.create({
          key: 'approved',
          title: 'Approved?',
          description: "Branches on the approver's decision.",
          config: { module: './server/is-approved' },
        }).branch({
          yes: [
            notify(
              'notifyApproved',
              'Tell the applicant it was approved',
              'approved',
              'Sends the applicant "Request approved" through the CRM notification queue.',
            ),
          ],
          no: [
            notify(
              'notifyRejected',
              'Tell the applicant it was rejected',
              'rejected',
              'Sends the applicant "Request rejected" through the CRM notification queue.',
            ),
          ],
        }),
      ],
      no: [
        ConditionInstruction.create({
          key: 'submitted',
          title: 'A submission?',
          description:
            'A submission tells the approver of a new request; a withdrawal tells them it no longer needs a decision.',
          config: { module: './server/is-submitted' },
        }).branch({
          yes: [
            notify(
              'notifySubmitted',
              'Tell the approver of a new request',
              'pending',
              'Sends the approver "Approval requested" through the CRM notification queue.',
            ),
          ],
          no: [
            notify(
              'notifyWithdrawn',
              'Tell the approver it was withdrawn',
              'withdrawn',
              'Sends the approver "Request withdrawn" through the CRM notification queue.',
            ),
          ],
        }),
      ],
    }),
  ],
});

export default workflow;
