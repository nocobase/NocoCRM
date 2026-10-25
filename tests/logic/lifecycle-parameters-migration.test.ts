// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import {
  createRepositoryLifecycleStore,
  ParameterConfigurationError,
  StoredLifecycleParameters,
} from '@nocobase/lifecycle';
import { expect, it } from 'vitest';
import migration from '../../database/main/migrations/202610140001_crm_lifecycle_parameters.js';
import { approverParameterGroup } from '../../server/lifecycles/approvals.js';

const collections = [
  'lifecycleParameterHeads',
  'lifecycleParameterVersions',
  'lifecycleParameterSelections',
  'lifecycleParameterRequests',
  'lifecycleParameterSnapshots',
  'lifecycleParameterUsages',
];

// The tables a lifecycle's administrator-set parameters are kept in, as the
// library's store reads and writes them: a version of the approver rule is
// saved, read back with its selections, and a save from a stale version is
// a conflict.
it('creates the lifecycle parameter tables the store keeps versions in, and drops them', async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const builder = isolated.builder();
    const context = {
      builder,
      query: isolated.query(),
      connection: isolated.connection(),
    } as never;
    await migration.up(context);
    for (const name of collections)
      expect(await builder.hasCollection(name)).toBe(true);

    const store = new StoredLifecycleParameters(
      createRepositoryLifecycleStore(isolated),
    );
    const rule = [
      { group: 1, type: 'role', referenceId: 'sales-manager' },
      { group: 2, type: 'user', referenceId: 'admin' },
    ];
    const save = (expectedRevision: number, requestId: string) =>
      store.save({
        scope: 'crm',
        group: approverParameterGroup,
        values: { approverRule: rule },
        expectedRevision,
        requestId,
        actorId: 'admin',
        at: '2026-10-14T08:00:00.000Z',
      });
    await save(0, 'first');
    expect(await store.read('crm', 'approvers')).toMatchObject({
      revision: 1,
      actorId: 'admin',
      values: { approverRule: rule },
    });
    // The same request again saves nothing twice.
    expect((await save(0, 'first')).revision).toBe(1);
    await expect(save(0, 'second')).rejects.toBeInstanceOf(
      ParameterConfigurationError,
    );

    await migration.down(context);
    for (const name of collections)
      expect(await builder.hasCollection(name)).toBe(false);
  } finally {
    await test.destroy();
  }
});
