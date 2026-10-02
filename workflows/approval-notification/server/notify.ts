import type {
  WorkflowRunFunction,
  WorkflowRunJsonValue,
} from '@nocobase/app-plugin-workflow';
import { messageArgs, queueMessage } from './queue.js';

// Queues one approval message; the key names the approval, the event and
// its time, so a rerun of the node never queues the same message twice.
export const run: WorkflowRunFunction = async (
  rawArgs: unknown,
  options,
): Promise<WorkflowRunJsonValue> => {
  options.signal.throwIfAborted();
  const message = messageArgs(
    rawArgs,
    ['pending', 'withdrawn', 'approved', 'rejected'],
    (args) => `approval-notification:${args.recordId}:${args.event}:${args.at}`,
    'approvals',
  );
  return { queued: await queueMessage(options, message) };
};
