// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import { expect, it } from 'vitest';
import createCrm from '../../database/main/migrations/202609090001_create_crm.js';
import migration from '../../database/main/migrations/202611100001_crm_drop_retired_settings.js';

// The settings the CRM no longer has, taken out of its stored business
// settings (database/main/migrations/202611100001_crm_drop_retired_settings.ts),
// which reading and saving them no longer drop.
it('takes the retired settings out of the stored business settings, keeping the rest', async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const query = isolated.query();
    const context = {
      builder: isolated.builder(),
      query,
      connection: isolated.connection(),
    } as never;
    await createCrm.up(context);
    const read = async (id: string): Promise<unknown> => {
      const row = await query
        .selectFrom('crmSettings')
        .select('value')
        .where('id', '=', id)
        .executeTakeFirst();
      return typeof row?.value === 'string'
        ? JSON.parse(row.value)
        : row?.value;
    };
    // An older row, as a JSON string inside the JSON column.
    await query
      .insertInto('crmSettings')
      .values([
        {
          id: 'business',
          value: JSON.stringify(
            JSON.stringify({
              currency: 'CNY',
              aiLanguage: 'zh-CN',
              approvalEnabled: true,
              firstContactDays: 2,
              aiInstructions: 'Old.',
              aiService: 'deepseek',
              aiModel: 'flash',
              aiEnabled: false,
            }),
          ),
          updatedAt: new Date(),
        },
        // Another row holding the same names is not the settings.
        {
          id: 'agents',
          value: JSON.stringify({ aiEnabled: false }),
          updatedAt: new Date(),
        },
      ])
      .execute();
    await migration.up(context);
    expect(await read('business')).toEqual({
      currency: 'CNY',
      aiLanguage: 'zh-CN',
    });
    expect(await read('agents')).toEqual({ aiEnabled: false });
    // Once clean, a second run changes nothing.
    await migration.up(context);
    expect(await read('business')).toEqual({
      currency: 'CNY',
      aiLanguage: 'zh-CN',
    });
    expect(migration.irreversible).toBe(true);
  } finally {
    await test.destroy();
  }
});

it('leaves a deployment with no stored settings as it is', async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const query = isolated.query();
    const context = {
      builder: isolated.builder(),
      query,
      connection: isolated.connection(),
    } as never;
    await createCrm.up(context);
    await migration.up(context);
    expect(
      await query.selectFrom('crmSettings').select('id').execute(),
    ).toEqual([]);
  } finally {
    await test.destroy();
  }
});
