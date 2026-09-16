// app-server 1.0.0-beta.12 resolves plugin database tasks from database/ before
// dist/database/. Some installed plugins publish both TypeScript sources and
// compiled JavaScript, so plain Node tries to execute TypeScript in node_modules.
// For the container deployment only, remove a shadowing source task directory
// after verifying every executable has its compiled counterpart. Leave the
// installed development packages, compiled tasks, and migration history intact.
// Remove this workaround when the runtime resolves compiled plugin tasks itself.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const packages = path.join(dist, 'node_modules', '@nocobase');

function executables(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return executables(entryPath);
    return entry.isFile() &&
      /\.(?:ts|mts|cts|js|mjs|cjs)$/.test(entry.name) &&
      !/\.d\.(?:ts|mts|cts)$/.test(entry.name)
      ? [entryPath]
      : [];
  });
}

for (const entry of fs.readdirSync(packages, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('app-plugin-')) continue;
  const root = path.join(packages, entry.name);
  for (const kind of ['migrations', 'seeds']) {
    const source = path.join(root, 'database', kind);
    if (!fs.existsSync(source)) continue;
    const files = executables(source);
    if (!files.some((file) => /\.(?:ts|mts|cts)$/.test(file))) continue;
    for (const file of files) {
      const compiled = path.join(
        root,
        'dist',
        'database',
        kind,
        path
          .relative(source, file)
          .replace(
            /\.(ts|mts|cts)$/,
            (_, ext) => ({ ts: '.js', mts: '.mjs', cts: '.cjs' })[ext],
          ),
      );
      assert.ok(
        fs.existsSync(compiled) && fs.statSync(compiled).isFile(),
        `Missing compiled plugin task: ${compiled}`,
      );
    }
    fs.rmSync(source, { recursive: true });
    console.log(`Container uses compiled ${entry.name}/${kind}.`);
  }
}
