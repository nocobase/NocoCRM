import type {
  WorkflowRunFunction,
  WorkflowRunJsonValue,
} from '@nocobase/app-plugin-workflow';
import { messageArgs, queueMessage } from './queue.js';

// Queues one record message; the key names the record, the event, the
// recipient and the change's time, so a rerun of the node never queues
// the same message twice.
export const run: WorkflowRunFunction = async (
  rawArgs: unknown,
  options,
): Promise<WorkflowRunJsonValue> => {
  options.signal.throwIfAborted();
  const message = messageArgs(
    rawArgs,
    ['assigned', 'invited', 'removed', 'rescheduled', 'cancelled'],
    (args) =>
      `record-notification:${args.entity}:${args.recordId}:${args.event}:${args.recipientId}:${args.at}`,
  );
  return { queued: await queueMessage(options, message) };
};
