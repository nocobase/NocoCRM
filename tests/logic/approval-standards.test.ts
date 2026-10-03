// @vitest-environment node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The approval standards (what needs an approval) are written in two
// skills: the deal follow-up proposes approvals by them, the approval
// review weighs a request against them. Nothing else states them, so the
// two must say the same.
const skill = (name: string): string =>
  readFileSync(
    fileURLToPath(new URL(`../../ai/skills/${name}/SKILL.md`, import.meta.url)),
    'utf8',
  );
// The standards' lines, one per kind of term, then the company's say.
const standards = (text: string): string[] =>
  text
    .split('\n')
    .filter((line) =>
      /^- (折扣|账期|合同条款|交付承诺)：|^- 公司在/.test(line),
    );

describe('the approval standards', () => {
  it('read the same in the deal follow-up and the approval review', () => {
    const followUp = standards(skill('opportunity-follow-up'));
    expect(followUp).toHaveLength(5);
    expect(standards(skill('approval-review'))).toEqual(followUp);
  });
});
