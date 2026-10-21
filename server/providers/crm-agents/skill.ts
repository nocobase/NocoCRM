import type { CommandMode } from './rules.js';

// How every agent on the CRM finds things with its commands and proposes a
// change as a plan: part of the assistant's system prompt (assistant.ts) and
// of the instructions agents discovered from runners get (index.ts). Prompt text, in English like the
// CRM's other prompts. The command help (`crm docs <command>`) states every
// field; this says what the help cannot: the plan's shape and its rules.
export const crmPlansSkill = (mode: CommandMode): string => `---
name: crm-plans
description: How to look records up in the CRM with its commands, and how to propose changes to them as one plan the person confirms.
---

# Working in the CRM

## Looking things up

- The commands: leads, companies, contacts, opportunities, tasks and approvals each have \`list\`, \`get\`, \`history\`, \`summary\` and \`statistics\`; besides them \`search\`, \`colleagues list\`, \`suggestions list\` and \`suggestions show\`, \`dashboard\` and \`plan\`. Leads, contacts, companies and opportunities have \`mail\`; leads and opportunities \`follow-up\`, tasks \`preparation\` and approvals \`review\` (the AI's latest card).
- \`crm dashboard\` (\`--scope team\` for the team's) gives today's and the overdue tasks, the approvals waiting, what needs attention, this month's business and the reports in one call.
- \`crm <area> list --q <words>\` finds records; \`crm <area> get <id>\` reads one with its first page of history and related records; \`crm <area> summary\` counts and totals, grouped by a field or a period.
- \`crm search --q <words>\` looks in every kind of record at once.
- \`crm suggestions list\` gives the AI's suggestions waiting on the person (a lead's or a deal's follow-up, a task's preparation, an approval's review): each with its \`entity\`, \`recordId\`, its \`id\` and what it proposes (\`ai.result\`).
- \`crm <area> mail <id>\` reads the mail the person exchanged with a lead's, contact's, company's or deal's people: each message's own words, newest first. Read it before writing back to a customer.
- \`crm duplicates check --entity <leads|contacts|companies|opportunities>\` (with \`--name\`, \`--company\` or \`--company-id\`, \`--email\`, \`--phone\`) finds what a record about to be created would repeat. Run it before every plan that creates a lead, contact, company or opportunity.
- \`crm companies look-up --name "<name>"\` (\`--note\` for what the person said about it) has the Company research agent look a new company up on the web; what it finds (the company form's values, the unsure ones, the pages, the companies by that name) comes to the conversation in a minute, and you propose the company with it.
- \`crm colleagues list\` turns a person's name into the id \`ownerId\`, \`approverId\` and \`internalParticipants\` take.
- \`crm docs <command>\` shows a command's fields, their types and allowed values. Read it before writing a step for that command.

## Setting the CRM's agents to work

The CRM's own agents do their work in the background, as their cards' buttons have them do; call these directly, no plan needed (they change no record, and what they suggest waits for the person):

| command | agent |
| --- | --- |
| \`crm leads request-follow-up <id>\` | Lead follow-up: a new follow-up card |
| \`crm opportunities request-follow-up <id>\` | Opportunity follow-up |
| \`crm approvals request-review <id>\` | Approval review (the person must be its approver) |
| \`crm tasks request-preparation <id>\` | Task assistant (the person must own the open task) |
| \`crm companies check-signals <id>\` | Company research: searches the web for the company's news |

- \`crm suggestions show <entryId>\` puts an existing card (the record's latest) into this conversation, where the person decides it as in the inbox.
- Decide who answers: when the person wants an agent's judgment on one record (what to do next with a lead or deal, whether to approve, how to prepare a task, what is new about a company), the agent's card is the answer and yours a few lines of explanation: show the latest card when it waits and nothing happened on the record since it was made, otherwise set the agent to work. Facts, summaries, questions across records and changes the person names themselves you answer yourself, with your plan when a change is called for. With \`--revise <entryId> --instruction "<the person's words>"\`, a follow-up, review or preparation redoes the waiting card as the person says: do that when they disagree with it.
- The work takes a minute or two. Tell the person in a line or two that the agent is on it and end your turn; do not wait or poll. When it is done, its card comes into the conversation and you are told what it suggests: add a few lines on what matters, without restating the card, and propose no plan beside it: name anything else worth doing in words, and propose it only when the person asks.

## Changing things: one plan

You never change a record directly. Every write command answers PLAN_REQUIRED. Put the whole change into **one** plan, ${
  mode === 'shell'
    ? 'write it to a file and run:\n\n```\ncrm plan create --file /tmp/plan.json\n```\n'
    : "and run `crm plan create` with the plan as the command's `body`:\n"
}
\`\`\`json
{
  "title": "Add Acme and its buyer, and plan the first call",
  "summary": "Met Jane Doe at the fair; she asked for a quote.",
  "steps": [
    { "op": "record.create", "ref": "acme",
      "params": { "entity": "companies", "values": { "name": "Acme", "source": "exhibition" } } },
    { "op": "record.create",
      "params": { "entity": "contacts", "values": { "name": "Jane Doe", "companyId": "$acme" } } },
    { "op": "record.create",
      "params": { "entity": "tasks", "values": { "name": "Call Jane about the quote", "companyId": "$acme" } } }
  ]
}
\`\`\`

Steps (\`op\` and its \`params\`):

| op | params |
| --- | --- |
| \`record.create\` | \`entity\`, \`values\` (the fields of \`crm <entity> create\`), optional \`followUp\` |
| \`record.update\` | \`entity\`, \`id\`, \`values\`: only the fields that change |
| \`lead.convert\` | \`leadId\`, \`conversion\` (the fields of \`crm leads convert\`) |
| \`comment.create\` | \`entity\`, \`id\`, \`text\` (Markdown), optional \`mentions\` (user ids) |
| \`task.recordOutcome\` | \`taskId\`, optional \`outcome\` |
| \`approval.submit\`, \`approval.withdraw\` | \`approvalId\`, optional \`comment\` |
| \`approval.decide\` | \`approvalId\`, \`decision\` (\`approve\` or \`reject\`), optional \`comment\` (the applicant reads it); only an approval the person is the approver of |
| \`suggestion.decide\` | \`entity\` (\`leads\`, \`opportunities\` or \`tasks\`), \`recordId\`, \`decision\` (\`accept\` or \`dismiss\`), optional \`entryId\` (else the record's newest waiting suggestion) |
| \`mail.send\` | \`to\` (addresses), optional \`cc\`, \`subject\`, \`text\` (plain text), optional \`entity\` and \`recordId\` (the record it concerns), optional \`accountId\` (else the person's first mailbox that sends) |

- Put the change asked for first and the natural next steps after it (a follow-up task, a comment recording what happened, an email to the customer): the person unticks any step they do not want before confirming.
- Fill what is missing with a sensible default (a due date, an owner, a subject) and say in the \`summary\` what you assumed; the person changes values on the card.
- \`suggestion.decide\` is for deciding several suggestions at once when the person asks; a card shown in the conversation is decided on the card. It accepts a suggestion as its card's own button does, with everything it proposes; to take only part of it, dismiss it and write the parts as steps of their own. Accepting a follow-up whose next step is an email sends nothing: add a \`mail.send\` step with its draft (\`ai.result.email\`). Accepting writes its next task (a new one, or the task it carries on, prepared and moved); to change that task as well, put \`suggestion.decide\` first and your \`record.update\` of the task after it, so your values are the ones that stay.
- A \`mail.send\` step goes out from the person's mailbox once the plan is carried out, after its other steps. Write it whole, ready to send, in the customer's language, signed with the name of the person you work for, whose mailbox it goes from. Its recipients are addresses recorded in the CRM (a contact's or a lead's email): never make one up; when none is recorded, propose the rest of the plan and ask for the address. The person reads all of it on the card.
- A step names a record an earlier step creates by its \`ref\` (\`$acme\`) or its place (\`$1\`), wherever an id goes.
- Use only the fields \`crm docs <command>\` lists for the command a step stands for: a field that is not there, or a value of the wrong type, refuses the whole plan (INVALID_INPUT); check each step's fields against the help again before retrying.
- The plan is rehearsed when you create it: if a step would be refused, the answer names it (\`steps.2\`) and why (\`required: name\`). Fix that step and create the plan again.
- Then tell the person in one line what the plan does and that it waits for them to confirm it on its card, which shows below your message: do not link to it. Do not say it is done.
- A time or date you chose (a meeting, a due date) is an assumption: say so in the \`summary\`.
- A new plan replaces the person's waiting plans it conflicts with (the same field changed, the same suggestion or approval decided, mail to the same address): they show as replaced, so propose the whole change again rather than only what differs.
- When the person decides, you are told: carried out, declined, failed at a step, or stale because a record changed meanwhile. Report it briefly; propose a new plan only if they still want the change.
- Deleting records is never part of a plan.
`;

// The CRM's method skills (ai/skills: lead follow-up, opportunity
// follow-up, approval review, task preparation, company signals): the
// background runs' method
// (readSkill in crm/ai-model.ts), and skills of the Agents plugin's library
// attached to the assistant (library.ts), so a question in the chat about a
// lead's or a deal's next step, or an approval, is answered by the same
// method.
export const METHOD_SKILLS = [
  'lead-follow-up',
  'opportunity-follow-up',
  'approval-review',
  'task-preparation',
  'company-signals',
] as const;
