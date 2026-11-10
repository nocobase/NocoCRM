// @vitest-environment node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SKILLS = [
  'lead-follow-up',
  'opportunity-follow-up',
  'approval-review',
  'task-preparation',
];

const skill = (name: string): string =>
  readFileSync(
    fileURLToPath(new URL(`../../ai/skills/${name}/SKILL.md`, import.meta.url)),
    'utf8',
  );

// The approval standards (what needs an approval) are written in two
// skills: the deal follow-up proposes approvals by them, the approval
// review weighs a request against them. Nothing else states them, so the
// two must say the same.
// The standards' lines, one per kind of term, then the company's say.
const standards = (text: string): string[] =>
  text
    .split('\n')
    .filter((line) =>
      /^- (Discount|Payment terms|Contract terms|Delivery commitments): |^- Standards the company adds/.test(
        line,
      ),
    );

describe('the approval standards', () => {
  it('read the same in the deal follow-up and the approval review', () => {
    const followUp = standards(skill('opportunity-follow-up'));
    expect(followUp).toHaveLength(5);
    expect(standards(skill('approval-review'))).toEqual(followUp);
    expect(followUp.join('\n')).toContain('10%');
    expect(followUp.join('\n')).toContain('30 days');
  });
});

// A skill's frontmatter: its single-line values.
const front = (name: string) => {
  const text = /^---\n([\s\S]*?)\n---\n/.exec(skill(name))?.[1] ?? '';
  return {
    text,
    description: /^description:\s*(.+)$/m.exec(text)?.[1].trim() ?? '',
  };
};

// The Agents plugin's skill library reads a skill's frontmatter as YAML, its
// `name` and `description`; a plain value holding ": " is the usual way to
// break it.
describe('the skill files', () => {
  for (const name of SKILLS)
    it(`${name} has frontmatter the plugin can read`, () => {
      const { text, description } = front(name);
      expect(text).toMatch(new RegExp(`^name: ${name}$`, 'm'));
      expect(description).not.toBe('');
      for (const line of text.split('\n')) {
        const value = /^\s*[\w.]+:\s(.*)$/.exec(line)?.[1] ?? '';
        if (/^['"[{|>]/.test(value)) continue;
        expect(`${line} → ${/: |\s#/.test(value)}`).toBe(`${line} → false`);
      }
    });
});
