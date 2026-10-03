import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Leads' and contacts' phone numbers as the CRM keeps them from now on
// (server/providers/crm/phone.ts, which every save applies): a Chinese
// mobile as its 11 digits, a Chinese landline as area code, hyphen and
// number, a number abroad as + and its digits, an extension after a
// hyphen; spaces and brackets gone. The rules are copied here as they stood
// when this ran, so a later change to them does not change what this did.
// The numbers as they were written are not kept, so down leaves them.

// Mainland area codes: 010 and 020–029 are three digits, the rest four.
function landline(digits: string): string {
  const area = /^0[12]/.test(digits) ? 3 : 4;
  return `${digits.slice(0, area)}-${digits.slice(area)}`;
}

function normalizePhone(value: string): string {
  const text = value.trim();
  if (!text) return '';
  // Already as the CRM keeps it: left so, extension and all.
  if (
    /^(?:1[3-9]\d{9}|0\d{2,3}-\d{7,8}|\+(?!86)\d{6,15}|\d{5,12})(?:-\d{1,6})?$/.test(
      text,
    ) &&
    !/^861[3-9]\d{9}$/.test(text)
  )
    return text;
  // An extension at the end: 转 8021, ext. 8021, x8021, #8021.
  const extMatch = /\s*(?:转|分机|ext\.?|x|#)\s*(\d{1,6})\s*$/i.exec(text);
  const main = extMatch ? text.slice(0, extMatch.index) : text;
  const ext = extMatch ? `-${extMatch[1]}` : '';
  // Anything but digits and the separators people write: not a number.
  if (/[^\d\s+().\-–—/]/.test(main)) return text;
  const plus = main.trimStart().startsWith('+');
  let digits = main.replace(/\D/g, '');
  if (digits.length < 5) return text;
  // China's country code: +86, 0086, or 86 before a mobile. A number with
  // another country code stays international.
  let china = false;
  if (digits.startsWith('0086')) {
    digits = digits.slice(4);
    china = true;
  } else if (plus && digits.startsWith('86')) {
    digits = digits.slice(2);
    china = true;
  } else if (/^861[3-9]\d{9}$/.test(digits)) digits = digits.slice(2);
  else if (plus) return `+${digits}${ext}`;
  if (/^1[3-9]\d{9}$/.test(digits)) return `${digits}${ext}`;
  // A landline written from abroad drops its trunk 0: put it back.
  if (china && !digits.startsWith('0')) digits = `0${digits}`;
  if (/^0\d{9,11}$/.test(digits)) return `${landline(digits)}${ext}`;
  return `${digits}${ext}`;
}

const migration: MigrationDefinition = defineMigration({
  name: '202610030001_crm_phone_numbers',
  async up({ builder, query }: MigrationContext): Promise<void> {
    for (const table of ['crmLeads', 'crmContacts']) {
      if (!(await builder.hasCollection(table))) continue;
      const rows = await query
        .selectFrom(table)
        .select(['id', 'phone'])
        .where('phone', 'is not', null)
        .execute();
      for (const row of rows) {
        const phone = typeof row.phone === 'string' ? row.phone : '';
        const kept = normalizePhone(phone);
        if (kept !== phone)
          await query
            .updateTable(table)
            .set({ phone: kept || null })
            .where('id', '=', String(row.id))
            .execute();
      }
    }
  },
  async down(): Promise<void> {
    // The numbers as first written are not kept; the normalised ones are
    // valid before this migration too.
  },
});

export default migration;
