import type { DemoContent } from './types.js';

// The demo mailboxes' conversations in Chinese (demo-mail.ts), by topic;
// their placeholders are filled with the dataset's people.
export const zhMail: DemoContent['mail'] = {
  quotation: {
    subject: '{{deal}} 报价方案',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n附上 {{deal}} 的报价方案，合计 {{amount}}，含一年的升级与技术支持。如有需要调整的地方，随时告诉我。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n方案收到了，我们内部在看。想确认一下：二期如果增加 50 个用户，单价是否还按这个标准？\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n增加的用户按同一单价计算，一年内追加还可以并入同一份合同。我整理一份二期的测算发您。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '好的，收到测算后我们周四开会定下来，届时给您答复。\n\n{{customer}}',
      },
    ],
  },
  contractClause: {
    subject: '{{deal}} 合同条款确认',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n法务看过合同，对第 7 条数据归属和第 12 条验收标准的写法有两点修改意见，修订版已放在附件说明里，请您确认。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n两处修改都没问题，只是措辞上的调整，不涉及价格和付款，我们这边不需要另行审批。更新后的合同我明天发您。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '好的，等您消息。如果能在月底前签，我们这边的预算也能赶上。\n\n{{customer}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n更新后的合同已经发到您邮箱，两处修改都按法务的意见改好了，确认无误就可以安排盖章。\n\n{{owner}}',
      },
    ],
  },
  discount: {
    subject: '关于 {{deal}} 的价格',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n我们比较了几家方案，贵司的功能最贴合，但价格比预算高了一截。{{amount}} 能否再给一些空间？\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n理解。如果签三年，我们可以在年费上给到 9 折，并把实施培训从两天加到四天。您看这个方向是否可行？\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '三年的方案我们可以考虑，我先和财务确认付款方式，这周内回复您。\n\n{{customer}}',
      },
    ],
  },
  trialFeedback: {
    subject: '{{deal}} 试用反馈',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n试用环境已经开好两周了，想了解一下目前的使用情况，有没有遇到卡住的地方？\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n整体顺利，审批流和数据表我们已经搭起来了。两个问题：能否对接我们的企业微信登录？大批量导入时偶尔超时。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n企业微信登录有现成的插件，我让技术同事明天和您约个时间配置；导入超时一般是单批太大，我们把批量调小再试一次。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '好的，明天下午三点后都可以。\n\n{{customer}}',
      },
    ],
  },
  onboarding: {
    subject: '{{deal}} 上线安排',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n感谢选择我们！实施顾问会在下周一和您对接上线计划，这是项目群的邀请，方便随时沟通。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n收到，谢谢。我们这边由 IT 和业务各出一个人对接，下周一见。\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  budgetPaused: {
    subject: '{{deal}} 项目进度',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n上次评审后想跟进一下项目的安排，需要我们补充哪些材料吗？\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n这类采购统一调整到下一个预算周期安排了，项目暂时搁置。新的周期启动后我第一时间联系您，方案我们还是倾向贵司的。\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  firstReply: {
    subject: '关于贵司的咨询',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n我是负责华东区的 {{owner}}，看到您在官网留下的需求。方便的话，想约 30 分钟电话，了解一下{{company}}目前的流程和痛点。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n可以，这周四或周五上午都行。我们主要想把纸质审批和几个 Excel 台账搬到线上。\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  meeting: {
    subject: '演示会议时间确认',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n上次电话聊得不错，我们团队想看一下产品演示，下周二下午方便吗？\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n下周二下午两点可以，线上会议，我会准备贵司场景的演示。请问参会的有哪几位？\n\n{{owner}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n会议邀请已经发出，到时见。\n\n{{owner}}',
      },
    ],
  },
  pricing: {
    subject: '产品价格咨询',
    messages: [
      {
        from: 'other',
        body: '您好，\n\n我们在评估明年的系统选型，想了解专业版和企业版的价格区别，以及是否支持私有化部署。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n价格表和两个版本的功能对比已附上，两个版本都支持私有化部署。等贵司明年立项时，我再和您详细沟通。\n\n{{owner}}',
      },
    ],
  },
  internal: {
    subject: '{{deal}} 折扣审批',
    messages: [
      {
        from: 'other',
        body: '{{owner}}，\n\n{{deal}} 的客户希望三年 9 折，我已经提交了折扣审批，麻烦今天帮忙看一下，客户这周要定。\n\n{{colleague}}',
      },
      {
        from: 'owner',
        body: '收到，下午看完给你答复。\n\n{{owner}}',
      },
    ],
  },
  needsRecap: {
    subject: '{{deal}} 需求沟通纪要',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n感谢今天抽时间沟通，我整理了一下要点：\n1. 招生咨询、报名和录取进度在一个系统里跑通；\n2. 排课按校区、教室和教师三个维度检查冲突；\n3. 面向师生的通知先沿用现有渠道。\n\n如有遗漏请补充，我据此准备演示环境。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n纪要没问题。再补充一点：系统最好能按学院分权限，各学院只看自己的数据。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n按学院分权限可以直接用角色和数据范围配置，演示时一并展示。下周二或周三下午，您哪天方便？\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '周三下午两点可以，我叫上教务部门的同事一起。\n\n{{customer}}',
      },
    ],
  },
  kickoff: {
    subject: '{{deal}} 项目启动安排',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n盖章版合同已经收到，感谢信任！开发团队下周一进场，第一周做需求确认和原型。项目计划附上，请帮忙确认双方的对接人。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n计划收到。日常对接由信息部的同事负责，业务需求由门店运营部确认。周一上午十点开启动会可以吗？\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '可以，会议邀请稍后发出。启动会上我们一起过一遍里程碑和验收标准。\n\n{{owner}}',
      },
    ],
  },
  declined: {
    subject: '关于 {{deal}} 的选型结果',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n感谢这段时间的支持。集团最终决定由自己的 IT 团队自建经销商管理系统，很遗憾这次没能合作。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n理解，也谢谢您坦诚告知。方便的话想请教一下，这次决策最看重的是哪几点？对我们改进很有帮助。以后有需要随时联系我。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '主要是集团希望核心的渠道系统由内部团队自己掌握，方便长期迭代。功能上贵司很灵活，以后有独立的项目再找您。保持联系。\n\n{{customer}}',
      },
    ],
  },
  renewalDeclined: {
    subject: '{{deal}} 续约事宜',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n实施服务合同下月到期，附上续约方案供参考：延续现有的驻场支持和季度巡检，合计 {{amount}}。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n谢谢。今年我们自己的 IT 团队已经能独立维护系统，部门决定实施服务暂不续约，软件的升级与技术支持照常保留。以后有新项目再找您。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '明白，感谢这一年的配合。升级与技术支持不受影响，生产管理平台的二期我们继续推进。\n\n{{owner}}',
      },
    ],
  },
  acceptance: {
    subject: '{{deal}} 验收确认',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n系统已经稳定运行两周，验收报告和测试记录见附件，请您安排签字确认。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n验收报告已签字，扫描件回传给您。巡检员反馈移动端很好用，下一步我们想把设备台账也搬进来。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '谢谢！设备台账可以在现有应用上扩展，我下周整理一份方案给您。\n\n{{owner}}',
      },
    ],
  },
  tenderWon: {
    subject: '{{deal}} 中标通知',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n评标结果已经公示，贵司中标本项目，正式的中标通知书已寄出。请准备合同文本，我们下周走签约流程。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n非常感谢！合同文本按招标文件的格式准备，周三前发您审阅，实施团队也已经就位。\n\n{{owner}}',
      },
    ],
  },
  requirementGap: {
    subject: '{{deal}} 方案评估结果',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n门店试用后反馈，排班主要在手机上做，还需要离线打卡和工时自动核算，这部分和贵司方案差距比较大，这次我们先不推进了。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n理解，离线打卡确实不是我们的强项。会员与供应商协同那边我们继续服务好，排班的需求以后有变化，欢迎再聊。\n\n{{owner}}',
      },
    ],
  },
  goLiveCheck: {
    subject: '{{deal}} 上线一个月回访',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n经销商门户上线一个月了，想了解一下使用情况：经销商下单和对账是否顺畅？有没有需要优化的地方？\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n整体不错，已经有 120 多家经销商在用。两个小需求：对账单希望能导出 PDF，首页想加一个本月返利的看板。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '收到，这两项都能通过配置实现，我安排实施同事下周和您确认细节。\n\n{{owner}}',
      },
    ],
  },
  competitorChosen: {
    subject: '{{deal}} 试点结果',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n供应链试点这次我们决定先在现有系统上扩展，暂时不引入新的平台。感谢贵司前期的投入。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n谢谢告知，祝试点顺利，以后有需要随时联系。生产管理平台这边我们会继续全力配合。\n\n{{owner}}',
      },
    ],
  },
  discovery: {
    subject: '{{deal}} 需求确认',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n关于巡检数据看板，想先确认几个问题：数据来自现有的巡检系统还是重新录入？需要看哪些指标？大约多少人使用？\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n数据从现有巡检系统同步，主要看设备缺陷率、巡检完成率和整改闭环时长，管理层和各站点负责人约 40 人使用。预算在单独申请，应该能批下来。\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  introduction: {
    subject: '想了解安全培训系统',
    messages: [
      {
        from: 'other',
        body: '您好，\n\n我是{{company}}安全部的{{customer}}，同事推荐了贵司。我们想做一套安全培训和考试系统，覆盖 2000 名一线员工，想先了解可行性和大致费用。\n\n{{customer}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n感谢联系！培训、考试和证书管理都可以在平台上快速搭建。我先发您一份同类客户的案例，明天下午电话细聊可以吗？\n\n{{owner}}',
      },
    ],
  },
  requirementCall: {
    subject: '患者随访应用需求沟通',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n上次提到的患者随访应用，想约您做一次需求沟通，大约一小时。本周四上午或周五下午，您看哪个时间方便？\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n周五下午三点可以，我会请随访中心的护士长一起参加，她最清楚现在的流程。\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  questionnaire: {
    subject: '{{deal}} 需求问卷',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n为了准确评估看板插件的工作量，附上一份需求问卷，主要是数据来源、指标口径和刷新频率，麻烦您有空时填一下。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n问卷已填好回传。补充一点：招生数据每晚同步一次就够，但招生办的负责人希望在手机上也能看。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '收到，手机上查看没问题。我们评估后周一给您报价。\n\n{{owner}}',
      },
    ],
  },
  pocSetup: {
    subject: '{{deal}} POC 环境',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\nPOC 环境已经部署好，访问地址和账号单独发您。建议先导入一个网点的样例数据，验证绩效计算规则。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n环境可以访问了。我们导入了华东区三个网点的数据，计算结果和手工核对一致。下一步想测一下 5 万条数据下的报表性能。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '好的，我请技术同事准备压测脚本，周四前把结果发您。\n\n{{owner}}',
      },
    ],
  },
  proposalFollowUp: {
    subject: '{{deal}} 方案书',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n感谢上周参加演示。附上供应商协同门户的方案书，包括功能清单、实施计划和报价 {{amount}}。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n方案看过了，整体符合预期。实施周期写的是十周，能否压缩到八周？我们希望在年底前上线。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n供应商入驻和对账两个模块可以并行实施，八周可行，但需要贵司每周安排半天做验收。调整后的计划稍后发您。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '可以，每周三下午我们安排人。等您的新计划。\n\n{{customer}}',
      },
    ],
  },
  deploymentRequirements: {
    subject: '{{deal}} 私有化部署环境',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n我是{{company}}信息部的{{customer}}。私有化部署想提前准备服务器，推荐的配置是怎样的？我们现有 PostgreSQL 14 和一套 K8s 集群。\n\n{{customer}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n现有环境可以直接用：应用建议两个副本，每个 4 核 8G，PostgreSQL 14 完全兼容。详细的部署说明我请技术同事发您。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '收到，谢谢。我们按这个配置先申请资源。\n\n{{customer}}',
      },
    ],
  },
  securityReview: {
    subject: '{{deal}} 信息安全评估',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n采购前需要通过信息安全评估，附件是评估问卷，主要涉及数据加密、审计日志和国产数据库支持，麻烦一周内反馈。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n问卷已填好附上。补充说明：审计日志覆盖登录、数据变更和权限调整，支持人大金仓数据库，也可以提供等保测评的相关材料。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '材料收到了，安全组在审，有问题再找您。\n\n{{customer}}',
      },
    ],
  },
  vendorOnboarding: {
    subject: '供应商入库资料',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n签约前需要先完成供应商入库，请提供营业执照、开户行信息和近一年的纳税证明，上传到我们的采购平台即可。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n资料已经上传到采购平台，麻烦帮忙看下是否齐全。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '审核通过了，入库编号稍后由系统通知您。\n\n{{customer}}',
      },
    ],
  },
  supportQuestion: {
    subject: '权限配置的问题',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n交付工作台用得挺好。有个问题：我们想让项目经理只看到自己负责的项目，但给角色配了数据范围后，他们连项目列表都打不开了。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n应该是列表还需要“查看”权限，数据范围选“我负责的记录”即可。配置步骤我截图发您，有问题我们远程看一下。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '按步骤改完已经好了，谢谢！\n\n{{customer}}',
      },
    ],
  },
  invoice: {
    subject: '{{deal}} 开票信息',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n首付款已经走流程了，请按附件的开票信息开具增值税专用发票，备注合同编号。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n收到，发票本周内开出，电子版先发到您的邮箱。\n\n{{owner}}',
      },
    ],
  },
  clientProject: {
    subject: '{{deal}}：授权与上线时间',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n我们给银行客户做的网点绩效项目已经在验证环境跑通，客户计划下月初上线。想确认两件事：一是这个项目的授权能否在年底前开票；二是上线后的一年里，客户如果再增加两个分行，是否需要另购授权。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n授权可以本月签约、年底前开票。授权按服务器计算，增加分行只要还在同一套服务器上，就不需要另购，{{amount}} 的报价不变。正式报价单我明天发您。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '好的，报价单收到后我们走内部审批，大概需要一周。\n\n{{customer}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n报价单已经发您，审批中需要我们补充材料随时告诉我。\n\n{{owner}}',
      },
    ],
  },
  reconciliation: {
    subject: '{{deal}}：对账单改为每日生成',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n按邓经理的要求，我们准备把经销商对账单改为每晚自动生成，经销商第二天在门户里确认。改动只涉及对账单的生成方式，不影响现有的订单和价格。测试环境已经改好，请您安排验收。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n测试环境看过了，生成的数据和手工对账一致。有一点：退货要按退货当天计入对账单，而不是按原订单的日期，麻烦再调整一下。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n退货已经改为按退货日期计入，测试环境已更新。您确认后我们安排周末上线。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '验收通过，可以上线。\n\n{{customer}}',
      },
    ],
  },
  dataSecurity: {
    subject: '{{deal}}：数据安全条款',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n按上次沟通，合同修订稿新增了第 9 条数据安全条款：数据存放在贵司自有机房，我方工程师只在贵司授权和陪同下远程访问，所有操作留审计日志。请您审阅。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n条款的方向没问题，还有两点需要补充：一是服务结束后数据的交还和销毁方式；二是贵司人员变动时的保密义务。我们想和贵司法务当面过一遍。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n两点我们都同意补充。我方法务这两天都有空，会议时间您来定。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '那就定在后天下午。补充的条款麻烦会前发一版。\n\n{{customer}}',
      },
    ],
  },
  interviewPrep: {
    subject: '{{deal}}：需求访谈准备',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n附上饲料厂现在用的三张质检表：原料入厂检验、生产过程抽检和成品出厂检验。质检部希望检验结果能和养殖场的数据关联起来，出现批次问题时能追到用料的养殖场。\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n表格收到了。我们按三张表整理了一版问题清单：检验项目怎么配置、不合格品怎么处理，以及批次和养殖场怎么对应，附在后面，访谈时逐项确认。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '清单看过了，我们会请质检部和两个饲料厂的厂长一起参加。\n\n{{customer}}',
      },
    ],
  },
  leadMigration: {
    subject: '订单和库存数据迁移',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n附上数据导入模板，订单和库存各一张表。您可以先挑一个月的数据按模板整理，导入后我们一起看效果。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n九月份的订单和库存已经按模板整理好了，大约 3000 行。有些经销商的名称写法不统一，导入时能自动合并吗？\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  leadTechnical: {
    subject: '插件开发与源码交付',
    messages: [
      {
        from: 'other',
        body: '您好，\n\n我是{{company}}的技术负责人{{customer}}，想确认两点：自研插件能否打包后交付给我们的客户单独部署？客户项目授权是否包含源码？\n\n{{customer}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n自研插件可以打包后随应用一起交付；客户项目授权包含交付所需的源码权限，具体范围见授权协议，协议样本我发您。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '协议收到，我们研究一下，有问题再请教。\n\n{{customer}}',
      },
    ],
  },
  leadBudget: {
    subject: '小团队的版本选择',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n按您说的 20 人规模，客户、项目和报表三块需求，用标准版加我们的模板就能起步，以后再按需升级。报价单附上。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n价格比预想的高一些。我们是小团队，能否分期付款，或者先买一年看看效果？\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  nurtureCheckIn: {
    subject: '社区版试用近况',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n好久没联系，社区版用得怎么样？新版本上线了工作流的审批中心，可能对您的场景有帮助。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}您好，\n\n还在用，测了几个流程都没问题。内部项目预计下个月立项，立项后我第一时间找您谈正式版本。\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  nurtureCase: {
    subject: '地产行业客户案例',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n季度问候。附上一份地产行业客户的案例：他们用 NocoBase 做了工程进度和供应商管理，上线三个月，供您调研参考。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '谢谢，案例很有参考价值，我转给工程部的同事看看。下季度再聊。\n\n{{customer}}',
      },
    ],
  },
  jobSeeker: {
    subject: '兼职开发合作',
    messages: [
      {
        from: 'other',
        body: '您好，\n\n我有三年的 NocoBase 插件开发经验，附上简历，想了解贵司是否有兼职或外包开发的机会。\n\n{{customer}}',
      },
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n感谢关注！我负责销售，开发合作的事已经转给招聘的同事，他们会直接联系您。\n\n{{owner}}',
      },
    ],
  },
  bounce: {
    subject: '{{company}}的系统需求',
    messages: [
      {
        from: 'owner',
        body: '{{customer}}您好，\n\n我是 NocoBase 的{{owner}}，看到您在官网留下的联系方式，想了解一下贵司的系统需求。\n\n{{owner}}',
      },
      {
        from: 'postmaster',
        subject: '退信：{{subject}}',
        body: '您发送的邮件无法投递到以下收件人：\n\n{{address}}\n\n原因：收件人地址不存在（550 5.1.1）。\n\n邮件系统',
      },
    ],
  },
  discountPrep: {
    subject: '{{company}} 折扣申请',
    messages: [
      {
        from: 'owner',
        body: '{{colleague}}，\n\n{{company}}的{{deal}}，客户希望在 {{amount}} 的基础上再降一些。我准备申请三年期 9 折、实施培训加两天，你看合适吗？审批今天提交。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '可以，三年期的折扣在标准内。培训加两天要写清楚交付成本，审批里附上客户的预算说明。\n\n{{colleague}}',
      },
    ],
  },
  forecast: {
    subject: '本周商机预测',
    messages: [
      {
        from: 'owner',
        body: '{{colleague}}，\n\n周五前把本月可能签约的商机更新一下：阶段、预计成交日期和风险，特别是{{company}}那一单。\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}}，\n\n已更新。{{company}}的合同条款基本谈妥，客户法务的修改意见也处理完了，预计月底能签。\n\n{{colleague}}',
      },
    ],
  },
  handover: {
    subject: '{{company}} 的两条线索',
    messages: [
      {
        from: 'other',
        body: '{{owner}}，\n\n{{company}}来了两条线索，一位是业务负责人，一位是技术负责人，问的是同一个客户项目。建议合并起来由你统一跟进，可以吗？\n\n{{colleague}}',
      },
      {
        from: 'owner',
        body: '{{colleague}}，\n\n可以，我来合并，技术问题我拉上售前一起。\n\n{{owner}}',
      },
    ],
  },
  newsletter: {
    subject: '低代码周刊 · 第 86 期',
    messages: [
      {
        from: 'other',
        body: '本期要点：\n\n· 企业如何评估低代码平台的总拥有成本\n· AI 员工在销售流程中的三个落地场景\n· 案例：一家制造企业用三个月替换了十套 Excel\n\n阅读全文请访问周刊网站。如不想再收到本周刊，可随时退订。\n\n低代码周刊编辑部',
      },
    ],
  },
  eventInvite: {
    subject: '邀请函：2026 企业数字化峰会（上海）',
    messages: [
      {
        from: 'other',
        body: '{{owner}}您好，\n\n诚邀您参加 11 月 20 日在上海举办的 2026 企业数字化峰会，主题为“AI 与业务系统”。名额有限，请于本月底前报名。\n\n峰会组委会',
      },
    ],
  },
  release: {
    subject: '产品更新：新版本发布说明',
    messages: [
      {
        from: 'other',
        body: '各位同事好，\n\n新版本今天发布，销售需要了解的变化：\n1. 工作流新增审批中心；\n2. AI 员工支持上传文件；\n3. 企业版的集群部署更简单了。\n\n详细说明见内部知识库，客户问到时可以直接引用。\n\n产品团队',
      },
    ],
  },
  officeNotice: {
    subject: '办公网络维护通知',
    messages: [
      {
        from: 'other',
        body: '各位同事：\n\n本周六 22:00 至周日 6:00 进行办公网络维护，期间 VPN 和内部系统暂停访问，请提前安排好工作。\n\n行政部',
      },
    ],
  },
};

// Who sends the mail that concerns no record, and the bounces.
export const zhMailSenders: DemoContent['mailSenders'] = {
  newsletter: {
    name: '低代码周刊',
    address: 'newsletter@lowcode-weekly.example',
  },
  events: {
    name: '企业数字化峰会组委会',
    address: 'invite@digital-summit.example',
  },
  product: { name: '产品团队', address: 'product@demo.example' },
  office: { name: '行政部', address: 'office@demo.example' },
  postmaster: { name: '邮件系统', address: 'postmaster@demo.example' },
};
