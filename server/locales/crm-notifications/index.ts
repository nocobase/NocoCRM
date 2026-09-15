const labels: Record<string, [string, string]> = {
  // The object is named: "Lead assigned to you", not "record".
  assigned: ['{{entity}} assigned to you', '{{entity}}已分配给你'],
  invited: ['You were added to an activity', '你被加入活动'],
  removed: ['You were removed from an activity', '你被移出活动'],
  cancelled: ['Activity cancelled', '活动已取消'],
  rescheduled: ['Activity rescheduled', '活动时间已变更'],
  starting: ['Upcoming activity', '活动即将开始'],
  pending: ['Approval requested', '待审批申请'],
  withdrawn: ['Request withdrawn', '审批已撤回'],
  approved: ['Request approved', '审批已通过'],
  rejected: ['Request rejected', '审批已拒绝'],
};
const entityLabels: Record<string, [string, string]> = {
  leads: ['Lead', '线索'],
  accounts: ['Account', '客户'],
  contacts: ['Contact', '联系人'],
  opportunities: ['Opportunity', '商机'],
  activities: ['Activity', '活动'],
  approvals: ['Approval', '审批'],
};
const pick = (
  table: Record<string, [string, string]>,
  index: 0 | 1,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(table).map(([key, pair]) => [key, pair[index]]),
  );
export const notificationLocales = {
  'en-US': async (): Promise<{
    titles: Record<string, string>;
    entities: Record<string, string>;
    body: string;
  }> => ({
    titles: pick(labels, 0),
    entities: pick(entityLabels, 0),
    // The record's name alone: the inbox shows the title itself.
    body: '{{name}}',
  }),
  'zh-CN': async (): Promise<{
    titles: Record<string, string>;
    entities: Record<string, string>;
    body: string;
  }> => ({
    titles: pick(labels, 1),
    entities: pick(entityLabels, 1),
    body: '{{name}}',
  }),
};
