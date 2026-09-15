import { randomUUID } from 'node:crypto';
import { CrmError, toText, type CrmRecord } from './schema.js';
import { array, type CrmService } from './service.js';
import type { Actor } from './authorization.js';

// Sending an email activity to the customer. The notification plugin's email
// channel is the transport (the same SMTP account that delivers
// notifications), but this is correspondence, not a notification: a person
// writes the subject and body — prefilled from the activity's name and
// description, editable before sending — and presses send; the recipients
// are the activity's external participants, and the activity keeps the
// message as it went out.

// What the CRM needs from the notification service; a structural type so a
// test can hand in a stub.
export interface Mailer {
  send(input: {
    idempotencyKey: string;
    source: { type: string; referenceId: string };
    to: readonly { type: 'email'; address: string }[];
    channels: readonly string[];
    content: { title: string; body: string };
  }): Promise<{ notificationId: string }>;
}

export interface EmailPreview {
  subject: string;
  body: string;
  recipients: { id: string; name: string; email: string }[];
  sentAt: string | null;
  sentTo: string | null;
}

// The activity as it would be sent. Needs the right to update the activity:
// sending changes it (it becomes completed), and only someone who may work
// the record should write to its contacts in the CRM's name.
export async function activityEmail(
  service: CrmService,
  actor: Actor,
  id: string,
): Promise<{ record: CrmRecord; preview: EmailPreview }> {
  const record = await service.get(
    actor,
    'activities',
    id,
    undefined,
    'update',
  );
  if (record.type !== 'email') throw new CrmError('emailNotApplicable', 409);
  const recipients: EmailPreview['recipients'] = [];
  for (const contactId of array(record.externalParticipants)) {
    try {
      const contact = await service.get(actor, 'contacts', toText(contactId));
      const email = toText(contact.email).trim();
      if (email)
        recipients.push({
          id: toText(contact.id),
          name: toText(contact.name),
          email,
        });
    } catch (error) {
      // A participant the actor may not read is simply not a recipient.
      if (!(error instanceof CrmError && error.status === 404)) throw error;
    }
  }
  return {
    record,
    preview: {
      subject: toText(record.name),
      body: toText(record.description),
      recipients,
      sentAt: record.emailSentAt == null ? null : toText(record.emailSentAt),
      sentTo: record.emailSentTo == null ? null : toText(record.emailSentTo),
    },
  };
}

export async function sendActivityEmail(
  service: CrmService,
  mailer: Mailer,
  actor: Actor,
  id: string,
  input: { subject?: unknown; body?: unknown } = {},
): Promise<CrmRecord> {
  const { preview } = await activityEmail(service, actor, id);
  if (!preview.recipients.length) throw new CrmError('noRecipient', 400);
  // The user may have reworded the draft in the dialog; what they confirmed
  // is what goes out and what the activity keeps.
  const subject = (
    input.subject === undefined ? preview.subject : toText(input.subject)
  ).trim();
  const body = (
    input.body === undefined ? preview.body : toText(input.body)
  ).trim();
  if (!subject) throw new CrmError('required', 400, 'emailSubject');
  if (!body) throw new CrmError('emailBodyRequired', 400, 'emailBody');
  // The send happens outside the transaction: an external effect cannot be
  // rolled back, so the record is only written once the mail server has
  // accepted the message.
  try {
    await mailer.send({
      // A resend is a new message, so every send gets its own key.
      idempotencyKey: `email-activity:${id}:${randomUUID()}`,
      source: { type: 'email-activity', referenceId: id },
      to: preview.recipients.map((r) => ({ type: 'email', address: r.email })),
      channels: ['email'],
      content: { title: subject, body },
    });
  } catch (error) {
    throw new CrmError(
      'emailFailed',
      502,
      undefined,
      error instanceof Error ? error.message : String(error),
    );
  }
  const sentTo = preview.recipients.map((r) => r.email).join(', ');
  return service.mutate(actor, async (prepared, query) => {
    const now = new Date().toISOString();
    const current = await service.get(
      prepared,
      'activities',
      id,
      query,
      'update',
    );
    const completed = current.status === 'completed';
    await query
      .updateTable('crmActivities')
      .set({
        emailSentAt: now,
        emailSentTo: sentTo,
        emailSubject: subject.slice(0, 255),
        emailBody: body,
        updatedAt: now,
        ...(completed ? {} : { status: 'completed', completedAt: now }),
      })
      .where('id', '=', id)
      .execute();
    await service.history(
      query,
      prepared,
      'activities',
      id,
      'emailSent',
      null,
      sentTo,
      { emailSubject: subject, emailBody: body },
    );
    if (!completed)
      await service.history(
        query,
        prepared,
        'activities',
        id,
        'status',
        current.status,
        'completed',
      );
    return service.get(prepared, 'activities', id, query);
  });
}
