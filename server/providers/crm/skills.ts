import type { SkillsEntity, SkillsManager } from '@nocobase/ai-employee';
import type { DatabaseManager } from '@nocobase/db';
import {
  createServiceToken,
  type ServiceToken,
} from '@nocobase/service-provider';
import {
  capability,
  conditions,
  listUsers,
  requireCapability,
  type Actor,
} from './authorization.js';
import { LONG_TEXT_LIMIT } from './limits.js';
import { CrmError, object, toText } from './schema.js';
import { encodeRow, jsonValue } from './values.js';

// The CRM's own AI skill (ai/skills/<name>/SKILL.md): how the assistant
// follows up a lead — where it stands, what to recommend and what to do
// next, from its first evaluation on (the former lead evaluation and lead
// follow-up skills, merged). The files ship with the source and change with
// it. Everyone reads them on the Sales skills page of the main menu, and
// whoever holds the sales capability manageSkills (sales managers and
// administrators by default) adds the company's own practice there as notes,
// which are stored in crm_settings and appended to the skill the AI loads;
// the plugin's read-only skill catalog shows that composed skill. The notes
// only add to the skill (NocoSolution's layering: what a customer adds may
// not overrule what ships), and the wording that joins them says so. The AI
// Employee plugin keeps skills in memory, registered from the files at boot,
// so the composed skill is registered again at start and after every save; a
// restart rebuilds it from the file and the stored notes.
export const CRM_SKILLS = ['lead-follow-up'] as const;
export type CrmSkillName = (typeof CRM_SKILLS)[number];

const NOTES_ID = 'skill-notes';

interface StoredNote {
  notes: string;
  updatedAt: string;
  updatedById: string;
}

export interface CrmSkill {
  name: CrmSkillName;
  title: string;
  description: string;
  // The procedure as the file states it, without the notes.
  content: string;
  notes: string;
  updatedAt: string | null;
  updatedById: string | null;
  updatedByName: string | null;
}

export function composeSkill(content: string, notes: string): string {
  const added = notes.trim();
  if (!added) return content;
  return `${content.trimEnd()}

## 本公司的补充说明

以下是本公司管理员补充的做法，与上面的内容一起遵守；与上面的边界冲突时，以上面为准。

${added}
`;
}

export interface CrmSkillList {
  skills: CrmSkill[];
  // Whether the reader may edit the notes (the sales capability
  // manageSkills: sales managers and administrators by default).
  canEdit: boolean;
}

export class CrmSkillNotes {
  private readonly originals = new Map<CrmSkillName, SkillsEntity>();

  constructor(
    private readonly database: DatabaseManager,
    private readonly skills: SkillsManager | undefined,
  ) {}

  // Takes the skills as the plugin registered them from their files, then
  // registers each again with the stored notes. Runs once the plugin has
  // booted, so the files are loaded.
  async start(): Promise<void> {
    if (!this.skills) return;
    for (const name of CRM_SKILLS) {
      const skill = await this.skills.getSkills(name);
      if (skill && !this.originals.has(name)) this.originals.set(name, skill);
    }
    const notes = await this.read();
    for (const name of this.originals.keys())
      await this.apply(name, notes[name]?.notes ?? '');
  }

  // Everyone who works in the CRM reads how the AI works; the page is
  // on the main menu.
  async list(actor: Actor): Promise<CrmSkillList> {
    await conditions(actor, 'leads', 'read');
    const notes = await this.read();
    const names = await this.userNames();
    return {
      skills: [...this.originals.entries()].map(([name, skill]) =>
        this.describe(name, skill, notes[name], names),
      ),
      canEdit: await capability(actor, 'manageSkills'),
    };
  }

  async save(actor: Actor, name: string, input: unknown): Promise<CrmSkill> {
    await requireCapability(actor, 'manageSkills');
    const skill = this.originals.get(name as CrmSkillName);
    if (!skill) throw new CrmError('notFound', 404);
    const notes = toText(object(input).notes).trim();
    if (notes.length > LONG_TEXT_LIMIT)
      throw new CrmError('invalidInput', 400, 'notes');
    const all = await this.read();
    all[name] = {
      notes,
      updatedAt: new Date().toISOString(),
      updatedById: actor.id,
    };
    await this.database.transaction(async ({ query }) => {
      const existing = await query
        .selectFrom('crmSettings')
        .select('id')
        .where('id', '=', NOTES_ID)
        .executeTakeFirst();
      if (existing)
        await query
          .updateTable('crmSettings')
          .set(encodeRow({ value: all, updatedAt: new Date() }))
          .where('id', '=', NOTES_ID)
          .execute();
      else
        await query
          .insertInto('crmSettings')
          .values(
            encodeRow({ id: NOTES_ID, value: all, updatedAt: new Date() }),
          )
          .execute();
    });
    await this.apply(name as CrmSkillName, notes);
    return this.describe(
      name as CrmSkillName,
      skill,
      all[name],
      await this.userNames(),
    );
  }

  private describe(
    name: CrmSkillName,
    skill: SkillsEntity,
    note: StoredNote | undefined,
    names: Map<string, string>,
  ): CrmSkill {
    return {
      name,
      title: skill.introduction?.title ?? name,
      description: skill.description,
      content: skill.content,
      notes: note?.notes ?? '',
      updatedAt: note?.updatedAt ?? null,
      updatedById: note?.updatedById ?? null,
      updatedByName: note ? (names.get(note.updatedById) ?? null) : null,
    };
  }

  private async userNames(): Promise<Map<string, string>> {
    return new Map((await listUsers(this.database)).map((u) => [u.id, u.name]));
  }

  private async apply(name: CrmSkillName, notes: string): Promise<void> {
    const skill = this.originals.get(name);
    if (!skill || !this.skills) return;
    await this.skills.registerSkills({
      ...skill,
      content: composeSkill(skill.content, notes),
    });
  }

  private async read(): Promise<Record<string, StoredNote>> {
    const row = await this.database
      .query()
      .selectFrom('crmSettings')
      .select('value')
      .where('id', '=', NOTES_ID)
      .executeTakeFirst();
    const value = record(jsonValue(row?.value));
    const notes: Record<string, StoredNote> = {};
    for (const name of CRM_SKILLS) {
      const note = record(value[name]);
      if (typeof note.notes === 'string')
        notes[name] = {
          notes: note.notes,
          updatedAt: toText(note.updatedAt),
          updatedById: toText(note.updatedById),
        };
    }
    // Notes a company added to the former lead evaluation skill join the
    // follow-up skill it was merged into, after its own; the next save
    // stores them there alone.
    const legacy = record(value['lead-evaluation']);
    if (typeof legacy.notes === 'string' && legacy.notes.trim()) {
      const own = notes['lead-follow-up'];
      notes['lead-follow-up'] = {
        notes: [own?.notes ?? '', legacy.notes]
          .map((text) => text.trim())
          .filter(Boolean)
          .join('\n\n'),
        updatedAt: own?.updatedAt || toText(legacy.updatedAt),
        updatedById: own?.updatedById || toText(legacy.updatedById),
      };
    }
    return notes;
  }
}

// A stored value read leniently: missing or malformed notes are no notes.
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const crmSkillNotesToken: ServiceToken<CrmSkillNotes> =
  createServiceToken<CrmSkillNotes>('crm/skill-notes');
