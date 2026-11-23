import { createHash } from 'node:crypto';

import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// `@nocobase/lifecycle` 0.1.0-beta.6 (template 1.0.0-beta.99) binds every
// record to the definition that created it and freezes a configured
// definition's parameters into each record when it is created, where 0.1.0-
// beta.4 read the approvals' approver rule live. This brings the approvals
// (server/lifecycles/approvals.ts, process `approvals`, version 1) across:
//
// 1. `crmApprovals.lifecycleDefinition`, a new nullable column, names the
//    definition each approval follows. The table has only ever had the one
//    definition, and every approval in it is moved by it (those from before
//    202610130001_crm_approval_lifecycle too, which have no creation entry
//    in the log), so every row is bound to `approvals`.
// 2. The administrator's approver rule moves to where the runtime now reads
//    a definition's configuration: one revision for the whole definition,
//    under its name (`approvals`), instead of the rule's group (`approvers`).
//    The current version is copied at its revision, with its author and
//    date; the `approvers` history stays where it is.
// 3. Every approval gets the parameter snapshot it now needs to be viewed or
//    moved: the rule recorded when it was created (the parameter usage of
//    its creation entry), or, without one, the rule in force now, marked as
//    supplied by this upgrade (`origin: 'upgrade'`), not as what it was
//    created with. A snapshot already there is kept.
//
// Self-contained: the identities are the library's (a SHA-256 of the
// JSON-encoded parts), the rule's group and default are written out as
// released, and nothing is imported from the live definition.

const SCOPE = 'crm';
const LIFECYCLE = 'approvals';
const RULE_GROUP = 'approvers';
const RULE_FIELD = 'approverRule';
const SCHEMA_VERSION = 1;
// The rule before an administrator set one, as released: the sales managers.
const DEFAULT_RULE = [{ group: 1, type: 'role', referenceId: 'sales-manager' }];
const ORIGINS = ['default', 'configuration', 'upgrade'];
const PAGE = 500;

interface Selection {
  readonly group: number;
  readonly type: string;
  readonly referenceId: string;
}

interface Source {
  readonly group: string;
  readonly schemaVersion: number;
  readonly revision: number;
  readonly origin: string;
}

function identity(...parts: readonly (string | number)[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

// A stored JSON value, which a dialect may return as text.
function parse(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 2 && typeof current === 'string'; i++) {
    try {
      current = JSON.parse(current) as unknown;
    } catch {
      return current;
    }
  }
  return current;
}

function object(value: unknown): Record<string, unknown> | undefined {
  const parsed = parse(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : undefined;
}

const revisionOf = (value: unknown): number | undefined =>
  Number.isSafeInteger(value) && (value as number) >= 0
    ? (value as number)
    : undefined;

// An approver rule as released: one to a hundred role or user selections,
// each in a positive group.
function rule(value: unknown): Selection[] | undefined {
  if (!Array.isArray(value) || !value.length || value.length > 100)
    return undefined;
  const selections: Selection[] = [];
  for (const item of value) {
    const entry = object(item);
    if (
      !entry ||
      !Number.isSafeInteger(entry.group) ||
      (entry.group as number) < 1 ||
      (entry.type !== 'role' && entry.type !== 'user') ||
      typeof entry.referenceId !== 'string' ||
      !entry.referenceId
    )
      return undefined;
    selections.push({
      group: entry.group as number,
      type: entry.type,
      referenceId: entry.referenceId,
    });
  }
  return selections;
}

function source(value: unknown): Source | undefined {
  const entry = object(value);
  const revision = revisionOf(entry?.revision);
  if (
    !entry ||
    entry.group !== RULE_GROUP ||
    entry.schemaVersion !== SCHEMA_VERSION ||
    revision === undefined ||
    !ORIGINS.includes(String(entry.origin))
  )
    return undefined;
  return {
    group: RULE_GROUP,
    schemaVersion: SCHEMA_VERSION,
    revision,
    origin: String(entry.origin),
  };
}

const migration: MigrationDefinition = defineMigration({
  name: '202611230001_crm_approval_definition',
  async up({ builder, query }: MigrationContext): Promise<void> {
    // Read everything first, so a stored configuration that cannot be read
    // stops the upgrade before anything is written.
    const headId = identity(SCOPE, RULE_GROUP);
    const head = await query
      .selectFrom('lifecycleParameterHeads')
      .select(['revision'])
      .where('id', '=', headId)
      .executeTakeFirst();
    let configured:
      | {
          revision: number;
          payload: Record<string, unknown>;
          counts: Record<string, unknown>;
          rule: Selection[];
        }
      | undefined;
    if (head) {
      const revision = revisionOf(Number(head.revision));
      const version =
        revision === undefined
          ? undefined
          : await query
              .selectFrom('lifecycleParameterVersions')
              .select(['payload', 'selectionCounts'])
              .where('id', '=', identity(SCOPE, RULE_GROUP, revision))
              .executeTakeFirst();
      const payload = object(version?.payload);
      const counts = object(version?.selectionCounts) ?? {};
      const count = Number(counts[RULE_FIELD]);
      if (
        revision === undefined ||
        !payload ||
        payload.revision !== revision ||
        !Number.isSafeInteger(count) ||
        count < 1 ||
        count > 100
      )
        throw new Error(
          `The approver rule's current version (${RULE_GROUP}, revision ${String(head.revision)}) cannot be read; restore it before upgrading.`,
        );
      const rows = await query
        .selectFrom('lifecycleParameterSelections')
        .select(['id', 'group', 'type', 'referenceId'])
        .where('versionId', '=', identity(SCOPE, RULE_GROUP, revision))
        .execute();
      const byId = new Map(rows.map((row) => [String(row.id), row]));
      const selections = Array.from({ length: count }, (_, index) =>
        byId.get(identity(SCOPE, RULE_GROUP, revision, RULE_FIELD, index)),
      ).map((row) =>
        row
          ? {
              group: Number(row.group),
              type: String(row.type),
              referenceId: String(row.referenceId),
            }
          : undefined,
      );
      const current = rule(selections);
      if (!current)
        throw new Error(
          `The approver rule's current version (${RULE_GROUP}, revision ${revision}) has missing or invalid selections; restore it before upgrading.`,
        );
      configured = { revision, payload, counts, rule: current };
    }
    const upgradeRule = configured?.rule ?? DEFAULT_RULE;
    const upgradeRevision = configured?.revision ?? 0;

    await builder.alterCollection('crmApprovals', (c) => {
      c.string('lifecycleDefinition').nullable();
    });
    await query
      .updateTable('crmApprovals')
      .set({ lifecycleDefinition: LIFECYCLE })
      .where('lifecycleDefinition', 'is', null)
      .execute();

    // The configuration under the definition's name, unless a run before
    // already put it there.
    const definitionHead = identity(SCOPE, LIFECYCLE);
    if (
      configured &&
      !(await query
        .selectFrom('lifecycleParameterHeads')
        .select(['id'])
        .where('id', '=', definitionHead)
        .executeTakeFirst())
    ) {
      const { revision, payload, counts } = configured;
      const versionId = identity(SCOPE, LIFECYCLE, revision);
      await query
        .insertInto('lifecycleParameterVersions')
        .values({
          id: versionId,
          payload: { ...payload, group: LIFECYCLE },
          selectionCounts: counts,
        })
        .execute();
      for (const [index, selection] of configured.rule.entries())
        await query
          .insertInto('lifecycleParameterSelections')
          .values({
            id: identity(SCOPE, LIFECYCLE, revision, RULE_FIELD, index),
            versionId,
            ruleKey: RULE_FIELD,
            group: selection.group,
            type: selection.type,
            referenceId: selection.referenceId,
          })
          .execute();
      await query
        .insertInto('lifecycleParameterHeads')
        .values({
          id: definitionHead,
          scope: SCOPE,
          groupKey: LIFECYCLE,
          status: 'current',
          revision,
        })
        .execute();
    }

    // The snapshots, a page of approvals at a time.
    const at = new Date().toISOString();
    let after = '';
    for (;;) {
      const approvals = (
        await query
          .selectFrom('crmApprovals')
          .select(['id'])
          .where('id', '>', after)
          .orderBy('id')
          .limit(PAGE)
          .execute()
      ).map((row) => String(row.id));
      if (!approvals.length) break;
      after = approvals.at(-1)!;
      const snapshotIds = new Map(
        approvals.map((id) => [identity(SCOPE, LIFECYCLE, id), id]),
      );
      const existing = new Set(
        (
          await query
            .selectFrom('lifecycleParameterSnapshots')
            .select(['id'])
            .where('id', 'in', [...snapshotIds.keys()])
            .execute()
        ).map((row) => String(row.id)),
      );
      const missing = approvals.filter(
        (id) => !existing.has(identity(SCOPE, LIFECYCLE, id)),
      );
      if (!missing.length) continue;
      // Each approval's creation entry, when the log has exactly one.
      const creations = new Map<string, string[]>();
      for (const row of await query
        .selectFrom('lifecycleTransitions')
        .select(['id', 'recordId', 'version'])
        .where('lifecycle', '=', LIFECYCLE)
        .where('transition', '=', '$create')
        .where('recordId', 'in', missing)
        .execute())
        if (Number(row.version) === 1)
          creations.set(String(row.recordId), [
            ...(creations.get(String(row.recordId)) ?? []),
            String(row.id),
          ]);
      const usageIds = new Map<string, { recordId: string; entry: string }>();
      for (const [recordId, entries] of creations)
        if (entries.length === 1)
          usageIds.set(identity(LIFECYCLE, 'transition', entries[0], 0), {
            recordId,
            entry: entries[0],
          });
      const usages = new Map<string, Record<string, unknown>>();
      if (usageIds.size)
        for (const row of await query
          .selectFrom('lifecycleParameterUsages')
          .select(['id', 'payload'])
          .where('id', 'in', [...usageIds.keys()])
          .execute()) {
          const payload = object(row.payload);
          if (payload) usages.set(String(row.id), payload);
        }
      const recovered = new Map<string, Record<string, unknown>>();
      for (const [usageId, { recordId, entry }] of usageIds) {
        const usage = usages.get(usageId);
        const values = object(usage?.values);
        const sources = object(usage?.sources);
        const recordedRule = rule(values?.[RULE_FIELD]);
        const recordedSource = source(sources?.[RULE_FIELD]);
        if (
          !usage ||
          usage.scope !== SCOPE ||
          usage.lifecycle !== LIFECYCLE ||
          usage.recordId !== recordId ||
          usage.kind !== 'transition' ||
          usage.associationId !== entry ||
          (usage.attempt !== undefined && usage.attempt !== 0) ||
          typeof usage.at !== 'string' ||
          Number.isNaN(Date.parse(usage.at)) ||
          !recordedRule ||
          !recordedSource ||
          Object.keys(values ?? {}).some((key) => key !== RULE_FIELD) ||
          Object.keys(sources ?? {}).some((key) => key !== RULE_FIELD)
        )
          continue;
        recovered.set(recordId, {
          scope: SCOPE,
          lifecycle: LIFECYCLE,
          recordId,
          revision: recordedSource.revision,
          values: { [RULE_FIELD]: recordedRule },
          sources: { [RULE_FIELD]: recordedSource },
          at: new Date(usage.at).toISOString(),
          recoveredFrom: {
            transitionId: entry,
            usageId,
            groupRevisions: { [RULE_GROUP]: recordedSource.revision },
          },
        });
      }
      for (const recordId of missing)
        await query
          .insertInto('lifecycleParameterSnapshots')
          .values({
            id: identity(SCOPE, LIFECYCLE, recordId),
            payload: recovered.get(recordId) ?? {
              scope: SCOPE,
              lifecycle: LIFECYCLE,
              recordId,
              revision: upgradeRevision,
              values: { [RULE_FIELD]: upgradeRule },
              sources: {
                [RULE_FIELD]: {
                  group: RULE_GROUP,
                  schemaVersion: SCHEMA_VERSION,
                  revision: upgradeRevision,
                  origin: 'upgrade',
                },
              },
              at,
            },
          })
          .execute();
    }
  },
  // Takes back what `up` added: the snapshots it wrote (those it recovered or
  // supplied, told apart from the runtime's own by `recoveredFrom` and
  // `origin: 'upgrade'`), the configuration under the definition's name,
  // versions saved there since included, and the column. The `approvers`
  // versions were never touched.
  async down({ builder, query }: MigrationContext): Promise<void> {
    for (const row of await query
      .selectFrom('lifecycleParameterSnapshots')
      .select(['id', 'payload'])
      .execute()) {
      const payload = object(row.payload);
      const ruleSource = object(object(payload?.sources)?.[RULE_FIELD]);
      if (
        payload?.lifecycle === LIFECYCLE &&
        (payload.recoveredFrom !== undefined ||
          ruleSource?.origin === 'upgrade')
      )
        await query
          .deleteFrom('lifecycleParameterSnapshots')
          .where('id', '=', String(row.id))
          .execute();
    }
    const head = await query
      .selectFrom('lifecycleParameterHeads')
      .select(['revision'])
      .where('id', '=', identity(SCOPE, LIFECYCLE))
      .executeTakeFirst();
    if (head) {
      for (let revision = 1; revision <= Number(head.revision); revision++) {
        const versionId = identity(SCOPE, LIFECYCLE, revision);
        await query
          .deleteFrom('lifecycleParameterSelections')
          .where('versionId', '=', versionId)
          .execute();
        await query
          .deleteFrom('lifecycleParameterVersions')
          .where('id', '=', versionId)
          .execute();
      }
      await query
        .deleteFrom('lifecycleParameterHeads')
        .where('id', '=', identity(SCOPE, LIFECYCLE))
        .execute();
    }
    await builder.alterCollection('crmApprovals', (c) => {
      c.dropField('lifecycleDefinition');
    });
  },
});

export default migration;
