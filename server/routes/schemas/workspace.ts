import type { LifecycleDescription } from '@nocobase/lifecycle';
import { z } from 'zod';
import type { AgentSwitches } from '../../providers/crm/agents.js';
import { AGENDA_PAGE } from '../../providers/crm/dashboard.js';
import type { DemoStatus } from '../../providers/crm/demo.js';
import type { PlaceMatch } from '../../providers/crm/geography.js';
import { LONG_TEXT_LIMIT } from '../../providers/crm/limits.js';
import type { CrmSettings } from '../../providers/crm/schema.js';
import type { ApproverRuleView as ServiceApproverRuleView } from '../../providers/crm/service.js';
import { JsonObject, PageQuery, TitlesShape } from './common.js';
import { AiEntry } from './operations.js';

// The workspace's own routes: what the pages start from, the settings, the
// demo data, the overview and reports, the inbox's AI suggestions, the AI
// agents, attachments, the mail timeline and search.

const SettingsShape = {
  currency: z.string().meta({ description: 'A three-letter ISO code.' }),
  timeZone: z.string().meta({ description: 'An IANA time zone.' }),
  taskReminderMinutes: z.number().int(),
  closeReminderDays: z.number().int(),
  uncontactedDays: z.number().int(),
  leadStaleDays: z.number().int(),
  staleDays: z.number().int(),
  nurtureReviewDays: z.number().int(),
  aiLanguage: z.enum(['en-US', 'zh-CN']),
  assistantDock: z.boolean().meta({
    description: "Whether pages show the assistant's ask box at their bottom.",
  }),
  notifyApprovals: z.boolean(),
  notifyRecordChanges: z.boolean(),
  notifyComments: z.boolean(),
  notifyTaskReminders: z.boolean(),
  businessGuidance: z.string().max(LONG_TEXT_LIMIT).meta({
    description:
      'The business guidance the AI works from, in Markdown; empty for the shipped one.',
  }),
};

export const SystemSettings: z.ZodType<CrmSettings> = z
  .object({
    ...SettingsShape,
    aiLanguage: z.string(),
    options: z
      .record(z.string(), z.array(z.string()))
      .meta({ description: 'The option lists of the select fields.' }),
  })
  .meta({ ref: 'CrmSystemSettings' });

// Every setting may be sent; one left out keeps its value.
export const UpdateSystemSettingsInput = z
  .strictObject(
    Object.fromEntries(
      Object.entries(SettingsShape).map(([key, schema]) => [
        key,
        schema.optional(),
      ]),
    ) as {
      [K in keyof typeof SettingsShape]: z.ZodOptional<
        (typeof SettingsShape)[K]
      >;
    },
  )
  .meta({ ref: 'CrmSystemSettingsInput' });

const AgentSwitch = z.object({
  enabled: z.boolean(),
  triggers: z.record(z.string(), z.boolean()),
});
export const AgentSwitchesSchema: z.ZodType<AgentSwitches> = z
  .object({
    leads: AgentSwitch,
    opportunities: AgentSwitch,
    approvals: AgentSwitch,
    tasks: AgentSwitch,
    // The company signals' check (company-signals.ts).
    signals: AgentSwitch,
  })
  .meta({ ref: 'CrmAgentSwitches' });

const Permission = z.union([
  z.literal(false),
  z.object({
    fields: z.union([z.array(z.string()), z.literal('*')]),
    all: z.boolean().optional().meta({
      description: 'Whether the action reaches every record, not a scope.',
    }),
  }),
]);

export const Workspace = z
  .object({
    definitions: z.record(z.string(), JsonObject).meta({
      description: "Each object's fields, statuses and list columns.",
    }),
    probabilities: z.record(z.string(), z.number()).meta({
      description: "An opportunity stage's win probability.",
    }),
    permissions: z
      .record(z.string(), z.record(z.string(), Permission))
      .meta({ description: 'Per object and action, what the reader may do.' }),
    settings: SystemSettings,
    userId: z.string(),
    users: z.array(JsonObject).meta({
      description: 'The users the reader may pick, with their CRM roles.',
    }),
    export: z.boolean(),
    assign: z.boolean(),
    approve: z.boolean(),
    sendWhatsApp: z.boolean(),
    settingsAccess: z.boolean(),
    demoPresent: z.boolean().optional().meta({
      description: 'For whoever may import one: whether a demo dataset is.',
    }),
    assistant: z.boolean().meta({
      description: "Whether the CRM's AI employee is switched on.",
    }),
    demoSite: z.boolean().optional().meta({
      description:
        'Whether this is a read-only demo site (Demo Mode), where the assistant takes no questions.',
    }),
    agents: AgentSwitchesSchema,
    workAgentNames: z
      .record(
        z.string(),
        z.object({
          name: z.string(),
          nameText: z.object({ key: z.string(), ns: z.string() }).nullable(),
          description: z.string().nullable(),
          descriptionText: z
            .object({ key: z.string(), ns: z.string() })
            .nullable(),
          model: z
            .object({ modelService: z.string(), model: z.string() })
            .nullable(),
        }),
      )
      .meta({
        description:
          "The CRM's work agents, by work: the name and description as written and the references translating them, and the model it asks (null while there is no chat model), which the CRM names wherever that work is done.",
      }),
    methodSkills: z.record(z.string(), z.string()).meta({
      description:
        "The Agents plugin's library ids of the CRM's method skills, by skill name (lead-follow-up, opportunity-follow-up, approval-review, task-preparation, company-signals).",
    }),
  })
  .meta({ ref: 'CrmWorkspace' });

// The approvals' lifecycle as the library describes it
// (server/lifecycles/approvals.ts): its states, which are final, and the
// transitions between them, which the settings' approval process page draws.
const names = z.array(z.string());
// A definition's own notes, kept as JSON.
const meta = z.record(z.string(), z.json());
export const ApprovalLifecycleView: z.ZodType<LifecycleDescription> = z
  .object({
    name: z.string(),
    initial: z.string(),
    initialStates: names,
    states: names,
    stateInfo: z.array(
      z.object({
        name: z.string(),
        title: z.string(),
        final: z.boolean(),
        meta,
      }),
    ),
    transitions: z.array(
      z.object({
        name: z.string(),
        title: z.string(),
        from: names,
        to: names,
        effects: names,
        accept: names,
        manual: z.boolean(),
        meta,
      }),
    ),
    continuations: z.array(
      z.object({
        effect: z.string(),
        onSuccess: z.string().optional(),
        onFailure: z.string().optional(),
      }),
    ),
    onEnter: z.record(z.string(), names),
    triggers: z.array(
      z.object({ name: z.string(), transition: z.string(), when: names }),
    ),
    // What an administrator may set on it: the approver rule.
    parameterConfiguration: z
      .object({
        readMode: z.string(),
        snapshotTransition: z.string().optional(),
        groups: z.array(
          z.object({
            key: z.string(),
            title: z.string(),
            schemaVersion: z.number().int(),
            fields: z.record(
              z.string(),
              z.object({
                type: z.enum([
                  'number',
                  'string',
                  'boolean',
                  'object',
                  'reviewers',
                ]),
                title: z.string(),
                readMode: z.enum(['snapshot', 'live']).optional(),
                bindings: z
                  .array(
                    z.object({
                      state: z.string().optional(),
                      transition: z.string().optional(),
                    }),
                  )
                  .optional(),
                minimum: z.number().optional(),
                maximum: z.number().optional(),
              }),
            ),
          }),
        ),
      })
      .optional(),
  })
  .meta({ ref: 'CrmApprovalLifecycle' });

// Who may approve (Settings → Approval process): CRM roles and people, any
// one of which is enough.
const approverChoice = {
  roles: z
    .array(
      z.enum(['sales-representative', 'sales-manager', 'system-administrator']),
    )
    .max(3)
    .describe('CRM roles whose holders may approve.'),
  users: z
    .array(z.string().min(1).max(64))
    .max(97)
    .describe('Users who may approve, by id.'),
};
export const ApproverRuleView: z.ZodType<ServiceApproverRuleView> = z
  .object({
    ...approverChoice,
    revision: z
      .number()
      .int()
      .describe('The version of the rule; 0 while it is the default.'),
    updatedById: z
      .string()
      .nullable()
      .describe('Who saved this version; null for the default.'),
    updatedAt: z.string().nullable().describe('When this version was saved.'),
    approvers: z
      .array(z.string())
      .describe(
        'The users the rule names now: active and holding the approve capability.',
      ),
  })
  .meta({ ref: 'CrmApproverRule' });
export const UpdateApproverRuleInput = z
  .object({
    ...approverChoice,
    revision: z
      .number()
      .int()
      .min(0)
      .describe(
        'The version the change was made from; a version saved meanwhile is a conflict (409).',
      ),
    requestId: z
      .string()
      .min(1)
      .max(100)
      .describe(
        'A new id for each save; sent again, the same save is not repeated.',
      ),
  })
  .meta({ ref: 'CrmApproverRuleInput' });

const DemoAccount = z.object({
  username: z.string(),
  name: z.string(),
  role: z.string(),
});
export const DemoDataStatus: z.ZodType<DemoStatus> = z
  .object({
    present: z.boolean(),
    language: z.enum(['zh-CN', 'en-US']).nullable(),
    createdAt: z.string().nullable(),
    records: z.number().int(),
    accounts: z.array(DemoAccount),
    accountsByLanguage: z.object({
      'zh-CN': z.array(DemoAccount),
      'en-US': z.array(DemoAccount),
    }),
    importing: z
      .object({ percent: z.number().int().min(0).max(100).nullable() })
      .nullable()
      .meta({
        description:
          'An import under way: how far it has got, 0 to 100, or null when another server process runs it; null when none runs.',
      }),
    settings: z.array(z.enum(['currency', 'timeZone', 'aiLanguage'])).meta({
      description:
        'The business settings the present import set, those still at their default: the currency to CNY, the time zone to the dataset’s, the AI language to the dataset’s.',
    }),
  })
  .meta({ ref: 'CrmDemoData' });

export const ImportDemoDataInput = z.strictObject({
  language: z.enum(['zh-CN', 'en-US']).optional().meta({
    description: 'The language the dataset is written in; Chinese by default.',
  }),
});

export const PlaceQuery = z.object({
  q: z
    .string()
    .max(100)
    .meta({ description: "A province's or a country's name." }),
});
export const Place: z.ZodType<PlaceMatch> = z
  .object({
    country: z.string(),
    state: z.string().nullable(),
    label: z.string(),
  })
  .meta({ ref: 'CrmPlace' });

export const SubdivisionQuery = z.object({
  country: z.string().meta({ description: 'An ISO 3166-1 alpha-2 code.' }),
});
export const Subdivision = z.object({
  value: z.string().meta({ description: 'Its ISO 3166-2 code.' }),
  label: z.string(),
});

export const SearchQuery = z.object({
  q: z.string().trim().min(1).max(100),
});
export const SearchGroup = z
  .object({
    entity: z.string(),
    total: z.number().int(),
    rows: z.array(JsonObject),
    ...TitlesShape,
  })
  .meta({ ref: 'CrmSearchGroup' });

export const ScopeQuery = z.object({
  scope: z.enum(['mine', 'team']).optional().meta({
    description:
      "The reader's own records, or the team's; their own by default.",
  }),
});

// One of the overview's lists, a page at a time.
export const AgendaParams = z.object({
  list: z.enum(['today', 'overdue', 'approvals']),
});
export const AgendaQuery = z.object({
  ...ScopeQuery.shape,
  page: PageQuery.shape.page,
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(AGENDA_PAGE)
    .meta({ description: 'Records per page, five by default.' }),
});

const AgendaPage = z.object({
  data: z.array(JsonObject),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
// The overview and the reports: today's work, what needs attention, this
// month's business and the analyses. The analyses are blocks of their own
// (reports.ts), each shaped for its chart.
export const Dashboard = z
  .object({
    scope: z.enum(['mine', 'team']),
    today: AgendaPage,
    overdue: AgendaPage,
    approvals: AgendaPage,
    attention: z.record(z.string(), z.number()),
    business: z.record(z.string(), z.number().nullable()),
    overall: z.record(z.string(), z.number().nullable()),
    ...TitlesShape,
  })
  .catchall(z.unknown())
  .meta({ ref: 'CrmDashboard' });

// The reader's own suggestions alone: a manager handles a colleague's from
// the record's page.
export const DecisionsQuery = z.object({
  ...PageQuery.shape,
  state: z.enum(['pending', 'all']).optional().meta({
    description: '`all` lists the decided ones too, after those waiting.',
  }),
});
// The in-app notifications the CRM sent the reader, by their ids, for the
// inbox's detail.
export const NoticesQuery = z.object({
  ids: z.string().meta({
    description: 'Notification ids, comma-separated; at most 200.',
  }),
});
export const Notice = z
  .object({
    notificationId: z.string(),
    source: z.literal('crm'),
    kind: z.literal('info'),
    type: z.string().meta({ description: 'What happened.' }),
    subject: z.object({
      type: z.string(),
      id: z.string(),
      label: z.null(),
    }),
    decisionKey: z.null(),
    data: JsonObject.meta({
      description:
        'The record, who did it and when, and for a mention or a reply the comment.',
    }),
    count: z.literal(1),
    resolvedAt: z.null(),
    outcome: z.null(),
  })
  .meta({ ref: 'CrmNotice' });

// An AI suggestion with the record it concerns.
export const Decision = AiEntry.extend({
  entity: z.enum(['leads', 'opportunities', 'approvals', 'tasks']),
  lead: JsonObject.optional(),
  opportunity: JsonObject.optional(),
  approval: JsonObject.optional(),
  task: JsonObject.optional(),
}).meta({ ref: 'CrmDecision' });
export const DecisionsMeta = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  pending: z.number().int().meta({ description: 'How many wait.' }),
});

export const AgentParams = z.object({
  agent: z.enum(['leads', 'opportunities', 'approvals', 'tasks', 'signals']),
});
const ModelRefSchema = z.object({
  modelService: z.string().min(1).max(200),
  model: z.string().min(1).max(200),
});
// How a work agent is set up (work-agents.ts): the model it asks and its
// instructions.
export const WorkAgentSetupInput = z.object({
  model: ModelRefSchema.nullable().meta({
    description: 'The model the work asks; null for the default.',
  }),
  instructions: z.string().max(20_000).nullable().meta({
    description:
      'The instructions every run opens with; null or blank for the shipped ones.',
  }),
});
export const WorkAgentSetup = z
  .object({
    model: ModelRefSchema.nullable().meta({
      description: 'The model an administrator chose; null for the default.',
    }),
    effectiveModel: ModelRefSchema.nullable().meta({
      description:
        'The model the work asks now: the chosen one while an enabled service offers it, else the default; null while there is no chat model.',
    }),
    instructions: z.string().meta({
      description: 'The instructions every run opens with now.',
    }),
    defaultInstructions: z.string(),
    custom: z.boolean().meta({
      description: "Whether the instructions are an administrator's own.",
    }),
  })
  .meta({ ref: 'CrmWorkAgentSetup' });

export const AgentQuery = z.object({
  ...PageQuery.shape,
  trigger: z.string().optional(),
  status: z.string().optional(),
});
const RunStats = z
  .object({
    runs: z.number().int(),
    acceptance: z.number().nullable(),
  })
  .catchall(z.number());
export const AgentOverview = z
  .object({
    agent: z.string(),
    switches: AgentSwitch,
    triggers: z.array(z.string()),
    week: RunStats,
    month: RunStats,
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    runs: z.array(
      z.object({
        id: z.string(),
        recordId: z.string(),
        name: z.string(),
        ownerId: z.unknown(),
        createdAt: z.string(),
        trigger: z.string(),
        status: z.string(),
        recommendation: z.unknown(),
        grade: z.unknown(),
        summary: z.unknown(),
      }),
    ),
  })
  .meta({ ref: 'CrmAgentOverview' });
export const AgentSwitchInput = z.strictObject({
  enabled: z.boolean().optional(),
  triggers: z
    .record(z.string(), z.boolean())
    .optional()
    .meta({ description: 'The triggers to change; the others keep theirs.' }),
});

export const UploadQuery = z.object({
  entity: z
    .enum([
      'leads',
      'companies',
      'contacts',
      'opportunities',
      'tasks',
      'approvals',
    ])
    .optional()
    .meta({
      description: 'The kind of record the files are for; leads by default.',
    }),
  recordId: z.string().optional().meta({
    description:
      "For a comment's files: the record commented on, which the reader need only read.",
  }),
});
export const UploadedAttachment = z.object({
  id: z.string(),
  filename: z.string(),
  contentUrl: z.string(),
});

export const AttachmentsQuery = z.object({
  ids: z.string().meta({ description: 'Comma-separated, at most 100.' }),
});
export const Attachment = z
  .object({
    id: z.string(),
    filename: z.string(),
    createdAt: z.string(),
    mimeType: z.string().nullable(),
    size: z.number().nullable(),
    url: z.string().meta({ description: 'Where its content is read.' }),
  })
  .meta({ ref: 'CrmAttachment' });
export const AttachmentParams = z.object({ attachmentId: z.string() });
export const ContentQuery = z.object({
  inline: z.enum(['1']).optional().meta({
    description:
      'Shown in the browser rather than downloaded, for the types a browser renders safely itself.',
  }),
});

export const ColleaguesQuery = z.object({
  q: z.string().max(100).optional().meta({
    description: 'Part of a name or a username.',
  }),
});
export const Colleague = z
  .object({
    id: z.string(),
    name: z.string(),
    roles: z.array(z.string()).meta({
      description:
        'CRM roles: sales-representative and sales-manager may own records; root administers.',
    }),
    canApprove: z.boolean(),
    current: z.boolean().optional(),
  })
  .meta({ ref: 'CrmColleague' });
