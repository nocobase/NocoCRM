// @vitest-environment node

import { createHash } from 'node:crypto';

import { createTestDatabase } from '@nocobase/app-testing/server';
import {
  createRepositoryLifecycleStore,
  StoredLifecycleParameters,
} from '@nocobase/lifecycle';
import { expect, it } from 'vitest';
import createCrm from '../../database/main/migrations/202609090001_create_crm.js';
import approvalLifecycle from '../../database/main/migrations/202610130001_crm_approval_lifecycle.js';
import lifecycleParameters from '../../database/main/migrations/202610140001_crm_lifecycle_parameters.js';
import migration from '../../database/main/migrations/202611230001_crm_approval_definition.js';
import { approverParameterGroup } from '../../server/lifecycles/approvals.js';
import { createLifecycleRuntime } from '../../server/providers/lifecycles.js';

// The approvals brought across to @nocobase/lifecycle 0.1.0-beta.6
// (database/main/migrations/202611230001_crm_approval_definition.ts): each
// bound to its definition, the administrator's rule moved to where the
// runtime reads it, and each given the parameter snapshot it now needs: the
// rule its creation recorded, or the rule in force, marked as the upgrade's.

const identity = (...parts: readonly (string | number)[]) =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const parse = (value: unknown): unknown =>
  typeof value === 'string' ? JSON.parse(value) : value;

it('binds every approval, moves the approver rule and gives each approval its snapshot, and takes it back', async () => {
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
    await createCrm.up(context);
    await approvalLifecycle.up(context);
    await lifecycleParameters.up(context);

    // The administrator's rule as 0.1.0-beta.4 saved it, under its group.
    const parameters = new StoredLifecycleParameters(
      createRepositoryLifecycleStore(isolated),
    );
    const managersAndAdmin = [
      { group: 1, type: 'role', referenceId: 'sales-manager' },
      { group: 2, type: 'user', referenceId: 'admin' },
    ];
    await parameters.save({
      scope: 'crm',
      group: approverParameterGroup,
      values: { approverRule: managersAndAdmin },
      expectedRevision: 0,
      requestId: 'before-upgrade',
      actorId: 'admin',
      at: '2026-11-01T08:00:00.000Z',
    });

    const now = new Date('2026-11-01T08:00:00.000Z');
    const approval = (id: string, status: string) => ({
      id,
      name: id,
      ownerId: 'rep',
      createdById: 'rep',
      createdAt: now,
      updatedAt: now,
      opportunityId: 'deal',
      topic: 'discount',
      description: '',
      approverId: 'manager',
      status,
      statusChangedAt: now,
      lifecycleVersion: 0,
    });
    await query
      .insertInto('crmApprovals')
      .values([
        approval('created', 'draft'),
        approval('legacy', 'pending'),
        approval('snapshotted', 'draft'),
      ])
      .execute();
    // `created` was created through the runtime, which logged the rule it
    // read (the default then) against its creation entry.
    await query
      .insertInto('lifecycleTransitions')
      .values({
        lifecycle: 'approvals',
        recordId: 'created',
        transition: '$create',
        from: null,
        to: 'draft',
        actorId: 'rep',
        input: {},
        at: now,
        version: 1,
        requestId: null,
        requestKey: 'created-v1',
      })
      .execute();
    const entry = await query
      .selectFrom('lifecycleTransitions')
      .select('id')
      .where('recordId', '=', 'created')
      .executeTakeFirstOrThrow();
    const defaultRule = [
      { group: 1, type: 'role', referenceId: 'sales-manager' },
    ];
    const usageId = identity('approvals', 'transition', String(entry.id), 0);
    await query
      .insertInto('lifecycleParameterUsages')
      .values({
        id: usageId,
        payload: {
          scope: 'crm',
          values: { approverRule: defaultRule },
          sources: {
            approverRule: {
              group: 'approvers',
              schemaVersion: 1,
              revision: 0,
              origin: 'default',
              readMode: 'live',
            },
          },
          lifecycle: 'approvals',
          recordId: 'created',
          kind: 'transition',
          associationId: String(entry.id),
          at: '2026-10-21T09:28:01.218Z',
        },
        recordKey: identity('crm', 'approvals', 'created'),
        at: now,
      })
      .execute();
    // `snapshotted` already has one: it is kept as it is.
    const kept = {
      scope: 'crm',
      lifecycle: 'approvals',
      recordId: 'snapshotted',
      revision: 0,
      values: { approverRule: defaultRule },
      sources: {
        approverRule: {
          group: 'approvers',
          schemaVersion: 1,
          revision: 0,
          origin: 'default',
        },
      },
      at: '2026-11-02T08:00:00.000Z',
    };
    await query
      .insertInto('lifecycleParameterSnapshots')
      .values({
        id: identity('crm', 'approvals', 'snapshotted'),
        payload: kept,
      })
      .execute();

    await migration.up(context);

    expect(
      (
        await query
          .selectFrom('crmApprovals')
          .select(['id', 'lifecycleDefinition'])
          .orderBy('id')
          .execute()
      ).map((row) => [row.id, row.lifecycleDefinition]),
    ).toEqual([
      ['created', 'approvals'],
      ['legacy', 'approvals'],
      ['snapshotted', 'approvals'],
    ]);
    // The rule is where the runtime reads a definition's configuration, at
    // the revision it had, and its history under the group stays.
    expect(
      await parameters.readConfiguration('crm', 'approvals'),
    ).toMatchObject({
      revision: 1,
      actorId: 'admin',
      values: { approverRule: managersAndAdmin },
    });
    expect(await parameters.read('crm', 'approvers')).toMatchObject({
      revision: 1,
    });

    const snapshot = async (id: string) => {
      const row = await query
        .selectFrom('lifecycleParameterSnapshots')
        .select('payload')
        .where('id', '=', identity('crm', 'approvals', id))
        .executeTakeFirst();
      return row ? parse(row.payload) : undefined;
    };
    // Recovered from its creation: the rule it was created under, when.
    expect(await snapshot('created')).toEqual({
      scope: 'crm',
      lifecycle: 'approvals',
      recordId: 'created',
      revision: 0,
      values: { approverRule: defaultRule },
      sources: {
        approverRule: {
          group: 'approvers',
          schemaVersion: 1,
          revision: 0,
          origin: 'default',
        },
      },
      at: '2026-10-21T09:28:01.218Z',
      recoveredFrom: {
        transitionId: String(entry.id),
        usageId,
        groupRevisions: { approvers: 0 },
      },
    });
    // Without a creation entry: the rule in force, as the upgrade's.
    expect(await snapshot('legacy')).toMatchObject({
      revision: 1,
      values: { approverRule: managersAndAdmin },
      sources: {
        approverRule: {
          group: 'approvers',
          schemaVersion: 1,
          revision: 1,
          origin: 'upgrade',
        },
      },
    });
    expect(await snapshot('snapshotted')).toEqual(kept);

    // The runtime accepts each as the approval's own.
    const runtime = createLifecycleRuntime(isolated as never);
    for (const [id, rule] of [
      ['created', defaultRule],
      ['legacy', managersAndAdmin],
      ['snapshotted', defaultRule],
    ] as const)
      expect(
        await runtime.resolveParameters('approvals', {
          record: { id } as never,
          purpose: 'preview',
          transactionHandle: undefined,
        }),
      ).toEqual({ approverRule: rule });

    await migration.down(context);
    expect(await snapshot('created')).toBeUndefined();
    expect(await snapshot('legacy')).toBeUndefined();
    expect(await snapshot('snapshotted')).toEqual(kept);
    expect(await parameters.readConfiguration('crm', 'approvals')).toBe(
      undefined,
    );
    expect(await parameters.read('crm', 'approvers')).toMatchObject({
      revision: 1,
    });
    const columns = await builder.getCollection('crmApprovals');
    expect(JSON.stringify(columns)).not.toContain('lifecycleDefinition');
  } finally {
    await test.destroy();
  }
});

it('stops before writing anything when the stored rule cannot be read', async () => {
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
    await createCrm.up(context);
    await approvalLifecycle.up(context);
    await lifecycleParameters.up(context);
    // A head whose version is gone.
    await query
      .insertInto('lifecycleParameterHeads')
      .values({
        id: identity('crm', 'approvers'),
        scope: 'crm',
        groupKey: 'approvers',
        status: 'current',
        revision: 2,
      })
      .execute();
    await expect(migration.up(context)).rejects.toThrow(
      /approver rule's current version/u,
    );
    await expect(
      query.selectFrom('lifecycleParameterSnapshots').select('id').execute(),
    ).resolves.toHaveLength(0);
  } finally {
    await test.destroy();
  }
});
