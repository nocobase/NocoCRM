import type { AppResource } from './en-US.js';
import { crmZh } from './crm/index.js';
import systemZhCN from './system/zh-CN.js';

const zhCN: AppResource = {
  // The template's own copy; see `./en-US.ts`.
  ...systemZhCN,
  settings: {
    ...systemZhCN.settings,
    usersDescription:
      '管理账户、角色及登录会话。新账户默认选中成员角色，可替换或移除；没有角色的账户仅保留账户基础功能。',
  },
  crm: crmZh,
  // Display text of the CRM's AI skills (ai/skills/<name>): the title and
  // description of each SKILL.md, keyed by that English text as the AI
  // Employee plugin requires; the Chinese is SKILL-zh.md's.
  'Lead follow-up': '跟进线索',
  'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    '综合查看一条线索现在的全部信息（线索本身、任务、备注和 CRM 里的相关记录），给出下一步建议：继续跟进、放入培育、转化还是无效，以及理由；继续跟进时写清楚怎么跟、具体做什么。新线索进来、用户要求跟进或重新跟进、或问"这条线索下一步怎么做"时使用。',
  'Opportunity follow-up': '跟进商机',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    '综合查看一个商机现在的全部信息（商机本身、公司、联系人和角色、任务、备注、审批、来源线索），判断它的阶段站不站得住、下一步做什么：推进到下一阶段、留在本阶段继续推进、暂停还是输单，以及理由、风险和要补的缺口；推进时写清楚具体做什么。线索转化出新商机、记录了商机任务的结果、用户要求跟进，或问"这个商机下一步怎么做"时使用。',
  'Approval review': '审批辅助',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    '帮审批人看一个审批申请（折扣、账期、合同条款、交付承诺）值不值得批：申请的条件和标准差多少、对金额和回款的影响、商机的情况和支撑这次让步的证据、同一商机一起提交的其他审批、以往同类审批是怎么批的、风险和申请人没说清的地方，最后给出批准、有条件批准、驳回或需要补充信息的建议，并写好审批意见。审批提交后、审批人问"这个审批该不该批"时使用。',
  'Task preparation': '任务准备',
  "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.":
    '为销售即将和客户进行的任务（电话、会议、拜访、演示）做准备：任务要达成什么、从记录的任务、评论和邮件看事情进展到哪一步、对方都有谁以及各自的角色、要问的问题、要带的材料、风险，以及按顺序要讲的要点。在任务当天早上，或任务负责人要求准备时使用。',
  'navigation.brandHome': 'NocoCRM 首页',
  'navigation.brandApps': 'NocoBase 应用',
  app: { ...systemZhCN.app, title: 'NocoCRM' },
  flowDiagram: {
    ...systemZhCN.flowDiagram,
    empty: '没有可显示的状态。',
    loading: '正在排布流程图…',
    failed: '无法排布这个流程图。',
    nodeHelp: '按回车或空格选中一个状态。',
    edgeHelp: '按回车或空格选中一个转换。',
  },
  loginActivity: {
    heading: '从一条线索，到一笔成交。',
    description:
      'AI 销售团队跟进每条线索和商机，备好每次见面和每个审批，由你拍板。',
    phases: { lead: '线索', deal: '商机', won: '成交' },
    participants: {
      rep: '王小芳',
      leadAgent: 'AI 线索跟进',
      prepAgent: 'AI 任务助手',
      dealAgent: 'AI 商机跟进',
      approvalAgent: 'AI 审批建议',
      manager: '李明',
      customer: '周晓',
    },
    capabilities: {
      capture: 'AI 录入',
      followUp: 'AI 跟进',
      pipeline: '商机管道',
      prep: '任务准备',
      mail: '邮件',
      approval: '审批',
    },
    timeline: '动态',
    lead: {
      kind: '线索',
      title: '周晓 / 星海物流',
      need: '车队调度，200 辆车 · 来自邮件',
      grade: 'A 级',
    },
    deal: {
      kind: '商机',
      title: '车队调度平台（企业版）',
      company: '星海物流',
      amount: '¥320,000',
      owner: '王小芳',
      won: '赢单',
    },
    leadStatuses: { new: '新线索', working: '跟进中', converted: '已转化' },
    stages: {
      qualification: '需求确认',
      proposal: '方案报价',
      negotiation: '商务谈判',
      won: '赢单',
    },
    steps: {
      captured: { who: 'AI', what: '从一封邮件整理出这条线索' },
      leadFollowUp: { who: 'AI 跟进', what: 'A 级，今天 15:00 致电' },
      converted: { who: '王小芳', what: '把线索转化成商机' },
      prepared: { who: 'AI', what: '备好明天的演示，用客户自己的线路' },
      replied: { who: '周晓', what: '付款能否按开票后 60 天？' },
      dealFollowUp: {
        who: 'AI 跟进',
        what: '推进到商务谈判，60 天账期需要审批',
      },
      reviewed: { who: 'AI 审批建议', what: '有条件批准' },
      approved: { who: '李明', what: '批准了 60 天账期' },
      won: { who: '王小芳', what: '盖章合同已回签' },
    },
  },
  navigation: { ...systemZhCN.navigation, home: '工作台' },
};

export default zhCN;
