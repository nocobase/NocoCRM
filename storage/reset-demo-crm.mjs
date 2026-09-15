import { createRequire } from 'node:module';
import { mkdir, readFile, unlink, chmod } from 'node:fs/promises';

const root = process.cwd();
const require = createRequire(`${root}/package.json`);
const Database = require('better-sqlite3');
const filename = `${root}/storage/crm.sqlite`;
const manifestPath = `${root}/storage/demo-crm-manifest.json`;

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const records = Array.isArray(manifest.records) ? manifest.records : [];
const idsByEntity = new Map();
for (const record of records) {
  if (!record?.entity || !record?.id) continue;
  const ids = idsByEntity.get(record.entity) ?? [];
  ids.push(String(record.id));
  idsByEntity.set(record.entity, ids);
}

const sqlite = new Database(filename);
try {
  await mkdir(`${root}/storage/backups`, { recursive: true });
  const backup = `${root}/storage/backups/pre-demo-reset-${new Date().toISOString().replaceAll(':', '-')}.sqlite`;
  await sqlite.backup(backup);
  await chmod(backup, 0o600);

  const tables = [
    ['crm_history', 'history'],
    ['crm_activities', 'activities'],
    ['crm_approvals', 'approvals'],
    ['crm_opportunities', 'opportunities'],
    ['crm_contacts', 'contacts'],
    ['crm_leads', 'leads'],
    ['crm_accounts', 'accounts'],
  ];
  const deleted = {};
  sqlite.transaction(() => {
    for (const [table, entity] of tables) {
      const ids = entity === 'history'
        ? [...new Set(records.map((record) => String(record.id)).filter(Boolean))]
        : idsByEntity.get(entity) ?? [];
      if (!ids.length) {
        deleted[entity] = 0;
        continue;
      }
      const placeholders = ids.map(() => '?').join(',');
      const column = entity === 'history' ? 'record_id' : 'id';
      const result = sqlite.prepare(`DELETE FROM ${table} WHERE ${column} IN (${placeholders})`).run(...ids);
      deleted[entity] = result.changes;
    }
    sqlite.prepare("DELETE FROM crm_settings WHERE id IN ('demo-dataset-v1', 'demo-dataset-v2-consulting', 'demo-dataset-v3-consulting-names')").run();
  })();
  try { await unlink(manifestPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  console.log(JSON.stringify({ reset: true, deleted, backup }, null, 2));
} finally {
  sqlite.close();
}
