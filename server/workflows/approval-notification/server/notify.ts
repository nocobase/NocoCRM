import type {
  WorkflowRunFunction,
  WorkflowRunJsonValue,
} from '@nocobase/app-plugin-workflow';
import { crmToken } from '../../../providers/crm/index.js';
import { toText } from '../../../providers/crm/schema.js';

interface NotifyArgs {
  approvalId?: unknown;
  recipientId?: unknown;
  actorId?: unknown;
  event?: unknown;
  at?: unknown;
}

const events = ['pending', 'withdrawn', 'approved', 'rejected'];

// Queues one approval message. The outbox key names the approval, the
// event and its time, so a rerun of the node never queues the same
// message twice.
export const run: WorkflowRunFunction = async (
  rawArgs: unknown,
  options,
): Promise<WorkflowRunJsonValue> => {
  options.signal.throwIfAborted();
  const args = rawArgs as NotifyArgs;
  for (const key of ['approvalId', 'recipientId', 'actorId', 'at'])
    if (typeof args[key as keyof NotifyArgs] !== 'string')
      throw new Error(`${key} is required.`);
  const event = toText(args.event);
  if (!events.includes(event))
    throw new Error(`event must be one of ${events.join(', ')}.`);
  const service = options.services.resolve(crmToken);
  const queued = await service.notifyOutcome({
    entity: 'approvals',
    recordId: toText(args.approvalId),
    recipientId: toText(args.recipientId),
    actorId: toText(args.actorId),
    event,
    key: `approval-notification:${toText(args.approvalId)}:${event}:${toText(args.at)}`,
  });
  options.logger.info('Approval notification handled', {
    approvalId: args.approvalId,
    event,
    queued,
  });
  return { queued };
};
