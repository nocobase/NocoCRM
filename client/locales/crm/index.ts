import { adminWording } from './admin.js';

const wording = {
  conversionRate: ['Conversion rate', '转化率'],
  uncontacted: ['Leads awaiting first contact', '待首次跟进线索'],
  uncontactedCard: ['New leads', '新线索'],
  // An empty field the reader may fill, by its label.
  emptyFill: ['Add {{field}}', '填写{{field}}'],
  emptyChoose: ['Choose {{field}}', '选择{{field}}'],
  // A lead's empty original message, under its heading.
  messagePlaceholder: ['Add the original message...', '填写原始信息...'],
  // An empty amount beside its currency (a deal's, a company's revenue).
  amountPlaceholder: ['Add amount', '填写金额'],
  // An opportunity's empty description, under its heading.
  dealDescriptionPlaceholder: ['Add a description...', '填写商机描述...'],
  companyDescriptionPlaceholder: ['Add an introduction...', '填写公司介绍...'],
  taskDescriptionPlaceholder: ['Add a description...', '填写任务描述...'],
  approvalDescriptionPlaceholder: [
    'Describe what is asked...',
    '填写审批内容...',
  ],
  stale: ['Stalled', '停滞'],
  convertedThisMonth: ['Converted this month', '本月转化'],
  converted: ['Converted leads', '已转化线索'],
  newThisMonth: ['New this month', '本月新增'],
  customers: ['Customers', '成交客户'],
  churnedThisMonth: ['Churned this month', '本月流失客户'],
  inactiveContacts: ['Former employees', '已离职人数'],
  missingContact: ['No contact details', '缺少联系方式'],
  todayTasks: ['Today’s tasks', '今日任务'],
  myDecisions: ['Waiting for me', '待我审批'],
  awaitingApproval: ['Awaiting approval', '等待审批'],
  toSubmit: ['To submit', '待提交'],
  approvedThisMonth: ['Approved this month', '本月通过'],
  rejectedThisMonth: ['Rejected this month', '本月拒绝'],
  planned: ['Upcoming', '待进行'],
  overdueTasks: ['Overdue tasks', '逾期任务'],
  cancelled: ['Cancelled', '已取消'],

  opportunityName: ['{{name}} opportunity', '{{name}}商机'],
  workspace: ['Sales workspace', '销售工作台'],
  dashboard: ['Overview', '工作台'],
  // The overview's heading, by the time of day in the CRM's time zone.
  greeting: {
    morning: ['Morning, {{name}}', '早上好，{{name}}'],
    afternoon: ['Afternoon, {{name}}', '下午好，{{name}}'],
    evening: ['Evening, {{name}}', '晚上好，{{name}}'],
  },
  greetingAlone: {
    morning: ['Good morning', '早上好'],
    afternoon: ['Good afternoon', '下午好'],
    evening: ['Good evening', '晚上好'],
  },
  sourcesSection: ['Lead sources', '线索来源'],
  // The overview's own navigation, a row of its sections.
  reportSections: ['Sections of the reports', '报表导航'],
  reportsTitle: ['Reports', '报表'],
  // The four figures that open the reports page.
  keyFigures: ['Key figures', '关键数字'],
  // The Mailbox page's way to the Mail accounts page (pages/crm-mail).
  mailManageAccounts: ['Manage mail accounts', '管理邮箱账户'],
  // The assistant's dock at the bottom of the page (assistant-dock.tsx), the
  // overview's ask box (assistant-ask-box.tsx), and the questions they
  // suggest, by page.
  dock: {
    placeholder: ['Ask anything…', '问任何问题…'],
    attach: ['Attach files', '上传文件'],
    model: ['Model', '模型'],
    // On a record's page, by the kind of record.
    placeholderFor: {
      leads: ['Ask anything about this lead…', '关于此线索，问任何问题…'],
      opportunities: [
        'Ask anything about this opportunity…',
        '关于此商机，问任何问题…',
      ],
      companies: [
        'Ask anything about this company…',
        '关于此公司，问任何问题…',
      ],
      contacts: [
        'Ask anything about this contact…',
        '关于此联系人，问任何问题…',
      ],
      tasks: ['Ask anything about this task…', '关于此任务，问任何问题…'],
      approvals: [
        'Ask anything about this approval…',
        '关于此审批，问任何问题…',
      ],
    },
    open: ['Ask AI', '问 AI'],
    suggestions: ['Suggested questions', '推荐问题'],
    q: {
      home: {
        analyze: ['Analyze sales and make a report', '分析销售情况并生成报告'],
      },
      leads: {
        first: [
          'Which new leads should I contact first?',
          '哪些新线索应该先联系？',
        ],
        quiet: ['Which leads have gone quiet?', '哪些线索很久没有跟进了？'],
      },
      opportunities: {
        closing: [
          'Which opportunities are expected to close this month?',
          '本月预计成交哪些商机？',
        ],
        risk: ['Which opportunities are at risk?', '哪些商机有风险？'],
      },
      companies: {
        quiet: [
          "Which companies haven't been contacted lately?",
          '哪些公司最近没有联系？',
        ],
      },
      contacts: {
        quiet: [
          "Who haven't I been in touch with lately?",
          '最近有哪些联系人没有联系？',
        ],
      },
      tasks: {
        overdue: ["What's overdue?", '有哪些逾期的任务？'],
        week: ["What's on my plate this week?", '我这周有哪些任务？'],
      },
      approvals: {
        waiting: ['Which approvals are waiting on me?', '哪些审批在等我处理？'],
      },
      lead: {
        next: [
          "Is this lead worth pursuing, and what's the next step?",
          '这条线索值得跟进吗？下一步做什么？',
        ],
        summary: ['Summarize this lead', '总结一下这条线索'],
        email: ['Draft a follow-up email', '起草一封跟进邮件'],
      },
      opportunity: {
        missing: [
          "What's missing to move this opportunity forward?",
          '推进这个商机还缺什么？',
        ],
        risk: [
          'What are the risks in this opportunity?',
          '这个商机有哪些风险？',
        ],
        progress: ['Summarize recent progress', '总结最近的进展'],
      },
      company: {
        latest: [
          "What's the latest with this company?",
          '这个公司最近有什么进展？',
        ],
        contacts: ['Who are the key contacts?', '主要联系人是谁？'],
        deals: ['Which opportunities are open?', '有哪些进行中的商机？'],
      },
      contact: {
        exchanges: [
          'Summarize my exchanges with this person',
          '总结我和这位联系人的往来',
        ],
        deals: [
          'Which opportunities is this person involved in?',
          '这位联系人参与了哪些商机？',
        ],
        email: ['Draft a follow-up email', '起草一封跟进邮件'],
      },
      task: {
        prepare: ['Help me prepare for this task', '帮我为这个任务做准备'],
      },
      approval: {
        decide: ['Should this request be approved?', '这个审批该批准吗？'],
      },
    },
  },
  // The global search (client/components/crm/global-search.tsx): the
  // dialog ⌘K opens, its keyword results and its AI answer.
  globalSearch: {
    label: ['Search', '搜索'],
    dialogTitle: ['Search the CRM', '搜索 CRM'],
    placeholder: [
      'Search leads, opportunities, companies, contacts, tasks, approvals…',
      '搜索线索、商机、公司、联系人、任务、审批…',
    ],
    hint: [
      'Search leads, opportunities, companies, contacts, tasks and approvals',
      '搜索线索、商机、公司、联系人、任务和审批',
    ],
    hintAsk: [
      'Or ask a question and let the AI answer',
      '也可以直接提问，让 AI 回答',
    ],
    searching: ['Searching…', '正在搜索…'],
    noResults: ['No matching records', '没有找到匹配的记录'],
    failed: ['The search failed', '搜索失败'],
    retry: ['Try again', '重试'],
    showAllIn: [
      'All {{count}} in {{list}}',
      '在{{list}}中查看全部 {{count}} 条',
    ],
    // The AI's answer in the dialog (search-answer.tsx).
    answering: ['The AI is answering…', 'AI 正在回答…'],
    backToResults: ['Back to results', '返回搜索结果'],
    continueAsking: ['Continue asking', '继续追问'],
    askAbout: ['Ask AI: {{text}}', '问 AI：{{text}}'],
    foundChip: ['Found by AI: {{title}}', 'AI 找到的：{{title}}'],
  },
  assistantLoading: ['Loading the AI configuration…', '正在加载 AI 配置…'],
  loading: ['Loading…', '正在加载…'],
  empty: ['A fresh start', '从这里开始'],
  emptyDescription: [
    'No matching records yet. Add your first record or adjust the filters.',
    '暂无符合条件的记录。创建第一条记录，或调整筛选条件。',
  ],
  create: ['Create', '新建'],
  update: ['Update', '修改'],
  edit: ['Edit', '编辑'],
  remove: ['Remove', '移除'],
  delete: ['Delete', '删除'],
  save: ['Save', '保存'],
  saving: ['Saving…', '正在保存…'],
  cancel: ['Cancel', '取消'],
  back: ['Back', '返回'],
  // A field's name opening its text (a record's intro under its heading),
  // as Markdown: the colon outside the bold in Chinese, where a closing
  // `**` straight after full-width punctuation would not close.
  fieldLead: ['**{{label}}:** ', '**{{label}}**：'],
  confirm: ['Confirm', '确认'],
  yes: ['Yes', '是'],
  no: ['No', '否'],
  choose: ['Select…', '请选择…'],
  selectCountryFirst: ['Select a country first', '请先选择国家 / 地区'],
  // The lead timeline's menu of asks to the AI.
  moreActions: ['More…', '更多…'],
  expand: ['Show details', '展开详情'],
  // Comments in a record's activity feed.
  mail: {
    tab: ['Mail', '邮件'],
    write: ['Write email', '写邮件'],
    send: ['Send email', '发送邮件'],
    to: ['To', '收件人'],
    noSubject: ['(No subject)', '（无主题）'],
    sent: ['Email sent', '邮件已发出'],
    logged: [
      'It shows in the timeline of the records it concerns.',
      '它会出现在相关记录的动态里。',
    ],
    outcomeSent: [
      'Email sent to {{to}}: {{subject}}',
      '已发邮件给 {{to}}：{{subject}}',
    ],
    partial: [
      'The provider rejected these recipients: {{recipients}}.',
      '邮件服务拒收了这些收件人：{{recipients}}。',
    ],
    unknown: [
      'Whether the email was sent could not be confirmed. Check your mailbox before sending again.',
      '无法确认邮件是否已发出，请先到邮箱里确认，再决定是否重发。',
    ],
    failed: [
      'The email could not be sent. Check the delivery result in your mailbox.',
      '邮件没有发出，请到邮箱查看发送结果。',
    ],
    logFailed: [
      'The email was sent, but what was to follow it could not be done. Refresh and try again.',
      '邮件已发出，但后续操作没有完成，请刷新后重试。',
    ],
    noAccount: [
      'Connect your mailbox to see your mail with this record here.',
      '连接你的邮箱后，这里会显示你与这条记录的往来邮件。',
    ],
    connect: ['Connect a mailbox', '连接邮箱'],
    noAddress: [
      'This record has no email address to look for.',
      '这条记录没有可查找的邮箱地址。',
    ],
    empty: [
      'Your mailboxes have no mail with this record yet.',
      '你的邮箱里还没有与这条记录的往来邮件。',
    ],
    // The record's conversations in colleagues' mailboxes (ColleaguesMail
    // in record-mail.tsx), which only their owners open.
    inColleagues: [
      "In colleagues' mailboxes: {{count}}. Only a mailbox's owner opens its mail.",
      '同事邮箱里的往来：{{count}} 个会话，只有邮箱主人能打开原文。',
    ],
    mailboxOf: ["In {{name}}'s mailbox", '在{{name}}的邮箱'],
    loadFailed: ['Mail could not be loaded.', '邮件加载失败。'],
    scope: ['Your mail with {{terms}}', '你与 {{terms}} 的往来邮件'],
    scopeCompany: ['Your mail with {{name}}', '你与{{name}}的往来邮件'],
    scopeContacts: ['{{count}} contacts', '{{count}} 位联系人'],
    scopeDomain: ['everyone at @{{domain}}', '@{{domain}} 的所有人'],
    scopeAnd: [' and ', '和'],
    scopeDeal: [
      "Your mail with the deal's {{count}} contacts",
      '你与本商机 {{count}} 位联系人的往来邮件',
    ],
    scopeDealCompany: [
      "Your mail with the company's {{count}} contacts",
      '你与公司的 {{count}} 位联系人的往来邮件',
    ],
  },
  comments: {
    lastFileRemovesComment: [
      'This file is all the comment holds: removing it deletes the comment.',
      '这个附件是这条评论唯一的内容，移除后整条评论会被删除。',
    ],
    label: ['Comment', '评论'],
    // Worded as the UI Library's comment composer.
    placeholder: [
      'Leave a comment… Type @ to mention someone',
      '写评论… 输入 @ 提及同事',
    ],
    add: ['Add comment', '添加评论'],
    // The comment box's button.
    post: ['Comment', '评论'],
    shortcut: [
      'Enter to send · Shift + Enter for a new line',
      '回车发送 · Shift + 回车换行',
    ],
    edited: ['Edited', '已编辑'],
    // Deleting one, asked once more.
    deleteTitle: ['Delete this comment?', '删除这条评论？'],
    deleteHint: [
      'A comment with replies keeps its place, marked as deleted.',
      '有回复的评论会保留位置，显示为已删除。',
    ],
    // Replies under a comment, in its thread.
    reply: ['Reply', '回复'],
    // A long thread's folded middle.
    moreReplies: ['Show {{count}} more replies', '展开另外 {{count}} 条回复'],
    // After a reply's author: whom it answers.
    replyTo: ['replied to {{name}}', '回复 {{name}}'],
    replyPlaceholder: [
      'Write a reply… Type @ to mention someone',
      '写回复… 输入 @ 提及同事',
    ],
    // A comment deleted while it had replies, its place kept for them.
    deleted: ['This comment was deleted', '此评论已删除'],
    // The comment and reply boxes' paperclip, and its files on their way up.
    attach: ['Attach files', '添加附件'],
    uploading: ['Uploading…', '上传中…'],
  },
  collapse: ['Hide details', '收起详情'],
  leadGroups: {
    general: ['General', '概况'],
    contact: ['Contact', '联系人'],
    company: ['Company', '公司'],
  },
  // The task page's particulars, grouped as the lead's.
  // A task's time in its whole form.
  taskTime: {
    pickDate: ['Pick a date', '选择日期'],
    timeOfDay: ['Time of day', '时刻'],
    noTime: ['No time', '不定时刻'],
    clear: ['Clear the time', '清除时间'],
  },
  // The task list: what is to do, then what is done or cancelled.
  taskList: {
    open: ['Not done', '未完成'],
    done: ['Closed', '已结束'],
    nothingOpen: ['Nothing left to do', '没有未完成的任务'],
    nothingDone: ['Nothing closed', '没有已结束的任务'],
    complete: ['Mark as completed', '标记为已完成'],
    reopen: ['Open again', '重新打开'],
    // The task page's table, its tasks to do by when they are due.
    record: ['Record', '关联记录'],
    groups: {
      overdue: ['Overdue', '已逾期'],
      today: ['Today', '今天'],
      tomorrow: ['Tomorrow', '明天'],
      thisWeek: ['Later this week', '本周'],
      later: ['Later', '以后'],
      noTime: ['No time', '无时间'],
      closed: ['Closed', '已结束'],
    },
  },
  // A new task's quick form: a title, a description and chips.
  taskQuick: {
    titlePlaceholder: ['Task title', '任务标题'],
    descriptionPlaceholder: [
      'Add a description or attach files…',
      '添加描述或上传附件…',
    ],
    attach: ['Attach files', '上传附件'],
    dropToAttach: ['Drop to attach', '松开以上传附件'],
    record: ['Record', '关联记录'],
    clear: ['Clear', '清除'],
    searchRecords: [
      'Search leads, companies, opportunities…',
      '搜索线索、公司、商机…',
    ],
    searchPeople: ['Search colleagues…', '搜索同事…'],
    searchContacts: ['Search contacts…', '搜索联系人…'],
    add: ['Add', '添加'],
  },
  // The overview's reports beyond its counts (dashboard-reports.tsx).
  reports: {
    revenueSection: ['Revenue and forecast', '业绩与预测'],
    wonByMonth: ['Won in the last six months', '近 6 个月成交金额'],
    dealsCount: ['{{count}} deals', '{{count}} 个商机'],
    forecast: ['Forecast', '成交预测'],
    thisMonth: ['This month', '本月'],
    thisQuarter: ['This quarter', '本季度'],
    won: ['Won', '已成交'],
    commit: ['Commit', '较有把握'],
    commitHint: [
      'Open deals from proposal on, expected to close in the period',
      '提案及以后阶段、预计本期成交的进行中商机',
    ],
    weighted: ['Weighted', '加权预测'],
    weightedHint: ['Amount × stage probability', '金额 × 阶段赢率'],
    bestCase: ['Best case', '全部可能'],
    bestCaseHint: [
      'Every open deal expected to close in the period',
      '预计本期成交的全部进行中商机',
    ],
    forecastHint: [
      "By each open deal's expected close date; won by the date it was won.",
      '按进行中商机的预计成交日期统计；已成交按成交日期。',
    ],
    lossSection: ['Losses and pace', '输单与销售周期'],
    lostReasons: ['Lost in the last 90 days', '近 90 天输单原因'],
    pausedReasons: ['Paused now', '当前暂停原因'],
    noLost: ['No deals lost in the last 90 days.', '近 90 天没有输单。'],
    noPaused: ['No paused deals.', '没有暂停的商机。'],
    unspecified: ['Not given', '未填写'],
    cycle: ['Sales cycle', '销售周期'],
    days: ['{{days}} days', '{{days}} 天'],
    cycleNote: [
      'Average from creation to won, over {{count}} deals won in the last year',
      '近一年 {{count}} 个赢单从创建到成交的平均天数',
    ],
    noCycle: ['No deals won in the last year.', '近一年没有赢单。'],
    stage: ['Stage', '阶段'],
    averageStay: ['Average stay', '平均停留'],
    openNow: ['Open now', '当前数量'],
    waitingLong: ['Waiting too long', '停留过久'],
    waitingDeals: ['Waiting longest', '停留最久的商机'],
    waitingHint: [
      'In their stage over 1.5 times its average stay, and at least 14 days',
      '在当前阶段超过平均停留的 1.5 倍，且至少 14 天',
    ],
    noWaiting: ['No deal is waiting too long.', '没有停留过久的商机。'],
    activity: ['Team activity', '团队活动量'],
    activityHint: [
      'The last four weeks and this week, Monday to Sunday',
      '近四周合计及本周，按周一至周日统计',
    ],
    tasksDone: ['Tasks completed', '完成任务'],
    commentsWritten: ['Comments', '评论'],
    mailThreads: ['Mail conversations', '邮件会话'],
    thisWeekCount: ['{{count}} this week', '本周 {{count}}'],
  },
  // The Agents section (pages/crm-agents.tsx, server/providers/crm/agents.ts).
  agents: {
    leads: {
      title: ['Lead follow-up', '线索跟进'],
      skill: ['Skill: Follow up a lead', '技能：跟进线索'],
    },
    opportunities: {
      title: ['Opportunity follow-up', '商机跟进'],
      skill: ['Skill: Follow up an opportunity', '技能：跟进商机'],
    },
    approvals: {
      title: ['Approval review', '审批助手'],
      skill: ['Skill: Review an approval', '技能：审批辅助'],
    },
    tasks: {
      title: ['Task preparation', '任务准备'],
      skill: ['Skill: Prepare a task', '技能：任务准备'],
    },
    // The company signals' check (company-signals.ts), its runs the checks.
    signals: {
      title: ['Company research', '公司情报'],
      skill: ['Skill: Company signals', '技能：公司信号'],
      // In the agents' slots (company-signals.ts, overview).
      stats: {
        runs: ['Checks', '检查次数'],
        accepted: ['Signals found', '发现信号'],
        dismissed: ['Dismissed', '已忽略'],
        pending: ['Worth acting on', '值得跟进'],
        failed: ['Failed checks', '检查失败'],
        acceptance: ['Dismiss rate', '忽略率'],
      },
    },
    duty: ['What it does', '职责'],
    // The work's agent (crm-agents/work-agents.ts) on its card: the model it
    // asks first, and the way to its page.
    model: ['Model: {{model}}', '模型：{{model}}'],
    defaultModel: ['Model: the default', '模型：系统默认模型'],
    setUpAgent: ['Set its model and instructions', '设置模型和指令'],
    // Setting up a work agent's model and instructions (work-agent-setup.tsx).
    setup: {
      title: ['Set up {{name}}', '设置 {{name}}'],
      description: [
        'The model this agent asks and the instructions every run opens with.',
        '这个 Agent 使用的模型，以及它每次运行开头的指令。',
      ],
      model: ['Model', '模型'],
      defaultModel: ['Default ({{model}})', '默认（{{model}}）'],
      modelHint: [
        'A model that reasons at length makes every run slow; a fast one is enough.',
        '推理很长的模型会让每次运行变慢，用快速模型即可。',
      ],
      modelHintSignals: [
        'It searches the web with this model: choose one whose provider can search (DeepSeek, Qwen, OpenAI, Anthropic, Google).',
        '它用这个模型联网搜索：请选择能搜索的服务商的模型（DeepSeek、通义千问、OpenAI、Anthropic、Google）。',
      ],
      instructions: ['Instructions', '指令'],
      instructionsHint: [
        'In English, as the CRM’s other prompts are; the agent writes in the AI working language.',
        '用英文书写，与 CRM 的其他提示词一致；Agent 用 AI 工作语言输出。',
      ],
      restore: ['Restore the default', '恢复默认'],
    },
    // Who runs it and who decides, naming its agent.
    byAgent: [
      'Run by {{agent}}. It only suggests: the owner decides in the inbox whether to accept.',
      '由 {{agent}} 执行；它只提出建议，由负责人在收件箱里决定是否采纳。',
    ],
    byAgentTasks: [
      "Run by {{agent}}. It changes nothing: the task's owner and participants read it on the task and may write it into the description.",
      '由 {{agent}} 执行；它不改动任何记录，任务负责人和参与人在任务上查看，可以写入任务描述。',
    ],
    byAgentSignals: [
      'Run by {{agent}}. It changes nothing on the company: whoever may edit the company dismisses a signal that is wrong or of no concern, and a dismissed event is not shown again.',
      '由 {{agent}} 执行；它不改动公司的任何资料，能编辑公司的人可以忽略不准确或不相关的信号，忽略的事件不再出现。',
    ],
    // Running it by hand, its button named for it.
    manualNoteAgent: [
      'A person can always run {{agent}} on a record, whatever is switched off.',
      '在记录上点「运行 {{agent}}」随时可以手动发起，不受这些开关影响。',
    ],
    manualNoteTasksAgent: [
      "A task's owner or participant can always run {{agent}} on the task, whatever is switched off.",
      '任务负责人和参与人在任务上点「运行 {{agent}}」随时可以手动发起，不受这些开关影响。',
    ],
    // Who runs it and who decides, on every agent's page.
    byAi: [
      'Run by the AI. It only suggests: the owner decides in the inbox whether to accept.',
      '由 AI 执行；它只提出建议，由负责人在收件箱里决定是否采纳。',
    ],
    // The task agent's: it decides nothing, its card waits on the task.
    byAiTasks: [
      "Run by the AI. It changes nothing: the task's owner and participants read it on the task and may write it into the description.",
      '由 AI 执行；它不改动任何记录，任务负责人和参与人在任务上查看，可以写入任务描述。',
    ],
    // The company signals': nothing to accept, its signals are read.
    byAiSignals: [
      'Run by the AI. It changes nothing on the company: whoever may edit the company dismisses a signal that is wrong or of no concern, and a dismissed event is not shown again.',
      '由 AI 执行；它不改动公司的任何资料，能编辑公司的人可以忽略不准确或不相关的信号，忽略的事件不再出现。',
    ],
    manualNoteSignals: [
      'Whoever may edit a company can always check it with Check now under its name, whatever is switched off.',
      '能编辑公司的人在公司名称下点「立即检查」随时可以手动发起，不受这些开关影响。',
    ],
    manualNoteTasks: [
      "A task's owner or participant can always ask for a preparation on the task, whatever is switched off.",
      '任务负责人和参与人在任务上点「AI 准备」随时可以手动发起，不受这些开关影响。',
    ],
    runsOnItsOwn: ['Runs on its own', '自动运行'],
    // The menu's badge: runs under way.
    runningHint: ['{{count}} running', '{{count}} 个正在运行'],
    enabledTag: ['On', '已启用'],
    off: ['Off', '已停用'],
    triggersTitle: ['When it runs', '触发方式'],
    adminOnly: [
      'Only an administrator may switch these.',
      '只有管理员可以修改开关。',
    ],
    manualNote: [
      'A person can always ask for a follow-up on a record, whatever is switched off.',
      '在记录上点「AI 跟进」随时可以手动发起，不受这些开关影响。',
    ],
    triggers: {
      created: {
        label: ['A lead is created', '新建线索时'],
        hint: [
          'From the form, the AI capture or the assistant; not imports or demo data.',
          '通过表单、AI 整理或 AI 助手新建；导入和演示数据不触发。',
        ],
      },
      opened: {
        label: ['An opportunity is opened', '新开商机时'],
        hint: [
          'Created, or a lead converted into it.',
          '新建商机或线索转化开出商机。',
        ],
      },
      daily: {
        label: ['The daily check', '每日巡检'],
        hint: [
          'Every day at 09:00 in the business time zone ({{zone}}), at most 20 a day.',
          '每天 09:00（业务时区 {{zone}}）巡检，每天最多 20 条。',
        ],
      },
      dailyLeads: {
        hint: [
          'A new lead not contacted in time, a lead gone quiet, a nurtured lead due for review.',
          '新线索超时未联系、跟进中的线索停滞、培育中的线索复查到期。',
        ],
      },
      dailySchedule: [
        'The same switch as the scheduled task “{{title}}”.',
        '与定时任务「{{title}}」是同一个开关。',
      ],
      dailyTasks: {
        hint: [
          "Today's open tasks with a time of day that concern a lead, an opportunity or a company, each once.",
          '当天还没开始、有具体时间、关联了线索、商机或公司的任务，每个准备一次。',
        ],
      },
      dailySignals: {
        hint: [
          "Every day at 08:00 in the business time zone ({{zone}}), before the deals' daily pass: the companies with an open deal or watched, each at most once a week, at most 100 a day.",
          '每天 08:00（业务时区 {{zone}}）在商机每日巡检之前，检查有进行中商机或被关注的公司，每家每周最多一次，每天最多 100 家。',
        ],
      },
      dailyOpportunities: {
        hint: [
          "A deal gone quiet, an expected close date near or past, a paused deal due to resume, or its company's news since its last follow-up (funding, a new executive, major news or a risk).",
          '商机停滞、预计成交日期临近或已过、暂停的商机到期恢复，或公司在上次跟进之后有新动态（融资、高管变动、重大动态或风险）。',
        ],
      },
      taskDone: {
        label: ['A task is completed', '任务完成后'],
        hint: [
          'Its outcome recorded, or the task marked done.',
          '记录了任务结果或把任务标为完成。',
        ],
      },
      customerReplied: {
        label: ['The customer writes', '客户来信时'],
        hint: [
          'A mail from one of its people reaches the timeline, or their WhatsApp messages have gone quiet for 30 minutes.',
          '客户方联系人的邮件同步到动态时，或 WhatsApp 消息停顿 30 分钟后。',
        ],
      },
      companyChanged: {
        label: ['The company changes', '公司信息变化时'],
        hint: [
          'Someone changes its company or website; it is followed up again.',
          '有人修改了公司名称或官网，重新跟进。',
        ],
      },
      merged: {
        label: ['Leads are merged', '合并线索后'],
        hint: ['The lead kept is followed up anew.', '对保留的线索重新跟进。'],
      },
      approvalDecided: {
        label: ['Its approvals are decided', '审批有结果后'],
        hint: [
          'Once the approvals submitted together have all been decided.',
          '一起提交的审批全部有了结果后。',
        ],
      },
      submitted: {
        label: ['An approval is submitted', '提交审批时'],
        hint: ['Reviewed for its approver right away.', '立即为审批人分析。'],
      },
    },
    // How a run started, in the runs list.
    started: {
      asked: ['Asked by a person', '手动发起'],
      revised: ['Redone as instructed', '按意见重做'],
    },
    statsTitle: ['How it did', '运行情况'],
    lastWeek: ['Last 7 days', '近 7 天'],
    lastMonth: ['Last 30 days', '近 30 天'],
    runs: ['Runs', '运行次数'],
    acceptance: ['Acceptance rate', '采纳率'],
    statuses: {
      running: ['Working', '运行中'],
      pending: ['Waiting', '待处理'],
      accepted: ['Accepted', '已采纳'],
      dismissed: ['Ignored', '已忽略'],
      failed: ['Failed', '失败'],
      retired: ['Settled elsewhere', '已在别处处理'],
      // A company signals' check.
      found: ['Found news', '有新动态'],
      nothing: ['Nothing new', '无新动态'],
    },
    all: ['All', '全部'],
    runsTitle: ['Runs', '运行记录'],
    when: ['When', '时间'],
    record: ['Record', '记录'],
    trigger: ['Started by', '触发'],
    outcome: ['Suggestion', '建议'],
    status: ['Status', '状态'],
    noRuns: ['No runs yet.', '还没有运行记录。'],
    runsScope: [
      'Runs on the records you may read, over the last 90 days',
      '近 90 天、你有权查看的记录上的运行',
    ],
    runsScopeApprovals: [
      'Reviews of the approvals submitted to you, over the last 90 days',
      '近 90 天提交给你的审批的分析',
    ],
    runsScopeSignals: [
      'Checks of the companies you may read, over the last 90 days',
      '近 90 天、你有权查看的公司的检查',
    ],
    runsScopeTasks: [
      'Preparations of the tasks you own or take part in, over the last 90 days',
      '近 90 天你负责或参与的任务的准备',
    ],
  },
  // An email follow-up step, changed and sent on its card (email-step.tsx).
  emailStep: {
    from: ['From', '发件人'],
    to: ['To', '收件人'],
    cc: ['Cc', '抄送'],
    subject: ['Subject', '主题'],
    body: ['Message', '正文'],
    toPlaceholder: [
      'Name <address>, separated by commas',
      '姓名 <邮箱>，多个用逗号分隔',
    ],
    send: ['Send email', '发送邮件'],
    sent: [
      'Email sent; the suggestion is accepted.',
      '邮件已发送，建议已采纳。',
    ],
    openComposer: ['Edit in the mail composer', '在邮件窗口中编辑'],
    // Beside the recipients: the copy line, drawn once asked for.
    addCc: ['Cc', '抄送'],
    // "Accept all" with the draft not ready to go.
    notReady: [
      'Fill in a recipient, the subject and the message first.',
      '请先填写收件人、主题和正文。',
    ],
    noMailbox: [
      'Connect a mailbox to send it from here; for now, copy the draft.',
      '连接邮箱后可直接在这里发送；现在可以先复制草稿。',
    ],
    noIdentity: [
      'This mailbox has no address it may send from.',
      '这个邮箱没有可用于发送的地址。',
    ],
  },
  // A new approval's quick dialog, laid out as a new task's.
  approvalQuick: {
    titlePlaceholder: ['What is the approval for', '审批主题'],
    descriptionPlaceholder: [
      'The condition asked for and why, or attach files…',
      '说明申请的条件和理由，或上传附件…',
    ],
    searchTopics: ['Search types…', '搜索类型…'],
    searchDeals: ['Search opportunities…', '搜索商机…'],
    saveDraft: ['Save draft', '保存草稿'],
    submit: ['Submit', '提交审批'],
    approverFirst: ['Choose an approver to submit', '选择审批人后才能提交'],
  },
  // The opportunity page's particulars, grouped as the lead's.
  // The company, contact and approval pages' particulars, likewise.
  companyGroups: {
    general: ['General', '概况'],
    // What the company is (its site, trade, size, revenue, place): not
    // "Company" again on a company's own page.
    company: ['Profile', '公司档案'],
  },
  // A contact's page: who the person is and how to reach them, beside its
  // General card.
  // A task's page: the record it concerns, a card of its own.
  taskGroups: {
    lead: ['Lead', '关联线索'],
    company: ['Company', '关联公司'],
    deal: ['Opportunity', '关联商机'],
    linked: ['Linked record', '关联记录'],
  },
  // An approval's page: the deal it is asked about, beside its Details.
  approvalGroups: {
    deal: ['Opportunity', '所属商机'],
  },
  contactGroups: {
    reach: ['Personal info', '个人信息'],
    // The company the person works at, or a deal is with, a card of its
    // own.
    company: ['Company', '所属公司'],
  },
  region: ['Region', '地区'],
  // The region and the street address in one row.
  location: ['Location', '地址'],
  // The region's editor: a province or a country found by its name.
  regionSearch: ['Search a province or country…', '搜索省份或国家…'],
  regionNoMatch: [
    'No province or country by that name',
    '没有找到这个省份或国家',
  ],
  loadMore: ['Load more', '加载更多'],
  justNow: ['just now', '刚刚'],
  // The line heading a record's tab, as the Mail tab's does: what the tab
  // lists, by the record's kind.
  tabScope: {
    tasks: ['Tasks linked to this {{entity}}', '关联到此{{entity}}的任务'],
    approvals: ['Approvals for this {{entity}}', '此{{entity}}的审批'],
    contacts: ['Contacts at this {{entity}}', '此{{entity}}的联系人'],
    opportunities: [
      'Opportunities with this {{entity}}',
      '关联到此{{entity}}的商机',
    ],
    leads: ['Leads converted into this {{entity}}', '转化为此{{entity}}的线索'],
    dealContacts: [
      'The people on this opportunity and the others at its company',
      '参与此商机的人，以及其公司的其他联系人',
    ],
  },
  // The heading over a record page's particulars when they are one list.
  detailsGroup: ['Details', '详情'],
  requiredField: ['This field is required', '此字段必填'],
  openWebsite: ['Open website in a new tab', '在新窗口打开官网'],
  openLinkedin: ['Open LinkedIn in a new tab', '在新窗口打开 LinkedIn'],
  noTasks: ['No tasks yet', '暂无任务'],
  noTasksOnDay: ['No tasks on this day', '这一天没有任务'],
  dayTotal: ['Total {{count}}', '共 {{count}} 项'],
  todayButton: ['Today', '今天'],
  noAttachments: ['No files yet', '暂无附件'],
  // Beside the button that creates a lead.
  leadFollowUpNow: ['AI follows up at once', 'AI 立刻跟进'],
  // Under a conversion that opens an opportunity.
  dealFollowUpNow: ['AI follows up the opportunity at once', 'AI 立刻跟进商机'],
  historyTab: ['Timeline', '动态'],
  feed: {
    // A field an update emptied, after its name.
    cleared: ['cleared', '已清空'],
    // Who did an AI entry on the timeline.
    ai: ['AI', 'AI'],
    aiProposed: ['AI proposed', 'AI 提议'],
    aiCaptured: ['AI organised', 'AI 整理'],
    addedFiles: ['added', '添加了附件'],
    removedFiles: ['removed', '删除了附件'],
    evaluated: ['suggested', '建议'],
    // An approval's review for its approver.
    reviewed: ['reviewed the request', '给出审批建议'],
    reviewing: ['is reviewing the request…', '正在分析这个申请…'],
    reviewFailed: ['could not review the request', '没能给出审批建议'],
    prepared: ['prepared the task', '完成了任务准备'],
    preparing: ['is preparing the task…', '正在准备这个任务…'],
    prepareFailed: ['could not prepare the task', '没能完成任务准备'],
    evaluating: ['is preparing a follow-up…', '正在准备跟进建议…'],
    evaluationFailed: ['could not finish a follow-up', '没能给出跟进建议'],
    fieldCount: ['{{count}} fields', '{{count}} 个字段'],
    // One of the record's tasks, after who did it.
    task: {
      planned: ['planned the task', '安排任务'],
      completed: ['completed the task', '完成任务'],
      cancelled: ['cancelled the task', '取消任务'],
      moved: ['moved the task', '改期任务'],
      edited: ['edited the task', '修改任务'],
      deleted: ['deleted the task', '删除任务'],
      to: ['to {{time}}', '改到 {{time}}'],
    },
    // A deal's contact with their role, in a change of the deal's contacts.
    contactRole: ['{{name}} ({{role}})', '{{name}}（{{role}}）'],
    // A mail conversation with the record's people, after the mailbox
    // owner's name.
    mail: {
      exchanged: ['exchanged mail', '往来邮件'],
      noSubject: ['(No subject)', '（无主题）'],
      count: ['{{count}} messages', '{{count}} 封'],
      countOne: ['1 message', '1 封'],
      // Mail from before the record existed, as one entry.
      before: ['Mail from before this record', '记录创建前的往来邮件'],
      conversations: ['{{count}} conversations', '{{count}} 个会话'],
      conversationsOne: ['1 conversation', '1 个会话'],
      lastFrom: ['last from {{name}}', '最后由 {{name}} 回复'],
    },
    // A customer's WhatsApp messages of a day (whatsapp/service.ts), after
    // their name.
    whatsapp: {
      exchanged: ['WhatsApp', 'WhatsApp'],
      countOne: ['1 message', '1 条消息'],
      count: ['{{count}} messages', '{{count}} 条消息'],
      fromCustomer: [' ({{count}} from the customer)', '（客户 {{count}} 条）'],
      lastCustomer: ['last from the customer', '最后由客户发出'],
      lastTeam: ['last from the team', '最后由团队发出'],
    },
    // One of a deal's approvals, read after the person's name.
    approval: {
      pending: ['submitted', '提交了'],
      approved: ['approved', '批准了'],
      rejected: ['rejected', '驳回了'],
      withdrawn: ['withdrew', '撤回了'],
      noun: ['approval', '审批'],
    },
    // What a person did, read after their name on the timeline.
    did: {
      created: ['created the record', '创建了记录'],
      updated: ['updated', '更新'],
      deleted: ['deleted the record', '删除了记录'],
      converted: ['converted the lead', '转化了线索'],
      commentEdited: ['edited a comment', '编辑了评论'],
      commentDeleted: ['removed a comment', '删除了一条评论'],
      aiRevise: ['asked the AI to revise the suggestion', '让 AI 修改建议'],
      merged: ['merged in the lead', '合并了线索'],
    },
    // What a merge moved over, after the lead merged in.
    mergedMoved: [
      '{{tasks}} tasks and {{comments}} comments moved over',
      '移入任务 {{tasks}} 条、评论 {{comments}} 条',
    ],
    empty: ['Nothing here yet.', '还没有记录。'],
  },
  // Where an AI suggestion stands, on the chips atop a record's page
  // (ai-status-word.tsx).
  // Why a failed AI card did not finish, after the card's own words.
  aiFailure: {
    timedOut: [
      "The model did not answer within 8 minutes. Put a faster model first on this work's agent (Agent team → Agents, such as Lead follow-up), then run it again.",
      '模型 8 分钟内没有答完。可在 Agent 团队 → Agents 中把更快的模型排到这项工作对应 Agent（如 Lead follow-up）的第一位，再重新运行。',
    ],
  },
  aiChip: {
    status: {
      pending: ['Waiting', '待处理'],
      accepted: ['Accepted', '已采纳'],
      dismissed: ['Ignored', '已忽略'],
      superseded: ['Replaced', '已替代'],
      failed: ['Failed', '失败'],
      done: ['Handled', '已处理'],
    },
  },
  evaluation: {
    title: ['AI follow-up', 'AI 跟进建议'],
    waiting: ['AI follow-up waiting for you', 'AI 跟进建议待处理'],
    onCard: {
      running: ['AI working', 'AI 跟进中'],
      pending: ['AI suggestion', 'AI 建议待处理'],
    },
    again: ['Follow up', '跟进'],
    // The chips' rerun, in a word (its full name on hover).
    rerun: ['Re-run', '重新运行'],
    // Before the first suggestion: asking for one, as a chip.
    start: ['AI follow-up', 'AI 跟进'],
    // Under the chip's hover.
    chipHint: ['click to open it in the timeline', '点击在动态里查看'],
    // At the end of the AI's latest suggestion's chip.
    askAgain: ['Rerun the AI follow-up', '重新运行 AI 跟进'],
    running: [
      'The AI is reviewing it and preparing a suggestion…',
      'AI 正在查看、准备跟进建议…',
    ],
    // A follow-up waiting for its turn behind others.
    queued: [
      'Waiting its turn behind other follow-ups…',
      '排队中，前面还有其他跟进…',
    ],
    failed: [
      'The follow-up did not finish. Follow up again to retry.',
      '这次跟进没有完成，可以重新跟进。',
    ],
    follow: ['Follow up', '继续跟进'],
    nurture: ['Nurture', '放入培育'],
    convert: ['Convert', '转化'],
    invalid: ['Invalid', '无效'],
    grade: ['Grade {{grade}}', '{{grade}} 级'],
    edition: ['Edition', '建议版本'],
    reason: ['Why', '理由'],
    reasons: ['Reasons', '依据'],
    findings: ['Found on the web', '联网查到'],
    // A lead's suggested values, from its own material as well as the web.
    fieldSuggestions: ['Suggested field updates', '建议更新的字段'],
    basis: ['from {{basis}}', '出自 {{basis}}'],
    findingsDone: ['written by {{name}}, {{time}}', '{{name}} {{time}} 已写入'],
    source: ['Source', '来源'],
    writePicked: ['Write {{count}} into the lead', '写入勾选的 {{count}} 项'],
    // A deal's: about its company, written into the company.
    findingsCompany: [
      'Found on the web about the company',
      '联网查到的公司信息',
    ],
    writePickedCompany: [
      'Write {{count}} into the company',
      '写入公司 {{count}} 项',
    ],
    written: ['Written', '已写入'],
    // A lead card's web look-up of its company (lead-research.ts).
    research: {
      done: [
        'Looked the company up on the web, {{time}} · {{count}} pages',
        '{{time}} 联网查了公司 · {{count}} 个来源',
      ],
      unavailable: [
        'No model can search the web, so the company was not looked up this time',
        '没有能联网搜索的模型，这次没有查公司',
      ],
      failed: [
        'The web search failed, so the company was not looked up this time',
        '联网搜索失败，这次没有查到公司信息',
      ],
    },
    nextStep: ['Next step', '下一步'],
    stepTask: ['Task', '任务'],
    stepEmail: ['Email', '邮件'],
    // The email box's heading on a card.
    emailToSend: ['Email to send', '要发送的邮件'],
    today: ['today', '今天'],
    inDays: ['in {{count}} days', '{{count}} 天后'],
    questions: ['To ask', '要问的问题'],
    prep: ['To prepare', '准备要点'],
    changes: ['Since last time', '和上次比'],
    opportunity: ['Opportunity', '商机'],
    // What accepting a conversion would create, before the dialog confirms
    // it, and what the duplicate check found.
    conversion: {
      company: ['Company', '公司'],
      contact: ['Contact', '联系人'],
      create: ['New', '新建'],
      link: ['Link to', '关联'],
      duplicates: ['Duplicates', '查重'],
      noDuplicates: [
        'No possible duplicate company, contact or opportunity',
        '没有可能重复的公司、联系人或商机',
      ],
      possible: ['Possible duplicates:', '可能重复：'],
      openDeals: ['Open at this company:', '该公司进行中的商机：'],
      confirm: [
        'Accepting opens the conversion, where these can be checked and changed before anything is saved.',
        '采纳后先打开转化窗口，确认或修改后才保存。',
      ],
    },
    // A value the AI left empty, in its own words of what changed.
    none: ['none', '无'],
    // What started a follow-up the system ran on its own (lead-signals.ts,
    // a task marked done, a company changed).
    trigger: {
      created: ['New lead: the AI followed it up.', '新线索，AI 自动跟进。'],
      opened: [
        'New opportunity: the AI followed it up.',
        '新商机，AI 自动跟进。',
      ],
      uncontacted: [
        'New lead not contacted in 2 days: the AI followed it up.',
        '新线索 2 天还没联系，AI 自动跟进。',
      ],
      silent: [
        'No contact in 14 days: the AI followed it up.',
        '14 天没有联系，AI 自动跟进。',
      ],
      nurtureDue: [
        'Nurture review due: the AI followed it up again.',
        '培育复查到期，AI 重新跟进。',
      ],
      companyChanged: [
        'The company changed: the AI followed it up again.',
        '公司信息有变化，AI 重新跟进。',
      ],
      taskDone: [
        'A task was done: the AI followed up again.',
        '任务已完成，AI 继续跟进。',
      ],
      customerReplied: [
        'The customer wrote: the AI followed up again.',
        '客户来信，AI 继续跟进。',
      ],
      approvalDecided: [
        'An approval was decided: the AI followed up again.',
        '审批有了结果，AI 继续跟进。',
      ],
      closeDue: [
        'The expected close date is near or past: the AI followed it up.',
        '预计成交日期快到或已过，AI 自动跟进。',
      ],
      resumeDue: [
        'The pause is due to end: the AI followed it up.',
        '暂停到了预计恢复日期，AI 自动跟进。',
      ],
      companySignal: [
        'The company has news: the AI followed up again.',
        '客户有新动态，AI 继续跟进。',
      ],
      approvalsDecided: [
        'Approvals decided ({{approvals}}): the AI followed up again.',
        '审批有了结果（{{approvals}}），AI 继续跟进。',
      ],
      merged: [
        'Leads merged: the AI followed up again.',
        '线索已合并，AI 重新跟进。',
      ],
    },
    // An opportunity's follow-up (opportunity-evaluation.ts): its
    // recommendations, how likely it is to close, and what accepting does.
    deal: {
      // Approvals the AI would request before promising the customer.
      approvals: ['Approvals to request', '建议发起的审批'],
      terms: ['Terms', '条款核对'],
      contacts: ['Contacts and roles', '联系人和角色'],
      newContact: ['New contact', '新建联系人'],
      addContact: ['Add to the opportunity', '加到商机'],
      termStatus: {
        standard: ['Within the standard', '标准内'],
        approved: ['Approved', '已批准'],
        pending: ['Awaiting approval', '审批中'],
        rejected: ['Rejected', '已驳回'],
        needed: ['Needs approval', '需审批'],
      },
      approvalsHint: [
        'submitted to the approver with the accept',
        '采纳时提交给审批人',
      ],
      confirmTitle: ['Submit {{count}} approvals?', '提交 {{count}} 个审批？'],
      confirmHint: [
        'Accepting applies the recommendation and submits these approvals; each approver is notified. Promise the customer none of these terms before they are approved.',
        '采纳会执行这条建议，并提交下面的审批，审批人会收到通知。审批通过前，不要向客户答应这些条件。',
      ],
      confirmSubmit: ['Accept and submit', '采纳并提交审批'],
      advance: ['Advance', '推进'],
      advanceTo: ['Advance to {{stage}}', '推进到{{stage}}'],
      continue: ['Keep at it', '继续推进'],
      pause: ['Pause', '暂停'],
      lose: ['Mark lost', '输单'],
      confidence: {
        high: ['Likely', '把握较大'],
        medium: ['Possible', '把握一般'],
        low: ['Unlikely', '把握不大'],
      },
      toStage: ['Move to {{stage}}', '改为{{stage}}'],
      risks: ['Risks', '风险'],
      resume: ['Resume', '恢复跟进'],
      revisit: ['Revisit', '回访'],
      updates: ['Suggested changes', '建议调整'],
      acceptAdvance: ['Accept and advance', '采纳并推进'],
      acceptPause: ['Accept and pause', '采纳并暂停'],
      acceptLose: ['Accept and mark lost', '采纳并标为输单'],
      // The task accepting plans to come back to the deal, after its name.
      resumeName: ['resume', '恢复跟进'],
      revisitName: ['revisit', '回访'],
    },
    review: ['Review', '复查'],
    acceptFollow: ['Accept and plan the contact', '采纳并安排联系'],
    acceptNurture: ['Accept and nurture', '采纳并放入培育'],
    acceptConvert: ['Accept and convert', '采纳并转化'],
    acceptUpdate: ['Accept and update the task', '采纳并更新任务'],
    acceptOnly: ['Accept', '采纳'],
    acceptEmailed: [
      'Accept: I will send the email myself',
      '采纳（自行发送邮件）',
    ],
    acceptReschedule: ['Accept and move it', '采纳并改期'],
    acceptReport: ['Record the outcome', '记录结果'],
    acceptInvalid: ['Accept and mark invalid', '采纳并标记无效'],
    dismiss: ['Ignore', '忽略'],
    // The card's one decision at its foot, and, on hover, what it does.
    acceptAll: ['Accept all', '全部采纳'],
    will: {
      title: ['Accepting all will:', '全部采纳将：'],
      write: [
        'Write the ticked fields into the lead ({{count}})',
        '把勾选的 {{count}} 项写入线索',
      ],
      writeCompany: [
        'Write the ticked fields into the company ({{count}})',
        '把勾选的 {{count}} 项写入公司',
      ],
      send: ['Send the email “{{subject}}”', '发送邮件「{{subject}}」'],
      sendYourself: [
        'Leave the email to you to send (copy the draft)',
        '邮件由你自己发送（可复制草稿）',
      ],
      plan: ['Create the task “{{name}}”', '创建任务「{{name}}」'],
      update: ['Update the task “{{name}}”', '更新任务「{{name}}」'],
      report: [
        'Record the outcome of “{{name}}”',
        '记录任务「{{name}}」的结果',
      ],
      reschedule: ['Move the task “{{name}}”', '改期任务「{{name}}」'],
      nurture: ['Set the lead to nurturing', '把线索设为培育中'],
      invalid: ['Mark the lead invalid', '把线索标记为无效'],
      convert: [
        'Open the conversion with the proposed opportunity',
        '打开转化，带上建议的商机',
      ],
      stage: ['Move the opportunity to {{stage}}', '把商机推进到「{{stage}}」'],
      pause: ['Pause the opportunity', '暂停商机'],
      lose: ['Mark the opportunity lost', '把商机标记为输单'],
      contacts: [
        'Set contacts on the opportunity ({{count}})',
        '更新商机的 {{count}} 位联系人',
      ],
      approvals: ['Submit approvals ({{count}})', '提交 {{count}} 个审批'],
      mark: ['Mark the suggestion accepted', '把建议标记为已采纳'],
    },
    // Talking a card over with the AI in a conversation of its own.
    ask: ['Discuss', '讨论'],
    revise: ['Adjust', '调整'],
    adjusting: ['Adjusting…', '正在调整…'],
    // Why a button asking the AI is greyed (ai-buttons.tsx).
    needsModel: [
      'No AI model is set up yet. Ask an administrator to add one.',
      '还没有配置 AI 模型，请联系管理员。',
    ],
    revisePlaceholder: ['Tell AI what to change', '告诉 AI 怎么改'],
    revising: ['The AI is revising the suggestion…', 'AI 正在修改建议…'],
    instructionBy: ['{{name}} asked: {{text}}', '{{name}} 的意见：{{text}}'],
    email: ['Email draft', '邮件草稿'],
    plannedTask: ['Task to create', '将创建的任务'],
    existingTask: ['Planned task to follow up', '跟进的任务（已安排）'],
    afterAccept: ['On accepting', '采纳后'],
    noChange: [
      'The task is ready as it is: accepting changes nothing on it.',
      '任务内容已经准备好，无需改动。',
    ],
    change: {
      added: ['added', '新增'],
      changed: ['updated', '更新'],
      kept: ['unchanged', '不变'],
    },
    overdueTask: ['Overdue task', '逾期的任务'],
    doneOrNot: ['Done or not', '是否已完成'],
    done: ['Done', '已完成'],
    notDone: ['Not done, move it', '未完成，改期'],
    notDoneYet: ['Not done', '未完成'],
    organiseOutcome: ['AI organise', 'AI 整理'],
    organising: ['Organising…', '正在整理…'],
    followUpAfter: [
      'Let the AI follow up again once recorded',
      '记录后让 AI 继续跟进',
    ],
    recordOutcome: ['Record the outcome', '记录结果'],
    recordOutcomeOf: ['Record the outcome: {{name}}', '记录结果：{{name}}'],
    recordOutcomeHint: [
      'Recording it marks the task done.',
      '记录后任务标为已完成。',
    ],
    outcomePlaceholder: [
      'What came of it: what they said, what was agreed',
      '结果如何：对方怎么说、约定了什么',
    ],
    // A nurtured lead's review task, after the company's name.
    reviewName: ['nurture review', '培育复查'],
    copy: ['Copy', '复制'],
    copied: ['Copied', '已复制'],
    statuses: {
      superseded: ['Replaced', '已被新建议替代'],
      running: ['AI working', 'AI 跟进中'],
      pending: ['Waiting', '待处理'],
      accepted: ['Accepted', '已采纳'],
      dismissed: ['Ignored', '已忽略'],
      failed: ['Not finished', '未完成'],
    },
    decidedBy: [
      '{{status}} by {{name}}, {{time}}',
      '{{name}} {{time}} {{status}}',
    ],
  },
  all: ['All', '全部'],
  mine: ['Mine', '我负责的'],
  // A task I own or take part in.
  involved: ['Mine', '我的'],
  // An approval the reader decides.
  // The header's control choosing whose records a list page shows.
  listScope: ['Whose records', '谁的记录'],
  team: ['Team', '团队'],
  search: ['Search records…', '搜索记录…'],
  // A list page's own filtering, apart from the global search.
  filterList: ['Filter this list', '筛选列表'],
  filterIn: ['Filter {{list}}…', '在{{list}}中筛选…'],
  keywordChip: ['Keyword: {{text}}', '关键词：{{text}}'],
  clearKeyword: ['Clear the keyword {{text}}', '清除关键词 {{text}}'],
  matchCount: ['{{count}} records', '共 {{count}} 条'],
  list: ['List', '列表'],
  board: ['Board', '看板'],
  calendar: ['Calendar', '日历'],
  total: ['Total records', '记录总数'],
  export: ['Export CSV', '导出 CSV'],
  import: ['Import CSV', '导入 CSV'],
  previous: ['Previous', '上一页'],
  next: ['Next', '下一页'],
  page: ['Page {{page}} of {{pages}}', '第 {{page}} / {{pages}} 页'],
  newRecord: ['New {{entity}}', '新建{{entity}}'],
  editRecord: ['Edit {{entity}}', '编辑{{entity}}'],
  deleteRecord: ['Delete {{entity}}', '删除{{entity}}'],
  changeCompanyTitle: ['Change the company?', '更换所属公司？'],
  changeCompanyContacts: [
    "The deal's contacts belong to the current company and will be removed from it: {{names}}.",
    '此商机的联系人属于原公司，更换后将从此商机移除：{{names}}。',
  ],
  deleteRecordTitle: [
    'Delete {{entity}} "{{name}}"?',
    '删除{{entity}}「{{name}}」？',
  ],
  localTimeHint: [
    'Enter times in your laptop timezone: {{zone}}.',
    '请按电脑时区 {{zone}} 输入时间。',
  ],
  pickDateTime: ['Pick date and time', '选择日期时间'],
  hour: ['Hour', '时'],
  minute: ['Minute', '分'],
  dateTimeFormatInvalid: [
    'Enter a date and time as yyyy-mm-dd HH:mm, for example 2026-09-24 14:30.',
    '请按 yyyy-mm-dd HH:mm 输入日期时间，如 2026-09-24 14:30。',
  ],
  noRelatedRecords: [
    'No eligible records. Select the company first, or create a related record.',
    '没有可选记录。请先选择公司，或创建相关记录。',
  ],
  addContact: ['Add contact role', '添加联系人角色'],
  attachment: ['File', '附件'],
  openFullPage: ['Open full page', '整页打开'],
  uploadFile: ['Upload file', '上传文件'],
  uploading: ['Uploading…', '上传中…'],
  dropFilesHere: ['Drop files here, or', '将文件拖到这里，或'],
  chooseFiles: ['choose files', '点击选择文件'],
  removeFileTitle: ['Remove this file?', '移除此附件？'],
  removeFileHint: [
    'If no other record uses the file, it is deleted from the system 7 days after it is removed.',
    '移除后，如果这个文件没有其他记录在用，7 天后会从系统中删除。',
  ],
  removeFileFromRecord: [
    'This removes the attachment from the {{entity}} “{{name}}”.',
    '将从{{entity}}「{{name}}」移除此附件。',
  ],
  attachmentsOwn: ['Uploaded to this {{entity}}', '本{{entity}}的附件'],
  attachmentsFromTasks: ['From linked tasks', '来自关联任务的附件'],
  attachmentsFromOpportunities: [
    'From linked opportunities',
    '来自关联商机的附件',
  ],
  attachmentsFromApprovals: ['From linked approvals', '来自关联审批的附件'],
  // Files attached to the record's comments and replies, by their writer.
  attachmentsFromComments: ['From comments', '来自评论的附件'],
  deleteCompanyTasks: [
    'This also deletes {{count}} task record(s) linked only to this {{entity}}.',
    '将同时删除 {{count}} 条仅关联此{{entity}}的任务。',
  ],
  deleteCompanyKeptTasks: [
    '{{count}} task record(s) also linked to another record are kept; only the {{entity}} link is cleared.',
    '{{count}} 条同时关联其他记录的任务将保留，只清空{{entity}}关联。',
  ],
  deleteOpportunityBlocked: [
    'Cannot delete: approvals are an audit trail and stay with the opportunity. Mark it as lost instead.',
    '无法删除：审批是审计记录，须随商机保留。请改为将商机标为输单。',
  ],
  deleteApprovalHint: [
    'This request and its attachments and history are deleted; nothing else changes. This cannot be undone.',
    '这条申请及其附件、变更记录将被删除，所属商机不受影响。此操作无法撤销。',
  ],
  deleteDecidedApprovalHint: [
    'This request has been submitted or decided. Deleting it removes the decision and its history for the applicant and the approver too; the opportunity is untouched. This cannot be undone.',
    '这条申请已提交或已有审批结果。删除后申请人和审批人都不再看到它及其审批记录，所属商机不受影响。此操作无法撤销。',
  ],
  deleteTaskHint: [
    'This task and its attachments and history are deleted; the lead, company or opportunity it was linked to is untouched. This cannot be undone.',
    '这条任务及其附件、变更记录将被删除，关联的线索、公司或商机不受影响。此操作无法撤销。',
  ],
  deleteContactHint: [
    'This permanently deletes the contact and cannot be undone.',
    '将永久删除此联系人，操作不可撤销。',
  ],
  deleteContactUnlinks: [
    'The contact is also removed from {{count}} linked {{entity}}; those records are kept.',
    '同时从 {{count}} 条关联的{{entity}}中移除此联系人，那些记录保留。',
  ],
  deleteLeadHint: [
    'This permanently deletes the lead and cannot be undone.',
    '将永久删除此线索，操作不可撤销。',
  ],
  deleteLeadTasks: [
    'This also deletes {{count}} task record(s) that belong only to this lead.',
    '将同时删除 {{count}} 条仅属于此线索的任务记录。',
  ],
  deleteLeadKeptTasks: [
    '{{count}} task record(s) are kept and unlinked from this lead, because they are also linked to a company or opportunity.',
    '另有 {{count}} 条任务因同时关联公司或商机而保留，仅解除与此线索的关联。',
  ],
  timeline: ['History', '变更记录'],
  related: ['Related records', '关联记录'],
  andMore: ['and {{count}} more', '等 {{count}} 个，查看'],
  deleteBlocked: [
    'Cannot delete: these records point at it and would be left without a parent. Remove or move them first.',
    '无法删除：以下记录关联着它，删除后会成为孤儿记录。请先删除或转移它们。',
  ],
  deleteHint: [
    'This deletes the record. Related records must be removed or unlinked first.',
    '记录将被删除。存在关联记录时，请先解除关联或删除相关记录。',
  ],
  convert: ['Convert lead', '转化线索'],
  // The lead page's button, beside the heading that names the lead.
  convertShort: ['Convert', '转化'],
  conversionHint: [
    'Create or link a company and contact. Existing values are preserved unless you select fields to overwrite. All changes are saved together.',
    '创建或关联公司与联系人。已有值默认保留，勾选的字段将被覆盖。所有变更将在同一事务中保存。',
  ],
  possibleDuplicates: ['Possible matches', '可能重复的记录'],
  // Leads that repeat a lead, and their merge (lead-merge.tsx).
  merge: {
    notice: ['Possible duplicate leads', '可能重复的线索'],
    // A duplicate as a sentence: what it shares with this lead, the lead
    // named where {{lead}} stands, then the way to merge it.
    same: ['Same {{what}} as {{lead}}', '与 {{lead}} {{what}}相同'],
    matched: {
      email: ['email', '邮箱'],
      phone: ['phone', '电话'],
      linkedin: ['LinkedIn profile', 'LinkedIn 主页'],
      person: ['person and company', '人和公司'],
    },
    // Between what it shares ("email and phone", "邮箱、电话").
    and: [' and ', '、'],
    // Before the way to merge, at the sentence's end.
    then: [' · ', '，'],
    go: ['Merge', '去合并'],
    action: ['Merge', '合并'],
    title: ['Merge duplicate leads', '合并重复线索'],
    hint: [
      'Keep one lead and pick the value to keep for each field. The other lead’s tasks, comments and attachments move to the lead kept, and the other lead is deleted; what it held is recorded on the kept lead’s timeline.',
      '保留一条线索，逐项选择要保留的值。另一条线索的任务、评论和附件会移到保留的线索，然后删除它；它原来的信息记在保留线索的动态里。',
    ],
    // From the capture review: what the AI organised, into a lead held.
    hintUnsaved: [
      'What the AI organised goes into the lead the CRM already holds: pick the value to keep for each field. No new lead is created; what was organised is recorded on that lead’s timeline.',
      '把 AI 整理的内容并入已有线索，逐项选择要保留的值。不会新建线索；整理的内容记在这条线索的动态里。',
    ],
    keep: ['Keep', '保留'],
    thisLead: ['this page', '本页'],
    // A lead not yet saved, organised by the AI in the capture review.
    newLabel: ['new', '新整理'],
    unsaved: ['Not saved yet, organised by the AI', '尚未保存，由 AI 整理'],
    history: [
      'Created {{date}} · {{tasks}} tasks · {{comments}} comments',
      '创建于 {{date}} · 任务 {{tasks}} · 评论 {{comments}}',
    ],
    both: ['Keep both', '两段都保留'],
    rest: [
      'The other {{count}} fields are the same. Attachments of both are kept.',
      '其余 {{count}} 项相同；两边的附件都会保留。',
    ],
    thinking: ['The AI is comparing the two leads…', 'AI 正在比较两条线索…'],
    comparing: ['Comparing the two leads…', '正在比较两条线索…'],
    followUp: ['AI follows up the merged lead', '合并后 AI 重新跟进'],
    confirm: ['Merge', '合并'],
  },
  // The AI's review of an approval request for its approver
  // (approval-review.tsx).
  // The AI's preparation of a task for its owner (task-preparation.tsx).
  taskPrep: {
    // The chip's and the first button's name.
    ask: ['AI prep', 'AI 准备'],
    again: ['Rerun the AI prep', '重新运行 AI 准备'],
    working: ['Preparing', '准备中'],
    running: ['The AI is preparing this task…', 'AI 正在为这个任务做准备…'],
    failed: ['The AI could not prepare it', '没能完成准备'],
    written: ['written into the task', '已写入任务'],
    // The AI's state tag on a task's row and its chip while it works.
    onRow: {
      running: ['AI preparing', 'AI 准备中'],
    },
    trigger: {
      daily: ['Prepared on the morning of the task', '任务当天早上自动准备'],
    },
    agenda: ['Points to cover', '要点'],
    questions: ['To ask', '要问的问题'],
    people: ['People', '对方人员'],
    bring: ['To bring', '要带的材料'],
    risks: ['Risks', '风险'],
    company: ['Recent news', '公司近况'],
    revisePlaceholder: ['Tell AI what to change', '告诉 AI 怎么改'],
    accept: ['Write into the task', '写入任务描述'],
    will: {
      title: ['Writing it in will:', '写入将：'],
      prep: [
        'Put the points to cover and what to bring under “To prepare” in the description',
        '把要点和要带的材料写进描述的「准备要点」',
      ],
      questions: [
        'Put the questions under “To ask”',
        '把要问的问题写进「要问的问题」',
      ],
      keep: [
        'Keep what you wrote in the description yourself',
        '保留你自己在描述里写的内容',
      ],
    },
  },
  approvalReview: {
    title: ['AI review', 'AI 审批建议'],
    running: ['The AI is reviewing the request…', 'AI 正在分析这个申请…'],
    failed: ['The AI could not review it', '没能给出审批建议'],
    superseded: ['decided on the approval itself', '已在审批上直接处理'],
    // Where the latest review stands, and asking for another, on its chip.
    working: ['Reviewing', '分析中'],
    again: ['Rerun the AI review', '重新运行 AI 辅助审批'],
    // Voided because the approval left the queue without the card.
    retired: {
      withdrawn: [
        '{{name}} withdrew the request {{time}}; this review no longer applies',
        '{{name}} {{time}} 撤回了审批，这条建议已作废',
      ],
      approved: [
        '{{name}} approved it on the request {{time}}; this review no longer applies',
        '{{name}} {{time}} 在审批上直接批准，这条建议已作废',
      ],
      rejected: [
        '{{name}} rejected it on the request {{time}}; this review no longer applies',
        '{{name}} {{time}} 在审批上直接驳回，这条建议已作废',
      ],
    },
    // What the approver did from the card, in the card's heading.
    statuses: {
      approve: ['Approved', '已批准'],
      reject: ['Rejected', '已驳回'],
    },
    recommendations: {
      approve: ['Approve', '建议批准'],
      conditional: ['Approve on conditions', '建议有条件批准'],
      reject: ['Reject', '建议驳回'],
      needMore: ['Ask for more', '建议补充信息'],
    },
    summary: ['Why', '理由'],
    asked: ['Asked vs standard', '申请与标准'],
    conditions: ['Conditions', '批准条件'],
    reasons: ['Grounds', '依据'],
    together: ['Taken together', '合在一起看'],
    precedents: ['Earlier requests', '以往同类'],
    risks: ['Risks', '风险'],
    missing: ['To add', '需补充'],
    comment: ['Decision comment', '审批意见'],
    revisePlaceholder: ['Tell AI what to change', '告诉 AI 怎么改'],
    // On an approval's row in the list, for its approver.
    onRow: {
      running: ['AI reviewing', 'AI 生成建议中'],
      pending: ['AI suggestion', 'AI 建议待处理'],
    },
    // The card's accept: what the review recommends, with its comment.
    accept: {
      approve: ['Approve as advised', '按建议批准'],
      reject: ['Reject as advised', '按建议驳回'],
    },
    // What the accept does, listed on its hover.
    will: {
      title: ['Accepting will:', '采纳将：'],
      approve: [
        'Approve the request with the comment above',
        '批准此申请，并附上上面的审批意见',
      ],
      reject: [
        'Reject the request with the comment above',
        '驳回此申请，并附上上面的审批意见',
      ],
    },
    // Asking for a review, the first or another, as "Follow up" is for a
    // lead or a deal.
    // Also the chip's name once there is a review, as "AI follow-up" is.
    ask: ['AI review', 'AI 辅助审批'],
    applicant: ['Applicant', '申请人'],
  },
  // The conversion dialog's duplicate check, when it found nothing.
  noDuplicateCompanies: [
    'Checked: no possible duplicate company',
    '已查重：没有可能重复的公司',
  ],
  noDuplicateContacts: [
    'Checked: no possible duplicate contact',
    '已查重：没有可能重复的联系人',
  ],
  openOpportunities: [
    'This company already has open opportunities:',
    '该公司已有进行中的商机：',
  ],
  // An empty field the conversion needs, in its row.
  requiredEmpty: ['Required', '必填'],
  createOpportunity: ['Also create an opportunity', '同时创建商机'],
  overwriteFields: ['Overwrite these existing values', '覆盖以下已有值'],
  submit: ['Submit for approval', '提交审批'],
  saveAndSubmit: ['Save and submit', '保存并提交'],
  withdraw: ['Withdraw request', '撤回审批'],
  approve: ['Approve', '通过'],
  reject: ['Reject', '拒绝'],
  decisionTitle: {
    submit: ['Submit "{{name}}" for approval?', '提交审批「{{name}}」？'],
    withdraw: ['Withdraw "{{name}}"?', '撤回审批「{{name}}」？'],
    approve: ['Approve "{{name}}"?', '通过「{{name}}」？'],
    reject: ['Reject "{{name}}"?', '拒绝「{{name}}」？'],
  },
  decisionHint: {
    submit: [
      'It goes to {{approver}} for a decision. Once submitted it cannot be edited — only withdrawn.',
      '提交给 {{approver}} 审批。提交后不能再修改，只能撤回。',
    ],
    withdraw: [
      'The approver will no longer act on it. It returns to "withdrawn", where you can edit it and submit again.',
      '审批人将不再处理。申请回到「已撤回」，可修改后重新提交。',
    ],
    approve: [
      'A comment is optional. The decision is final; the applicant is notified.',
      '审批意见选填。通过后不可更改，申请人会收到通知。',
    ],
    reject: [
      'Say why, so the applicant knows what to change. The decision is final; a new request is needed to try again.',
      '请写明拒绝原因，方便申请人调整。拒绝后不可更改，需要重新发起申请。',
    ],
  },
  comment: ['Comment', '审批意见'],
  active: ['Active', '有效'],
  completed: ['Completed', '已完成'],
  overdue: ['Overdue', '已逾期'],
  open: ['Open', '进行中'],
  weighted: ['Weighted pipeline', '加权进行中商机金额'],
  pipeline: ['Open pipeline', '进行中商机金额'],
  won: ['Won revenue', '赢单金额'],
  winRate: ['Win rate', '赢单率'],
  today: ["Today's tasks", '今日任务'],
  recentChats: ['Recent conversations', '最近的对话'],
  viewAllChats: ['View all', '查看全部'],
  monthBusiness: ['This month', '本月生意'],
  overall: ['Sales performance', '销售表现'],
  leadConversionRate: ['Lead conversion rate', '线索转化率'],
  teamSection: ['Team', '团队'],
  scopeMine: ['Mine', '我负责的'],
  scopeTeam: ['Team', '团队'],
  newLeads: ['New leads this month', '本月新增线索'],
  convertedLeads: ['Converted this month', '本月转化'],
  staleLeads: ['Stalled leads', '停滞线索'],
  staleCompanies: ['Quiet companies', '公司久未联系'],
  amount: ['Amount', '金额'],
  count: ['Count', '数量'],
  pendingApprovals: ['Waiting for my approval', '待我审批'],
  pendingApprovalsTeam: ['Pending approvals', '待审批'],
  risks: ['Needs attention', '需要关注'],
  funnel: ['Opportunity funnel', '商机漏斗'],
  trends: ['Win / loss trend', '输赢趋势'],
  sources: ['Source performance', '来源表现'],
  sellers: ['Team performance', '团队业绩'],
  noRate: ['No closed opportunities', '暂无已关闭商机'],
  send: ['Send', '发送'],
  // The CRM's business actions in the Agents plugin's agent editor
  // (server/providers/crm-agents/actions.ts); the action titles are the
  // Permission Sets page's own, under authz.
  agentActions: {
    throughPlan: [
      'Suggested as changes the person confirms.',
      '以建议的改动提出，由本人确认后执行。',
    ],
    plans: ['Suggested changes', '建议的改动'],
    workspace: ['Workspace', '工作台'],
    search: ['Search records', '搜索记录'],
    colleagues: ['See colleagues', '查看同事'],
    comment: ['Comment on records', '评论记录'],
    aiWork: ['Set the AI agents to work', '让 AI Agent 工作'],
    aiWorkDescription: [
      "Asks the CRM's agents for a follow-up, a review, a task's preparation or a company's profile and news; what they suggest waits for the person.",
      '请 CRM 的 Agent 跟进、复核、准备任务或查公司资料和动态；它们的建议仍由本人决定。',
    ],
    planCreate: ['Suggest changes', '建议改动'],
    planCreateDescription: [
      'Suggests changes to records together, carried out once the person confirms them.',
      '把对记录的改动整理在一起提出，本人确认后执行。',
    ],
    deleteReason: [
      'Deleting records is left to people.',
      '删除记录只能由人来做。',
    ],
    approveReason: [
      'Deciding approvals is left to people.',
      '审批只能由人来做。',
    ],
    exportReason: [
      'Taking data out of the CRM is left to people.',
      '导出数据只能由人来做。',
    ],
  },
  // The preset a CRM agent starts from in the Agents plugin.
  agentPreset: {
    name: ['CRM assistant', 'CRM 助手'],
    // The assistant agent's own name (server/providers/crm-agents/assistant.ts).
    agentName: ['Sales Expert', '销售专家'],
    description: [
      'An AI that knows sales: it looks up your leads, deals and customers, reads where they stand and prepares the next step; any change it suggests waits for you to confirm.',
      '懂销售的 AI 助手：查线索、商机和客户，分析进展、准备跟进；要改的内容先列出来，由你确认。',
    ],
  },
  // The CRM's work agents' descriptions, the same on the Agents page and on
  // the Agent work page's card (server/providers/crm-agents/
  // work-agents.ts): what each does, then the other work it does.
  // What an agent set to work from a conversation came to, told in that
  // conversation (server/providers/crm-agents/ai-work-news.ts).
  aiWork: {
    news: {
      ready: ['{{agent}} finished “{{title}}”', '{{agent}}已完成「{{title}}」'],
      failed: [
        '{{agent}} could not finish “{{title}}”',
        '{{agent}}未能完成「{{title}}」',
      ],
      shown: [
        '{{agent}}’s suggestion on “{{title}}”',
        '{{agent}}对「{{title}}」的建议',
      ],
    },
    // A suggestion shown in the conversation that was redone or followed
    // up again elsewhere since.
    replaced: [
      'This suggestion on “{{title}}” has been replaced by a newer one, on the record and in the inbox.',
      '「{{title}}」的这条建议已被新的建议替换，可在记录和收件箱中查看。',
    ],
  },
  agentWork: {
    // Their names, shown in the viewer's language while an administrator
    // has not renamed them.
    names: {
      leads: ['Lead follow-up', '线索跟进'],
      opportunities: ['Opportunity follow-up', '商机跟进'],
      approvals: ['Approval review', '审批助手'],
      tasks: ['Task assistant', '任务助手'],
      signals: ['Company research', '公司情报'],
    },
    // The agent doing a dialog's AI work, named in it
    // (components/crm/work-agent.tsx).
    // The option letting it follow a record up, its name in place of
    // {{agent}} (components/crm/follow-up-option.tsx, outcome.tsx).
    followUp: {
      now: ['Run {{agent}} once created', '创建后运行 {{agent}}'],
      merged: ['Run {{agent}} once merged', '合并后运行 {{agent}}'],
      afterTask: ['Run {{agent}} once recorded', '记录后运行 {{agent}}'],
    },
    // A record's AI buttons, chips, cards and progress naming the agent
    // (useAgentWords in components/crm/work-agent-name.ts).
    words: {
      name: ['{{agent}}', '{{agent}}'],
      run: ['Run {{agent}}', '运行 {{agent}}'],
      rerun: ['Rerun {{agent}}', '重新运行 {{agent}}'],
      suggestion: ['Suggestion from {{agent}}', '{{agent}} 的建议'],
      preparation: ['Preparation by {{agent}}', '{{agent}} 的准备'],
      running: {
        followUp: [
          '{{agent}} is reviewing it and preparing a suggestion…',
          '{{agent}} 正在查看、准备跟进建议…',
        ],
        prep: [
          '{{agent}} is preparing this task…',
          '{{agent}} 正在为这个任务做准备…',
        ],
        review: [
          '{{agent}} is reviewing the request…',
          '{{agent}} 正在分析这个申请…',
        ],
      },
    },
    by: {
      organise: ['Organised by {{agent}}', '由 {{agent}} 整理'],
      propose: ['Proposed by {{agent}}', '由 {{agent}} 提出'],
    },
    leads: [
      'Reads a lead with its tasks, comments and mail, and what Company research found about its company on the web, and recommends following up, nurturing, converting or closing it as invalid, with a grade and the next step. It also organises pasted text into new leads and proposes how to merge duplicate leads.',
      '读取线索及其任务、评论和邮件，以及公司情报联网查到的线索公司信息，给出继续跟进、放入培育、转化或无效的建议，附等级和下一步；也负责 AI 整理新线索、提出重复线索的合并方案。',
    ],
    opportunities: [
      'Reads a deal with its company, contacts, tasks, comments, approvals and mail, checks its terms against the approval standards, and recommends advancing, keeping at it, pausing or losing it, with the approvals to submit and the next step. It also organises pasted text into new opportunities.',
      '读取商机及其公司、联系人、任务、评论、审批和邮件，按审批标准核对商务条款，给出推进、继续、暂停或输单的建议，以及需要提交的审批和下一步；也负责 AI 整理新商机。',
    ],
    approvals: [
      'Reviews an approval for its approver: the terms asked for against the standard and their cost, the deal, earlier decisions of the same kind and the risks, with a recommendation and a drafted comment. Only the approver sees it.',
      '为审批人分析审批申请：申请条件与标准的差距和代价、商机情况、以往同类审批的结果和风险，给出建议和审批意见草稿。只有审批人能看到。',
    ],
    tasks: [
      "Prepares a task for its owner on the morning of its day: what it should achieve, where things stand from the record's tasks, comments and mail, who is on the other side, the questions to ask, what to bring, the risks and the points to cover. Only the task's owner and participants see it. It also writes up a task's outcome when the task is done.",
      '在任务当天早上为负责人做准备：任务要达成什么、从记录的任务、评论和邮件看进展到哪一步、对方都有谁、要问的问题、要带的材料、风险和要点。只有任务负责人和参与人能看到。也负责完成任务时整理任务结果。',
    ],
    signals: [
      "Looks companies up on the web. For a new company, it fills the form with the company's public particulars. Before a lead's follow-up, when it is due, it looks the lead's company up: who it is, what changed there lately and whether it uses NocoBase. Each morning, it looks at what happened lately at the companies with an open deal or marked as watched: funding, hiring at scale, new executives, major news and risks. It keeps each with its sources on the company's page and tells the people selling to it; the deals' daily pass then follows up the company's open deals for one worth acting on.",
      '联网了解客户公司。新建公司时，查找公司的公开资料填好表单；跟进线索前，需要时查线索的公司：是谁、最近有什么变化、是否在用 NocoBase；每天早上，查看有进行中商机或被标记关注的公司最近发生了什么：融资、扩张招聘、高管变动、重大动态和风险。每条带出处记在公司页上，并通知公司和商机的负责人；值得跟进的，由随后的商机每日巡检跟进这家公司进行中的商机。',
    ],
  },
  // The agent whose model and instructions the CRM's background work
  // followed before the work agents (server/providers/crm-agents/background.ts).
  agentBackground: {
    description: [
      "The CRM's background work: follow-ups, approval reviews, task preparation and organising text. Its first model and its instructions are what that work uses.",
      'CRM 的后台工作：跟进、审批辅助、任务准备和 AI 整理。这些工作使用它的第一个模型和它的指令。',
    ],
  },
  agentConversationSource: ['CRM', 'CRM'],
  agentSearchSource: ['CRM search', 'CRM 搜索'],
  // The CRM's permission model as the Permission Sets page shows it.
  authz: {
    group: ['CRM', 'CRM'],
    capabilities: ['CRM capabilities', 'CRM 能力'],
    sales: ['Sales capabilities', '销售能力'],
    // The two sales permission sets (an existing set keeps its stored
    // title; provisioning never rewrites one).
    roles: {
      salesManager: ['Sales manager', '销售经理'],
      salesRepresentative: ['Salesperson', '销售人员'],
    },
    actions: {
      view: ['View', '查看'],
      create: ['Create', '新建'],
      edit: ['Edit', '编辑'],
      delete: ['Delete', '删除'],
      assign: ['Assign records to others', '分配记录给他人'],
      approve: ['Decide approvals', '审批'],
      export: ['Export records', '导出记录'],
      sendWhatsApp: ['Send WhatsApp messages', '发送 WhatsApp 消息'],
      manage: ['Manage', '管理'],
    },
    pages: {
      home: ['Overview', '工作台'],
      record: ['Record pages', '记录详情页'],
      decisions: ['AI suggestions in the inbox', '收件箱的 AI 建议'],
      agents: ['Agent work', 'Agent 工作'],
      runnerAgents: ['Agents (from runners)', 'Agent（来自运行器）'],
      reports: ['Reports', '报表'],
      agentChat: ['AI conversations', 'AI 对话'],
      whatsapp: ['WhatsApp', 'WhatsApp'],
    },
  },
  aiLanguages: {
    'zh-CN': ['Simplified Chinese', '中文（简体）'],
    'en-US': ['English', 'English'],
  },
  // The AI's suggestions in the inbox's To do view.
  inbox: {
    suggestions: ['AI suggestions', 'AI 建议'],
    showHandled: ['Show handled suggestions', '查看已处理的建议'],
    hideHandled: ['Hide', '收起'],
    noHandled: ['No handled suggestions yet.', '还没有已处理的建议。'],
  },
  decisions: {
    empty: ['Nothing is waiting on you.', '没有等你处理的事。'],
    handled: ['Handled', '已处理'],
  },
  // The settings' General tab, named so in the permission catalog too
  // (server/providers/crm/authorization.ts).
  settings: ['General settings', '通用设置'],
  leadCapture: {
    aiTab: ['Organise with AI', 'AI 整理'],
    formTab: ['Fill in a form', '表单录入'],
    placeholder: [
      'Paste anything: an email, a chat, notes from a fair or a call. The AI turns each person into a lead, and you check it before it is saved.',
      '粘贴任何内容：邮件、聊天记录、展会或电话记录。AI 会把每个人整理成一条线索，你核对后再保存。',
    ],
    input: ['Text to organise', '要整理的内容'],
    organise: ['AI organise', 'AI 整理'],
    organising: ['The AI is organising…', 'AI 正在整理…'],
    check: ['Check', '请核对'],
    filledNotice: [
      'The AI filled this from your text. Fields marked Check are its guesses; empty fields were not in the text.',
      'AI 根据原文填写。标记"请核对"的是推测，空的是原文里没有的。',
    ],
    fillRequired: ['Still required: {{fields}}', '需补充必填项：{{fields}}'],
    duplicates: ['Possibly already in the CRM:', 'CRM 里可能已有：'],
    // Merge the lead, not yet saved, into the one the CRM holds instead of
    // creating it.
    mergeInto: ['Merge into it…', '合并到这条…'],
    merged: ['Merged', '已合并'],
    found: [
      'The AI found {{count}} leads. Check them, then create the ones you want.',
      'AI 整理出 {{count}} 条线索，核对后创建需要的。',
    ],
    forAll: ['Set for all', '统一设置'],
    unassigned: ['No owner', '未指派'],
    missing: ['{{count}} required missing', '缺 {{count}} 项必填'],
    checkCount: ['{{count}} to check', '核对 {{count}} 处'],
    duplicate: ['Possible duplicate', '可能重复'],
    aiChanged: ['AI changed', 'AI 刚改'],
    createOne: ['Create lead', '创建线索'],
    createCount: ['Create {{count}}', '创建 {{count}} 条'],
    pendingCount: ['{{count}} incomplete', '{{count}} 条待补'],
    created: ['Created', '已创建'],
    createFailed: ['Not created', '创建失败'],
    openRecord: ['Open the lead', '打开线索'],
    adjust: ['Adjust', '调整'],
    adjusting: ['Adjusting…', '正在调整…'],
    adjustPlaceholder: ['Tell AI what to change', '告诉 AI 怎么改'],
    original: ['Your text', '原文'],
    adjustTitle: ['Adjust with the AI', '让 AI 调整'],
    noneLeft: [
      'No leads are left. Organise the text again, or cancel.',
      '没有剩下的线索了。可以重新整理原文，或者取消。',
    ],
    reorganise: ['Organise again', '重新整理'],
    reorganiseHint: [
      'Replaces the leads not yet created.',
      '会替换还没创建的线索',
    ],
  },
  // New opportunity with the AI (opportunity-capture.tsx).
  // New company with the AI (components/crm/company-capture.tsx).
  // The overview's questions under its ask box, from its attention figures
  // (pages/crm-dashboard.tsx), sent as they read.
  overviewAsk: {
    overdueOpportunities_one: [
      'A deal is past its expected close: update it or let it go?',
      '1 个商机已过预计成交日，该更新还是放弃？',
    ],
    overdueOpportunities_other: [
      '{{count}} deals are past their expected close: update them or let them go?',
      '{{count}} 个商机已过预计成交日，该更新还是放弃？',
    ],
    closingSoon_one: [
      'A deal is due to close soon: might it slip?',
      '1 个商机即将到预计成交日，会不会落空？',
    ],
    closingSoon_other: [
      '{{count}} deals are due to close soon: which might slip?',
      '{{count}} 个商机即将到预计成交日，哪些可能落空？',
    ],
    staleOpportunities_one: [
      'A deal has stalled: how do I move it?',
      '1 个商机很久没有进展，怎么推进？',
    ],
    staleOpportunities_other: [
      '{{count}} deals have stalled: which should move first?',
      '{{count}} 个商机很久没有进展，先推进哪个？',
    ],
    uncontacted_one: [
      'A new lead is not contacted yet: how should I reach out?',
      '1 条新线索还没联系，怎么联系比较好？',
    ],
    uncontacted_other: [
      '{{count}} new leads not contacted yet: who first?',
      '{{count}} 条新线索还没联系，先联系谁？',
    ],
    staleLeads_one: [
      'A lead has gone quiet: still worth chasing?',
      '1 条线索很久没跟进了，还值得跟吗？',
    ],
    staleLeads_other: [
      '{{count}} leads have gone quiet: still worth chasing?',
      '{{count}} 条线索很久没跟进了，还值得跟吗？',
    ],
    staleCompanies_one: [
      'A company has gone quiet: how should we get back in touch?',
      '1 家公司很久没有往来，怎么重新联系？',
    ],
    staleCompanies_other: [
      '{{count}} companies have gone quiet: whom should we reach out to?',
      '{{count}} 家公司很久没有往来，该联系谁？',
    ],
    noContacts_one: [
      'A company has no contact yet: whom should I find?',
      '1 家公司还没有联系人，该找谁？',
    ],
    noContacts_other: [
      '{{count}} companies have no contact yet: whom to find first?',
      '{{count}} 家公司还没有联系人，先找谁？',
    ],
  },
  companyCapture: {
    name: ['Company name', '公司名称'],
    namePlaceholder: [
      'The name you know it by, e.g. H World Group',
      '常用名称即可，例如：华住集团',
    ],
    note: ['What you know (optional)', '补充信息（可选）'],
    notePlaceholder: [
      'Its city, website or what it does, to tell it from others of the same name',
      '城市、网址或主营业务等，帮助区分同名公司',
    ],
    searchHint: [
      'The AI searches the web for its public information and fills the form; it takes about half a minute.',
      'AI 会联网搜索公司的公开信息并填好表单，大约需要半分钟。',
    ],
    searching: ['Searching the web for the company…', '正在联网搜索公司信息…'],
    filledNotice: [
      'Filled from the web; check each value before creating.',
      '已根据网上公开信息填写，创建前请逐项核对。',
    ],
    duplicates: ['Already in the CRM:', 'CRM 中已有同名公司：'],
    sources: ['Sources', '参考来源'],
    noSources: ['The search cited no page.', '这次搜索没有给出来源网页。'],
    searchAgain: ['Search again', '重新搜索'],
    create: ['Create company', '创建公司'],
  },
  dealCapture: {
    placeholder: [
      'Paste anything: a customer email about buying more, a renewal, a tender notice, call notes. The AI fills in the opportunity, matches the company and its contacts, and you check it before saving.',
      '粘贴任何内容：客户要增购的邮件、续约、招标公告、沟通记录。AI 会整理成一个商机，匹配公司和联系人，你核对后再保存。',
    ],
    noCompany: [
      'The company “{{company}}” in the text is not in the CRM: pick a company, or create it first.',
      '原文里的公司「{{company}}」在 CRM 里没有找到：请选择公司，没有的话先新建公司。',
    ],
    severalCompanies: [
      'Several companies may be “{{company}}”: pick the right one.',
      '有几个公司可能是「{{company}}」：请选择正确的那个。',
    ],
    duplicates: [
      'This company already has open opportunities:',
      '这个公司已有进行中的商机：',
    ],
    newContact: ['New', '新建'],
    newContactHint: [
      'Created as the company’s contact with the opportunity; remove the row to leave them out.',
      '创建商机时新建为这个公司的联系人；不需要就删掉这一行。',
    ],
    newContactNeedsCompany: [
      'Pick the company first: new people become its contacts.',
      '先选择公司：新联系人会建在这个公司下。',
    ],
    reorganiseHint: [
      'The text changed: organise it again to replace the opportunity.',
      '原文改过了，重新整理会替换上面的商机。',
    ],
    create: ['Create opportunity', '创建商机'],
  },
  settingsDescription: [
    'Business defaults and reminders.',
    '配置业务选项和提醒。',
  ],
  business: ['Business defaults', '业务配置'],
  reminders: ['Reminders', '提醒设置'],
  // The business guidance page (crm-guidance.tsx).
  guidance: ['Business guidance', '业务指导'],
  guidanceHint: [
    'What the AI works from in every conversation and every follow-up, review and preparation: who you are, your editions and prices, when to follow up and when to ask for approval. Markdown.',
    'AI 在每段对话和每次跟进、审批辅助、任务准备时遵循的业务指导：公司定位、版本和价格、跟进节奏、何时需要审批。支持 Markdown。',
  ],
  guidanceShipped: [
    "The default guidance: it follows the reminders' days and the AI working language.",
    '当前是默认指导：跟进天数取自提醒设置，语言跟随 AI 工作语言。',
  ],
  guidanceCustom: [
    "Your own guidance: the reminders' days and the AI working language no longer change it.",
    '当前是自定义指导：提醒设置的天数和 AI 工作语言不再影响它。',
  ],
  guidanceRestore: ['Restore the default', '恢复默认'],
  // The settings' switches for the in-app messages the CRM sends.
  notifications: {
    heading: ['In-app notifications', '站内通知'],
    notifyApprovals: ['Approval notifications', '审批通知'],
    notifyApprovalsHint: [
      'To the approver when a request is submitted or withdrawn, and to the applicant when it is approved or rejected.',
      '申请提交或撤回时通知审批人，通过或驳回时通知申请人。',
    ],
    notifyRecordChanges: ['Record change notifications', '记录变更通知'],
    notifyRecordChangesHint: [
      "To the new owner when a record changes hands, to a task's participants when they are invited or removed or the task is rescheduled or cancelled, and to the people selling to a company when the AI finds news about it.",
      '记录更换负责人时通知新负责人；任务参与人被邀请、移除，或任务改期、取消时通知参与人；AI 发现客户新动态时通知公司和商机的负责人。',
    ],
    notifyComments: ['Comment notifications', '评论通知'],
    notifyCommentsHint: [
      'To a colleague a comment @-mentions, and to everyone who has written in a thread when someone replies to it.',
      '评论里 @ 到的同事会收到通知；有人回复时，通知参与过该讨论的人。',
    ],
    notifyTaskReminders: ['Task reminders', '任务提醒'],
    notifyTaskRemindersHint: [
      'To the owner and participants before a task with a time starts; a task with a date alone is not reminded of.',
      '有具体时刻的任务开始前提醒负责人和参与人；只填日期的任务不提醒。',
    ],
  },
  settingsSaved: ['Settings saved', '设置已保存'],
  searchRecords: ['Type to search', '输入关键字搜索'],
  noMatches: ['No matching records', '没有匹配的记录'],
  clearChoice: ['Clear', '清除选择'],
  clearDate: ['Clear', '清除'],
  demoData: ['Demo data', '演示数据'],
  demoDescription: [
    'Sample sales data of NocoBase with fictional customers, in English or Chinese: leads, companies, contacts, opportunities, tasks, approvals, mail and WhatsApp chats. Importing creates the accounts below; each password is the username followed by 123.',
    '以 NocoBase 销售为背景的演示数据，客户均为虚构，有中文和英文两种：线索、公司、联系人、商机、任务、审批，以及邮件和 WhatsApp 对话。导入时会创建下列账号，密码为用户名加 123。',
  ],
  demoLanguage: ['Demo data language', '演示数据语言'],
  demoAbsent: ['No demo data has been imported.', '尚未导入演示数据。'],
  demoPresent: [
    'Demo data imported on {{date}}: {{count}} records.',
    '演示数据已于 {{date}} 导入，共 {{count}} 条记录。',
  ],
  demoSettingsSet: [
    'The import changed these settings for the demo data: {{names}}.',
    '导入时为演示数据修改了：{{names}}。',
  ],
  demoAccounts: ['Demo accounts', '演示账号'],
  demoImport: ['Import demo data', '导入演示数据'],
  demoImportTitle: ['Import the demo data?', '导入演示数据？'],
  demoImportHint: [
    "The demo records are added beside your own, owned by the demo accounts and by you, and you also become a sales manager. Settings still at their defaults change to the demo data's: currency CNY, its timezone and its AI language. Each account gets a demo mailbox that never sends mail out. You can remove it all again here.",
    '演示记录会加在现有数据旁边，负责人是演示账号和你，你也会成为销售经理。仍为默认值的设置会改成演示数据用的：币种人民币、所在时区和 AI 语言。每个账号会有一个演示邮箱，邮件不会真正发出。之后可以在这里全部清除。',
  ],
  demoImported: ['Demo data imported', '演示数据已导入'],
  demoReset: ['Remove demo data', '清除演示数据'],
  demoResetTitle: ['Remove the demo data?', '清除演示数据？'],
  demoResetHint: [
    'Every record the import created is deleted, including changes made to them since, and the demo accounts it created are disabled: they no longer sign in or appear as owners, and importing again enables them. The sales manager role the import gave you is removed. The demo mailboxes and their mail are removed too. Records created by hand stay.',
    '导入创建的全部记录（含之后对它们的修改）都会被删除，导入时新建的演示账号会被停用：不能再登录，也不会出现在负责人等选项里，再次导入时会重新启用；导入时给你加上的销售经理角色会被移除；演示邮箱及其中的邮件也会一并删除。手工创建的记录保留。',
  ],
  demoRemoved: ['Demo data removed', '演示数据已清除'],
  demoBanner: [
    'No demo data yet. Import a sample dataset to try leads, opportunities and the AI’s follow-ups with realistic records.',
    '还没有演示数据。导入一套演示数据，用接近真实的记录体验线索、商机和 AI 跟进。',
  ],
  demoBannerAction: ['Import demo data', '导入演示数据'],
  demoBannerDismiss: ['Dismiss', '不再显示'],
  demoImporting: ['Importing the demo data…', '正在导入演示数据…'],
  enabled: ['Enabled', '启用'],
  disabled: ['Disabled', '停用'],
  role: ['Sales role', '销售角色'],
  importHint: [
    'Use field keys as column headers. Download a template below. Related records use their IDs; array fields use JSON. Up to 500 rows, saved together or rolled back together.',
    '使用字段键作为表头，可下载模板。关联字段填写记录 ID，数组字段使用 JSON。最多 500 行，全部成功才保存，否则整体回滚。',
  ],
  template: ['Download template', '下载模板'],
  importPreview: ['{{count}} rows ready to import', '{{count}} 行记录待导入'],
  download: ['Download', '下载'],
  preview: ['Preview', '预览'],
  close: ['Close', '关闭'],
  month: ['Month', '月份'],
  previousMonth: ['Previous month', '上个月'],
  nextMonth: ['Next month', '下个月'],
  previousYear: ['Previous year', '上一年'],
  nextYear: ['Next year', '下一年'],
  thisMonth: ['This month', '本月'],
  changed: ['Changed fields', '变更字段'],
  owner: ['Owner', '负责人'],
  newTask: ['New task', '新建任务'],
  completeTask: ['Complete', '完成'],
  cancelTask: ['Cancel task', '取消任务'],
  cancelTaskTitle: ['Cancel this task?', '取消此任务？'],
  cancelTaskDescription: [
    'It is marked cancelled, and the colleagues taking part are told. It can be opened again later.',
    '任务将标记为已取消，参与的同事会收到通知。之后仍可重新打开。',
  ],
  completeTaskOf: ['Complete: {{name}}', '完成：{{name}}'],
  newApproval: ['Request approval', '申请审批'],
  linkExisting: ['Link existing', '关联已有'],
  opportunitySuffix: [' opportunity', '商机'],
  conversionImpact: [
    'On conversion the lead becomes read-only, {{tasks}} linked tasks move to the company, and the contact and opportunity are attached to it.',
    '转化后线索永久只读；{{tasks}} 条关联任务将挂到公司下；联系人和商机归属该公司。',
  ],
  noRecords: ['None yet', '暂无'],
  showing: ['Showing', '当前显示'],
  metricNotes: {
    uncontacted: ['No follow-up yet', '没有任何跟进'],
    conversionRate: [
      'All time: converted ÷ all leads except invalid',
      '全部时间：已转化 ÷ 无效外的全部线索',
    ],
    customers: [
      'Status is customer; {{share}} of all companies',
      '状态为成交客户，占全部 {{share}}',
    ],
    contactsNewThisMonth: ['Contacts created this month', '本月创建的联系人'],
    churnedThisMonth: [
      'Moved to churned this month; {{added}} new this month',
      '本月转为流失；本月新增 {{added}}',
    ],
    noContacts: ['Companies with no contacts yet', '公司下还没有联系人'],
    noOpenOpportunity: [
      'Qualified or customer, no open opportunity',
      '有意向或已成交，但没有进行中的商机',
    ],
    staleLeads: [
      'No contact for {{days}}+ days, nothing planned',
      '{{days}} 天没联系，也没安排下一步',
    ],
    staleCompanies: ['No contact for {{days}}+ days', '{{days}} 天没联系'],
    staleOpportunities: [
      'No contact for {{days}}+ days, nothing planned',
      '{{days}} 天没联系，也没安排下一步',
    ],
    newLeads: ['Leads created this month', '本月创建的线索'],
    convertedLeads: ['Leads converted this month', '本月转化的线索'],
    pipeline: ['All open opportunities added up', '所有进行中商机的金额合计'],
    missingContact: ['Contacts with no phone or email', '联系人没有电话和邮箱'],
    inactiveContacts: ['Marked as left the company', '标记为已离职'],
    open: ['Open opportunities', '进行中的商机'],
    weighted: [
      'Amount × stage probability, open opportunities',
      '金额 × 阶段概率，进行中的商机',
    ],
    closingSoon: [
      'Expected to close within {{days}} days',
      '{{days}} 天内预计成交',
    ],
    overdueOpportunities: ['Expected close date passed', '预计成交日已过'],
    wonThisMonth: ['Amount closed as won this month', '本月赢单的金额'],
    winRate: [
      'All time: won ÷ (won + lost)',
      '全部时间：赢单 ÷（赢单 + 输单）',
    ],
    todayTasks: ['Tasks for today', '今天的任务'],
    myDecisions: [
      'Pending, with me as approver; {{waiting}} waiting over 3 days',
      '审批中且审批人是我；其中 {{waiting}} 条已等待超过 3 天',
    ],
    awaitingApproval: [
      'Raised by me, pending a decision',
      '我发起、正在审批中的申请',
    ],
    toSubmit: ['Drafts and withdrawn approvals', '草稿和撤回的审批'],
    approvedThisMonth: ['Decided as approved this month', '本月通过的审批'],
    rejectedThisMonth: [
      'Decided as rejected this month; approval rate {{rate}}',
      '本月拒绝的审批；本月通过率 {{rate}}',
    ],
    overdueTasks: ['Open, and its time has passed', '未完成，且时间已过'],
    upcoming: ['Open, coming up', '未完成，时间在后'],
    completedThisMonth: ['Tasks completed this month', '本月完成的任务'],
  },
  allOf: ['All: {{what}}', '{{what}}：全部'],
  leadTitle: ['Name / Company', '姓名 / 公司'],
  leftCompany: ['Left the company', '已离职'],
  onThisOpportunity: ['On this opportunity', '参与此商机'],
  otherCompanyContacts: ['Other contacts at the company', '公司的其他联系人'],
  addToOpportunity: ['Add', '加入'],
  yourDecision: ['Waiting for me', '待我审批'],
  youApprove: ['You are the approver', '你是审批人'],
  joinOpportunityTitle: [
    'Add {{name}} to this opportunity',
    '将 {{name}} 加入本商机',
  ],
  joinOpportunityHint: [
    'Choose the role this person plays in the deal.',
    '选择此人在商机中的角色。',
  ],
  removeContactTitle: [
    'Remove {{name}} from this opportunity?',
    '从本商机移除 {{name}}？',
  ],
  removeContactHint: [
    'The contact itself is kept; only its role on this opportunity is removed.',
    '联系人本身保留，只移除其在本商机中的角色。',
  ],
  convertedFrom: ['From lead', '转化自线索'],
  companyPrimary: ["The company's primary contact", '公司的主要联系人'],
  setPrimary: ['Set as primary contact', '设为主要联系人'],
  unsetPrimary: ['Primary contact (click to clear)', '主要联系人（点击取消）'],
  setPrimaryTitle: ['Set primary contact', '设为主要联系人'],
  unsetPrimaryTitle: ['Clear primary contact', '取消主要联系人'],
  setPrimaryDetail: [
    '{{name}} becomes the primary contact of this company.',
    '{{name}} 将成为该公司的主要联系人。',
  ],
  replacePrimaryDetail: [
    '{{name}} becomes the primary contact; {{previous}} no longer is.',
    '{{name}} 将成为主要联系人，{{previous}} 不再是主要联系人。',
  ],
  unsetPrimaryDetail: [
    '{{name}} will no longer be the primary contact; this company will have none.',
    '{{name}} 将不再是主要联系人，该公司将没有主要联系人。',
  ],
  moveTo: ['Move to {{stage}}', '移到「{{stage}}」'],
  moveToDetail: ['{{name}}: a reason is required.', '{{name}}：必须填写原因。'],
  noContacts: ['No contacts', '公司无联系人'],
  noOpenOpportunity: ['No open opportunity', '无进行中商机'],
  staleOpportunities: ['Stalled opportunities', '商机停滞'],
  closingSoon: ['Closing soon', '商机即将到期'],
  overdueOpportunities: ['Past close date', '商机已逾期'],
  wonThisMonth: ['Won this month', '本月赢单'],
  upcoming: ['Upcoming', '待进行'],
  completedThisMonth: ['Completed this month', '本月完成'],
  more: ['View all', '查看全部'],
  showMore: ['Show more', '展开'],
  // A record's particular, copied as it reads from the button on its row.
  copyValue: ['Copy', '复制'],
  editValue: ['Edit this value', '编辑此项'],
  copiedValue: ['Copied', '已复制'],
  refresh: ['Refresh', '刷新'],
  moreFields: ['More: {{fields}}', '更多：{{fields}}'],
  fewerFields: ['Fewer fields', '收起'],
  showLess: ['Show less', '收起'],
  prompts: {
    analyzeSales: [
      'Analyze the sales situation: the funnel by stage, this month against the pipeline, where deals are stuck, and the three most useful next actions. Look the records up rather than guessing.',
      '分析销售情况：各阶段商机分布、本月进展与在手商机、卡在哪里、最有价值的三项下一步行动。需要的记录先查再说，不要猜。',
    ],
    companies: [
      'Summarize this company and suggest opportunities to deepen the relationship.',
      '总结此公司，并建议深化客户关系的机会。',
    ],
    contacts: [
      'Prepare a conversation brief for this contact using their company and opportunity history.',
      '根据此联系人的公司和商机记录，准备一份沟通简报。',
    ],
    opportunities: [
      'Review this opportunity, its contacts, tasks and approvals. Suggest the next actions to move it forward.',
      '分析此商机及联系人、任务和审批记录，建议下一步推进动作。',
    ],
    tasks: [
      'Summarize this task and suggest a concrete next step.',
      '总结这个任务，并建议具体的下一步。',
    ],
    approvals: [
      'Review this approval request. Summarize the risks and missing information without making the decision.',
      '审阅此审批申请，总结风险与缺失信息，不替审批人做决定。',
    ],
  },
  // The assistant's panel on the Agents plugin
  // (client/components/crm/agent-chat/).
  agentPanel: {
    title: ['AI', 'AI'],
    history: ['Conversations', '对话列表'],
    newConversation: ['New conversation', '新建对话'],
    openFullPage: ['Open full page', '在整页中打开'],
    close: ['Close', '关闭'],
    attachHint: [
      'Attach files: the AI sees images, and only the names of other files',
      '添加附件：AI 能看到图片，其他文件只能看到文件名',
    ],
    model: ['Model', '模型'],
    removePin: ['Remove {{label}}', '移除{{label}}'],
    notSetUp: [
      'The assistant is not available. Ask an administrator to set it up in Settings → Agent team.',
      '助手暂时不可用，请联系管理员在 设置 → Agent 团队 里设置。',
    ],
    sendFailed: [
      'The question was not sent. Try again.',
      '问题没发出去，请重试。',
    ],
    uploadFailed: ['"{{name}}" could not be uploaded.', '“{{name}}”上传失败。'],
    fileTooLarge: [
      '"{{name}}" is too large to attach.',
      '“{{name}}”太大，无法添加。',
    ],
    tooManyFiles: [
      'A message carries at most {{count}} files.',
      '一条消息最多带 {{count}} 个文件。',
    ],
  },
  // The conversations with the Agents plugin's agents.
  agentChat: {
    new: ['New conversation', '新建对话'],
    // Back into the side panel, on the conversation open: the panel's
    // Open full page undone.
    collapse: ['Collapse', '收起'],
    collapseHint: [
      'Back to the page you came from, the conversation in the side panel',
      '回到之前的页面，在右侧面板里继续这段对话',
    ],
    actions: ['Conversation actions', '对话操作'],
    // A conversation's last message in its list row, when it is the person's.
    lastYours: ['You: ', '你：'],
    lastFrom: ['{{name}}: ', '{{name}}：'],
    copy: ['Copy', '复制'],
    copied: ['Copied', '已复制'],
    list: ['Conversations', '对话'],
    // What a conversation started from, under its header.
    startedFrom: ['Started from', '对话起点'],
    aiCard: ['AI suggestion', 'AI 建议'],
    archivedList: ['Archived conversations', '已归档的对话'],
    empty: ['No conversations yet', '还没有对话'],
    emptyDescription: [
      'Ask an agent about your records; the changes it proposes are made once you confirm them.',
      '问 Agent 关于你的记录的问题，它提出的改动由你确认后执行。',
    ],
    nothingOpen: [
      'Pick a conversation or start a new one',
      '选择一个对话，或新建一个',
    ],
    noAgent: ['No agent yet', '还没有 Agent'],
    noAgentDescription: [
      'Set up a model service on Agent team → Models.',
      '在 Agent 团队 → 模型 里配置模型服务。',
    ],
    manageAgents: ['Set up models', '配置模型'],
    agent: ['Agent', 'Agent'],
    placeholder: ['Ask the agent…', '问问 Agent…'],
    send: ['Send', '发送'],
    sending: ['Sending…', '发送中…'],
    notSent: ['Not sent', '未发送'],
    sendAgain: ['Send again', '重新发送'],
    archive: ['Archive', '归档'],
    restore: ['Restore', '恢复'],
    showArchived: ['Show archived', '显示已归档'],
    hideArchived: ['Hide archived', '隐藏已归档'],
    noArchived: ['No archived conversations', '没有已归档的对话'],
    archivedNote: ['This conversation is archived.', '这个对话已归档。'],
    unread: ['Unread', '未读'],
    jumpToLatest: ['Jump to latest', '回到最新'],
    untitled: ['Untitled conversation', '未命名对话'],
    you: ['You', '你'],
    working: ['{{agent}}: {{step}}', '{{agent}}：{{step}}'],
    // What the run is doing, in plain words rather than the CRM command it
    // runs (agent-chat/step-text.ts); {{object}} is the kind of record.
    step: {
      thinking: ['thinking…', '正在思考…'],
      skill: ['reading up on how to do it…', '正在查阅工作方法…'],
      help: ['checking what it can do…', '正在了解可用的操作…'],
      search: ['searching for “{{q}}”…', '正在搜索「{{q}}」…'],
      find: ['looking for {{object}} “{{q}}”…', '正在查找{{object}}「{{q}}」…'],
      list: ['looking through the {{object}}…', '正在查看{{object}}…'],
      get: ['reading the {{object}}…', '正在读取{{object}}详情…'],
      history: [
        'reading the {{object}}’s timeline…',
        '正在查看{{object}}的动态…',
      ],
      read: ['looking at the {{object}}…', '正在查看{{object}}…'],
      summary: ['counting up the {{object}}…', '正在统计{{object}}…'],
      colleagues: ['looking up colleagues…', '正在查看同事…'],
      crm: ['querying the CRM…', '正在查询 CRM…'],
      reading: ['reading…', '正在查阅资料…'],
      working: ['working on it…', '正在处理…'],
      plan: [
        'putting the changes into a plan for you…',
        '正在整理建议的改动，等你确认…',
      ],
    },
    notFound: ['This conversation does not exist.', '这个对话不存在。'],
    backToList: ['Back to the conversations', '返回对话列表'],
    retry: ['Retry', '重试'],
    // Why an agent cannot answer now (the plugin's offline reasons).
    // How an answer that did not finish reads.
    outcome: {
      failed: ['The answer did not finish.', '回答没有完成。'],
      cancelled: ['The answer was stopped.', '已停止回答。'],
      interrupted: ['The answer was interrupted.', '回答被中断。'],
    },
    offline: {
      agentMissing: ['This agent no longer exists', '这个 Agent 已不存在'],
      agentArchived: ['This agent is archived', '这个 Agent 已归档'],
      forbidden: ['You may not use this agent', '你不能使用这个 Agent'],
      noRunner: [
        'No runner can run it for you now',
        '现在没有能为你运行它的 Runner',
      ],
      modelUnavailable: ['No AI model is set up yet', '还没有配置 AI 模型'],
      noModel: ['No AI model is set up yet', '还没有配置 AI 模型'],
    },
  },
  // The plans an agent proposes, decided by the person they were proposed to.
  plans: {
    agent: ['Agent', 'Agent'],
    meta: [
      'Changes suggested by {{agent}} · {{time}}',
      '{{agent}} 建议的改动 · {{time}}',
    ],
    status: {
      pending: ['Waiting', '待决定'],
      executing: ['Carrying out', '执行中'],
      executed: ['Carried out', '已执行'],
      failed: ['Failed', '执行失败'],
      stale: ['Not carried out', '未执行'],
      voided: ['Ignored', '已忽略'],
      expired: ['Expired', '已过期'],
      superseded: ['Replaced', '已替换'],
    },
    op: {
      record: {
        create: ['New {{entity}}', '新建{{entity}}'],
        update: ['Update {{entity}}', '修改{{entity}}'],
      },
      lead: { convert: ['Convert lead', '转化线索'] },
      comment: { create: ['Comment on {{entity}}', '评论{{entity}}'] },
      task: { recordOutcome: ['Record the outcome of', '记录任务结果'] },
      approval: {
        submit: ['Submit approval', '提交审批'],
        withdraw: ['Withdraw approval', '撤回审批'],
        approve: ['Approve', '批准'],
        reject: ['Reject', '驳回'],
      },
      suggestion: {
        accept: [
          'Accept the AI suggestion on {{entity}}',
          '采纳{{entity}}的 AI 建议',
        ],
        dismiss: [
          'Ignore the AI suggestion on {{entity}}',
          '忽略{{entity}}的 AI 建议',
        ],
      },
      mail: { send: ['Send email', '发送邮件'] },
    },
    comment: ['Comment', '评论'],
    suggestion: ['Suggestion', 'AI 建议'],
    nextTask: ['Next task', '下一步任务'],
    mail: {
      from: ['From', '发件人'],
      to: ['To', '收件人'],
      cc: ['Cc', '抄送'],
      subject: ['Subject', '主题'],
      later: [
        'Sent from your mailbox once you carry this out.',
        '执行后从你的邮箱发出。',
      ],
      sent: ['Sent', '已发送'],
      notSent: ['Not sent: {{reason}}', '未发送：{{reason}}'],
    },
    keepStep: ['Keep step {{step}}', '保留第 {{step}} 步'],
    execute_one: ['Carry out 1 change', '执行 1 项改动'],
    execute_other: ['Carry out {{count}} changes', '执行 {{count}} 项改动'],
    void: ['Ignore', '忽略'],
    expiresIn_one: ['expires in 1 hour', '1 小时后过期'],
    expiresIn_other: ['expires in {{count}} hours', '{{count}} 小时后过期'],
    carryingOut: ['Carrying out…', '执行中…'],
    gone: [
      'These suggested changes no longer exist.',
      '这些建议的改动已不存在。',
    ],
    executed: ['Carried out “{{title}}”', '已执行「{{title}}」'],
    voided: ['Ignored “{{title}}”', '已忽略「{{title}}」'],
    notExecuted: ['“{{title}}” was not carried out', '「{{title}}」未执行'],
    outcome: {
      executed: [
        'Carried out by {{name}} · {{time}}',
        '{{name}} 已执行 · {{time}}',
      ],
      voided: [
        '{{name}} ignored these changes · {{time}}',
        '{{name}} 忽略了这些改动 · {{time}}',
      ],
      failed: [
        'Step {{position}} was refused: {{reason}}. Nothing was changed.',
        '第 {{position}} 步被拒：{{reason}}。没有任何改动。',
      ],
      stale: [
        'Not carried out: a record these changes concern changed after they were suggested. Ask the agent again.',
        '未执行：涉及的记录在提出建议后被改动过。请让 Agent 重新提出。',
      ],
      expired: ['Expired after a day undecided', '超过一天未处理，已过期'],
      superseded: [
        'Replaced by newer suggested changes that do the same, so the two cannot both be carried out.',
        '已被后来提出的同类改动替换，两者不会都执行。',
      ],
    },
    news: {
      executed: ['“{{title}}” carried out', '「{{title}}」已执行'],
      voided: ['“{{title}}” ignored', '「{{title}}」已忽略'],
      failed: ['“{{title}}” failed', '「{{title}}」执行失败'],
      stale: ['“{{title}}” not carried out', '「{{title}}」未执行'],
    },
  },
  // Singular, for "New lead" / "Delete contact"; Chinese has no plural.
  entity: {
    leads: ['lead', '线索'],
    companies: ['company', '公司'],
    contacts: ['contact', '联系人'],
    opportunities: ['opportunity', '商机'],
    tasks: ['task', '任务'],
    approvals: ['approval', '审批'],
  },
  // The company's WhatsApp numbers (pages/crm-whatsapp/, components/crm/
  // whatsapp/): their conversations, a record's messages.
  whatsapp: {
    title: ['WhatsApp', 'WhatsApp'],
    what: ['WhatsApp conversations', 'WhatsApp 对话'],
    whatOne: ['this conversation', '这个对话'],
    whatMessages: ['the WhatsApp messages', 'WhatsApp 消息'],
    views: {
      label: ['Conversations to show', '显示的对话'],
      unlinked: ['Unlinked', '未关联'],
      all: ['All', '全部'],
    },
    state: {
      unlinked: ['Unlinked', '未关联'],
      dismissed: ['Not a customer', '不是客户'],
      spam: ['Spam', '垃圾消息'],
    },
    // The customer wrote last: the team has not replied yet.
    awaiting: ['Awaiting reply', '待回复'],
    awaitingCount: [
      '{{count}} messages since the last reply',
      '上次回复后客户发来 {{count}} 条',
    ],
    allNumbers: ['All numbers', '全部号码'],
    numberFilter: ['Number', '号码'],
    onNumber: ['On {{number}}', '号码：{{number}}'],
    linkedTo: ['Linked to', '已关联'],
    empty: {
      title: ['No WhatsApp conversations yet', '还没有 WhatsApp 对话'],
      body: [
        "Messages customers send to the company's WhatsApp number appear here.",
        '客户发到公司 WhatsApp 号码的消息会出现在这里。',
      ],
      connect: [
        "Connect the company's number with Manage WhatsApp connection.",
        '用“管理 WhatsApp 连接”连接公司的号码。',
      ],
      askAdmin: [
        "Ask an administrator to connect the company's WhatsApp number.",
        '请管理员连接公司的 WhatsApp 号码。',
      ],
      unlinkedTitle: ['No unlinked conversations', '没有未关联的对话'],
      unlinkedBody: [
        "Customers who write from a number the CRM doesn't know appear here.",
        '从 CRM 不认识的号码写来的客户会出现在这里。',
      ],
    },
    choose: ['Choose a conversation', '选择一个对话'],
    chooseBody: [
      'Pick one on the left to read it.',
      '在左侧选一个对话来查看。',
    ],
    loadMore: ['Load more', '加载更多'],
    loadEarlier: ['Load earlier', '加载更早的消息'],
    newMessages: ['New messages', '有新消息'],
    loadMoreFailed: ["Couldn't load more conversations", '无法加载更多对话'],
    loadEarlierFailed: ["Couldn't load earlier messages", '无法加载更早的消息'],
    manageConnection: ['Manage WhatsApp connection', '管理 WhatsApp 连接'],
    link: ['Link to record', '关联到记录'],
    changeLink: ['Change link', '更改关联'],
    newLead: ['New lead', '新建线索'],
    dismiss: ['Not a customer', '不是客户'],
    spam: ['Mark as spam', '标为垃圾消息'],
    restore: ['Restore', '恢复'],
    actionsFor: ['Actions for {{name}}', '{{name}} 的操作'],
    linkTo: ['Link to', '关联到'],
    lead: ['Lead', '线索'],
    contact: ['Contact', '联系人'],
    linkSubmit: ['Link', '关联'],
    // Where a contact's messages also go (pages/crm-whatsapp/link.tsx).
    reach: {
      companyAndDeals: [
        "The messages also show on {{company}}'s timeline and those of its {{count}} deals with this contact.",
        '消息也会出现在 {{company}} 和这位联系人参与的 {{count}} 个商机的动态里。',
      ],
      company: [
        "The messages also show on {{company}}'s timeline.",
        '消息也会出现在 {{company}} 的动态里。',
      ],
      deals: [
        'The messages also show on the timelines of the {{count}} deals with this contact.',
        '消息也会出现在这位联系人参与的 {{count}} 个商机的动态里。',
      ],
    },
    chooseLead: ['Choose a lead', '请选择一条线索'],
    chooseContact: ['Choose a contact', '请选择一个联系人'],
    linked: ['Linked to “{{name}}”', '已关联到“{{name}}”'],
    leadCreated: ['Created lead “{{name}}”', '已新建线索“{{name}}”'],
    leadNotLinked: [
      'The lead was created but not linked; link it from Link to record',
      '线索已新建但未关联，请用“关联到记录”关联',
    ],
    dismissed: [
      '“{{name}}” set aside as not a customer',
      '已将“{{name}}”标为不是客户',
    ],
    restored: ['“{{name}}” is back in Unlinked', '“{{name}}”已回到未关联'],
    spamTitle: ['Mark “{{name}}” as spam?', '将“{{name}}”标为垃圾消息？'],
    spamBody: [
      "You won't be told of their messages; the messages are kept.",
      '之后不再通知他们的消息，消息仍会保存。',
    ],
    spammed: ['Marked “{{name}}” as spam', '已将“{{name}}”标为垃圾消息'],
    deleteConversation: ['Delete conversation', '删除对话'],
    deleteTitle: [
      'Delete the conversation with “{{name}}”?',
      '删除与“{{name}}”的对话？',
    ],
    deleteBody: [
      "Its messages and files are deleted, and its lines leave the records' timelines. This cannot be undone.",
      '对话里的消息和文件都会删除，记录时间线上的相关条目也会移除，删除后无法恢复。',
    ],
    deleted: [
      'Deleted the conversation with “{{name}}”',
      '已删除与“{{name}}”的对话',
    ],
    setAside: {
      dismissed: ['Set aside as not a customer', '已标为不是客户'],
      spam: ['Set aside as spam', '已标为垃圾消息'],
    },
    linkFailed: [
      "You can't change that record, or it no longer exists",
      '无法修改该记录，或它已不存在',
    ],
    updateFailed: ["Couldn't update the conversation", '无法更新这个对话'],
    gone: ['This conversation no longer exists', '这个对话已不存在'],
    loadFailed: [
      "Couldn't load WhatsApp conversations",
      '无法加载 WhatsApp 对话',
    ],
    conversationFailed: ["Couldn't load this conversation", '无法加载这个对话'],
    forbidden: [
      "You don't have access to WhatsApp conversations",
      '你没有查看 WhatsApp 对话的权限',
    ],
    notFound: [
      'This conversation does not exist or you can no longer read it',
      '这个对话不存在或你已无权查看',
    ],
    network: ['Check your connection and try again.', '请检查网络后重试。'],
    sessionEnded: ['Your session has ended', '登录已失效'],
    signIn: ['Sign in again', '重新登录'],
    retry: ['Retry', '重试'],
    backToList: ['Back to the list', '返回列表'],
    // The record tab's note: replies are written in the conversation.
    replyInConversation: [
      'Open the conversation to reply.',
      '打开对话即可回复。',
    ],
    // The reply box under a conversation (composer.tsx).
    composer: {
      placeholder: ['Write a reply…', '输入回复…'],
      send: ['Send', '发送'],
      attach: ['Attach a file', '添加附件'],
      removeFile: ['Remove {{file}}', '移除 {{file}}'],
      tooLarge: ['The file is larger than 20 MB.', '文件超过 20 MB。'],
      windowHours: [
        'Reply window: {{count}} h left',
        '回复窗口还剩 {{count}} 小时',
      ],
      windowMinutes: [
        'Reply window: {{count}} min left',
        '回复窗口还剩 {{count}} 分钟',
      ],
      windowClosed: [
        "The customer hasn't written for 24 hours, so WhatsApp doesn't allow a reply now: wait for them to write again.",
        '客户超过 24 小时没发消息，WhatsApp 现在不允许回复，要等客户先发消息。',
      ],
      windowClosedApp: [
        "More than 24 hours since the customer's last message: from the CRM only approved templates can go now (they come later). Reply from the WhatsApp Business app on your phone.",
        '客户最后一条消息已超过 24 小时，在 CRM 里只能发审核通过的模板（稍后提供），可以先在手机的 WhatsApp Business App 上回复。',
      ],
      noRecipient: [
        'This customer is known only by a username, so the CRM cannot send to them yet.',
        '这位客户只有用户名，没有号码，暂时无法从 CRM 发送。',
      ],
      noPermission: [
        'You may not send WhatsApp messages; ask an administrator for the permission.',
        '你没有发送 WhatsApp 消息的权限，请联系管理员。',
      ],
      demo: [
        'Demo number: messages stay in the CRM and are never sent.',
        '演示号码：消息只保存在 CRM，不会真的发出。',
      ],
    },
    // Where a message sent from the CRM stands, beside its time.
    sendStatus: {
      sending: ['Sending', '发送中'],
      sent: ['Sent', '已发送'],
      delivered: ['Delivered', '已送达'],
      read: ['Read', '已读'],
      failed: ['Not sent', '发送失败'],
    },
    team: ['Team', '团队'],
    kind: {
      image: ['Photo', '图片'],
      document: ['File', '文件'],
      audio: ['Voice message', '语音'],
      video: ['Video', '视频'],
      sticker: ['Sticker', '贴纸'],
      location: ['Location', '位置'],
      reaction: ['Reaction', '回应'],
      button: ['Button reply', '按钮回复'],
      interactive: ['Reply', '选项回复'],
      system: ['System message', '系统消息'],
      unsupported: ['Unsupported message', '不支持的消息'],
      // A file of the imported history whose content Meta did not send.
      media_placeholder: ['File from the history', '历史文件'],
    },
    // Where a message came from, beside its time: the team's sent from the
    // WhatsApp Business app, the history imported once; and an edit or a
    // deletion made there.
    origin: {
      businessApp: ['From the app', '手机发出'],
      imported: ['Imported', '历史导入'],
    },
    edited: ['Edited', '已编辑'],
    revoked: ['This message was deleted', '此消息已删除'],
    photoFrom: ['Photo from {{name}}', '来自 {{name}} 的图片'],
    media: {
      pending: ['Fetching file…', '正在获取文件…'],
      unavailable: ['File unavailable', '文件不可用'],
    },
    tab: ['WhatsApp', 'WhatsApp'],
    tabPeople: ['Messages with {{names}}', '与 {{names}} 的消息'],
    tabPeopleLabel: ['Whose conversation', '谁的对话'],
    openConversation: ['Open conversation', '打开对话'],
    tabEmptyTitle: ['No WhatsApp messages yet', '还没有 WhatsApp 消息'],
    tabEmptyBody: [
      "Messages this record's people send to the company's WhatsApp number appear here.",
      '这条记录的联系人发到公司 WhatsApp 号码的消息会出现在这里。',
    ],
  },
  // The WhatsApp connection (pages/crm-whatsapp/connection.tsx).
  whatsappSettings: {
    title: ['WhatsApp connection', 'WhatsApp 连接'],
    description: [
      "Connect the company's WhatsApp numbers through Meta's Cloud API.",
      '通过 Meta Cloud API 连接公司的 WhatsApp 号码。',
    ],
    app: ['Meta app', 'Meta 应用'],
    appBody: [
      'The app every number is connected through; its secret checks each delivery and stays on the server.',
      '所有号码都通过这个应用接入；它的密钥用来校验每一次推送，只保存在服务器上。',
    ],
    appSaved: ['App secret saved', '应用密钥已保存'],
    numbers: ['Numbers', '号码'],
    numbersBody: [
      'The company numbers whose messages come into the CRM, each with its own access token.',
      '消息进入 CRM 的公司号码，每个号码有自己的访问令牌。',
    ],
    addNumber: ['Add number', '添加号码'],
    editNumber: ['Edit number', '编辑号码'],
    numberAdded: ['Number added', '号码已添加'],
    numberSaved: ['Number saved', '号码已保存'],
    numberRemoved: ['Number removed', '号码已移除'],
    whatNumber: ['the number', '号码'],
    removeTitle: ['Remove {{number}}?', '移除 {{number}}？'],
    removeBody: [
      'Its messages stop coming into the CRM. You can add it again later.',
      '移除后不再接收它的消息，之后可以重新添加。',
    ],
    removeInUse: [
      "This number holds conversations, so it stays: its customers' history is kept in the CRM.",
      '这个号码已有对话，不能移除：客户的往来记录要保留在 CRM 里。',
    ],
    conversations: ['Conversations', '对话'],
    conversationCount: ['{{value}} conversations', '{{value}} 个对话'],
    mode: ['Connection mode', '接入方式'],
    modes: {
      coexistence: ['Coexistence', '共存'],
      api: ['Cloud API only', '纯 API'],
    },
    modeHints: {
      coexistence: [
        "The number stays in the WhatsApp Business app on the phone. Reply from the phone or the CRM; the phone's replies come in too, and earlier chats are imported once.",
        '号码继续在手机的 WhatsApp Business App 里使用。手机和 CRM 都能回复，手机上的回复也会同步进来，之前的聊天导入一次。',
      ],
      api: [
        "The number is on the Cloud API alone and can no longer be used in the phone app: messages are sent and read in the CRM. When a customer hasn't written for 24 hours, you can't reply until they write again.",
        '号码只接入 Cloud API，手机 App 上不能再用，消息只在 CRM 里收发。客户超过 24 小时没发消息时无法回复，要等客户先发消息。',
      ],
    },
    recommended: ['Recommended', '推荐'],
    demo: ['Demo', '演示'],
    demoHint: [
      "The demo data's number: not connected to Meta, it receives nothing, and goes when the demo data is removed.",
      '演示数据的号码：不连接 Meta，也收不到消息，删除演示数据时一并删除。',
    ],
    whatConnection: ['the connection', '连接设置'],
    whatStatus: ['the status', '状态'],
    phoneNumberId: ['Phone number ID', '电话号码 ID'],
    wabaId: ['WhatsApp Business Account ID', 'WhatsApp 企业账号 ID'],
    accessToken: ['Access token', '访问令牌'],
    appSecret: ['App secret', '应用密钥'],
    secretSet: ['Set — leave empty to keep it', '已设置，留空则保持不变'],
    enterToken: ['Enter the access token', '请填写访问令牌'],
    enterSecret: ['Enter the app secret', '请填写应用密钥'],
    phoneInvalid: ['Enter 5 to 32 digits', '请输入 5 到 32 位数字'],
    save: ['Save', '保存'],
    webhook: ['Webhook', '推送地址'],
    webhookBody: [
      "Enter these in your Meta app's WhatsApp webhook settings, then subscribe to the messages field, and for coexistence numbers to smb_message_echoes and history too.",
      '填到 Meta 应用的 WhatsApp Webhook 设置里，并订阅 messages 字段；有共存号码时还要订阅 smb_message_echoes 和 history。',
    ],
    callbackUrl: ['Callback URL', '回调地址'],
    verifyToken: ['Verify token', '校验令牌'],
    tokenLater: [
      'Made when you first save the app secret or add a number.',
      '首次保存应用密钥或添加号码时生成。',
    ],
    show: ['Show', '显示'],
    hide: ['Hide', '隐藏'],
    copyUrl: ['Copy callback URL', '复制回调地址'],
    copyToken: ['Copy verify token', '复制校验令牌'],
    copyFailed: [
      "Couldn't copy; select the text and copy it instead",
      '无法复制，请选中文字后手动复制',
    ],
    leaveConfirm: [
      'Leave without saving the app secret?',
      '离开且不保存应用密钥？',
    ],
    status: ['Processing', '处理情况'],
    statusBody: [
      "Whether Meta's deliveries and their files are processed; what needs doing shows here.",
      'Meta 推送的消息和文件是否处理正常；有需要处理的会显示在这里。',
    ],
    notConnected: ['No number connected yet', '还没有连接号码'],
    quality: ['Quality', '质量评级'],
    limit: ['Messaging limit', '发送上限'],
    lastDelivery: ['Last delivery', '最近一次推送'],
    never: ['None yet', '还没有'],
    qualities: {
      GREEN: ['High', '高'],
      YELLOW: ['Medium', '中'],
      RED: ['Low', '低'],
      UNKNOWN: ['Not rated', '未评级'],
      other: ['Other', '其他'],
    },
    limits: {
      TIER_250: ['250 customers a day', '每天 250 个客户'],
      TIER_1K: ['1,000 customers a day', '每天 1,000 个客户'],
      TIER_10K: ['10,000 customers a day', '每天 10,000 个客户'],
      TIER_100K: ['100,000 customers a day', '每天 100,000 个客户'],
      TIER_UNLIMITED: ['Unlimited', '不限'],
      other: ['Other', '其他'],
    },
    waiting: ['Waiting to be processed', '等待处理的推送'],
    allWell: [
      'All well; last delivery {{time}}',
      '一切正常，最近一次推送：{{time}}',
    ],
    noDeliveries: ['No delivery from Meta yet', '还没有收到 Meta 的推送'],
    failed: ['Failed deliveries', '失败的推送'],
    failureReasons: {
      unknownNumber: [
        "Sent to a number this CRM doesn't hold",
        '发到了这个 CRM 没有的号码',
      ],
      invalidJson: ['Not valid JSON', '不是有效的 JSON'],
      processingFailed: ["Couldn't be processed", '无法处理'],
      other: ['Another reason', '其他原因'],
    },
    filesWaiting: ['Files waiting', '待下载文件'],
    filesUnavailable: ['Files unavailable', '无法获取的文件'],
    check: ['Check', '检查'],
    checked: ['Connected: {{name}}', '已连接：{{name}}'],
    retry: ['Retry failed deliveries', '重试失败的推送'],
    retrying: [
      'Retrying {{count}} failed deliveries',
      '正在重试 {{count}} 条失败的推送',
    ],
    checkReason: {
      notConfigured: [
        "Save the number's access token first",
        '还没有保存这个号码的访问令牌',
      ],
      network: [
        "Couldn't reach Meta; try again later",
        '无法连接 Meta，请稍后再试',
      ],
      http_401: [
        'The access token is invalid or expired',
        '访问令牌无效或已过期',
      ],
      http_403: [
        'The token has no access to this number',
        '令牌没有这个号码的权限',
      ],
      http_404: ['This phone number ID was not found', '找不到这个电话号码 ID'],
      other: [
        'Meta returned an error; try again later',
        'Meta 返回了错误，请稍后再试',
      ],
    },
  },
  navigation: {
    reports: ['Reports', '报表'],
    inbox: ['Inbox', '收件箱'],
    // The agents' conversations page (pages/crm-agent-chat/), its heading
    // and its breadcrumb.
    conversations: ['All conversations', '全部对话'],
    records: ['Records', '记录'],
    // Where the user's connected services sit: mail now, other channels
    // (WhatsApp, LinkedIn) later.
    integrations: ['Integrations', '集成'],
    mailbox: ['Mailbox', '邮箱'],
    whatsapp: ['WhatsApp', 'WhatsApp'],
    // The menu's Settings entry and page (client/routes.ts).
    settings: ['Settings', '设置'],
    // The administration pages (client/pages/settings/).
    users: ['Users', '用户'],
    roles: ['Roles', '角色'],
    apiKeys: ['API keys', 'API 密钥'],
    scheduledTasks: ['Scheduled tasks', '定时任务'],
    // The Agents plugin's pages, in Settings (migration step 2).
    agentsGroup: ['Agent team', 'Agent 团队'],
    // The CRM's four agents on one page (pages/crm-agents.tsx).
    demoData: ['Demo data', '演示数据'],
    agentWork: ['Agent work', 'Agent 工作'],
    guidance: ['Business guidance', '业务指导'],
    // The first tab of Settings (pages/settings/index.tsx).
    general: ['General', '通用'],
    // How an approval moves (pages/settings/approval-flow/).
    approvalFlow: ['Approval process', '审批流程'],
    agentList: ['Agents', 'Agent'],
    models: ['Models', '模型'],
    skills: ['Skills', '技能'],
    usage: ['Usage', '用量'],
  },
  admin: adminWording,
  // Settings → Approval process (pages/settings/approval-flow/): the
  // approvals' lifecycle, read only, and who may approve.
  approvalFlow: {
    title: ['Approval process', '审批流程'],
    description: [
      'Who may approve, and the states an approval goes through, from a draft to a decision. The states are set in the product; who may approve is yours to set.',
      '谁可以审批，以及一个审批从草稿到决定要经过的状态。状态由产品内置，谁可以审批由你设置。',
    ],
    approvers: {
      title: ['Who may approve', '谁可以审批'],
      // The diagram's button for the rule, on its submit step.
      configure: ['Approvers', '审批人'],
      hint: [
        'An applicant chooses the approver from these roles and people; any one of them is enough. A change applies to the next submissions; requests already submitted keep their approver.',
        '申请人从这些角色和人员中选择审批人，满足其中一项即可。修改只影响之后的提交，已提交的申请保留原审批人。',
      ],
      roles: ['Roles', '角色'],
      people: ['People', '人员'],
      now: [
        'Approvers now: {{names}}. Each must be active and hold the Decide approvals permission.',
        '当前可选审批人：{{names}}。审批人须为启用状态，并拥有审批权限。',
      ],
      nobody: [
        'Nobody is an approver now: no one named is active and holds the Decide approvals permission.',
        '当前没有可选审批人：所选的人中没有启用且拥有审批权限的。',
      ],
      changed: [
        'Version {{revision}}, set by {{name}} at {{time}}.',
        '第 {{revision}} 版，由{{name}}于 {{time}} 设置。',
      ],
      default: ['The default: sales managers.', '默认设置：销售经理。'],
    },
    diagram: ['Approval process diagram', '审批流程图'],
    end: ['End', '结束'],
    steps: ['Steps', '每一步'],
    and: [' and ', '和'],
    who: {
      submit: [
        'The applicant, once an approver is chosen from who may approve. A withdrawn request can be changed and submitted again.',
        '申请人，从可审批的人中选好审批人后才能提交。撤回的申请可以修改后再次提交。',
      ],
      withdraw: [
        'The applicant, while the request awaits a decision.',
        '申请人，在审批人做决定之前。',
      ],
      approve: [
        'The chosen approver, who is never the applicant.',
        '指定的审批人，不能是申请人本人。',
      ],
      reject: [
        'The chosen approver, who is never the applicant.',
        '指定的审批人，不能是申请人本人。',
      ],
    },
    final: [
      '{{states}} end a request: to ask again, raise a new approval.',
      '{{states}}之后申请就结束了，要再申请需新建一条审批。',
    ],
  },
  // A company's Signals tab and its timeline lines (company-signals.tsx).
  signals: {
    tab: ['Signals', '信号'],
    watchedScope: [
      'Checked on the web every week, as you watch it.',
      '已关注，每周联网检查一次。',
    ],
    dealScope: [
      'Checked on the web every week while it has an open deal.',
      '有进行中的商机，每周联网检查一次。',
    ],
    offScope: [
      'Not checked daily: it has no open deal. Watch it to have it checked.',
      '没有进行中的商机，不在每日检查中；打开"关注"即可每周检查。',
    ],
    checkedAt: ['Last checked {{time}}.', '上次检查：{{time}}。'],
    watch: ['Watch', '关注'],
    checkNow: ['Check now', '立即检查'],
    checking: ['Checking the web…', '正在联网检查…'],
    unavailable: [
      'Checking on the web needs a model service, set up on Agent team → Models.',
      '联网检查需要先在「Agent 团队 → 模型」里配置模型服务。',
    ],
    foundSome: ['New signals found: {{count}}.', '发现 {{count}} 条新信号。'],
    foundNone: ['Nothing new found.', '没有发现新信号。'],
    empty: [
      'No signals yet: funding, hiring, new executives, major news and risks found on the web show here, with their sources.',
      '还没有信号。联网发现的融资、扩张招聘、高管变动、重大动态和风险会显示在这里，并附上出处。',
    ],
    types: {
      funding: ['Funding', '融资'],
      hiring: ['Hiring', '扩张招聘'],
      leadership: ['Executives', '高管变动'],
      business: ['Major news', '重大动态'],
      risk: ['Risk', '风险'],
    },
    new: ['New', '新'],
    dismiss: ['Dismiss', '忽略'],
    dismissed: ['Dismissed', '已忽略'],
    restore: ['Restore', '取消忽略'],
    feed: ['found news', '发现新动态'],
    // The company's Signals card and a deal's company row
    // (company-signals.tsx): the latest few, the whole list in a dialog.
    viewAll: ['All signals ({{count}})', '查看全部 {{count}} 条'],
    // With none yet the dialog is opened only to check for some.
    openToCheck: ['Check for signals', '检查信号'],
    latest: ['Latest signal', '最近信号'],
    inAll: ['{{count}} in all', '共 {{count}} 条'],
    none: ['None yet', '暂无'],
    dialogTitle: ['Signals: {{name}}', '信号：{{name}}'],
    // The chip under the company's title, and its Watch button.
    newCount: ['{{count}} new', '{{count}} 条新'],
    watching: ['Watching', '已关注'],
    watchHint: [
      'Watch it to have its news checked on the web every week, open deal or not.',
      '关注后每周联网检查一次这家公司的动态，没有进行中的商机也会检查。',
    ],
    watchingHint: [
      'Watched: its news is checked on the web every week. Click to stop watching.',
      '已关注：每周联网检查一次这家公司的动态。点击取消关注。',
    ],
  },
  entities: {
    leads: ['Leads', '线索'],
    companies: ['Companies', '公司'],
    contacts: ['Contacts', '联系人'],
    opportunities: ['Opportunities', '商机'],
    tasks: ['Tasks', '任务'],
    approvals: ['Approvals', '审批'],
  },

  fields: {
    id: ['Record ID', '记录 ID'],
    name: ['Name', '名称'],
    leadName: ['Name', '姓名'],
    companyDescription: ['Introduction', '公司介绍'],
    taskName: ['Title', '标题'],
    approvalSubject: ['Subject', '审批主题'],
    contactName: ['Name', '姓名'],
    company: ['Company', '公司'],
    // Under the lead card's Company heading, where "Company" would repeat
    // it; "Company name" would not fit the label column in English.
    companyName: ['Name', '公司名'],
    companyIntro: ['Introduction', '介绍'],
    phone: ['Phone', '电话'],
    email: ['Email', '邮箱'],
    jobTitle: ['Job title', '职位'],
    ownerId: ['Owner', '负责人'],
    source: ['Source', '来源'],
    status: ['Status', '状态'],
    invalidReason: ['Invalid reason', '无效原因'],
    industry: ['Industry', '行业'],
    country: ['Country / region', '国家 / 地区'],
    state: ['State / province', '省份'],
    city: ['City', '城市'],
    website: ['Website', '官网'],
    // A person's profile, or a company's page.
    linkedin: ['LinkedIn', 'LinkedIn'],
    description: ['Description', '描述'],
    // The enquiry as it arrived, kept as it is.
    message: ['Original message', '原始信息'],
    attachments: ['Files', '附件'],
    lostReason: ['Lost reason', '输单原因'],
    churnReason: ['Churn reason', '流失原因'],
    type: ['Type', '类型'],
    employees: ['Employees', '员工数'],
    // The street part of a location, under its heading 地址.
    address: ['Address', '详细地址'],
    comments: ['Comments', '评论'],
    companyId: ['Company', '所属公司'],
    related: {
      // Short, to fit the particulars' label column on one line.
      leadId: ['Lead', '关联线索'],
      companyId: ['Company', '关联公司'],
      opportunityId: ['Opportunity', '关联商机'],
    },
    contactId: ['Contact', '联系人'],
    newCompanyName: ['New company name', '新公司名称'],
    opportunityName: ['Opportunity name', '商机名称'],
    createOpportunity: ['Create opportunity', '创建商机'],
    gender: ['Gender', '性别'],
    employed: ['Employed', '在职'],
    stage: ['Stage', '阶段'],
    amount: ['Amount', '金额'],
    currency: ['Currency', '币种'],
    // A company's, in its currency.
    annualRevenue: ['Annual revenue', '年营收'],
    expectedCloseAt: ['Close date', '预计成交日期'],
    businessType: ['Business type', '业务类型'],
    contacts: ['Opportunity contacts', '商机联系人'],
    pauseReason: ['Pause reason', '暂停原因'],
    resumeAt: ['Expected resume date', '预计恢复日期'],
    time: ['Time', '时间'],
    dueAt: ['Time', '时间'],
    endAt: ['End time', '结束时间'],
    leadId: ['Lead', '线索'],
    opportunityId: ['Opportunity', '商机'],
    internalParticipants: ['Participants', '参与人'],
    result: ['Result', '结果'],
    topic: ['Approval topic', '审批事项'],
    approverId: ['Approver', '审批人'],
    applicant: ['Applicant', '申请人'],
    opportunityAmount: ['Opportunity amount', '商机金额'],
    createdAt: ['Created', '创建时间'],
    updatedAt: ['Updated', '更新时间'],
    closedAt: ['Closed', '关闭时间'],
    // The current stage's chance of winning, from the stage settings.
    probability: ['Win probability', '成交概率'],
    completedAt: ['Completed', '完成时间'],
    submittedAt: ['Submitted', '提交时间'],
    decidedAt: ['Decided', '审批时间'],
    decisionComment: ['Decision comment', '审批意见'],
    convertedAt: ['Converted', '转化时间'],
    convertedCompanyId: ['Converted company', '转化的公司'],
    convertedContactId: ['Converted contact', '转化联系人'],
    convertedOpportunityId: ['Converted opportunity', '转化商机'],
    role: ['Contact role', '联系人角色'],
    primary: ['Primary contact', '主要联系人'],
    createdById: ['Created by', '创建人'],
    actorId: ['Operator', '操作人'],
    timeZone: ['Business timezone', '业务时区'],
    aiLanguage: ['AI working language', 'AI 工作语言'],
    assistantDock: ['Ask box at the bottom of pages', '页面底部的 AI 对话框'],
    assistantDockHint: [
      'For everyone. Off, the AI is asked from the ✨ button at the top right.',
      '对所有人生效。关闭后，从右上角的 ✨ 按钮使用 AI。',
    ],
    decision: ['Decision', '处理'],
    comment: ['Comment', '意见'],
    taskReminderMinutes: [
      'Task reminder (minutes before)',
      '任务提前提醒（分钟）',
    ],
    closeReminderDays: [
      'Opportunity close reminder (days before)',
      '商机到期提醒（天）',
    ],
    uncontactedDays: [
      'New lead uncontacted after (days)',
      '新线索未联系阈值（天）',
    ],
    leadStaleDays: [
      'Lead and opportunity stall threshold (days)',
      '线索、商机停滞阈值（天）',
    ],
    staleDays: [
      'Company inactivity threshold (days)',
      '公司长期未联系阈值（天）',
    ],
    nurtureReviewDays: ['Nurture review after (days)', '培育复查间隔（天）'],
    companyType: ['Company type', '公司类型'],
  },
  options: {
    manufacturing: ['Manufacturing', '制造业'],
    technology: ['Technology / software', '科技 / 软件'],
    telecommunications: ['Telecommunications', '通信'],
    financialServices: ['Financial services', '金融服务'],
    insurance: ['Insurance', '保险'],
    healthcare: ['Healthcare', '医疗健康'],
    pharmaceuticals: ['Pharmaceuticals', '医药'],
    retail: ['Retail', '零售'],
    wholesale: ['Wholesale / distribution', '批发 / 分销'],
    foodAndBeverage: ['Food and beverage', '食品饮料'],
    agriculture: ['Agriculture', '农业'],
    energy: ['Energy', '能源'],
    construction: ['Construction', '建筑工程'],
    realEstate: ['Real estate', '房地产'],
    automotive: ['Automotive', '汽车'],
    logistics: ['Logistics / transport', '物流运输'],
    hospitality: ['Hospitality / travel', '酒店旅游'],
    media: ['Media / entertainment', '传媒娱乐'],
    education: ['Education', '教育'],
    professionalServices: ['Professional services', '专业服务'],
    government: ['Government / public sector', '政府 / 公共部门'],
    nonprofit: ['Non-profit', '非营利组织'],
    website: ['Website', '官网'],
    marketing: ['Marketing', '营销'],
    exhibition: ['Exhibition', '展会'],
    search: ['Search engine', '搜索引擎'],
    ai: ['AI', 'AI'],
    customerReferral: ['Customer referral', '客户推荐'],
    employeeReferral: ['Employee referral', '员工推荐'],
    partner: ['Partner', '合作伙伴'],
    outbound: ['Outbound', '主动开发'],
    other: ['Other', '其他'],
    new: ['New', '新线索'],
    working: ['Working', '跟进中'],
    nurturing: ['Nurturing', '培育中'],
    converted: ['Converted', '已转化'],
    invalid: ['Invalid', '无效'],
    price: ['Price', '价格'],
    toCompetitor: ['Moved to a competitor', '转向竞品'],
    businessChange: ['Business change', '业务调整'],
    serviceDissatisfied: ['Dissatisfied with service', '服务不满意'],
    closedOrMerged: ['Closed or merged', '停业或并购'],
    notTarget: ['Not target customer', '非目标客户'],
    badContact: ['Invalid contact details', '联系方式无效'],
    duplicate: ['Duplicate', '重复'],
    noNeed: ['No need', '无需求'],
    student: ['Student / research', '学生 / 调研'],
    competitor: ['Competitor', '竞争对手'],
    prospect: ['Prospect', '潜在客户'],
    qualified: ['Qualified', '已确认意向'],
    customer: ['Customer', '成交客户'],
    inactive: ['Inactive', '休眠客户'],
    churned: ['Churned', '流失客户'],
    direct: ['Direct customer', '直客'],
    reseller: ['Reseller', '经销商'],
    male: ['Male', '男'],
    noBudget: ['Budget cancelled', '预算取消'],
    noDecision: ['No decision', '无决策'],
    requirementMismatch: ['Requirements did not match', '需求不匹配'],
    timing: ['Wrong timing', '时机不对'],
    budgetDeferred: ['Budget deferred', '预算推迟'],
    priorityChanged: ['Priorities changed', '优先级调整'],
    decisionDelayed: ['Decision delayed', '决策延期'],
    waitingOnCustomer: ['Waiting on the customer', '等待客户'],
    female: ['Female', '女'],
    unknown: ['Unknown', '未知'],
    contact: ['Initial contact', '初步接触'],
    qualification: ['Qualification', '需求确认'],
    validation: ['Validation', '方案验证'],
    proposal: ['Proposal', '方案报价'],
    negotiation: ['Negotiation', '商务谈判'],
    contract: ['Contract', '合同签署'],
    won: ['Won', '赢单'],
    lost: ['Lost', '输单'],
    paused: ['Paused', '暂停'],
    newBusiness: ['New business', '新业务'],
    expansion: ['Expansion', '增购'],
    crossSell: ['Cross-sell', '交叉销售'],
    renewal: ['Renewal', '续约'],
    tender: ['Tender', '招投标'],
    decisionMaker: ['Decision maker', '决策'],
    champion: ['Champion', '推动'],
    evaluator: ['Evaluator', '评估'],
    influencer: ['Influencer', '影响'],
    user: ['End user', '使用'],
    blocker: ['Blocker', '阻碍'],
    email: ['Email', '邮件'],
    open: ['Not done', '未完成'],
    completed: ['Completed', '已完成'],
    cancelled: ['Cancelled', '已取消'],
    discount: ['Discount', '折扣'],
    paymentTerms: ['Payment terms', '付款条款'],
    contractTerms: ['Contract terms', '合同条款'],
    commitment: ['Commitment', '商务承诺'],
    draft: ['Draft', '草稿'],
    pending: ['Pending approval', '审批中'],
    approved: ['Approved', '已通过'],
    rejected: ['Rejected', '已拒绝'],
    withdrawn: ['Withdrawn', '已撤回'],
    executed: ['Executed', '已执行'],
    dismissed: ['Ignored', '已忽略'],
    superseded: ['Replaced', '已替换'],
    executing: ['Executing', '执行中'],
    'sales-representative': ['Salesperson', '销售人员'],
    'sales-manager': ['Sales manager', '销售经理'],
    'system-administrator': ['Administrator', '管理员'],
  },
  events: {
    created: ['Created', '创建'],
    updated: ['Updated', '更新'],
    deleted: ['Deleted', '删除'],
    stage: ['Stage changed', '阶段变更'],
    status: ['Status changed', '状态变更'],
    converted: ['Lead converted', '线索转化'],
    ai: ['AI follow-up', 'AI 跟进建议'],
    merged: ['Leads merged', '线索合并'],
  },
  errors: {
    serverError: [
      'Something went wrong. Please try again.',
      '操作失败，请重试。',
    ],
    invalidInput: ['Check the values and try again.', '请检查填写内容后重试。'],
    evaluationDecided: [
      'This recommendation has already been decided.',
      '这条建议已经处理过了。',
    ],
    planDecided: [
      'These suggested changes have already been decided.',
      '这些建议的改动已经处理过了。',
    ],
    planExpired: [
      'These suggested changes waited more than a day and have expired. Ask the agent again if they are still needed.',
      '这些建议的改动超过一天未处理，已过期。如仍需要，请让 Agent 重新提出。',
    ],
    planStepRefused: [
      'One of the suggested changes would be refused.',
      '建议的改动中有一项无法执行。',
    ],
    noMailbox: [
      'Connect a mailbox that can send mail first.',
      '请先连接一个可以发信的邮箱。',
    ],
    mailFailed: ['The email could not be sent.', '邮件没能发出。'],
    taskNotOpen: [
      'Only an open task can be prepared.',
      '只有未完成的任务可以准备。',
    ],
    taskChanged: [
      'The task has changed since this suggestion. Follow up again.',
      '这个任务在建议给出后已经有了变化，请重新跟进。',
    ],
    convertFirst: [
      'Convert the lead first; accepting records it.',
      '请先完成转化，采纳会在转化后记录。',
    ],
    opportunityClosed: [
      'This opportunity is won or lost; there is nothing to follow up.',
      '这个商机已经赢单或输单，不需要再跟进。',
    ],
    assistantUnavailable: [
      'The AI assistant is off or has no model configured. Enter the lead in the form instead.',
      'AI 助手未启用或没有配置模型，请改用表单录入。',
    ],
    captureNothing: [
      'The AI found no lead in this text.',
      'AI 没有从这段内容里找到线索。',
    ],
    feedbackFailed: [
      'The AI could not organise these notes. Try again, or write the outcome yourself.',
      'AI 没能整理这段内容，请重试，或者直接填写结果。',
    ],
    captureFailed: [
      'The AI could not organise this text. Try again, or enter the lead in the form.',
      'AI 没能整理这段内容，请重试或改用表单录入。',
    ],
    requiredField: ['This field is required', '此字段必填'],
    required: ['A required field is missing.', '请填写必填字段。'],
    forbidden: [
      'You do not have permission for this action.',
      '你没有执行此操作的权限。',
    ],
    unauthorized: ['Please sign in to continue.', '请先登录。'],
    notFound: [
      'The record is unavailable or you do not have access.',
      '记录不存在，或你没有访问权限。',
    ],
    invalidOwner: [
      'Choose an active sales user as owner.',
      '请选择有效的销售人员作为负责人。',
    ],
    convertedReadOnly: [
      'Converted leads are read-only.',
      '已转化线索为只读状态。',
    ],
    approvalLocked: [
      'This approval cannot be changed in its current state.',
      '当前审批状态不允许此操作。',
    ],
    relatedRecords: [
      'Related records prevent this change. Unlink them first.',
      '存在关联记录，请先解除关联。',
    ],
    companyMismatch: [
      'The related contacts and opportunities must belong to the same company.',
      '关联联系人和商机必须属于同一公司。',
    ],
    leadOrCompany: [
      'A task concerns a lead, or a company and its opportunity, not both.',
      '任务关联线索，或关联公司及其商机，二者不能同时关联。',
    ],
    opportunityHasTasks: [
      'This deal has tasks with its current company, so it cannot move to another company.',
      '此商机已有与当前公司的任务，不能更换到其他公司。',
    ],
    endBeforeStart: [
      "The end time must come after the task's time.",
      '结束时间不能早于任务时间。',
    ],
    selfApproval: [
      'You cannot approve your own request.',
      '不能审批自己发起的申请。',
    ],
    approvalOpportunity: [
      'An approval can only be raised for an opportunity you may edit.',
      '只能为自己负责的商机发起审批。',
    ],
    invalidApprover: [
      'Choose an approver from who may approve, set under Settings → Approval process.',
      '请从可审批的人中选择审批人（在设置 → 审批流程中配置）。',
    ],
    signalsUnavailable: [
      'Checking a company on the web needs a model service, set up on Agent team → Models.',
      '联网检查公司需要先在「Agent 团队 → 模型」里配置模型服务。',
    ],
    signalsFailed: [
      'The web search failed. Try again later.',
      '联网搜索失败，请稍后再试。',
    ],
    noApprovers: [
      'Nobody named here is active and holds the Decide approvals permission, so no request could be submitted.',
      '所选的人中没有启用且拥有审批权限的，这样任何申请都无法提交。',
    ],
    conflict: [
      'This record changed. Refresh and try again.',
      '记录已变更，请刷新后重试。',
    ],
    aiBusy: [
      'The previous message is still waiting for its reply.',
      '上一条消息还在等待回复，请稍候。',
    ],
    aiDisabled: [
      'The AI assistant is disabled in system settings.',
      '系统设置中已停用 AI 助手。',
    ],
    aiNotConfigured: [
      'No AI model is configured. Add a model service in config.yml, then select it in system settings.',
      '尚未配置 AI 模型。请在 config.yml 添加模型服务，并在系统设置中选择。',
    ],
    aiAuthFailed: [
      'The model provider rejected the API key. Check ai.llmServices in config.yml and restart the server.',
      '模型服务拒绝了 API 密钥。请检查 config.yml 中的 ai.llmServices，并重启服务。',
    ],
    aiRateLimited: [
      'The model provider is rate limiting or out of quota. Try again later.',
      '模型服务触发了限流或额度不足，请稍后再试。',
    ],
    aiProviderError: [
      'The model provider returned an error.',
      '模型服务返回了错误。',
    ],
    aiInvalidResponse: [
      'The model returned an unreadable response. Try again.',
      '模型返回的内容无法解析，请重试。',
    ],
    confirmationRequired: [
      'Confirm this action before executing it.',
      '执行前请确认此操作。',
    ],
    fileTooLarge: ['The upload exceeds 20 MB.', '上传文件超过 20 MB。'],
    importLimit: [
      'Import between 1 and 500 records at a time.',
      '每次可导入 1 至 500 条记录。',
    ],
    demoExists: [
      'The demo data is already imported. Remove it before importing again.',
      '演示数据已导入，请先清除后再导入。',
    ],
    demoMissing: ['There is no demo data to remove.', '没有可清除的演示数据。'],
    secretsMissing: [
      "Credentials can't be saved: set SECRETS_KEYS on the server first.",
      '无法保存凭据：请先在服务器上配置 SECRETS_KEYS。',
    ],
    numberExists: [
      'That WhatsApp number is already connected.',
      '这个 WhatsApp 号码已经接入了。',
    ],
    numberInUse: [
      "This number holds conversations, so it can't be removed: its customers' history stays in the CRM.",
      '这个号码已有会话，不能删除：客户的往来记录要保留在 CRM 里。',
    ],
    windowClosed: [
      'The 24-hour reply window has closed: WhatsApp accepts only approved templates now.',
      '24 小时回复窗口已关闭，WhatsApp 现在只接受审核通过的模板消息。',
    ],
    noRecipient: [
      'This customer has no number WhatsApp can send to.',
      '这位客户没有可以发送的 WhatsApp 号码。',
    ],
    demoAccounts: [
      'The demo accounts could not be created.',
      '无法创建演示账号。',
    ],
  },
} as const;
type Translated<T> = T extends readonly [string, string]
  ? string
  : { [K in keyof T]: Translated<T[K]> };
function translate<T>(value: T, index: 0 | 1): Translated<T> {
  if (Array.isArray(value)) return value[index] as Translated<T>;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      translate(child, index),
    ]),
  ) as Translated<T>;
}
// The shape every other language's CRM copy takes (./zh-TW.ts): the same
// keys as `wording`, a string each.
export type CrmWording = Translated<typeof wording>;
export const crmEn = translate(wording, 0);
export const crmZh = translate(wording, 1);
