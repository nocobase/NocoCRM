// The administration pages of the menu's Settings section: Users,
// Permission sets, API keys and Scheduled tasks (client/pages/settings/),
// rebuilt on the plugins' APIs once template 1.0.0-beta.60 removed the
// settings area and the plugins stopped shipping pages. English first,
// Chinese second, as the rest of the CRM's wording.
export const adminWording = {
  common: {
    loading: ['Loading', '加载中'],
    retry: ['Retry', '重试'],
    signInAgain: ['Sign in again', '重新登录'],
    loadFailed: ['Could not load {{what}}.', '无法加载{{what}}。'],
    forbidden: [
      'You do not have access to {{what}}.',
      '你没有权限查看{{what}}。',
    ],
    sessionEnded: ['Your session has ended.', '你的登录已过期。'],
    notFound: [
      'This record does not exist or has been deleted.',
      '记录不存在或已被删除。',
    ],
    backToList: ['Back to the list', '返回列表'],
    clearFilters: ['Clear filters', '清除筛选'],
    cancel: ['Cancel', '取消'],
    save: ['Save', '保存'],
    create: ['Create', '创建'],
    done: ['Done', '完成'],
    actions: ['Actions', '操作'],
    actionsFor: ['Actions for "{{name}}"', '“{{name}}”的操作'],
    refresh: ['Refresh', '刷新'],
    loadMore: ['Load more', '加载更多'],
    copy: ['Copy', '复制'],
    copied: ['Copied', '已复制'],
    failed: ['Something went wrong. Try again.', '操作没有成功，请重试。'],
    network: [
      'The server could not be reached. Check the connection and try again.',
      '无法连接服务器，请检查网络后重试。',
    ],
    previous: ['Previous page', '上一页'],
    next: ['Next page', '下一页'],
    pageOf: ['Page {{page}} of {{pages}}', '第 {{page}} / {{pages}} 页'],
  },
  users: {
    // The page's title, the menu entry's words (crm.navigation).
    title: ['Users', '用户'],
    what: ['the users', '用户'],
    description: [
      'Who can sign in to the CRM, and the roles they hold.',
      '可以登录 CRM 的人，以及他们的角色。',
    ],
    new: ['New user', '新建用户'],
    invite: ['Invite users', '邀请用户'],
    search: ['Search by name, username or email', '按姓名、用户名或邮箱搜索'],
    statusFilter: ['Status', '状态'],
    roleFilter: ['Role', '角色'],
    status: {
      all: ['All statuses', '全部状态'],
      enabled: ['Enabled', '已启用'],
      disabled: ['Disabled', '已停用'],
    },
    roleAll: ['All roles', '全部角色'],
    columns: {
      name: ['Name', '姓名'],
      username: ['Username', '用户名'],
      email: ['Email', '邮箱'],
      roles: ['Roles', '角色'],
      status: ['Status', '状态'],
    },
    you: ['You', '你'],
    noRoles: ['No role', '无角色'],
    pagination: ['Pagination', '分页'],
    managedRole: ['Managed by the application', '由应用管理'],
    noResults: ['No users match these filters.', '没有符合筛选条件的用户。'],
    range: [
      'Showing {{from}}–{{to}} of {{total}}',
      '第 {{from}}–{{to}} 条，共 {{total}} 条',
    ],
    actions: {
      edit: ['Edit', '编辑'],
      roles: ['Change roles', '修改角色'],
      password: ['Reset password', '重置密码'],
      signOut: ['Sign out everywhere', '退出所有登录'],
      disable: ['Disable', '停用'],
      enable: ['Enable', '启用'],
      delete: ['Delete', '删除'],
    },
    dialogs: {
      newTitle: ['New user', '新建用户'],
      editTitle: ['Edit user', '编辑用户'],
      rolesTitle: ['Change roles', '修改角色'],
      rolesDescription: ['Roles of "{{name}}"', '“{{name}}”的角色'],
      passwordTitle: ['Reset password', '重置密码'],
      passwordDescription: [
        'A new password for "{{name}}". Their other sessions stay signed in; sign them out everywhere as well if the old password leaked.',
        '为“{{name}}”设置新密码。对方已登录的会话不受影响；如果旧密码泄露，请同时让对方退出所有登录。',
      ],
      inviteTitle: ['Invite users', '邀请用户'],
      inviteDescription: [
        'Each address gets a link to create an account, valid for seven days.',
        '每个地址会收到一个创建账号的链接，七天内有效。',
      ],
    },
    fields: {
      name: ['Name', '姓名'],
      username: ['Username', '用户名'],
      email: ['Email', '邮箱'],
      password: ['Password', '密码'],
      newPassword: ['New password', '新密码'],
      confirmPassword: ['Confirm password', '确认密码'],
      roles: ['Roles', '角色'],
      emails: ['Email addresses', '邮箱地址'],
    },
    hints: {
      username: [
        'Optional; they can sign in with it instead of the email address.',
        '选填；可以用它代替邮箱登录。',
      ],
      password: ['At least 8 characters.', '至少 8 位。'],
      emails: [
        'One per line, or separated by commas, semicolons or spaces.',
        '每行一个，或用逗号、分号、空格分隔。',
      ],
      rolesDefault: [
        'Every signed-in user also gets the default access, whatever their roles.',
        '无论角色如何，每个登录用户都有默认权限。',
      ],
    },
    errors: {
      name: ['Enter a name', '请输入姓名'],
      email: ['Enter an email address', '请输入邮箱'],
      emailFormat: ['The email address is invalid', '邮箱格式不正确'],
      username: [
        'A username uses letters, digits, dots, hyphens and underscores',
        '用户名只能包含字母、数字、点、连字符和下划线',
      ],
      tooLong: ['Use at most {{max}} characters', '最多 {{max}} 个字符'],
      password: ['The password needs at least 8 characters', '密码至少 8 位'],
      mismatch: ['The passwords do not match', '两次输入的密码不一致'],
      roles: ['Choose at least one role', '至少选择一个角色'],
      emailTaken: ['This email address is already in use', '这个邮箱已被使用'],
      usernameTaken: ['This username is already in use', '这个用户名已被使用'],
      lastAdministrator: [
        'The last administrator cannot lose the role.',
        '最后一位管理员不能失去这个角色。',
      ],
      lastAdministratorDisable: [
        'The last administrator cannot be disabled.',
        '最后一位管理员不能被停用。',
      ],
      self: ['You cannot delete yourself.', '不能删除自己。'],
      holdsRecords: [
        'This user still owns, created or decides CRM records; disable them instead.',
        '这个用户仍是 CRM 记录的负责人、创建人或审批人，请改为停用。',
      ],
      emailsRequired: ['Enter at least one address', '请至少输入一个地址'],
      emailsInvalid: [
        'These addresses are invalid: {{list}}',
        '这些地址无效：{{list}}',
      ],
      emailsTooMany: [
        'Invite at most {{max}} addresses at a time',
        '每次最多邀请 {{max}} 个地址',
      ],
    },
    toasts: {
      created: ['Created user "{{name}}"', '已创建用户“{{name}}”'],
      saved: ['Saved user "{{name}}"', '已保存用户“{{name}}”'],
      roles: ['Saved the roles of "{{name}}"', '已保存“{{name}}”的角色'],
      password: ['Reset the password of "{{name}}"', '已重置“{{name}}”的密码'],
      signedOut: [
        'Signed "{{name}}" out everywhere',
        '已让“{{name}}”退出所有登录',
      ],
      disabled: ['Disabled "{{name}}"', '已停用“{{name}}”'],
      enabled: ['Enabled "{{name}}"', '已启用“{{name}}”'],
      deleted: ['Deleted user "{{name}}"', '已删除用户“{{name}}”'],
    },
    confirm: {
      signOutTitle: [
        'Sign "{{name}}" out everywhere?',
        '让“{{name}}”退出所有登录？',
      ],
      signOutBody: [
        'Every session of this account ends; they sign in again with their password.',
        '这个账号的所有登录都会结束，需要用密码重新登录。',
      ],
      signOut: ['Sign out', '退出登录'],
      disableTitle: ['Disable "{{name}}"?', '停用“{{name}}”？'],
      disableBody: [
        'They are signed out at once and cannot sign in until enabled again.',
        '对方会立即退出，重新启用前无法登录。',
      ],
      deleteTitle: ['Delete user "{{name}}"?', '删除用户“{{name}}”？'],
      deleteBody: [
        'This cannot be undone. Someone who still owns, created or decides CRM records cannot be deleted; disable them instead.',
        '删除后无法恢复。仍是 CRM 记录负责人、创建人或审批人的用户不能删除，请改为停用。',
      ],
    },
  },
  invitations: {
    title: ['Pending invitations', '待接受的邀请'],
    description: [
      'Invitations not yet accepted; a link works once, for seven days.',
      '还没有被接受的邀请；每个链接只能用一次，七天内有效。',
    ],
    invitedBy: [
      'Invited by {{name}} · expires {{date}}',
      '邀请人 {{name}} · {{date}} 过期',
    ],
    pending: ['Pending', '待接受'],
    expired: ['Expired', '已过期'],
    resend: ['Resend', '重新发送'],
    copyLink: ['Copy link', '复制链接'],
    revoke: ['Revoke', '撤销'],
    send: ['Send', '发送'],
    sent: ['Invitation sent', '邀请已发送'],
    linkOnly: [
      'Invitation created; copy the link to send it yourself',
      '邀请已创建，请复制链接自行发送',
    ],
    existing: ['Already has an account', '已有账号'],
    resultsTitle: ['Invitations', '邀请结果'],
    revokeTitle: [
      'Revoke the invitation to {{email}}?',
      '撤销给 {{email}} 的邀请？',
    ],
    revokeBody: ['The invitation link stops working.', '邀请链接将失效。'],
    revoked: [
      'Revoked the invitation to {{email}}',
      '已撤销给 {{email}} 的邀请',
    ],
    resent: [
      'Sent the invitation to {{email}} again',
      '已重新发送给 {{email}} 的邀请',
    ],
    resentLink: [
      'A new link was created; copy it to send it yourself',
      '已生成新链接，请复制后自行发送',
    ],
    what: ['the invitations', '邀请'],
  },
  sets: {
    // The page's title, the menu entry's words (crm.navigation).
    title: ['Permission sets', '权限集'],
    what: ['the permission sets', '权限集'],
    whatOne: ['this permission set', '这个权限集'],
    description: [
      'The roles people hold, and what each one may do.',
      '每个角色可以做什么，以及谁拥有它。',
    ],
    new: ['New permission set', '新建权限集'],
    rename: ['Rename', '重命名'],
    renameTitle: ['Rename permission set', '重命名权限集'],
    delete: ['Delete', '删除'],
    columns: {
      name: ['Name', '名称'],
      key: ['Key', '标识'],
      kind: ['Kind', '类型'],
    },
    kinds: {
      unrestricted: ['Unrestricted', '不受限'],
      builtIn: ['Built-in', '内置'],
    },
    // A row's two views of a set, each a drawer over the list.
    openPermissions: ['Permissions', '权限'],
    openMembers: ['Members', '成员'],
    permissionsOf: ['Permissions of "{{name}}"', '“{{name}}”的权限'],
    membersOf: ['Members of "{{name}}"', '“{{name}}”的成员'],
    permissionsDescription: [
      'Which pages, business operations and administration this permission set grants.',
      '这个权限集可以访问的页面、业务操作和管理功能。',
    ],
    areaEmptyTitle: ['Nothing to grant here', '这里没有可授予的权限'],
    areaEmptyBody: [
      'The application offers no permissions in this area.',
      '应用在这一部分没有提供可授予的权限。',
    ],
    noUpdate: [
      'You can view this permission set but not change its permissions.',
      '你可以查看这个权限集，但不能修改它的权限。',
    ],
    discardTitle: [
      'Discard changes to "{{name}}"?',
      '放弃对“{{name}}”的更改？',
    ],
    discardBody: [
      'Your changes to its permissions will be lost.',
      '你对它的权限所做的更改将丢失。',
    ],
    keepEditing: ['Keep editing', '继续编辑'],
    // The Pages area's first group: the menu's entries above its headings,
    // and the pages no menu entry names.
    topPages: ['Essentials', '基础'],
    headings: {
      pages: ['Pages', '页面'],
      business: ['Business operations', '业务操作'],
      administration: ['Administration', '管理'],
    },
    // Page grants whose routes name no menu entry of their own, or that
    // several entries share, by the page id `client/routes.ts` declares.
    pages: {
      'crm-agent-chat': ['Agent conversations', 'Agent 对话'],
      'crm-record': ['Record pages', '记录详情页'],
      'crm-decisions': ['AI suggestions', 'AI 建议'],
      // The Agents plugin's page of the coding agents runners report, off
      // the menu since the CRM's assistant is its own.
      agents: ['Runner agents', 'Runner Agent'],
      // The scheduler plugin's grant, `scheduler.schedules`, which Settings →
      // Scheduled tasks declares: the dot in its id is a key separator.
      scheduler: { schedules: ['Scheduled tasks', '定时任务'] },
    },
    unrestricted: [
      'This permission set is unrestricted: whoever holds it may do everything.',
      '这个权限集不受限：拥有它的人可以做任何事。',
    ],
    readOnly: [
      'This permission set is maintained by the application; its permissions cannot be changed here.',
      '这个权限集由应用维护，不能在这里修改权限。',
    ],
    customFilter: ['Custom filter', '自定义筛选'],
    levelFor: ['How far "{{name}}" reaches', '“{{name}}”的范围'],
    unsaved: ['Unsaved changes', '有未保存的更改'],
    discard: ['Discard', '放弃'],
    leaveConfirm: [
      'Leave without saving? Your changes to the permissions are lost.',
      '不保存就离开？你对权限所做的更改将丢失。',
    ],
    stale: [
      'Someone else changed this permission set. Reload to see their changes, then make yours again.',
      '其他人修改了这个权限集。请重新加载查看他们的更改，然后再修改。',
    ],
    reload: ['Reload', '重新加载'],
    fields: {
      name: ['Name', '名称'],
      key: ['Key', '标识'],
      keyHint: [
        'Lowercase letters, digits and hyphens; it cannot be changed later.',
        '小写字母、数字和连字符；创建后不能修改。',
      ],
    },
    errors: {
      name: ['Enter a name', '请输入名称'],
      key: [
        'A key uses lowercase letters, digits and hyphens',
        '标识只能包含小写字母、数字和连字符',
      ],
      keyTaken: ['This key is taken', '这个标识已被使用'],
      tooLong: ['Use at most {{max}} characters', '最多 {{max}} 个字符'],
      protected: [
        'This permission set is maintained by the application and cannot be changed this way.',
        '这个权限集由应用维护，不能这样修改。',
      ],
      lastAssignment: [
        'The last administrator cannot be removed.',
        '最后一位管理员不能被移除。',
      ],
      subjectNotAllowed: [
        'This permission set cannot be given to that member.',
        '这个权限集不能分配给该成员。',
      ],
    },
    members: {
      what: ['the members', '成员'],
      heading: [
        'People and groups who hold this permission set',
        '拥有这个权限集的人和群组',
      ],
      add: ['Add members', '添加成员'],
      // The Add members dialog's submit button, the verb alone (C3).
      addSubmit: ['Add', '添加'],
      addTitle: ['Add members', '添加成员'],
      everyone: ['All signed-in users', '所有已登录用户'],
      everyoneHint: [
        'Everyone who signs in holds it, now and later.',
        '所有登录的人都拥有它，包括以后加入的人。',
      ],
      user: ['User', '用户'],
      type: ['Type', '类型'],
      name: ['Name', '名称'],
      emptyTitle: [
        'Nobody holds this permission set',
        '还没有人拥有这个权限集',
      ],
      emptyBody: [
        'Once added, they get what it grants.',
        '添加成员后，他们即获得这里的权限。',
      ],
      emptyReadOnly: [
        'Ask an administrator to add members.',
        '请联系管理员添加成员。',
      ],
      search: ['Search users', '搜索用户'],
      noUsers: ['No users match.', '没有匹配的用户。'],
      already: ['Already a member', '已是成员'],
      remove: ['Remove', '移除'],
      removeTitle: [
        'Remove "{{name}}" from "{{set}}"?',
        '从“{{set}}”移除“{{name}}”？',
      ],
      removeBody: [
        'They lose what this permission set grants.',
        '对方将失去这个权限集授予的权限。',
      ],
      addedOne: ['Added 1 member', '已添加 1 位成员'],
      added: ['Added {{count}} members', '已添加 {{count}} 位成员'],
      removed: ['Removed "{{name}}"', '已移除“{{name}}”'],
      chooseOne: ['Choose at least one member', '至少选择一位成员'],
      unknown: ['Unknown ({{id}})', '未知（{{id}}）'],
    },
    toasts: {
      created: ['Created permission set "{{name}}"', '已创建权限集“{{name}}”'],
      saved: ['Saved permission set "{{name}}"', '已保存权限集“{{name}}”'],
      deleted: ['Deleted permission set "{{name}}"', '已删除权限集“{{name}}”'],
    },
    confirm: {
      deleteTitle: [
        'Delete permission set "{{name}}"?',
        '删除权限集“{{name}}”？',
      ],
      deleteBody: [
        'The people who hold it lose what it grants. This cannot be undone.',
        '拥有它的人将失去它授予的权限，删除后无法恢复。',
      ],
    },
  },
  keys: {
    // The page's title, the menu entry's words (crm.navigation).
    title: ['API keys', 'API 密钥'],
    what: ['your API keys', 'API 密钥'],
    description: [
      'Keys that let scripts and agents call the CRM as you.',
      '让脚本和 Agent 以你的身份调用 CRM 的密钥。',
    ],
    new: ['New API key', '新建 API 密钥'],
    columns: {
      name: ['Name', '名称'],
      access: ['Access', '访问范围'],
      created: ['Created', '创建时间'],
      expires: ['Expires', '过期时间'],
      lastUsed: ['Last used', '最近使用'],
    },
    full: ['Everything I can do', '我能做的一切'],
    limited: ['Only what I choose', '仅我选择的'],
    limitedCount: ['Limited ({{count}})', '有限（{{count}}）'],
    neverUsed: ['Never used', '从未使用'],
    neverExpires: ['Never', '永不过期'],
    days: ['{{count}} days', '{{count}} 天'],
    expired: ['Expired', '已过期'],
    fields: {
      name: ['Name', '名称'],
      description: ['Description', '描述'],
      expires: ['Expires', '有效期'],
      access: ['Access', '访问范围'],
    },
    levels: {
      read: ['Read', '读取'],
      write: ['Read and write', '读写'],
      admin: ['Administer', '管理'],
    },
    emptyTitle: ['No API keys yet', '还没有 API 密钥'],
    emptyBody: [
      'Create one to let a script or an agent call the CRM as you.',
      '创建一个，让脚本或 Agent 以你的身份调用 CRM。',
    ],
    emptyNoCreate: [
      'You may not create API keys; ask an administrator.',
      '你没有创建 API 密钥的权限，请联系管理员。',
    ],
    secretTitle: ['Copy your new key', '复制新密钥'],
    secretWarning: [
      'Copy it now: it is not shown again.',
      '现在复制：关闭后不再显示。',
    ],
    secretLabel: ['API key', 'API 密钥'],
    rotatedTitle: ['New secret for "{{name}}"', '“{{name}}”的新密钥'],
    rotate: ['Rotate', '轮换'],
    delete: ['Delete', '删除'],
    errors: {
      name: ['Enter a name', '请输入名称'],
      tooLong: ['Use at most {{max}} characters', '最多 {{max}} 个字符'],
      access: ['Choose at least one permission', '至少选择一项权限'],
      creation: ['You may not create API keys.', '你没有创建 API 密钥的权限。'],
    },
    toasts: {
      created: ['Created API key "{{name}}"', '已创建 API 密钥“{{name}}”'],
      rotated: ['Rotated "{{name}}"', '已轮换“{{name}}”'],
      deleted: ['Deleted API key "{{name}}"', '已删除 API 密钥“{{name}}”'],
    },
    confirm: {
      rotateTitle: ['Rotate "{{name}}"?', '轮换“{{name}}”？'],
      rotateBody: [
        'A new secret replaces the current one, which stops working at once.',
        '新密钥会替换当前密钥，当前密钥立即失效。',
      ],
      deleteTitle: ['Delete API key "{{name}}"?', '删除 API 密钥“{{name}}”？'],
      deleteBody: [
        'Anything using it stops working at once. This cannot be undone.',
        '使用它的地方会立即失效，删除后无法恢复。',
      ],
    },
  },
  schedules: {
    // The page's title, the menu entry's words (crm.navigation).
    title: ['Scheduled tasks', '定时任务'],
    what: ['the scheduled tasks', '定时任务'],
    whatOne: ['this scheduled task', '这个定时任务'],
    description: [
      "The CRM's recurring passes and how their runs went.",
      'CRM 的定时任务，以及它们的运行情况。',
    ],
    columns: {
      task: ['Task', '任务'],
      schedule: ['Schedule', '计划'],
      status: ['Status', '状态'],
      lastRun: ['Last run', '上次运行'],
      nextRun: ['Next run', '下次运行'],
      runs: ['Runs', '运行次数'],
      on: ['On', '启用'],
    },
    switchFor: ['Run "{{title}}"', '运行“{{title}}”'],
    status: {
      active: ['Active', '运行中'],
      paused: ['Paused', '已暂停'],
      inactive: ['Inactive', '已失效'],
    },
    target: {
      disabled: ['Target off', '目标已关闭'],
      missing: ['Target missing', '目标缺失'],
      invalid: ['Target invalid', '目标无效'],
    },
    resumed: ['Resumed "{{title}}"', '已恢复“{{title}}”'],
    paused: ['Paused "{{title}}"', '已暂停“{{title}}”'],
    inactiveHint: [
      'The application no longer defines this task.',
      '应用已不再定义这个任务。',
    ],
    fields: {
      key: ['Key', '标识'],
      schedule: ['Schedule', '计划'],
      timezone: ['Time zone', '时区'],
      target: ['Target', '目标'],
      status: ['Status', '状态'],
      runs: ['Runs', '运行次数'],
      succeeded: ['Succeeded', '成功次数'],
      lastRun: ['Last run', '上次运行'],
      nextRun: ['Next run', '下次运行'],
      description: ['Description', '说明'],
    },
    history: ['Run history', '运行记录'],
    historyEmpty: ['This task has not run yet.', '这个任务还没有运行过。'],
    started: ['Started', '开始'],
    finished: ['Finished', '结束'],
    reason: ['Reason', '原因'],
    cap: [
      'Only the first {{count}} tasks are shown.',
      '只显示前 {{count}} 个任务。',
    ],
    emptyTitle: ['No scheduled tasks', '没有定时任务'],
    emptyBody: [
      'The application and its plugins define none.',
      '应用和插件都没有定义定时任务。',
    ],
    occurrence: {
      pending: ['Pending', '等待中'],
      running: ['Running', '运行中'],
      waiting: ['Waiting', '等待结果'],
      succeeded: ['Succeeded', '成功'],
      failed: ['Failed', '失败'],
      skipped: ['Skipped', '已跳过'],
      cancelled: ['Cancelled', '已取消'],
      timed_out: ['Timed out', '超时'],
      triggered: ['Triggered', '已触发'],
    },
  },
  // Settings → Notification management → Notification templates
  // (pages/settings/notification-templates.tsx and its drawer): the page's
  // words, and the registered notifications' own, which the Notification
  // plugin carries in one language only, by template id (`items`) and
  // variable name (`variables`); an id or variable not here shows the
  // registered English.
  notificationTemplates: {
    intro: [
      'Notifications the CRM sends on its own: when each is sent, who receives it, and what it says in each language. Nothing here can be changed.',
      'CRM 自动发送的通知：每类通知什么时候发、发给谁，以及各语言下的内容。这里只能查看，不能修改。',
    ],
    search: ['Search', '搜索'],
    searchPlaceholder: ['Name or description', '名称或说明'],
    category: ['Category', '分类'],
    channel: ['Channel', '渠道'],
    all: ['All', '全部'],
    empty: ['No notifications are registered.', '还没有登记的通知。'],
    noResults: [
      'No notifications match the search and filters.',
      '没有符合搜索和筛选条件的通知。',
    ],
    what: ['the notification templates', '通知模板'],
    whatOne: ['this notification template', '这个通知模板'],
    when: ['When it is sent', '什么时候发'],
    who: ['Who receives it', '发给谁'],
    conditions: ['Conditions', '发送条件'],
    language: ['Language', '语言'],
    source: ['Provided by', '提供方'],
    channels: ['Channels', '发送渠道'],
    channelsHint: [
      'Set up and on does not prove the connection works.',
      '已配置、已启用不代表连接一定正常。',
    ],
    channelState: {
      configured: ['Set up', '已配置'],
      unconfigured: ['Not set up', '未配置'],
      enabled: ['On', '已启用'],
      disabled: ['Off', '已停用'],
      unknown: ['Unknown', '状态未知'],
    },
    variables: ['Variables', '可用变量'],
    preview: ['Preview', '预览'],
    previewLanguage: ['Preview language', '预览语言'],
    previewAllLanguages: [
      'This message carries every language at once; every recipient gets the same content.',
      '这条通知一次包含所有语言，每位收件人收到的内容都相同。',
    ],
    example: ['Example', '示例'],
    definition: ['Template', '模板原文'],
    synthetic: [
      'Made-up example data. Previewing sends nothing and changes nothing.',
      '使用虚构的示例数据，预览不会发送通知，也不会改动任何设置。',
    ],
    html: ['HTML version', 'HTML 版本'],
    channelTypes: {
      'in-app': ['In-app', '站内信'],
      email: ['Email', '邮件'],
    },
    contributors: {
      crm: ['NocoCRM', 'NocoCRM'],
    },
    categories: {
      accounts: ['Accounts', '账号'],
      records: ['Records', '记录'],
      tasks: ['Tasks', '任务'],
      comments: ['Comments', '评论'],
      signals: ['Company signals', '公司信号'],
      approvals: ['Approvals', '审批'],
    },
    // A CRM notification's conditions: its switch, any rule of its own,
    // then what every one of them keeps to.
    switchRule: [
      'Sent while “{{switch}}” is on under Settings → General → Reminders (on by default).',
      '设置 › 通用 › 提醒设置 中的“{{switch}}”开启时发送（默认开启）。',
    ],
    always: [
      'Never sent to the person who made the change, about a deleted record, or to a disabled account, and only while the recipient can still see the record.',
      '不会发给操作者本人，记录已删除或账号已停用时不发送，并且只在收件人仍能查看该记录时送达。',
    ],
    crmLanguage: [
      "In each recipient's own language, the one they chose in their account menu; English when they have not chosen one.",
      '按每位收件人在账号菜单里选择的语言发送；没有选择时用英文。',
    ],
    items: {
      recordAssigned: {
        name: ['Record assigned', '记录分配给你'],
        trigger: [
          'A lead, opportunity, company, contact, task or approval gets a new owner, a new record created for someone else included.',
          '线索、商机、公司、联系人、任务或审批更换了负责人，包括为别人新建的记录。',
        ],
        recipients: ['The new owner.', '新负责人。'],
      },
      taskInvited: {
        name: ['Added to a task', '被加入任务'],
        trigger: [
          "Someone is added to a task's participants.",
          '有人被加为任务的参与人。',
        ],
        recipients: ['Each participant added.', '被加入的参与人。'],
      },
      taskRemoved: {
        name: ['Removed from a task', '被移出任务'],
        trigger: [
          "Someone is removed from a task's participants.",
          '有人被移出任务的参与人。',
        ],
        recipients: ['Each participant removed.', '被移出的参与人。'],
      },
      taskCancelled: {
        name: ['Task cancelled', '任务已取消'],
        trigger: ['A task is cancelled.', '任务被取消。'],
        recipients: [
          'The participants still on the task (not the owner).',
          '仍在任务中的参与人（不通知负责人）。',
        ],
      },
      taskRescheduled: {
        name: ['Task rescheduled', '任务改期'],
        trigger: [
          "A task's time is changed, unless the task is cancelled.",
          '任务的时间被修改（已取消的任务除外）。',
        ],
        recipients: [
          'The participants still on the task (not the owner).',
          '仍在任务中的参与人（不通知负责人）。',
        ],
      },
      taskStarting: {
        name: ['Task coming up', '任务即将开始'],
        trigger: [
          'A task with a time, not just a date, is about to start, within the lead time set under Settings → General → Reminders.',
          '设了具体时刻（不只是日期）的任务即将开始，提前多久在 设置 › 通用 › 提醒设置 中设定。',
        ],
        recipients: [
          'The task owner and its participants.',
          '任务负责人和参与人。',
        ],
        rule: [
          'Once per task, start time and person.',
          '同一任务、同一开始时间，每人只提醒一次。',
        ],
      },
      commentMentioned: {
        name: ['Mentioned in a comment', '评论中提到你'],
        trigger: [
          'A comment @-mentions a colleague, when it is written or when an edit adds the mention.',
          '评论里 @ 了同事，包括编辑评论时新加的 @。',
        ],
        recipients: ['Each colleague newly mentioned.', '新被 @ 到的同事。'],
        rule: ['Once per comment and person.', '同一条评论，每人只通知一次。'],
      },
      commentReplied: {
        name: ['Reply in a comment thread', '评论有新回复'],
        trigger: [
          'Someone replies to a comment or to a reply.',
          '有人回复了评论或回复。',
        ],
        recipients: [
          'Everyone who has written in the thread; those the reply @-mentions are told of the mention instead.',
          '参与过该讨论的人；回复里被 @ 到的人改为收到“评论中提到你”。',
        ],
        rule: ['Once per reply and person.', '同一条回复，每人只通知一次。'],
      },
      companySignal: {
        name: ['Company news', '公司新动态'],
        trigger: [
          "The company signals check finds news about a company through the AI's web search.",
          '公司信号检查通过 AI 联网搜索发现了某家公司的新动态。',
        ],
        recipients: [
          "The company's owner and the owners of its open opportunities.",
          '公司负责人，以及该公司进行中商机的负责人。',
        ],
        rule: [
          "Once per news item and person; it opens the company's Signals tab.",
          '同一条动态，每人只通知一次；点开后进入公司的信号页签。',
        ],
      },
      approvalPending: {
        name: ['Approval requested', '收到审批申请'],
        trigger: ['An approval request is submitted.', '有人提交了审批申请。'],
        recipients: ['The approver.', '审批人。'],
      },
      approvalWithdrawn: {
        name: ['Approval request withdrawn', '审批申请已撤回'],
        trigger: [
          'The applicant withdraws a submitted request.',
          '申请人撤回了已提交的申请。',
        ],
        recipients: ['The approver.', '审批人。'],
      },
      approvalApproved: {
        name: ['Approval request approved', '审批已通过'],
        trigger: ['The approver approves a request.', '审批人通过了申请。'],
        recipients: ['The applicant.', '申请人。'],
      },
      approvalRejected: {
        name: ['Approval request rejected', '审批被驳回'],
        trigger: ['The approver rejects a request.', '审批人驳回了申请。'],
        recipients: ['The applicant.', '申请人。'],
      },
      // The Users plugin's invitation mail (`users.invitation`).
    },
    variableText: {
      entity: [
        "The kind of record, in the recipient's language (lead, opportunity, company, contact, task, approval).",
        '记录类型，用收件人的语言显示（线索、商机、公司、联系人、任务、审批）。',
      ],
      record: [
        'The kind of record as it reads inside a sentence ("a lead"), for the languages that need it.',
        '在句中使用的记录类型（如英文的“a lead”），供需要的语言使用。',
      ],
      name: [
        'The record\'s name as the CRM shows it: "name / company" for a lead or contact, "company / name" for an opportunity.',
        '记录名称，与 CRM 页面上一致：线索和联系人为“姓名 / 公司”，商机为“公司 / 商机名”。',
      ],
    },
  },
} as const;
