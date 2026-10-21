import type {
  AppUIMessage,
  StepLine,
} from '@nocobase/app-plugin-agents/client/chat';

// What the agent's run is doing, in the person's words rather than the
// command it runs: the plugin sums a run up as thinking, reading or working
// on a subject, and the subject of the CRM's agent is its CLI command line
// (`crm leads list --q "顺丰" --json | head -50`), which reads as noise. The
// command's object and verb, and what it searches for, say it plainly; a
// CRM command it does not know reads as querying the CRM, and any other
// command as working, so no command line ever shows. No imports beyond
// types, so the tests read it directly.

// The CRM's objects as its commands name them, singular or plural.
const OBJECTS: Record<string, string> = {
  lead: 'leads',
  leads: 'leads',
  company: 'companies',
  companies: 'companies',
  opportunity: 'opportunities',
  opportunities: 'opportunities',
  deal: 'opportunities',
  deals: 'opportunities',
  contact: 'contacts',
  contacts: 'contacts',
  task: 'tasks',
  tasks: 'tasks',
  approval: 'approvals',
  approvals: 'approvals',
};

export interface StepWords {
  // The key under `agentChat.step` and its values.
  readonly key: string;
  readonly values?: Record<string, string>;
}

export function stepWords(line: StepLine): StepWords {
  if (line.kind === 'thinking') return { key: 'thinking' };
  const subject = line.subject.trim();
  // A skill the run loads: the method it works by.
  if (/^skill\b/iu.test(subject)) return { key: 'skill' };
  const command = /(?:^|[\s;&|(])crm\s+([a-z-]+)(?:\s+([a-z-]+))?/iu.exec(
    subject,
  );
  if (!command) return { key: line.kind === 'reading' ? 'reading' : 'working' };
  const [, first, second] = command;
  if (/--help\b/u.test(subject) || first === 'docs') return { key: 'help' };
  if (first === 'colleagues') return { key: 'colleagues' };
  const query = /--q\s+(?:"([^"]+)"|'([^']+)'|(\S+))/u.exec(subject);
  const q = query ? (query[1] ?? query[2] ?? query[3] ?? '') : '';
  if (first === 'search')
    return q ? { key: 'search', values: { q } } : { key: 'crm' };
  if (first === 'plan' || first === 'plans') return { key: 'plan' };
  const object = OBJECTS[first.toLowerCase()];
  if (!object) return { key: 'crm' };
  const verb = (second ?? '').toLowerCase();
  if (verb === 'list')
    return q
      ? { key: 'find', values: { object, q } }
      : { key: 'list', values: { object } };
  if (verb === 'get') return { key: 'get', values: { object } };
  if (verb === 'history') return { key: 'history', values: { object } };
  if (verb === 'summary' || verb === 'statistics')
    return { key: 'summary', values: { object } };
  return { key: 'read', values: { object } };
}

// What the assistant is doing now, from the last step of the reply it is
// writing: a command it runs (the `crm` tool's first line), reading a
// method skill, else thinking.
export function liveStep(message: AppUIMessage | undefined): StepLine {
  if (message?.role !== 'assistant') return { kind: 'thinking' };
  const part = message.parts.at(-1);
  if (!part) return { kind: 'thinking' };
  if (part.type === 'tool-crm_skill')
    return { kind: 'reading', subject: 'skill' };
  if (part.type === 'tool-crm') {
    const lines = (part.input as { lines?: unknown } | undefined)?.lines;
    const line = Array.isArray(lines) ? String(lines[0] ?? '') : '';
    return line
      ? {
          kind: 'reading',
          subject: /^crm\s/u.test(line) ? line : `crm ${line}`,
        }
      : { kind: 'reading', subject: 'crm' };
  }
  return { kind: 'thinking' };
}
