import {
  ConditionInstruction,
  defineWorkflow,
  RunInstruction,
  TerminateInstruction,
  type WorkflowSourceAst,
} from '@nocobase/app-plugin-workflow';

// The reminder an activity sends shortly before it starts, to its owner
// and each internal participant. The CRM's scheduled scan finds the
// activities due and starts one run per recipient, keyed by the activity,
// its start and the recipient, so a later scan of the same activity starts
// nothing new; the workflow is the only sender.
const workflow: WorkflowSourceAst = defineWorkflow({
  title: 'Activity reminder',
  description:
    'Reminds the owner and the internal participants that an activity is about to start; how far ahead follows the "Activity reminder" system setting. Administrators can switch reminders off in the parameters.',
  inputSchema: {
    type: 'object',
    required: ['activityId', 'recipientId', 'startAt'],
    properties: {
      activityId: { type: 'string', minLength: 1 },
      recipientId: { type: 'string', minLength: 1 },
      startAt: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
  parameters: {
    notify: {
      type: 'boolean',
      title: 'Send reminders',
      description:
        'When off, no in-app reminder is sent before an activity starts.',
      default: true,
    },
  },
  nodes: [
    ConditionInstruction.create({
      key: 'shouldNotify',
      title: 'Reminders on?',
      description:
        'Whether to send activity reminders, as the administrator parameter says.',
      config: { module: './server/notify-enabled' },
    }).branch({
      yes: [],
      no: [
        TerminateInstruction.create({
          key: 'skipReminder',
          title: 'No reminder',
          description:
            'Reminders are off: this run sends nothing and ends normally.',
          config: { outcome: 'success' },
        }),
      ],
    }),
    RunInstruction.create({
      key: 'remind',
      title: 'Send the activity reminder',
      description:
        'Sends the recipient "Upcoming activity" through the CRM notification queue.',
      config: {
        module: './server/remind',
        args: {
          recordId: '{{$input.activityId}}',
          recipientId: '{{$input.recipientId}}',
          actorId: 'system',
          event: 'starting',
          at: '{{$input.startAt}}',
        },
      },
      result: {
        type: 'object',
        required: ['queued'],
        properties: { queued: { type: 'boolean' } },
        additionalProperties: false,
      },
    }),
  ],
});

export default workflow;
