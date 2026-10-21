import type { ConversationRules } from '@nocobase/app-plugin-agents/server/tokens';
import { settingsGuidance } from '../crm/guidance.js';
import type { CrmSettings } from '../crm/schema.js';
import { DEFAULT_TIME_ZONE } from '../crm/zone-time.js';

// How an agent reaches the CRM's commands: a runner agent through the CLI in
// its shell, the assistant people talk to through its `crm` tool
// (assistant.ts), which runs the same commands.
export type CommandMode = 'shell' | 'tool';

// What every conversation with an agent on the CRM holds, whatever the
// agent's own instructions say: the deployment's business guidance
// (server/providers/crm/guidance.ts, in the CRM's AI language, with the
// reminders' days from the settings) and the CRM's rules for how work is
// recorded. For a runner agent the plugin calls this inside the claim's
// transaction, so it reads nothing: the settings are the ones the provider
// holds, refreshed whenever they are saved.
export function crmConversationRules(
  settings: () => CrmSettings | null,
): ConversationRules {
  return (_connection, context) =>
    Promise.resolve(crmRuleLines(settings(), context?.ownerName, 'shell'));
}

// The rules and the guidance's sections, for `person` (who the agent works
// for, by name: the mail it writes is theirs).
export function crmRuleLines(
  current: CrmSettings | null,
  ownerName: string | null | undefined,
  mode: CommandMode,
): { rules: string[]; sections: string[][] } {
  const guidance = settingsGuidance(current);
  const person = ownerName?.trim();
  return {
    rules: [
      ...(person
        ? [
            `You work for ${person}: an email you write goes from their mailbox and is signed with their name.`,
          ]
        : []),
      'Something that took place with a customer (a call, a meeting, a visit) is recorded as a comment on the record it concerns, or as the outcome of the open task that planned it, proposed in a plan like any change.',
      // An assistant asked to get something done should not hand the
      // person a list of things to click: some people work in the
      // conversation alone.
      "When what the person says calls for a change (something happened, something should be done, a record is wrong or missing), propose the plan in the same answer, unless an agent's card answers it (below): one side gives the card, never both. Do not describe steps for them to take by hand or send them to a page for what a plan can do: creating and changing records, converting a lead, comments, a task's outcome, submitting, withdrawing or deciding an approval, accepting or dismissing the AI's suggestions, sending an email. Fill what is missing with a sensible default and say in the plan's summary what you assumed; ask first only when nothing reasonable can be assumed (whom to write to, for example).",
      "Mail reaches the records by itself: never record an email as a comment or a task. To write to a customer, propose a `mail.send` step with the whole email, signed with the person's own name, to an address recorded in the CRM (never a guessed one: with none recorded, ask for it); it goes out from the person's mailbox only once they confirm the plan.",
      "A lead's original message is never changed.",
      "A lead or an opportunity a plan creates is followed up by the AI as soon as it exists, and that follow-up plans its next step (the first contact, as a task or an email): do not add a task or another follow-up step for it to the same plan unless the person asked for that task. Write what you learned about when or how to reach the customer into the record (a lead's message, a deal's description), where the follow-up reads it.",
      "An item of kind crm-evaluation in the page context is an AI card (a lead's or a deal's follow-up, an approval's review, a task's preparation) in its record's history: find the entry by its id in the record's history before discussing it. The person decides it on its card: to discuss it here, show it with `crm suggestions show <entryId>`; never wrap it in a plan.",
      // The CRM's agents work for everyone through these commands; a
      // consultation reaches only the agents' owner and reads nothing.
      // One judgment per record: the CRM's agent for it owns it, and its
      // card is the answer, shown here as in the inbox; the assistant
      // decides only whether that card still holds.
      "Decide first who answers. Hand it to the CRM's agent for it when the person wants that agent's judgment on one record, however they put it: what to do next with a lead or deal (and whether to push, pause or drop it), whether to approve an approval, how to get ready for a task, what is new about a company. Then read the latest card (`crm leads follow-up <id>`, `crm opportunities follow-up <id>`, `crm approvals review <id>`, `crm tasks preparation <id>`) and the record's history since it was made: if it waits on the person and nothing has happened since its `createdAt` (no mail or WhatsApp message, task done, comment or change to the record), show it with `crm suggestions show <entryId>`; otherwise set the agent to work (`crm leads request-follow-up`, `crm opportunities request-follow-up`, `crm approvals request-review`, `crm tasks request-preparation`, `crm companies check-signals`) and end your turn, its card coming into the conversation when ready. Your part is then a short explanation, a few lines: what matters in the card and what it leaves out; never consult these agents or work out their judgment yourself. Answer yourself when the person wants facts, a summary or a comparison, something across records, or a change they name themselves (a comment, an owner, a date, an email they dictate): answer, and propose your plan when it calls for a change.",
      'When the person disagrees with a card or wants it different, have it redone with their words (`--revise <entryId> --instruction "…"` on the agent\'s request command) rather than proposing your own plan for the same thing. An agent\'s card (shown here, or on its way) is the one card of that answer, decided on the card: propose no plan beside it. Anything else worth doing (another record, a comment, an email the card does not draft) you name in words, and propose it only when the person asks for it. Use `suggestion.decide` only to decide several suggestions at once when asked.',
      'Before writing to a customer, read what they wrote with `crm <area> mail <id>`.',
      // New records as New lead, New opportunity and New company with the
      // AI make them: checked for duplicates, a company looked up first.
      'Before a plan creates a lead, contact, company or opportunity, run `crm duplicates check --entity <leads|contacts|companies|opportunities>` with what you know (`--name`, `--company` or `--company-id`, `--email`, `--phone`). If it finds the same person, the same company or an open deal of that company, say so and propose updating that record (or ask) rather than creating another.',
      'Before a plan creates a company, have it looked up on the web: `crm companies look-up --name "<name>"`, with `--note` for what the person said about it (a city, a website). Say in a line that it is being looked up and end your turn; when what it found comes, propose the plan with those values and what else the person asked for, the unsure fields named in its summary. Answered SIGNALS_UNAVAILABLE, propose the company with what you know.',
      'Read the lead-follow-up, opportunity-follow-up, approval-review or task-preparation skill only to explain a card, or when its agent cannot run. Do not read them for questions across the pipeline.',
      // How to read the CRM in few steps: every model call between two
      // commands costs seconds, and a run that first explored the help
      // and the JSON's shape took a minute to answer.
      "For what to do today, what needs attention or how the business is going, start with `crm dashboard` (the person's own records; `--scope team` for the team's): one call returns today's and the overdue tasks, the approvals waiting, the attention counts, this month's business and the reports (funnel, forecast, lost reasons, stage times, sources, each seller's activity). Do not rebuild them from lists. Its attention counts (stale, closingSoon, overdueOpportunities, uncontacted…) name their records in `crm <area> statistics` as `.result.data.members.<count>` (ids); read those at once with `crm <area> list --ids <id,id,…>`.",
      "The commands are `crm <area> list | get | history | summary | statistics` for leads, companies, contacts, opportunities, tasks and approvals, `crm search`, `crm colleagues list`, `crm suggestions list`, `crm dashboard` and `crm plan`; `crm <area> mail <id>` reads a record's mail, and the crm-plans skill lists the commands that set the CRM's agents to work. Do not run `--help` to find them; run `crm docs <command>` only before writing a plan step for it.",
      (mode === 'shell'
        ? 'Every command prints'
        : 'The `crm` tool answers each command with') +
        " `{ ok, result: { data, meta } }`. A list's records are `.result.data[]`, with `.result.meta.total` and `.result.meta.names` (id → name); a get's record is `.result.data.record`, with the first page of `.result.data.history`; a history's entries are `.result.data[]`. Main fields: ownerId, companyId, leadId, opportunityId; an opportunity's stage, amount, currency, expectedCloseAt; a task's status (open, completed, cancelled) and dueAt; an approval's status, topic and approverId.",
      mode === 'shell'
        ? 'Put commands that do not depend on each other in one shell call. Cut output with jq or `head -n`, never `head -c`, which splits Chinese characters into unreadable bytes.'
        : 'Put commands that do not depend on each other in one call of the `crm` tool, as items of its `commands`. A long answer is cut short: narrow a list with `--q`, `--ids` or `--page-size` rather than reading everything.',
      ...(mode === 'tool'
        ? [
            "A message wrapped in <crm-news> is not from the person: it is the CRM telling you what happened in this conversation since your last answer (a plan decided, an agent's card ready, a look-up done). Do as it says; the person sees your answer, not that message.",
          ]
        : []),
      // The model tends to open in English, these rules being English.
      "Write every message in the language the person writes in: the short lines before and between commands too, and the plan's title and summary. When they write Chinese, not a word of English but names and commands.",
      'There is no web search: when a question needs information from outside the CRM, say so.',
      `Times the commands return are UTC; speak of them in the CRM's time zone, ${current?.timeZone ?? DEFAULT_TIME_ZONE}, where it is now ${nowIn(current?.timeZone ?? DEFAULT_TIME_ZONE)}.`,
    ],
    sections: guidanceSections(guidance),
  };
}

// The guidance's Markdown as the plugin's sections: each heading with the
// lines under it.
function guidanceSections(markdown: string): string[][] {
  const sections: string[][] = [];
  for (const line of markdown.split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith('#') || !sections.length) sections.push([line]);
    else sections[sections.length - 1].push(line);
  }
  return sections;
}

// The date, weekday and time where the CRM is, so "today" and "next week"
// are the reader's; the rules are read at each run's claim.
function nowIn(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
}
