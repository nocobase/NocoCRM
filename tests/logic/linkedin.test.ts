// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import { describe, expect, it } from 'vitest';
import migration from '../../database/main/migrations/202610150003_crm_linkedin.js';
import { differing } from '../../server/providers/crm/lead-merge.js';
import {
  linkedinKey,
  linkedinPath,
} from '../../server/providers/crm/linkedin.js';

describe('a LinkedIn address', () => {
  it('reads what a profile or page address points at, however it is written', () => {
    expect(linkedinPath('https://www.linkedin.com/in/jane-doe/')).toBe(
      'in/jane-doe',
    );
    expect(linkedinPath('linkedin.com/in/jane-doe?trk=profile')).toBe(
      'in/jane-doe',
    );
    expect(linkedinPath('cn.linkedin.com/in/jane-doe/details/skills/')).toBe(
      'in/jane-doe',
    );
    expect(linkedinPath('https://www.linkedin.com/in/%E5%BC%A0%E4%B8%89')).toBe(
      'in/张三',
    );
    expect(linkedinPath('www.linkedin.com/company/nocobase')).toBe(
      'company/nocobase',
    );
    expect(linkedinPath('linkedin.com/school/mit/')).toBe('company/mit');
    expect(linkedinKey('LinkedIn.com/in/Jane-Doe')).toBe('in/jane-doe');
  });
  it('is not one when it points elsewhere', () => {
    for (const value of [
      '',
      null,
      'jane doe',
      'https://linkedin.com/',
      'https://www.linkedin.com/feed/',
      'https://notlinkedin.com/in/jane',
      'https://example.com/in/jane',
    ])
      expect(linkedinPath(value)).toBe('');
  });
  it('is no choice to make in a merge when the two leads name the same profile', () => {
    const groups = (a: string, b: string): string[] =>
      differing({ linkedin: a }, { linkedin: b }).map(([key]) => key);
    expect(
      groups(
        'https://www.linkedin.com/in/jane-doe/',
        'linkedin.com/in/Jane-Doe',
      ),
    ).not.toContain('linkedin');
    expect(
      groups('linkedin.com/in/jane-doe', 'linkedin.com/in/john-doe'),
    ).toContain('linkedin');
  });
});

it('adds the LinkedIn address to leads, contacts and companies, and takes it away', async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const builder = isolated.builder();
    const connection = isolated.connection();
    const query = isolated.query();
    const context = { builder, query, connection } as never;
    const tables = ['crmLeads', 'crmContacts', 'crmCompanies'];
    // The tables as earlier migrations left them, with only the columns
    // this one needs beside its own.
    for (const table of tables)
      await builder.createCollection(table, (c) => {
        c.string('id', { length: 36, nullable: false });
        c.primary('id');
        c.string('name', { nullable: false });
      });
    await query
      .insertInto('crmLeads')
      .values({ id: 'lead-1', name: 'Jane Doe' })
      .execute();
    const lead = async (): Promise<unknown> =>
      query
        .selectFrom('crmLeads')
        .selectAll()
        .where('id', '=', 'lead-1')
        .executeTakeFirst();
    await migration.up(context);
    // Each table has the column: reading it works.
    for (const table of tables)
      await expect(
        query.selectFrom(table).select('linkedin').execute(),
      ).resolves.toEqual(table === 'crmLeads' ? [{ linkedin: null }] : []);
    await query
      .updateTable('crmLeads')
      .set({ linkedin: 'linkedin.com/in/jane-doe' })
      .where('id', '=', 'lead-1')
      .execute();
    expect(await lead()).toMatchObject({
      name: 'Jane Doe',
      linkedin: 'linkedin.com/in/jane-doe',
    });
    await migration.down(context);
    for (const table of tables)
      await expect(
        query.selectFrom(table).select('linkedin').execute(),
      ).rejects.toThrow();
    expect(await lead()).toMatchObject({ name: 'Jane Doe' });
  } finally {
    await test.destroy();
  }
});
