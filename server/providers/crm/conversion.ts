import { toText } from './schema.js';
import type { QueryAdapter, Row } from '@nocobase/db';
import {
  assertFields,
  compileFilter,
  conditions,
  type Actor,
} from './authorization.js';
import { CrmError, object, type CrmRecord } from './schema.js';
import { array, type CrmService } from './service.js';

export async function conversionPreview(
  service: CrmService,
  actor: Actor,
  id: string,
): Promise<Row> {
  const lead = await service.get(actor, 'leads', id);
  const accounts = (await service.list(actor, 'accounts', { pageSize: 1000 }))
    .data;
  const contacts = (await service.list(actor, 'contacts', { pageSize: 1000 }))
    .data;
  const normalized = (v: unknown): string =>
    toText(v ?? '')
      .replace(/[\s.,，。]/g, '')
      .toLowerCase();
  const company = normalized(lead.company);
  const domain = toText(lead.email ?? '').split('@')[1];
  const matchedAccounts = accounts.filter(
    (a) =>
      (company &&
        (normalized(a.name).includes(company) ||
          company.includes(normalized(a.name)))) ||
      (domain && toText(a.website ?? '').includes(domain)),
  );
  const accountIds = new Set(matchedAccounts.map((a) => toText(a.id)));
  const name = normalized(lead.name);
  const email = toText(lead.email ?? '').toLowerCase();
  const phone = normalized(lead.phone);
  // The opportunities still open at those accounts: converting with a new
  // one beside them may duplicate a deal already being worked.
  const opportunities = accountIds.size
    ? (
        await service.list(actor, 'opportunities', { pageSize: 1000 })
      ).data.filter(
        (o) =>
          accountIds.has(toText(o.accountId ?? '')) &&
          !['won', 'lost'].includes(toText(o.stage)),
      )
    : [];
  return {
    lead,
    accounts: matchedAccounts,
    // The same person: the same e-mail or phone, or the same name at one of
    // the matching accounts, which finds a contact the lead gave no e-mail
    // or phone for.
    contacts: contacts.filter(
      (c) =>
        (email && toText(c.email ?? '').toLowerCase() === email) ||
        (phone && normalized(c.phone) === phone) ||
        (name &&
          normalized(c.name) === name &&
          accountIds.has(toText(c.accountId ?? ''))),
    ),
    opportunities,
  };
}
export async function convertLead(
  service: CrmService,
  actor: Actor,
  id: string,
  raw: unknown,
  tx?: QueryAdapter,
): Promise<CrmRecord> {
  if (!tx)
    return service.mutate(actor, (prepared, query) =>
      convertLead(service, prepared, id, raw, query),
    );
  const input = object(raw);
  const editable = await service.get(actor, 'leads', id, tx, 'update');
  assertFields(
    { status: 'converted' },
    await conditions(actor, 'leads', 'update'),
  );
  if (editable.status === 'converted')
    throw new CrmError('convertedReadOnly', 409);
  // Only copy fields the person converting the lead may actually read.
  const lead = await service.get(actor, 'leads', id, tx);
  const accountInput: Row = {
    name: lead.company,
    ownerId: lead.ownerId,
    source: lead.source,
    status: 'qualified',
    website: lead.website,
    description: lead.companyDescription,
    ...Object.fromEntries(
      ['industry', 'country', 'state', 'city', 'employees', 'address'].map(
        (key) => [key, lead[key]],
      ),
    ),
  };
  // input.account / input.contact override what the lead supplies, field by
  // field: the card lets the user correct an inherited value before
  // confirming, and the assistant can propose corrections the same way.
  // save() validates the merged result like any other write.
  Object.assign(accountInput, object(input.account ?? {}));
  if (input.accountName) accountInput.name = toText(input.accountName);
  const contactInput: Row = {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    jobTitle: lead.jobTitle,
    ownerId: lead.ownerId,
    source: lead.source,
    employed: true,
    ...object(input.contact ?? {}),
  };
  const merge = async (
    entity: 'accounts' | 'contacts',
    recordId: unknown,
    proposed: Row,
    force: unknown,
  ): Promise<CrmRecord> => {
    if (!recordId) return service.save(actor, entity, proposed, undefined, tx);
    const current = await service.get(actor, entity, toText(recordId), tx);
    const requested = Array.isArray(force) ? force : [];
    const patch: Row = {};
    for (const [key, value] of Object.entries(proposed))
      if (
        value != null &&
        value !== '' &&
        (current[key] == null || current[key] === '' || requested.includes(key))
      )
        patch[key] = value;
    return Object.keys(patch).length
      ? service.save(actor, entity, patch, current.id, tx)
      : current;
  };
  const account = await merge(
    'accounts',
    input.accountId,
    accountInput,
    input.overwriteAccountFields,
  );
  contactInput.accountId = account.id;
  if (input.contactId) {
    const chosen = await service.get(
      actor,
      'contacts',
      toText(input.contactId),
      tx,
    );
    if (chosen.accountId !== account.id) throw new CrmError('accountMismatch');
  }
  const contact = await merge(
    'contacts',
    input.contactId,
    contactInput,
    input.overwriteContactFields,
  );
  let opportunity: CrmRecord | undefined;
  if (input.createOpportunity === true)
    opportunity = await service.save(
      actor,
      'opportunities',
      {
        name: input.opportunityName || account.name,
        ownerId: lead.ownerId,
        source: lead.source,
        accountId: account.id,
        amount: input.amount ?? null,
        // What the person set on the deal in the conversion dialog beside
        // its name and amount; the rest comes from the lead and the account.
        ...Object.fromEntries(
          Object.entries(object(input.opportunity ?? {})).filter(([key]) =>
            ['currency', 'expectedCloseAt'].includes(key),
          ),
        ),
        contacts: [{ contactId: contact.id, role: 'other' }],
      },
      undefined,
      tx,
    );
  const now = new Date().toISOString();
  const access = await conditions(actor, 'leads', 'update');
  const updated = await tx
    .updateTable('crmLeads')
    .set({
      status: 'converted',
      convertedAt: now,
      convertedAccountId: account.id,
      convertedContactId: contact.id,
      convertedOpportunityId: opportunity?.id ?? null,
      updatedAt: now,
    })
    .where('id', '=', id)
    .where('status', '!=', 'converted')
    .where((eb) => compileFilter(eb, access.scope))
    .execute();
  if (!updated.updatedCount) throw new CrmError('conflict', 409);
  // Conversion is the single authorized system operation that links all existing history,
  // including activities owned by colleagues, while preserving their original content.
  const activities = await tx
    .selectFrom('crmActivities')
    .selectAll()
    .where('leadId', '=', id)
    .execute();
  for (const activity of activities)
    await tx
      .updateTable('crmActivities')
      .set({
        accountId: account.id,
        opportunityId: opportunity?.id ?? null,
        externalParticipants: JSON.stringify([
          ...new Set([...array(activity.externalParticipants), contact.id]),
        ]),
        updatedAt: now,
      })
      .where('id', '=', activity.id)
      .execute();
  await service.history(
    tx,
    actor,
    'leads',
    id,
    'converted',
    lead.status,
    'converted',
    {
      accountId: account.id,
      contactId: contact.id,
      opportunityId: opportunity?.id ?? null,
    },
  );
  return service.get(actor, 'leads', id, tx);
}
