import type { AppResource } from './en-US.js';
import { crmZh } from './crm/index.js';

const zhCN: AppResource = {
  crm: crmZh,
  'auth.welcome': '欢迎回来',
  'auth.loginDescription': '使用用户名或邮箱和密码登录。',
  'auth.forgotTitle': '忘记密码',
  'auth.forgotDescription': '输入邮箱，如果账户存在，我们将发送重置链接。',
  'auth.resetTitle': '重置密码',
  'auth.resetDescription': '为账户设置新密码。',
  'auth.identifier': '用户名或邮箱',
  'auth.password': '密码',
  'auth.signIn': '登录',
  'auth.signInLink': '登录',
  'auth.signingIn': '正在登录…',
  'auth.hidePassword': '隐藏密码',
  'auth.showPassword': '显示密码',
  'auth.forgotLink': '忘记密码？',
  'auth.signUp': '注册',
  'auth.createAccount': '创建账户',
  'auth.creatingAccount': '正在创建账户…',
  'auth.name': '姓名',
  'auth.username': '用户名',
  'auth.email': '邮箱',
  'auth.confirmPassword': '确认密码',
  'auth.existingAccount': '已有账户？',
  'auth.resetting': '正在重置…',
  'auth.newPassword': '新密码',
  'auth.confirmNewPassword': '确认新密码',
  'auth.invalidResetLink': '此密码重置链接无效或已过期。',
  'auth.returnTo': '返回',
  'auth.sendResetLink': '发送重置链接',
  'auth.sending': '正在发送…',
  'auth.resetSent': '如果账户存在，重置链接已发送。',
  'auth.rememberPassword': '记得密码？',
  'auth.methods': '登录方式',
  'auth.continueWith': '或使用以下方式继续',
  'auth.about': '关于此应用',
  'auth.marketingDescription':
    '让 AI 在灵活的前端框架上构建体验，由 NocoBase 保障底层数据、权限、工作流与治理。',
  'auth.platform': 'AI 原生应用平台',
  'auth.frontendDescription': '在灵活的框架上自由构建界面。',
  'auth.frontend': 'AI 原生前端',
  'auth.foundationDescription': '可靠的数据、访问控制、工作流与治理。',
  'auth.foundation': 'NocoBase 基础能力',
  'auth.marketingFooter': '自由构建，可靠支撑。',
  'auth.marketingTitleFirst': '让 AI 自由构建。',
  'auth.marketingTitleSecond': 'NocoBase 保障',
  'auth.marketingTitleThird': '可靠运行。',
  'status.loading': '加载中',
  'status.loadingPage': '正在加载页面',
  'status.loadingSettings': '正在加载设置',
  'status.loadingDev': '正在加载开发工具',
  'status.denied': '无权访问',
  'status.pageFailed': '无法加载页面',
  'status.retry': '重试',
  // Display text of the CRM's AI tools (server/ai/tools), keyed by their
  // English source text as the AI Employee plugin requires.
  'Search CRM records': '搜索 CRM 记录',
  'Finds leads, accounts, contacts, opportunities, activities and approvals the current user may read, a page at a time.':
    '按页查找当前用户可读的线索、客户、联系人、商机、活动和审批。',
  'Read a CRM record': '读取一条 CRM 记录',
  'Reads one record in full, with its change history, related records and what the current user may do to it.':
    '完整读取一条记录，包括变更历史、关联记录和当前用户可执行的操作。',
  'Create a CRM record': '创建 CRM 记录',
  'Creates a lead, account, contact, opportunity, activity or approval once the user confirms the values.':
    '在用户确认字段值后创建线索、客户、联系人、商机、活动或审批。',
  'Update a CRM record': '修改 CRM 记录',
  'Changes the fields of an existing record once the user confirms the new values.':
    '在用户确认新值后修改已有记录的字段。',
  'Delete a CRM record': '删除 CRM 记录',
  'Deletes one record once the user confirms; it cannot be undone.':
    '在用户确认后删除一条记录，无法撤销。',
  'Convert a lead': '转化线索',
  'Turns a lead into an account and a contact, optionally with an opportunity, once the user confirms.':
    '在用户确认后把线索转化为客户和联系人，可同时创建商机。',
  'Decide on an approval': '处理审批',
  'Submits, withdraws, approves or rejects an approval request once the user confirms.':
    '在用户确认后提交、撤回、通过或拒绝一条审批申请。',
  'List CRM users': '列出 CRM 用户',
  'Lists the users who hold a CRM role, with their ids, so a record can be given an owner or an approver by name.':
    '列出拥有 CRM 角色的用户及其 ID，以便按姓名指定负责人或审批人。',
  'navigation.brandHome': 'NocoCRM 首页',
  'navigation.brandApps': 'NocoBase 应用',
  'auth.passwordMismatch': '两次输入的密码不一致。',
  'routeOverlay.close': '关闭',
  'status.deniedDescription': '你没有访问 {{label}} 的权限。',
  'status.routeFailedDescription':
    '无法加载 {{packageName}} 的路由 {{label}}。',
  shell: {
    workspace: 'AI 应用工作区',
    buildFreely: 'AI 自由构建。',
    reliability: '<brand>NocoBase</brand> 保障可靠。',
  },
  surface: {
    backToApp: '返回应用',
    loading: '正在加载{{title}}',
    navigation: '{{title}}导航',
    page: '{{title}}页面',
  },
  settings: {
    title: '设置',
    emptyTitle: '暂无可用设置',
    emptyDescription: '没有已启用的插件提供你有权访问的设置页面。',
  },
  dev: {
    componentExamples: '组件示例',
    title: '开发工具',
    emptyTitle: '暂无可用开发工具',
    emptyDescription: '没有已启用的插件提供你有权访问的开发页面。',
  },
  home: {
    title: '开始构建你的应用',
    description: '向 AI 助手描述你的需求，逐步构建页面、数据模型和业务流程。',
  },

  appearance: {
    title: '外观',
    mode: '颜色模式',
    preset: '主题',
    light: '浅色',
    dark: '深色',
    system: '跟随系统',
    themes: { default: '宽松', compact: '紧凑' },
  },
  app: {
    title: 'NocoCRM',
  },
  actions: {
    close: '关闭',
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    language: '语言',
  },
  notices: {
    serverLocaleFallback: '服务端不支持该语言，服务端内容已回落为英文。',
    languageChangeFailed: '未能完成语言切换，请重试。',
  },
  account: {
    signOutFailed: '退出登录失败，请重试。',
    openMenu: '打开账户菜单',
    fallback: '账户',
    signOut: '退出登录',
    signingOut: '正在退出…',
  },
  navigation: {
    home: '工作台',
    open: '打开导航',
    close: '关闭导航',
    expand: '展开导航',
    collapse: '收起导航',
    label: '应用导航',
    breadcrumb: '面包屑',
  },
};

export default zhCN;
