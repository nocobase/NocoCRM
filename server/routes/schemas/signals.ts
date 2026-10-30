import { z } from 'zod';
import type {
  CheckResult,
  CompanySignalsView,
  SignalView,
} from '../../providers/crm/company-signals.js';
import { SIGNAL_TYPES } from '../../providers/crm/signal-reading.js';
import { LONG_TEXT_LIMIT } from '../../providers/crm/limits.js';
import { PageQuery } from './common.js';

// Company signals (company-signals.ts): what happened to a company, found
// on the web, with the pages that say so.

export const Signal: z.ZodType<SignalView> = z
  .object({
    id: z.string(),
    companyId: z.string(),
    type: z.string().describe(`One of ${SIGNAL_TYPES.join(', ')}.`),
    title: z.string(),
    summary: z.string(),
    occurredOn: z.string().describe('The day the event happened (YYYY-MM-DD).'),
    sources: z
      .array(z.object({ title: z.string(), url: z.string(), site: z.string() }))
      .describe('The pages the web search read that state it.'),
    status: z
      .enum(['new', 'seen', 'dismissed'])
      .describe(
        'dismissed once someone dismissed it; seen, from before, reads as new.',
      ),
    createdAt: z.string(),
    decidedById: z.string().nullable(),
    decidedAt: z.string().nullable(),
  })
  .meta({ ref: 'CrmSignal' });

export const CompanySignals: z.ZodType<CompanySignalsView> = z
  .object({
    available: z
      .boolean()
      .describe('Whether a web search is configured (the Qwen model service).'),
    watched: z.boolean().describe('Switched on to be checked daily.'),
    inDailyCheck: z
      .boolean()
      .describe('Checked daily: watched, or with an open deal.'),
    checkedAt: z.string().nullable(),
    canEdit: z.boolean(),
    total: z.number().int().describe('All its signals, dismissed or not.'),
    open: z.number().int().describe('Those not dismissed.'),
    fresh: z
      .number()
      .int()
      .describe('Those new: found in the last week and not dismissed.'),
    page: z.number().int(),
    pageSize: z
      .number()
      .int()
      .describe('The page size, widened to reach `until` when given.'),
    signals: z
      .array(Signal)
      .describe('A page: those not dismissed first, the newest events first.'),
  })
  .meta({ ref: 'CrmCompanySignals' });

export const CompanySignalsQuery = z.object({
  ...PageQuery.shape,
  until: z.string().optional().meta({
    description:
      'A signal the first page widens to reach, for opening the list at it.',
  }),
});

export const SignalCheckStarted = z.object({
  started: z.literal(true),
});
export const SignalCheck: z.ZodType<CheckResult> = z
  .object({ found: z.array(Signal) })
  .meta({ ref: 'CrmSignalCheck' });

export const WatchCompanyInput = z
  .object({ watched: z.boolean() })
  .meta({ ref: 'CrmWatchCompanyInput' });

export const DecideSignalInput = z
  .object({
    status: z
      .enum(['dismissed', 'new'])
      .describe(
        'dismissed: the event is not proposed again; new: undoes a dismissal.',
      ),
  })
  .meta({ ref: 'CrmDecideSignalInput' });

// New company with the AI (company-profile.ts): the company to look up.
export const CompanyProfileInput = z
  .strictObject({
    name: z.string().min(1).max(255).describe('The company to look up.'),
    note: z
      .string()
      .max(LONG_TEXT_LIMIT)
      .optional()
      .describe('What the person adds about it (its city, its website).'),
    // The labels the dialog shows: a field's under its key, an option's
    // under `key.value`, for the AI to name them by.
    labels: z.record(z.string(), z.string()).optional(),
  })
  .meta({ ref: 'CrmCompanyProfileInput' });

export const CompanyProfile = z
  .object({
    input: z
      .record(z.string(), z.union([z.string(), z.number()]))
      .describe(
        "The company form's values found: name, website, linkedin, industry, employees, annualRevenue with currency, country, state (its code), city, address, description.",
      ),
    uncertain: z.array(z.string()).describe('The fields it was unsure of.'),
    sources: z
      .array(z.object({ title: z.string(), url: z.string(), site: z.string() }))
      .describe('The pages it read, those cited first.'),
    duplicates: z
      .array(z.object({ id: z.string(), name: z.string() }))
      .describe('Companies the reader may see by that name.'),
  })
  .meta({ ref: 'CrmCompanyProfile' });
