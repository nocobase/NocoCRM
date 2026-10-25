// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import migration from '../../database/main/migrations/202610150004_crm_whatsapp.js';
import {
  ChannelError,
  cloudApiChannel,
  verifySignature,
  webhookEvents,
} from '../../server/providers/crm/whatsapp/channel.js';

const at = '2026-10-15T08:00:00.000Z';
const value = (inner: Record<string, unknown>) => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'waba',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: '111', display_phone_number: '1555' },
            ...inner,
          },
        },
      ],
    },
  ],
});

// A delivery of another field (coexistence's echoes and history).
const field = (name: string, inner: Record<string, unknown>) => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'waba',
      changes: [
        {
          field: name,
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: '111', display_phone_number: '1555' },
            ...inner,
          },
        },
      ],
    },
  ],
});

describe("Meta's webhook deliveries", () => {
  it('accepts only the app secret’s signature of the raw body', () => {
    const body = new TextEncoder().encode('{"a":1}');
    const good = `sha256=${createHmac('sha256', 's3cret').update(body).digest('hex')}`;
    expect(verifySignature('s3cret', body, good)).toBe(true);
    expect(verifySignature('other', body, good)).toBe(false);
    expect(verifySignature('s3cret', body, undefined)).toBe(false);
    expect(verifySignature('s3cret', body, 'sha256=zz')).toBe(false);
    expect(verifySignature('', body, good)).toBe(false);
  });

  it('reads messages of every kind, with the business-scoped user id and without a number', () => {
    const events = webhookEvents(
      value({
        contacts: [
          { profile: { name: 'Ana', username: 'ana.s' }, user_id: 'BR.1' },
        ],
        messages: [
          {
            from_user_id: 'BR.1',
            id: 'w1',
            timestamp: '1792051200',
            type: 'text',
            text: { body: 'Olá' },
          },
          {
            from_user_id: 'BR.1',
            id: 'w2',
            timestamp: '1792051201',
            type: 'image',
            image: {
              id: 'm1',
              mime_type: 'image/jpeg',
              sha256: 'abc',
              caption: 'x',
            },
          },
          {
            from_user_id: 'BR.1',
            id: 'w3',
            timestamp: '1792051202',
            type: 'interactive',
            interactive: { button_reply: { id: 'b', title: 'Yes' } },
            context: { id: 'w0' },
          },
          {
            from_user_id: 'BR.1',
            id: 'w4',
            timestamp: '1792051203',
            type: 'location',
            location: { latitude: -23.5, longitude: -46.6 },
          },
        ],
      }),
      at,
    );
    expect(events).toMatchObject([
      {
        kind: 'message',
        phoneNumberId: '111',
        userId: 'BR.1',
        username: 'ana.s',
        profileName: 'Ana',
        type: 'text',
        text: 'Olá',
        occurredAt: new Date(1792051200 * 1000).toISOString(),
      },
      { type: 'image', caption: 'x', media: { id: 'm1', sha256: 'abc' } },
      { type: 'interactive', text: 'Yes', replyTo: 'w0' },
      { type: 'location', text: '-23.5, -46.6' },
    ]);
    expect(events[0]).not.toHaveProperty('waId', expect.anything());
  });

  it('reads status updates with their pricing and error', () => {
    expect(
      webhookEvents(
        value({
          statuses: [
            {
              id: 'w9',
              status: 'failed',
              timestamp: '1792051300',
              errors: [{ code: 131047 }],
              pricing: { billable: false, category: 'service' },
            },
          ],
        }),
        at,
      ),
    ).toEqual([
      {
        kind: 'status',
        phoneNumberId: '111',
        waMessageId: 'w9',
        status: 'failed',
        errorCode: '131047',
        pricingCategory: 'service',
        billable: false,
        occurredAt: new Date(1792051300 * 1000).toISOString(),
      },
    ]);
  });

  it('ignores what is not a WhatsApp delivery', () => {
    expect(webhookEvents({ object: 'page', entry: [] }, at)).toEqual([]);
    expect(webhookEvents(null, at)).toEqual([]);
  });
});

describe('media from the Cloud API', () => {
  const bytes = new TextEncoder().encode('image');
  const digest = createHash('sha256').update(bytes).digest('hex');
  const channel = (status = 200) =>
    cloudApiChannel({
      appSecret: 's',
      accessToken: 't',
      fetch: (async (url: string) =>
        url.includes('/m1')
          ? new Response(JSON.stringify({ url: 'https://cdn.test/f' }), {
              status,
            })
          : new Response(bytes, {
              headers: { 'content-type': 'image/png' },
            })) as unknown as typeof fetch,
    });
  it('downloads a file and checks its digest', async () => {
    const media = await channel().media({ id: 'm1', sha256: digest });
    expect(new TextDecoder().decode(media.data)).toBe('image');
    expect(media.mimeType).toBe('image/png');
    await expect(
      channel().media({ id: 'm1', sha256: '0'.repeat(64) }),
    ).rejects.toMatchObject({ reason: 'checksum' });
  });
  it('tells a gone file from a passing failure', async () => {
    const gone = await channel(404)
      .media({ id: 'm1' })
      .catch((e: unknown) => e);
    expect(gone).toBeInstanceOf(ChannelError);
    expect(gone).toMatchObject({ reason: 'http_404', transient: false });
    expect(
      await channel(503)
        .media({ id: 'm1' })
        .catch((e: unknown) => e),
    ).toMatchObject({ transient: true });
  });
});

it('creates the WhatsApp tables and takes them away', async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const builder = isolated.builder();
    const query = isolated.query();
    const context = {
      builder,
      query,
      connection: isolated.connection(),
    } as never;
    await migration.up(context);
    const tables = [
      'crmWaNumbers',
      'crmWaContacts',
      'crmWaIdentities',
      'crmWaConversations',
      'crmWaMessages',
      'crmWaInbox',
    ];
    for (const table of tables)
      await expect(
        query.selectFrom(table).selectAll().execute(),
      ).resolves.toEqual([]);
    // A message id is stored once.
    const message = {
      waMessageId: 'w1',
      conversationId: 'c',
      numberId: 'n',
      direction: 'in',
      origin: 'customer',
      type: 'text',
      occurredAt: at,
      createdAt: at,
    };
    await query
      .insertInto('crmWaMessages')
      .values({ id: 'a', ...message })
      .execute();
    await expect(
      query
        .insertInto('crmWaMessages')
        .values({ id: 'b', ...message })
        .execute(),
    ).rejects.toThrow();
    await migration.down(context);
    for (const table of tables)
      await expect(
        query.selectFrom(table).selectAll().execute(),
      ).rejects.toThrow();
  } finally {
    await test.destroy();
  }
});

describe("Coexistence's deliveries", () => {
  it("reads coexistence's echoes as the team's messages sent from the app, to the customer they name", () => {
    const events = webhookEvents(
      field('smb_message_echoes', {
        message_echoes: [
          {
            from: '1555',
            to: '4930123456789',
            to_user_id: 'DE.9',
            id: 'echo-1',
            timestamp: '1792051200',
            type: 'text',
            text: { body: 'Gern, ich schicke es Ihnen.' },
          },
          {
            from: '1555',
            to: '4930123456789',
            id: 'echo-2',
            timestamp: '1792051300',
            type: 'edit',
            edit: {
              original_message_id: 'echo-1',
              message: { type: 'text', text: { body: 'Gern, anbei.' } },
            },
          },
          {
            from: '1555',
            to: '4930123456789',
            id: 'echo-3',
            timestamp: '1792051400',
            type: 'revoke',
            revoke: { original_message_id: 'echo-1' },
          },
        ],
      }),
      at,
    );
    expect(events[0]).toMatchObject({
      kind: 'message',
      direction: 'out',
      origin: 'businessApp',
      waId: '4930123456789',
      userId: 'DE.9',
      type: 'text',
      text: 'Gern, ich schicke es Ihnen.',
    });
    expect(events[1]).toMatchObject({ edits: 'echo-1', text: 'Gern, anbei.' });
    expect(events[2]).toMatchObject({ revokes: 'echo-1' });
  });

  it("reads coexistence's history, either way by its thread's number, a file left as a placeholder, and nothing when declined", () => {
    const events = webhookEvents(
      field('history', {
        history: [
          {
            metadata: { phase: 0, chunk_order: 1, progress: 100 },
            threads: [
              {
                id: '4930123456789',
                messages: [
                  {
                    from: '4930123456789',
                    id: 'h-1',
                    timestamp: '1780000000',
                    type: 'text',
                    text: { body: 'Hallo' },
                    history_context: { status: 'READ' },
                  },
                  {
                    from: '1555',
                    to: '4930123456789',
                    id: 'h-2',
                    timestamp: '1780000100',
                    type: 'media_placeholder',
                  },
                ],
              },
            ],
          },
          { errors: [{ code: 2593109 }] },
        ],
      }),
      at,
    );
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      direction: 'in',
      origin: 'imported',
      waId: '4930123456789',
      text: 'Hallo',
    });
    expect(events[1]).toMatchObject({
      direction: 'out',
      origin: 'imported',
      waId: '4930123456789',
      type: 'media_placeholder',
    });
    expect(events[1]).not.toHaveProperty('media', expect.anything());
  });
});
