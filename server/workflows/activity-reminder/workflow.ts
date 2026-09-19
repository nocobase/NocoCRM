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
  title: '活动开始提醒',
  description:
    '活动即将开始时，提醒负责人和内部参与人；提前多久由系统设置里的「活动提醒」决定。管理员可以在参数里关闭提醒。',
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
      title: '发送提醒',
      description: '关闭后，活动开始前不再发站内提醒。',
      default: true,
    },
  },
  nodes: [
    ConditionInstruction.create({
      key: 'shouldNotify',
      title: '是否开启提醒',
      description: '由管理员参数决定是否发送活动提醒。',
      config: {
        expression: { '===': [{ var: 'parameters.notify' }, true] },
      },
    }).branch({
      yes: [],
      no: [
        TerminateInstruction.create({
          key: 'skipReminder',
          title: '无需提醒',
          description: '提醒已关闭：本次运行不发消息，正常结束。',
          config: { outcome: 'success' },
        }),
      ],
    }),
    RunInstruction.create({
      key: 'remind',
      title: '发送活动提醒',
      description: '通过 CRM 通知队列给收件人发送「活动即将开始」。',
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
