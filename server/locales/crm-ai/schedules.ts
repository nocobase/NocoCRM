import type { Pair } from './index.js';

// The CRM's daily checks as the scheduled tasks page shows them: the
// target's label and description, and the schedule's title and
// description (CrmProvider), in the CRM's working language.
export const scheduleTexts = {
  leadTarget: ['线索巡检', 'Lead signal check'],
  leadTargetDescription: [
    'AI 跟进长时间未联系、没有动静或培育复查到期的线索',
    'The AI follows up leads left uncontacted, gone quiet or due for a nurture review',
  ],
  leadTitle: ['线索每日巡检', 'Daily lead check'],
  leadDescription: [
    '每天检查进行中的线索：新线索太久没联系、跟进中太久没有活动、培育复查到期（天数见 CRM 设置的提醒）。AI 对每条跟进一次，结果进线索负责人的「待我处理」。',
    "Every day, the open leads are checked: a new lead left uncontacted, a working one gone quiet, a nurtured one due for review (the days are the CRM settings' reminders). The AI follows each up once, and the result waits on its owner.",
  ],
  dealTarget: ['商机巡检', 'Opportunity signal check'],
  dealTargetDescription: [
    'AI 跟进没有动静、临近或超过预计成交日期、暂停到期的商机',
    'The AI follows up opportunities gone quiet, near or past their expected close date, or due to resume',
  ],
  dealTitle: ['商机每日巡检', 'Daily opportunity check'],
  dealDescription: [
    '每天检查进行中的商机：太久没有活动、预计成交日期临近或已过、暂停到了预计恢复日期（天数见 CRM 设置的提醒）。AI 对每个跟进一次，结果进商机负责人的「待我处理」。',
    "Every day, the open opportunities are checked: one gone quiet, one whose expected close date is near or past, a paused one due to resume (the days are the CRM settings' reminders). The AI follows each up once, and the result waits on its owner.",
  ],
} as const satisfies Record<string, Pair>;
