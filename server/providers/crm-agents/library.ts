import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import type { DatabaseManager } from '@nocobase/db';
import { METHOD_SKILLS } from './skill.js';

// @temporary(nocobase-official): an application cannot ship skills into the
// Agents plugin's library, so the CRM's method skills are put there from
// code once, at start. Replace with the plugin's own mechanism when it has
// one.
//
// The CRM's method skills (ai/skills: lead follow-up, opportunity follow-up,
// approval review, task preparation) as skills of the library, where people
// read and edit them on Settings → Agent team → Skills: each is added once,
// from its SKILL.md as shipped (the assistant reads them with its
// `crm_skill` tool, assistant.ts); the marker
// keeps their ids, so a skill an administrator edited, detached or deleted
// stays as they left it, and a later SKILL.md shipped with the code does not
// replace the library's. The background runs read the library's current
// version (`readSkill` in crm/ai-model.ts), so an edit there is what they follow.

export const SKILLS_MARKER = 'agents-skills-v1';

export async function provisionSkills(
  agents: Agents,
  database: DatabaseManager,
  dir: string,
): Promise<void> {
  const query = database.query();
  const marker = await query
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', SKILLS_MARKER)
    .executeTakeFirst();
  // The marker first, as the assistant's: an instance starting beside this
  // one finds it and adds nothing.
  if (!marker)
    try {
      await query
        .insertInto('crmSettings')
        .values({
          id: SKILLS_MARKER,
          value: JSON.stringify({ version: 1, skillIds: {} }),
          updatedAt: new Date(),
        })
        .execute();
    } catch {
      return;
    }
  // Only the skills never put there: one whose id the marker holds stays as
  // an administrator left it, deleted included, while one that could not be
  // read at an earlier start (a deployment built without the files) is added
  // now.
  const known = skillIdsOf(marker?.value);
  const missing = METHOD_SKILLS.filter((slug) => !known[slug]);
  if (!missing.length) return;
  // One a person added under the same name before is taken as it is.
  const library = new Map(
    (await agents.skills.list()).map((skill) => [skill.slug, skill.id]),
  );
  const added: Record<string, string> = {};
  for (const slug of missing) {
    const existing = library.get(slug);
    if (existing) {
      added[slug] = existing;
      continue;
    }
    const content = await readFile(join(dir, slug, 'SKILL.md'), 'utf8').catch(
      () => null,
    );
    if (!content) continue;
    added[slug] = (await agents.skills.create(null, { content })).id;
  }
  if (!Object.keys(added).length) return;
  await query
    .updateTable('crmSettings')
    .set({
      value: JSON.stringify({ version: 1, skillIds: { ...known, ...added } }),
      updatedAt: new Date(),
    })
    .where('id', '=', SKILLS_MARKER)
    .execute();
}

function skillIdsOf(value: unknown): Record<string, string> {
  try {
    const ids = (JSON.parse(String(value)) as { skillIds?: unknown }).skillIds;
    return ids && typeof ids === 'object'
      ? Object.fromEntries(
          Object.entries(ids).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === 'string' && entry[1] !== '',
          ),
        )
      : {};
  } catch {
    return {};
  }
}
