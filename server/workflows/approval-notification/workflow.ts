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
        approvalId: '{{$input.approvalId}}',
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
  title: '审批通知',
  description:
    '审批提交或撤回时通知审批人，通过或驳回时通知申请人；管理员可以在参数里关闭通知。',
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
      title: '发送通知',
      description: '关闭后，审批的提交、撤回、通过、驳回都不再发站内通知。',
      default: true,
    },
  },
  nodes: [
    ConditionInstruction.create({
      key: 'shouldNotify',
      title: '是否开启通知',
      description: '由管理员参数决定是否发送任何审批通知。',
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
      key: 'decided',
      title: '是否为审批结果',
      description: '通过和驳回是结果，通知申请人；提交和撤回通知审批人。',
      config: {
        expression: { in: [{ var: 'input.event' }, ['approved', 'rejected']] },
      },
    }).branch({
      yes: [
        ConditionInstruction.create({
          key: 'approved',
          title: '是否通过',
          description: '按审批人的决定分支。',
          config: {
            expression: { '===': [{ var: 'input.event' }, 'approved'] },
          },
        }).branch({
          yes: [
            notify(
              'notifyApproved',
              '通知申请人已通过',
              'approved',
              '通过 CRM 通知队列给申请人发送「审批已通过」。',
            ),
          ],
          no: [
            notify(
              'notifyRejected',
              '通知申请人已驳回',
              'rejected',
              '通过 CRM 通知队列给申请人发送「审批已拒绝」。',
            ),
          ],
        }),
      ],
      no: [
        ConditionInstruction.create({
          key: 'submitted',
          title: '是否为提交',
          description: '提交通知审批人有新申请，撤回通知审批人不必再处理。',
          config: {
            expression: { '===': [{ var: 'input.event' }, 'pending'] },
          },
        }).branch({
          yes: [
            notify(
              'notifySubmitted',
              '通知审批人有新申请',
              'pending',
              '通过 CRM 通知队列给审批人发送「待审批申请」。',
            ),
          ],
          no: [
            notify(
              'notifyWithdrawn',
              '通知审批人申请已撤回',
              'withdrawn',
              '通过 CRM 通知队列给审批人发送「审批已撤回」。',
            ),
          ],
        }),
      ],
    }),
  ],
});

export default workflow;
