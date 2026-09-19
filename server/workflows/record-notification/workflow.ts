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
  title: '记录变更通知',
  description:
    '记录更换负责人时通知新负责人；活动的内部参与人被邀请、移除、改期或活动取消时通知参与人。管理员可以在参数里关闭通知。',
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
      title: '发送通知',
      description: '关闭后，负责人变更和活动参与人变动都不再发站内通知。',
      default: true,
    },
  },
  nodes: [
    ConditionInstruction.create({
      key: 'shouldNotify',
      title: '是否开启通知',
      description: '由管理员参数决定是否发送任何记录变更通知。',
      config: {
        expression: { '===': [{ var: 'parameters.notify' }, true] },
      },
    }).branch({
      yes: [],
      no: [
        TerminateInstruction.create({
          key: 'skipNotification',
          title: '无需通知',
          description: '通知已关闭：本次运行不发消息，正常结束。',
          config: { outcome: 'success' },
        }),
      ],
    }),
    ConditionInstruction.create({
      key: 'handoff',
      title: '是否为负责人变更',
      description: '负责人变更通知新负责人；其余事件通知活动参与人。',
      config: {
        expression: { '===': [{ var: 'input.event' }, 'assigned'] },
      },
    }).branch({
      yes: [
        notify(
          'notifyOwner',
          '通知新负责人',
          '通过 CRM 通知队列给新负责人发送「已分配给你」。',
        ),
      ],
      no: [
        notify(
          'notifyParticipant',
          '通知活动参与人',
          '通过 CRM 通知队列给参与人发送邀请、移除、改期或取消消息。',
        ),
      ],
    }),
  ],
});

export default workflow;
