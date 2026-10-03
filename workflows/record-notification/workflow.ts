import {
  ConditionInstruction,
  defineWorkflow,
  RunInstruction,
  TerminateInstruction,
  type WorkflowSourceAst,
} from '@nocobase/app-plugin-workflow';

// The message a record change sends: to the new owner when a record
// changes hands, and to an activity's internal participants when they are
// invited, removed, rescheduled or told of a cancellation. The CRM service
// commits the change and starts this workflow with the event and its
// recipient; the workflow is the only sender.
const notify = (key: string, title: string, description: string) =>
  RunInstruction.create({
    key,
    title,
    description,
    config: {
      module: './server/notify',
      args: {
        entity: '{{$input.entity}}',
        recordId: '{{$input.recordId}}',
        recipientId: '{{$input.recipientId}}',
        actorId: '{{$input.actorId}}',
        event: '{{$input.event}}',
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
  title: 'Record change notifications',
  description:
    "Notifies the new owner when a record changes hands, and an activity's internal participants when they are invited or removed, or the activity is rescheduled or cancelled. Administrators can switch notifications off in the parameters.",
  inputSchema: {
    type: 'object',
    required: ['entity', 'recordId', 'recipientId', 'actorId', 'event', 'at'],
    properties: {
      entity: {
        type: 'string',
        enum: [
          'leads',
          'accounts',
          'contacts',
          'opportunities',
          'activities',
          'approvals',
        ],
      },
      recordId: { type: 'string', minLength: 1 },
      recipientId: { type: 'string', minLength: 1 },
      actorId: { type: 'string', minLength: 1 },
      event: {
        type: 'string',
        enum: ['assigned', 'invited', 'removed', 'rescheduled', 'cancelled'],
      },
      at: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
  parameters: {
    notify: {
      type: 'boolean',
      title: 'Send notifications',
      description:
        "When off, no in-app notification is sent for a change of owner or of an activity's participants.",
      default: true,
    },
  },
  nodes: [
    ConditionInstruction.create({
      key: 'shouldNotify',
      title: 'Notifications on?',
      description:
        'Whether to send any record change notification, as the administrator parameter says.',
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
      key: 'handoff',
      title: 'A change of owner?',
      description:
        "A change of owner goes to the new owner; every other event goes to the activity's participants.",
      config: { module: './server/is-handoff' },
    }).branch({
      yes: [
        notify(
          'notifyOwner',
          'Tell the new owner',
          'Sends the new owner "Assigned to you" through the CRM notification queue.',
        ),
      ],
      no: [
        notify(
          'notifyParticipant',
          "Tell the activity's participants",
          'Sends the participants an invitation, removal, rescheduling or cancellation message through the CRM notification queue.',
        ),
      ],
    }),
  ],
});

export default workflow;
