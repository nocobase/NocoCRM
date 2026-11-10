import fileUi from '../extensions/nocobase-file-component-ui/locales/zh-CN.js';
import type { AppResource } from './en-US.js';
import { crmZh } from './crm/index.js';
import systemZhCN from './system/zh-CN.js';

const zhCN: AppResource = {
  // The template's own copy; see `./en-US.ts`.
  ...systemZhCN,
  ...fileUi,
  settings: {
    ...systemZhCN.settings,
    usersDescription:
      '管理账户、角色及登录会话。新账户默认选中成员角色，可替换或移除；没有角色的账户仅保留账户基础功能。',
  },
  crm: crmZh,
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
  listToolbar: {
    filters: '筛选',
    filtersApplied: '筛选（已选 {{count}} 项）',
    removeFilter: '移除「{{name}}」筛选',
    clear: '清除筛选',
    keyword: '关键词',
    noMatches: '没有匹配项',
    searchPeople: '搜索人员',
  },
  navigation: { ...systemZhCN.navigation, home: '工作台' },
};

export default zhCN;
