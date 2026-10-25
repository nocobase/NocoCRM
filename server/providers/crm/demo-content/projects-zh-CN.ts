import type { DemoProjects } from './types.js';

export const zhProjects: DemoProjects = {
  sf: {
    company: '顺丰速运',
    domain: 'sf-express',
    person: {
      name: '梁志远',
      mailbox: 'liang.zhiyuan',
      jobTitle: '华南区运营数字化经理',
    },
    message:
      '你好，我们是顺丰速运华南区运营中心。目前 300 多个网点的巡检记录和异常工单都靠表格和群消息流转，区域经理很难看到全貌。想了解 NocoBase 能否私有化部署在我们自己的机房，并和现有的统一身份认证打通。下个月要给区域总做方案汇报，方便的话这周约个时间聊聊。',
  },
  hworld: {
    company: {
      name: '华住集团',
      domain: 'h-world',
      website: 'https://www.hworld.com',
      linkedin: 'https://www.linkedin.com/company/huazhugrouplimited/',
      description:
        '华住集团旗下有汉庭、全季、桔子等十多个酒店品牌，国内门店超过 9000 家，其中大部分是加盟店。\n\nIT 部计划把门店运营巡检、维修工单和加盟商协同从三套 SaaS 收拢到一个自建平台：\n\n- **巡检**：区域督导按品牌标准检查门店，问题拍照上报并跟踪整改；\n- **维修工单**：门店报修后自动派给就近的维修商，按时效考核；\n- **加盟商协同**：加盟商在门户里看自己门店的巡检得分和工单进度。\n\n要求私有化部署在华住自己的云上、集群部署，审计日志保留三年，登录与会员系统的统一身份打通。一期覆盖华东 2000 家门店，后续按区域分批推广。',
      address: '上海市闵行区\n华住集团总部 IT 部',
    },
    people: [
      { name: '陆晨', mailbox: 'lu.chen', jobTitle: 'IT 总监' },
      { name: '程浩', mailbox: 'cheng.hao', jobTitle: '数据平台负责人' },
      { name: '邵佳', mailbox: 'shao.jia', jobTitle: '采购经理' },
    ],
    message:
      '在上海的数字化酒店展会上看了你们的演示，印象很深。\n\n我们有 9000 多家门店，巡检、维修工单和加盟商沟通分散在三套系统里，督导、门店和维修商要在不同的系统之间来回切换，总部也很难看到全局数据。想评估能否统一到一个平台上。\n\n我们的基本要求是：私有化部署、完整的审计日志、能和会员系统的统一身份打通。如果方便，希望先安排一次需求调研，我和数据平台负责人程浩一起参加。',
    deal: '门店运营与工单平台（企业版）',
    leadTask: {
      name: '预约需求调研',
      result:
        '和陆晨约好下周二在华住上海总部做需求调研，程浩一起参加。\n\n陆晨会提前准备巡检、维修工单和加盟商报修三条线现在用的系统清单，我们这边带上连锁行业的案例和私有化部署的架构说明。',
    },
    discovery: {
      heading: '需求调研',
      body: '与陆晨、程浩梳理了巡检、维修工单、加盟商报修三条线；一期覆盖华东 2000 家门店，要求对接会员系统的单点登录，审计日志保留 3 年。',
    },
    poc: {
      heading: 'POC 演示',
      body: '在华住测试环境演示了工单流转和集群部署，程浩确认性能满足要求；陆晨提出希望首年价格有一定空间，并会拉采购邵佳参加下次评审。',
    },
    quoteSent: {
      heading: '报价单发送',
      body: '已发送企业版报价与三年运维服务方案，合计 72 万元；陆晨回复会在方案评审会上和采购一起过。',
    },
    review: '方案评审会',
    reviewDescription:
      '与陆晨、程浩、邵佳一起评审方案与报价。\n\n**要确认的事**\n- 一期范围：华东 2000 家门店的巡检、维修工单和加盟商门户；\n- 上线节奏：POC 结论、试点区域和全面推广的时间点；\n- 商务条款：首年折扣（审批中）、三年运维服务是否写进主合同、付款方式。\n\n**会后**\n把评审结论和待补的材料写进结果，邵佳那边的采购流程节点记下来。',
    approval: {
      name: '华住集团 企业版首年 15% 折扣',
      description:
        '华住集团门店运营与工单平台，企业版加三年运维服务合计 72 万元。申请企业版首年 15% 折扣。\n\n**背景**\n客户有 9000 多家门店，一期覆盖华东 2000 家，POC 已通过，后续会按区域分批推广，长期价值很大。\n\n**理由**\n- 采购邵佳已经明确首年预算有上限，报价需要下调才能进入采购流程；\n- 客户愿意把三年运维服务写进主合同，三年总收入基本不受影响；\n- 拿下华住后，可以作为酒店行业的标杆案例。\n\n折扣只适用于首年企业版授权，运维服务和后续扩展按标准价格。',
    },
    mention:
      '@{{name}} 华住 15% 的折扣我倾向批准，前提是三年运维服务写进主合同。你确认一下客户能接受吗？',
  },
  gac: {
    company: {
      name: '广汽集团',
      domain: 'gac',
      website: 'https://www.gac.com.cn',
      linkedin:
        'https://www.linkedin.com/company/guangzhou-automobile-group-co-ltd-/',
      description:
        '广汽集团数字化部牵头建设经销商协同平台，覆盖集团旗下几个乘用车品牌的 1000 多家经销商。\n\n目前线索分配、整车库存调拨和售后服务工单分别在不同的系统里，经销商要登录多个后台，集团也很难实时掌握各店的库存和线索转化。平台要把这三条线统一起来，并为经销商提供一个统一入口。\n\n技术上要求使用国产数据库、集群部署，满足集团的数据安全规范；合同已进入法务审核阶段，付款按 3-4-3 分期。',
      address: '广州市天河区\n广汽集团总部 数字化部',
    },
    people: [
      { name: '冯毅', mailbox: 'feng.yi', jobTitle: '数字化部部长' },
      { name: '莫琳', mailbox: 'mo.lin', jobTitle: '法务经理' },
    ],
    deal: '经销商协同平台（企业版）',
    alignment: {
      heading: '合同条款对齐会',
      body: '与冯毅、莫琳逐条过了合同：付款按 3-4-3 分期，尾款验收后 60 天支付（已走审批）；法务要求补充数据安全条款，我们答应三个工作日内给出修订稿。',
    },
    legal: {
      heading: '法务意见',
      body: '莫琳回复了修订稿：数据安全条款接受，但希望把违约金上限从 5% 提到 10%，需要内部再评估。',
    },
    signing: '合同签署推进',
    followLegal: '跟进法务违约金条款',
    approval: {
      name: '广汽集团 尾款 60 天账期',
      description:
        '广汽集团经销商协同平台，企业版合同 120 万元，付款按 3-4-3 分期：签约后 30%，上线后 40%，验收后 30%。\n\n客户财务流程规定尾款在验收后 60 天支付，超出我们 30 天的标准账期。\n\n**风险评估**\n- 首付 30% 合同签订后即支付，回款风险可控；\n- 客户是大型国企，付款信用良好；\n- 尾款 36 万元，延后 30 天对现金流影响有限。\n\n建议同意，并在合同中写明验收标准和验收时限，避免验收环节拖延。',
      comment: '同意 60 天账期，首付比例不低于 30%，请在合同中写明验收标准。',
    },
    note: '违约金上限客户希望提到 10%，我倾向守在 5%，可以用延长一年升级服务来换，大家怎么看？',
    reply: '同意守 5%。合同签署我明天和你一起约冯毅，把升级服务的方案带上。',
  },
  newHope: {
    company: {
      name: '新希望集团',
      domain: 'newhope',
      website: 'https://www.newhopegroup.com',
      linkedin:
        'https://www.linkedin.com/company/%E6%96%B0%E5%B8%8C%E6%9C%9B%E9%9B%86%E5%9B%A2-new-hope-group/',
      description:
        '新希望集团是农牧食品企业，旗下有大量养殖场和饲料厂。\n\n信息中心今年用 NocoBase 专业版上线了养殖场巡检系统，首批 12 个养殖场三周内完成上线，巡检提交率稳定在 90% 以上，场长们反馈比原来的纸质表方便很多。\n\n在此基础上，信息中心计划把饲料厂的质检和设备点检扩展到同一平台，让质检数据和养殖端打通。目前正在做质检需求访谈，准备续约与扩展方案。',
      address: '成都市锦江区\n新希望集团 信息中心',
    },
    people: [
      { name: '钟岚', mailbox: 'zhong.lan', jobTitle: '信息中心主任' },
      { name: '唐峰', mailbox: 'tang.feng', jobTitle: '数字化项目经理' },
    ],
    deal: '养殖场巡检系统（专业版）',
    expansion: '饲料厂质检应用扩展（专业版）',
    kickoff: {
      heading: '项目启动会',
      body: '与钟岚、唐峰确认上线计划：首批 12 个养殖场，三周内完成巡检表单和异常上报，唐峰负责内部推广。',
    },
    training: {
      heading: '上线培训',
      body: '完成两场场长培训，首周巡检提交率 92%；钟岚提出饲料厂质检也想用同一平台。',
    },
    interview: '质检需求访谈',
    renewal: '新希望 续约与扩展方案准备',
  },
  chats: [
    {
      title: '华住评审会的折扣怎么谈',
      messages: [
        {
          role: 'user',
          text: '华住的方案评审会马上要开了，陆晨肯定会再提首年价格，我该怎么谈？',
        },
        {
          role: 'assistant',
          text: '结合商机记录，建议这样准备：\n\n1. **先谈价值，再谈价格**：开场请程浩讲 POC 结论（性能和集群部署都已验证），让采购邵佳先认可方案本身。\n2. **折扣审批还没批，不要承诺 15%**：可以说“首年价格我们在内部争取，前提是一期范围和三年运维一起确定”。\n3. **用三年运维换折扣**：李明在商机上留言说倾向批准 15%，条件是三年运维写进主合同，正好作为交换条件。\n4. **准备两套报价**：标准价，以及 15% 折扣 + 三年运维，让采购在两者之间选，而不是自己去比价。\n\n要我把这些整理成评审会议程，写进任务描述吗？',
        },
        {
          role: 'user',
          text: '邵佳是第一次参加，她会关心什么？',
        },
        {
          role: 'assistant',
          text: '采购通常关心三件事：**总价和付款方式**、**有没有可比较的报价**、**合同风险**。建议提前准备：\n\n- 报价拆分清楚：授权、实施、三年运维各多少；\n- 同等规模连锁客户的案例，说明价格依据；\n- 标准合同模板，提前发给她看。\n\n另外她还不在商机的联系人里，AI 跟进建议把她加为“影响者”，你可以在商机的 AI 建议里一起采纳。',
        },
      ],
    },
    {
      title: '本月预测',
      messages: [
        { role: 'user', text: '我这个月能成交多少？' },
        {
          role: 'assistant',
          text: '按你名下的商机和预计成交日期看：\n\n| 商机 | 阶段 | 金额 | 预计成交 |\n| --- | --- | --- | --- |\n| 广汽集团 经销商协同平台 | 谈判 | 120 万 | 12 天后 |\n| 华住集团 门店运营与工单平台 | 方案 | 68 万 | 25 天后 |\n\n- **承诺**：广汽 120 万。账期审批已通过，只剩违约金条款和签署。\n- **最好情况**：再加上华住，合计 188 万；但华住还在方案阶段，折扣审批未定，本月成交的把握不大。\n\n建议把精力先放在广汽的签署上：合同签署推进这个任务已经逾期一天。',
        },
      ],
    },
    {
      title: '给冯毅的签约邮件',
      messages: [
        {
          role: 'user',
          text: '帮我给广汽的冯毅写封邮件，推进合同签署，违约金上限我们守 5%，可以多送一年升级服务。',
        },
        {
          role: 'assistant',
          text: '**主题**：经销商协同平台合同签署安排\n\n冯部长您好：\n\n感谢您和莫琳经理这两周对合同的细致审阅。数据安全条款已按贵方意见修订完毕。\n\n关于违约金上限，我们建议维持在合同金额的 5%，这是我们对所有企业客户一致的标准。为了表达合作诚意，我们愿意在原有一年升级服务的基础上，**额外赠送一年升级服务**，确保平台在两年内持续获得新版本。\n\n如果您认可，我们希望本周内安排合同签署，具体时间听您安排。\n\n祝好！\n\n---\n\n要我把这封邮件存为商机上的邮件任务，或者用你的邮箱直接打开写信窗口吗？',
        },
      ],
    },
    {
      title: '顺丰这条线索怎么跟',
      messages: [
        { role: 'user', text: '顺丰速运那条新线索值得跟吗？' },
        {
          role: 'assistant',
          text: '值得，而且要快。AI 跟进给的是 **A 级，建议跟进**：\n\n- 梁志远负责华南 300 多个网点的运营数字化，下个月要给区域总汇报方案；\n- 他明确要私有化部署和对接统一身份认证，正好是企业版的强项；\n- 华南试点成功后有机会推广到其他大区。\n\nAI 已经准备好一封回复邮件，约本周三或周四下午沟通。你可以在收件箱的 AI 建议里检查邮件内容，确认后直接发送。',
        },
      ],
    },
  ],
  signals: [
    {
      company: 'gac',
      type: 'business',
      title:
        '广汽集团筹划以发行股份方式购买一汽股份持有的某整车合资公司部分股权，构成重大资产重组',
      summary:
        '广汽集团与中国第一汽车股份有限公司签署意向协议，筹划以发行股份方式购买一汽股份持有的某整车合资公司部分股权并募集配套资金，预计构成重大资产重组及关联交易。',
      occurredOn: '2026-09-14',
      foundDaysAgo: 2,
      status: 'new',
      sources: [
        {
          title:
            '广汽集团公告:筹划以发行股份方式购买一汽股份持有的某整车合资公司部分股权,并募集配套资金,预计停牌时间不超过10个交易日',
          url: 'https://baijiahao.baidu.com/s?id=1876315325965744147',
          site: '百度',
        },
        {
          title:
            '广汽集团 601238.SH :拟筹划重大资产重组事项 A股股票9月14日起停牌',
          url: 'https://baijiahao.baidu.com/s?id=1876314277796904936',
          site: '百度',
        },
        {
          title: '今早停牌!刚刚,公告回应!',
          url: 'https://www.sohu.com/a/1076012420_122014422',
          site: '搜狐',
        },
      ],
    },
    // The other companies' (by their index in `companies`): 0 Shanghai
    // Electric, 2 United Family Healthcare, 4 XJTLU, 5 XGIMI, 6 NARI,
    // 7 Guangzhou Restaurant.
    {
      company: 6,
      type: 'business',
      title: '国电南瑞中标国网福建电力2026年第四次物资公开招标采购项目',
      summary:
        '国电南瑞是这次采购的119家中标企业之一，采购总金额约2.4亿元，涉及主设备全面监视系统、智能变电站辅助系统等品类。',
      occurredOn: '2026-10-14',
      foundDaysAgo: 1,
      status: 'new',
      sources: [
        {
          title: '国电南瑞等119家企业中标国网福建电力物资公开招标采购项目',
          url: 'https://app.myzaker.com/news/article.php?pk=6acef609b15ec037f525cb68',
          site: 'ZAKER',
        },
      ],
    },
    {
      company: 6,
      type: 'business',
      title: '国电南瑞申请面向电力系统的数据交互方法及装置专利',
      summary:
        '国电南瑞及其子公司申请了一项面向电力系统的数据交互方法、存储介质及装置专利，用于简化数据交互链路。',
      occurredOn: '2026-10-10',
      foundDaysAgo: 4,
      status: 'new',
      sources: [
        {
          title:
            '国电南瑞申请面向电力系统的数据交互方法、存储介质及装置专利,简化了数据交互链路',
          url: 'https://www.163.com/dy/article/L8T53ED00519QIKK.html',
          site: '网易',
        },
      ],
    },
    {
      company: 0,
      type: 'risk',
      title: '上海电气子公司重大诉讼按原告撤诉处理结案',
      summary:
        '上海电气公告，其控股子公司上海电气通讯技术有限公司涉及的重大诉讼已按原告撤诉处理。',
      occurredOn: '2026-10-14',
      foundDaysAgo: 1,
      status: 'new',
      sources: [
        {
          title: '上海电气集团股份有限公司关于子公司重大诉讼的进展公告',
          url: 'http://finance.sina.cn/2026-10-15/detail-inivfmzh1339438.d.html',
          site: '新浪财经',
        },
        {
          title: '上海电气集团股份有限公司 601727',
          url: 'https://www.sse.com.cn/assortment/stock/list/info/company/index.shtml?COMPANY_CODE=601727',
          site: '上海证券交易所',
        },
      ],
    },
    {
      company: 5,
      type: 'business',
      title: '极米科技股东会审议通过2026年股票期权激励计划',
      summary:
        '极米科技于2026年10月13日召开临时股东会，审议通过《2026年股票期权激励计划（草案）》及相关考核管理办法。',
      occurredOn: '2026-10-13',
      foundDaysAgo: 2,
      status: 'new',
      sources: [
        {
          title: '股市必读:极米科技新发布《2026年第一次临时股东会决议公告》',
          url: 'https://stock.stockstar.com/RB2026101500001570.shtml',
          site: '证券之星',
        },
        {
          title: '股市必读:极米科技新发布《2026年第一次临时股东会决议公告》',
          url: 'https://m.sohu.com/a/1087843315_115377',
          site: '搜狐',
        },
      ],
    },
    {
      company: 7,
      type: 'funding',
      title: '广州酒家发行可转换公司债券的申请获上交所审核通过',
      summary:
        '上海证券交易所上市审核委员会审议通过了广州酒家向不特定对象发行可转换公司债券的申请，尚需获得中国证监会同意注册后方可实施。',
      occurredOn: '2026-10-14',
      foundDaysAgo: 1,
      status: 'new',
      sources: [
        {
          title:
            '广州酒家集团股份有限公司关于向不特定对象发行可转换公司债券申请获得上海证券交易所上市审核委员会审核通过的公告',
          url: 'https://www.sohu.com/a/1087889292_120988533',
          site: '搜狐',
        },
        {
          title:
            '广州酒家披露向不特定对象发行可转换公司债券申请获上交所上市审核委审核通过',
          url: 'https://www.toutiao.com/article/7696535638497215016/',
          site: '今日头条',
        },
      ],
    },
    {
      company: 4,
      type: 'business',
      title: '西交利物浦大学举办首届生涯嘉年华',
      summary:
        '西交利物浦大学于2026年10月14日举办首届生涯嘉年华，近60所高校和近150家企业参与升学与校园招聘对接。',
      occurredOn: '2026-10-14',
      foundDaysAgo: 1,
      status: 'new',
      sources: [
        {
          title:
            '学生邀请函|2026西交利物浦大学生涯嘉年华:近60名校&近150名企,一站直达',
          url: 'https://www.sohu.com/a/1087291940_121124035',
          site: '搜狐',
        },
      ],
    },
    {
      company: 4,
      type: 'business',
      title: '西交利物浦大学技术与创新支持中心（TISC）揭牌',
      summary:
        '国家知识产权局同意西交利物浦大学作为第二期技术与创新支持中心（TISC）正式运行，学校于9月19日参加了苏州市获批机构的揭牌仪式。',
      occurredOn: '2026-09-19',
      foundDaysAgo: 6,
      status: 'new',
      sources: [
        {
          title: '西交利物浦大学知识产权信息服务中心',
          url: 'https://ipisc.xjtlu.edu.cn/',
          site: '西交利物浦大学',
        },
      ],
    },
    {
      company: 2,
      type: 'business',
      title: '和睦家医疗为2026中国网球公开赛提供赛事医疗保障',
      summary:
        '和睦家医疗作为2026中国网球公开赛指定的赛事医疗服务保障供应商，完成了为期数周的驻场医疗保障，这是其连续第二年为该赛事提供医疗支持。',
      occurredOn: '2026-10-11',
      foundDaysAgo: 3,
      status: 'new',
      sources: [
        {
          title: '对标国际赛事标准 和睦家全程护航2026中国网球公开赛',
          url: 'https://www.cqn.com.cn/cj/content/2026-10/12/content_9175871.htm',
          site: '中国质量新闻网',
        },
      ],
    },
  ],
  ai: {
    sfLead: {
      recommendation: 'follow',
      grade: 'A',
      summary:
        '大型企业、需求明确、要私有化和统一身份认证，适合企业版，值得尽快跟进。',
      brief:
        '梁志远负责顺丰速运华南区 300 多个网点的运营数字化，巡检和异常工单靠表格和群消息流转，下个月要向区域总汇报方案。他明确提出私有化部署和对接统一身份认证，这两点正是企业版的强项。顺丰是年营收数千亿的物流龙头，一旦华南试点成功，有机会推广到其他大区。',
      reasons: [
        '规模大：300 多个网点、区域级汇报，后续可向全国推广（原始留言）',
        '需求清晰：巡检记录和异常工单，私有化部署 + 统一身份认证（原始留言）',
        '时间紧：下个月要做方案汇报，本周就希望沟通（原始留言）',
      ],
      edition: '企业版',
      invalidReason: null,
      nextStep: {
        type: 'email',
        subject: '回复梁志远，约本周需求沟通',
        inDays: 0,
      },
      prep: [
        '准备物流网点巡检和异常工单的演示应用',
        '整理私有化部署架构图和统一身份认证（OIDC/SAML）对接说明',
        '带一份大型企业集群部署案例',
      ],
      questions: [
        '区域总汇报的时间和关注点是什么？',
        '现有统一身份认证用的是什么协议？',
        '一期是华南全部网点，还是先选几个试点？',
        '机房环境用什么数据库和操作系统？',
      ],
      opportunity: null,
      reviewInDays: null,
      changes: [],
      email: {
        subject: '关于网点巡检与异常工单平台的沟通',
        body: '梁经理您好：\n\n感谢您的留言。300 多个网点的巡检和异常工单从表格迁到统一平台，这正是 NocoBase 很多客户的做法：支持在您自己的机房私有化部署，也可以通过 OIDC/SAML 对接现有的统一身份认证。\n\n为了给您的区域汇报准备得更有针对性，想约本周三或周四下午半小时线上沟通，了解一下网点规模、现有身份认证和机房环境。届时我也可以现场演示一个巡检工单的示例应用。\n\n您看哪个时间方便？\n\nNocoBase 销售',
      },
      enrich: [
        {
          field: 'industry',
          value: 'logistics',
          source: 'https://www.sf-express.com',
          current: null,
        },
        {
          field: 'employees',
          value: '5000+',
          source: 'https://www.sf-express.com',
          current: null,
        },
        {
          field: 'website',
          value: 'https://www.sf-express.com',
          source: 'https://www.sf-express.com',
          current: null,
        },
      ],
    },
    hworldLead: {
      recommendation: 'convert',
      grade: 'A',
      summary: '需求、规模、预算和决策人都已明确，建议转化并开企业版商机。',
      brief:
        '陆晨是华住集团 IT 总监，展会后的两次沟通确认了巡检、维修工单、加盟商报修三条线，一期华东 2000 家门店，要求私有化和审计日志，预算在年度规划内。他本人就是决策人，程浩负责技术评估。',
      reasons: [
        '决策人直接参与：陆晨是 IT 总监（原始留言、需求调研）',
        '一期范围明确：华东 2000 家门店、三条业务线（需求调研）',
        '私有化、审计日志、集群部署指向企业版（需求调研）',
      ],
      edition: '企业版',
      invalidReason: null,
      nextStep: null,
      prep: [],
      questions: [],
      opportunity: { name: '门店运营与工单平台（企业版）', amount: 680000 },
      reviewInDays: null,
      changes: [],
      email: null,
      enrich: [],
    },
    hworldDeal: {
      recommendation: 'advance',
      confidence: 'medium',
      stage: 'negotiation',
      summary: '报价已发、POC 通过、折扣在审批，可以推进到谈判阶段。',
      brief:
        'POC 和集群压测已由程浩确认通过，报价单（企业版 + 三年运维，合计 72 万）两天前已发给陆晨。陆晨昨晚在 WhatsApp 上确认评审会需要我们远程讲解，采购邵佳也会参加，并要求会前发一份运维服务的 SLA。15% 折扣的审批还在李明那里，三年运维能否写进主合同也还没和客户确认。会前要准备好对比材料和 SLA，会上问清邵佳的比价对象和采购节点。',
      reasons: [
        '陆晨昨晚确认评审会需要我们远程讲解，并要运维服务的 SLA（WhatsApp）',
        'POC 和集群压测通过，程浩已确认性能满足要求（POC 演示、WhatsApp）',
        '企业版加三年运维的报价单已发出，客户在内部评审（报价单发送）',
      ],
      risks: [
        '15% 折扣审批未批前，不能向客户承诺（审批）',
        '采购邵佳会比价，比价对象还不清楚（WhatsApp）',
        '三年运维写进主合同还没和客户确认',
      ],
      nextStep: {
        type: 'task',
        subject: '方案评审会后确认商务条款',
        inDays: 1,
      },
      prep: [
        '整理和其他方案的对比材料',
        '准备三年运维服务的 SLA 文档',
        '确认远程参会方式和讲解分工',
      ],
      questions: [
        '邵佳比价的是哪些平台或自建方案？',
        '三年运维服务能否写进主合同？',
        '采购和合同流程还有哪些节点？',
      ],
      email: null,
      updates: [
        {
          field: 'amount',
          value: '720000',
          reason: '报价单为企业版加三年运维服务，合计 72 万元（报价单发送）',
          current: '680000',
        },
      ],
      pauseReason: null,
      resumeInDays: null,
      lostReason: null,
      revisitInDays: null,
      changes: [
        '陆晨要求会前发 SLA、评审会需要远程讲解，准备事项随之调整（WhatsApp）',
        '阶段由提案推进到谈判：报价已发，折扣审批在走',
        '折扣审批仍待批，保持中等信心',
      ],
      approvals: [
        {
          topic: 'contractTerms',
          name: '华住集团 三年运维服务写进主合同',
          description:
            '报价单为企业版加三年运维服务，客户评审会要谈运维内容；标准是一年升级支持、服务按项目另行报价。三年运维写进主合同能锁定长期收入，也是首年 15% 折扣的理由。',
        },
      ],
      terms: [
        {
          topic: 'discount',
          term: '企业版首年 15% 折扣',
          status: 'pending',
          approval: '华住集团 企业版首年 15% 折扣',
        },
        {
          topic: 'contractTerms',
          term: '三年运维服务写进主合同',
          status: 'needed',
        },
      ],
      contacts: [
        {
          name: '邵佳',
          role: 'influencer',
          contactId: null,
          currentRole: null,
          jobTitle: '采购经理',
          phone: null,
          email: null,
          reason: '采购，会参加评审会并比价（WhatsApp）',
        },
      ],
    },
    hworldPrep: {
      summary: '在评审会上确认一期范围和上线节奏，并让采购认可报价结构。',
      brief:
        '展会后做过需求调研和 POC，程浩确认技术可行；两天前发出企业版加三年运维的报价，合计 72 万。陆晨希望首年有价格空间，15% 折扣审批还在李明那里。这是采购邵佳第一次参加。',
      people: [
        { name: '陆晨', note: 'IT 总监，决策人；关心首年预算和上线节奏' },
        { name: '程浩', note: '数据平台负责人，POC 已确认性能和集群部署' },
        { name: '邵佳', note: '采购经理，第一次参与，可能要求比价' },
      ],
      company:
        '华住集团近期公布的门店数已超过 9000 家，并在持续推进数字化运营（https://ir.hworld.com）。',
      questions: [
        '采购的比价和审批流程需要多长时间？',
        '三年运维能否写进主合同？',
        '一期 2000 家门店的上线时间是否有硬性要求？',
      ],
      bring: [
        '报价单两套方案（标准价 / 折扣 + 三年运维）',
        '集群部署架构图和审计日志说明',
        '同规模连锁客户的实施案例',
      ],
      risks: [
        '折扣审批还没结果，评审会上不承诺 15%',
        '采购可能拿其他平台的报价比价',
      ],
      agenda: [
        '回顾 POC 结论（程浩）',
        '确认一期范围：华东 2000 家门店、三条业务线',
        '上线计划与里程碑',
        '报价结构与付款方式',
        '约定合同评审时间',
      ],
    },
    gacDeal: {
      recommendation: 'continue',
      confidence: 'high',
      stage: null,
      summary:
        '客户已进入合同条款讨论，先把付款和数据安全条款对齐，再推进签署。',
      brief:
        '冯毅确认了企业版和集群部署方案，客户财务要求尾款验收后 60 天支付，法务莫琳提出要补充数据安全条款。两点都需要在签署前对齐。',
      reasons: [
        '决策人冯毅已确认方案（邮件）',
        '法务开始审合同，说明进入签约流程（邮件）',
      ],
      risks: [
        '60 天账期超出标准，需要审批',
        '数据安全条款若拖延，会影响签署时间',
      ],
      nextStep: { type: 'task', subject: '合同条款对齐会', inDays: 1 },
      prep: ['准备数据安全条款修订稿', '准备分期付款方案'],
      questions: ['验收标准由谁确认？', '法务的审核周期多长？'],
      email: null,
      updates: [],
      pauseReason: null,
      resumeInDays: null,
      lostReason: null,
      revisitInDays: null,
      changes: [],
      approvals: [
        {
          topic: 'paymentTerms',
          name: '广汽集团 尾款 60 天账期',
          description:
            '客户财务流程规定验收后 60 天付款，超出 30 天的标准账期；首付 30% 合同签订后支付，回款风险可控。',
        },
      ],
      terms: [
        {
          topic: 'paymentTerms',
          term: '尾款验收后 60 天支付',
          status: 'needed',
        },
      ],
      contacts: [],
    },
    newHopeExpansion: {
      recommendation: 'pause',
      confidence: 'low',
      stage: null,
      summary: '扩展需求还停留在意向，建议暂停到饲料厂预算确定后再推进。',
      brief:
        '养殖场巡检系统上线顺利，钟岚提到饲料厂质检也想用同一平台，但还没有明确的范围和预算。',
      reasons: ['扩展只有口头意向，没有范围和预算（上线培训）'],
      risks: ['过早报价可能影响续约谈判'],
      nextStep: null,
      prep: [],
      questions: [],
      email: null,
      updates: [],
      pauseReason: 'waitingOnCustomer',
      resumeInDays: 30,
      lostReason: null,
      revisitInDays: null,
      changes: [],
      approvals: [],
      terms: [],
      contacts: [],
    },
    reviewDiscount: {
      recommendation: 'conditional',
      summary: '案例合作有价值，但 18% 超出标准较多，建议以 15% 为上限批准。',
      asked:
        '一期 28 万，申请 18% 折扣，比 10% 的标准上限多 8 个百分点，少收 22,400 元；按 10% 为 252,000 元，按申请为 229,600 元，按 15% 为 238,000 元。',
      reasons: [
        '客户承诺上线后作为制造业案例联合发布（审批说明）',
        '三家工厂、约 200 名报工人员，后续有扩展空间（需求摸底电话）',
        '目前没有竞争对手报价的证据（商机记录）',
      ],
      together: null,
      precedents:
        '近半年同类折扣审批均以 15% 为上限，本次 18% 偏宽，按 15% 批准与先例一致。',
      risks: ['没有竞品压力的证据，18% 让利缺少依据'],
      missing: ['联合发布案例的具体形式和时间'],
      conditions: '折扣不超过 15%，并在合同中写明案例联合发布的时间和形式。',
      comment:
        '同意以 15% 为上限，请在合同中写明案例联合发布的时间和形式；如客户坚持 18%，请补充竞品报价后再提交。',
    },
    reviewContract: {
      recommendation: 'approve',
      summary: '授权范围在专业版权益之内，写进合同有利于集成商交付，可以批准。',
      asked:
        '集成商希望在合同中写明为最终客户交付应用的授权范围；专业版本身允许为客户构建应用，不涉及金额和回款变化。',
      reasons: [
        '专业版授权本就允许为客户交付应用（定价与版本说明）',
        '集成商按项目采购专业版，写明范围便于后续每个项目复用（公司简介）',
      ],
      together: null,
      precedents: '暂无同类先例。',
      risks: ['范围措辞过宽可能被理解为不限项目数，需限定按项目授权'],
      missing: [],
      conditions: null,
      comment:
        '同意。合同中请写明授权按项目计，每个最终客户项目对应一份专业版授权。',
    },
    reviewPayment: {
      recommendation: 'approve',
      summary: '金额小、老客户扩容、回款记录良好，60 天账期可以批准。',
      asked:
        '扩容 45,000 元，账期从标准 30 天延长到 60 天，多占用 30 天，涉及金额 45,000 元。',
      reasons: [
        '银泰百货是已签约客户，过往按时回款（商机记录）',
        '扩容金额小，回款风险有限（商机金额）',
      ],
      together: null,
      precedents: '同类账期审批此前均以 60 天为上限批准，与本次一致。',
      risks: [],
      missing: ['首期发票金额'],
      conditions: null,
      comment: '同意 60 天账期，请在合同中注明首期发票金额。',
    },
  },
};
