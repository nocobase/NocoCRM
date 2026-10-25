import type { DemoContent } from './types.js';
import { zhWhatsAppFiles } from './whatsapp-files-zh-CN.js';

// The demo's WhatsApp conversations in Chinese (demo-whatsapp.ts), in the
// order of its schedule.
export const zhWhatsApp: DemoContent['whatsapp'] = {
  displayNames: ['NocoBase 销售', 'NocoBase 海外'],
  files: zhWhatsAppFiles,
  conversations: [
    // Shanghai Electric's decision maker, about the deal at proposal.
    {
      messages: [
        '您好，我是上海电气信息中心的陈曼云，前两天在工业展上拿了你们的资料。',
        '陈主任您好！感谢关注 NocoBase。方便说一下这次想解决哪些问题吗？',
        '我们下面几家工厂的报工还是班组长手工填 Excel，月底对账很痛苦。',
        '设备点检也是纸质的，发现的问题没人跟到底。',
        '明白，这两块都是我们制造业客户最常做的。报工可以按班组当天汇总；点检扫设备二维码就能打开点检表，发现异常自动生成待办，一直跟到关闭。',
        '下周能约个线上演示吗？我可以用一家汽车零部件厂的案例给您看。',
        '可以，周二上午十点。我把生产部的刘经理也拉上。',
        '好的，会议链接稍后发您邮箱。',
        '演示看完了，刘经理挺感兴趣，尤其是报工看板。',
        '他问能不能按产线、按班次看停机时间？',
        '可以的，停机记录带上产线和班次，看板按这两个维度分组就行。我在演示环境里加一个给您看。',
        '已经加好了，账号和密码发到您邮箱了，可以直接试。',
        '收到，我们这几天让两个班组长试一下。',
        '班组长反馈手机上填报工比较顺，就是不良原因的选项太多了。',
        '这个可以按产线配置，每条线只显示自己常见的几种原因。',
        '那挺好。',
        '我们这边有个硬性要求：系统必须部署在自己的机房，不能上公有云。',
        '没问题，我们支持私有化部署，企业版还支持集群，三家工厂同时用也稳定。',
        '所有改动要留审计日志，集团审计每年都查。',
        '企业版带审计日志，谁在什么时间改了哪条记录、改前改后都能查。',
        '好，这两点我要写进立项材料，麻烦发一份技术说明。',
        '技术说明已经发到您邮箱，包括部署架构图和审计日志的说明。',
        '还有个问题，我们近三年的报工数据都在 Excel 里，能导进去吗？',
        '可以，按模板整理后批量导入。您发一个样例文件给我，我们先试导一下。',
        '样例发您了，是一号工厂去年的数据。',
        '试导完成了，12 万行，不到两分钟。有 300 多行班次填得不规范，清单发您了。',
        '这么快。那些不规范的我们自己改。',
        '下周集团要开信息化评审会，你们能出一版正式方案吗？',
        '可以。一期按三家工厂 12 条产线的报工和设备巡检来写，二期对接 MES 和 ERP 放在规划里，您看行吗？',
        '可以，二期先不报价，写清楚思路就行。',
        '明白。',
        '顺便问一下，你们和另外两家比，最大的区别是什么？评审会上肯定会被问。',
        '主要三点：一是数据模型和页面都能自己改，后续需求不用每次找供应商；二是私有化部署，源码可控；三是按服务器授权，不按用户数收费，三家工厂人再多也不会越用越贵。',
        '按服务器授权这点很重要，我会重点讲。',
        '方案初稿看了，整体没问题。实施周期能压到两个月吗？',
        '一期两个月可以，前提是报工表单和点检表在第一周定下来。我们可以派两位顾问驻场一周。',
        '驻场费用另算吗？',
        '一周驻场包含在实施服务里，不另收费。',
        '好。',
        '评审会过了，集团同意进入采购流程。',
        '接下来要你们出正式报价，采购会联系你们。',
        '太好了，谢谢陈主任的支持！报价这两天准备好，先发您过目再走采购。',
        '报价已经发到您邮箱：企业版三台服务器授权，加一期实施和首年运维。',
        '收到。运维从第二年开始怎么收费？',
        '第二年起每年按授权费的 18% 收取，包含版本升级和工作日远程支持。',
        '了解，我和刘经理再对一下。',
        '刘经理希望正式上线前，先在一号工厂试运行一个月。',
        '完全可以，试运行期间的问题我们都会跟进，结束后再推广到另外两家。',
        '那方案里把试运行的安排也加上吧。',
        '更新后的方案已经发您了，加了一号工厂一个月试运行和验收标准。',
        '您好，方案收到了。生产部想先确认一下私有化部署需要几台服务器，有清单吗？',
        '陈总您好，三家工厂一起上的话，按 3 台应用服务器加 1 台数据库估算，详细的配置清单我今天发到您邮箱。',
        '好的，谢谢。',
        '清单看过了。IT 那边问数据库能不能用我们现有的达梦，麻烦确认一下。',
        '另外下周三下午方便来厂里过一下方案吗？',
      ],
    },
    // United Family Healthcare's decision maker, about the contract.
    {
      messages: [
        '合同里的付款节点，我们财务希望改成 3-4-3。',
        '收到，我和公司确认后回复您。',
        '王经理，付款节点按 3-4-3 可以，修订版合同已经发到您邮箱，请查收。',
        '好的，我们法务这周内看完。',
        '好的，有问题随时找我。',
      ],
    },
    // The working lead from Tongwei.
    {
      messages: [
        '白天电话没接到，不好意思。经销商对账那块，我们有 6 个仓库，月底对账单能自动生成吗？',
        '郑总您好，可以按经销商和仓库自动汇总，月底直接导出对账单。我们有一个饲料经销商的类似案例，方便的话演示给您看。',
        '可以，周四下午两点吧。',
      ],
    },
    // H World's IT director, the importer's own deal.
    {
      messages: [
        '你好，我是华住的陆晨，展会上聊过。我们想先做个 POC。',
        '陆总您好！POC 想重点验证哪几块？',
        '三条线：门店巡检、维修工单、加盟商报修。',
        '还有性能，一期就是华东 2000 家门店。',
        '明白。我们按 2000 家门店的数据量造一套测试数据，再验证一下集群部署，您看可以吗？',
        '可以，技术评估由程浩负责，我拉他进来。',
        '陆总，POC 环境已经搭好，账号发给程浩了。',
        '好，他这周会测。',
        '程浩说巡检和工单都跑通了，报修那块想加一个加盟商自己提交的入口。',
        '可以做一个对外的报修表单，加盟商不用登录，提交后自动生成工单，派给所在片区的维修。',
        '这个好，加上吧。',
        '报修表单加好了，程浩那边可以试了。',
        '压测结果出来了，2000 家门店同时巡检，响应在一秒以内。',
        '程浩挺满意的。',
        '太好了！集群也验证了切换，挂掉一台不影响使用。',
        '审计日志是必须的，集团安全部门会查。企业版有吧？',
        '有的，所有改动都有记录，可以按人、按时间、按记录查，也能导出给安全部门。',
        '好的。',
        'POC 算是通过了，下一步要报价。',
        '范围就是华东一期，三年运维一起报。',
        '收到，我们按企业版加三年运维出报价。',
        '预算这边首年压力有点大，价格上有没有空间？',
        '理解。我先申请一下首年的折扣，有结果第一时间告诉您，在这之前没法给您承诺具体数字。',
        '理解，等你消息。',
        '折扣申请已经提交了，报价单这两天出来就发您。',
        '好的，不急，评审会前给到就行。',
        '采购邵佳会参加评审，她会比价，你们心里有个数。',
        '谢谢提醒！需要的话我们可以准备一份和其他方案的对比材料。',
        '可以，评审会前发我。',
        '报价收到了，评审会定在下周一。',
        '好的陆总，评审会上需要我们远程参加讲解吗？',
        '需要的，采购邵佳也会参加，主要会问三年运维服务的内容。',
        '麻烦提前把运维服务的 SLA 发我一份。',
      ],
    },
    // Someone nobody knows yet, by username alone.
    {
      username: 'kevin_zhou',
      messages: [
        '你好，在官网看到这个号码。想问一下社区版可以商用吗？',
        '我们是一家 20 人的设计公司，想搭一个项目管理系统。',
      ],
    },
    // A systems integrator abroad, in English.
    {
      profileName: 'Ahmed Rahman',
      messages: [
        'Hello, we are a systems integrator in Dubai. Do you have a partner program for the Middle East?',
        "Hi Ahmed, yes we do. Could you tell me which industries you serve? I'll send you the details of our partner program.",
        'Mainly hospitals and logistics companies in the UAE and Saudi Arabia. We have about 30 engineers.',
        "That's a good fit: hospitals are one of our strongest areas. I've emailed you the partner program deck and the reseller terms.",
        "Thanks, I'll go through it with my partners.",
        "We read the deck. Two questions: is Arabic supported in the interface, and can it run fully offline in a customer's data centre?",
        'Arabic is supported, right to left included. And yes, it runs entirely on-premises, with no connection to us required.',
        "Great. Saudi hospitals often require data to stay in the country, so that's essential.",
        'Do partners get a discount on licences?',
        'Yes. Registered partners get a discount on licences, and higher tiers get more. The rates are in the reseller terms I sent.',
        'We have a hospital in Riyadh looking for an asset maintenance system. Could your platform handle medical equipment maintenance?',
        'Yes. Equipment registers, preventive maintenance plans and work orders are a common build. I can share a template you could start from.',
        'Please do.',
        'Sent. It covers equipment, maintenance plans, work orders and spare parts.',
        "My engineers tried the template. They want to know how hard it is to connect to the hospital's existing ERP.",
        "There's a REST API for every table, and workflows can call external APIs. Most ERP integrations take a few days of engineering.",
        'That sounds manageable.',
        "We'd like our team trained before we pitch to the hospital. Do you offer partner training?",
        'Yes, a three-day online course for partner engineers. The next one starts on the first of next month.',
        'Can you hold three seats for us?',
        'Done, three seats are reserved for your company.',
        'The hospital wants a proposal by the end of the month. Could we do a joint call with them next week?',
        'Happy to. Would Tuesday or Wednesday afternoon, Dubai time, work for them?',
        "Wednesday at 2 pm Dubai time. I'll send the invite. Could you also send a draft of the partner agreement before the call?",
      ],
    },
    // A job seeker, set aside as not a customer.
    {
      profileName: '小刘',
      messages: [
        '您好，请问你们还招实施工程师吗？简历附上，麻烦转给负责招聘的同事。',
        '您好，招聘信息在官网的“加入我们”页面，可以直接在那里投递。这个号码只处理客户咨询，谢谢。',
      ],
    },
    // H World's evaluator, about the POC's tests.
    {
      messages: [
        '你好，我是华住数据平台的程浩，陆总让我直接找你对接 POC。',
        '程工您好！测试环境的账号已经发到您邮箱，有问题随时在这里找我。',
        '登录了。会员系统的单点登录能先接到测试环境吗？',
        '可以，支持 OIDC，您把测试环境的客户端 ID 和回调地址给我就行。',
        '参数发你邮箱了。',
        '单点登录接好了，可以用会员系统的账号登录试试。',
        '能登录了，挺顺利。',
        '压测脚本准备好了，打算模拟 2000 家门店早上同一时间提交巡检，你们那边要配合什么？',
        '我们把集群扩到三台，压测时我在线盯着日志。约后天晚上九点？',
        '可以。',
        '开始压测了。',
        '看到了，目前响应都在 600 毫秒以内。',
        '我这边也看到了，比预期好。再测一下停掉一台的情况。',
        '已经停掉一台，请求自动切到另外两台，没有报错。',
        '好，我整理一份报告给陆总。',
        '辛苦了！报告里需要我们的架构图的话随时说。',
      ],
    },
    // Intime's decision maker, the upgrade's contract being stamped.
    {
      messages: [
        '合同我们法务看完了，没有意见，这周走盖章流程。',
        '太好了，谢谢林经理！盖章后把扫描件发我，我这边安排升级。',
        '盖章还在排队，预计下周初能出来。升级要停机吗？',
        '不需要停机，升级放在晚上十点以后做，第二天门店照常使用。',
        '好的，那就定在合同回来后的第二天晚上。',
        '收到，我们的工程师会提前一天和周昊确认数据备份。',
      ],
    },
    // Digital China's technical manager, the client project's licence.
    {
      messages: [
        '你好，我们给银行客户做的网点绩效应用，验证环境装好了，想确认一下授权怎么绑定服务器。',
        '孙工您好，授权按服务器的机器码绑定。在设置的授权页面导出机器码发我，我这边生成授权文件。',
        '机器码发你邮箱了。',
        '授权文件已经发到您邮箱，导入后重启一次就生效。',
        '导入了，没问题。客户问考核指标能不能每月自动算分？',
        '可以，用工作流定时运行，每月一号按指标公式算出得分写回考核表。我整理一个示例给您。',
        '好，谢谢。',
        '示例已经发到您邮箱，里面有算分的工作流和一张月度排名表。',
      ],
    },
    // XJTLU's head of IT, after the converted lead brought her in.
    {
      messages: [
        '你好，我是西交利物浦信息化办公室的徐雅琳，高晗把你们的方案转给我了。',
        '徐老师您好！方便的话约个时间，聊聊招生看板的需求？',
        '明天下午可以。我们最关心的是各专业的报名数据能不能每天自动更新。',
        '可以的，对接招生系统的接口每天同步，看板按专业和生源地分组。明天下午三点线上见。',
        '上次说的排课，教务处也想一起看看，下周能再演示一次吗？',
        '没问题，我准备一个排课的演示，重点看教室冲突和课时上限的校验。下周找个上午可以吗？',
        '可以，下周哪天上午都行，你定好时间发我邀请。',
        '好的，时间定好就把会议邀请发您。',
      ],
    },
    // XGIMI's head of IT, after the upgrade went live.
    {
      messages: [
        '升级后交付工作台挺好用的，项目经理们说看板比以前清楚多了。',
        '太好了赵经理！有需要调整的地方随时说。',
        '想问一下，能不能给外部的安装服务商开账号，只让他们看自己负责的项目？',
        '可以，给服务商建一个角色，数据范围设成只看分配给自己的项目，字段也可以只开放几项。我写个步骤发您。',
        '好的，麻烦了。',
        '步骤已经发到您邮箱，配置大概十分钟。',
        '服务商账号开好了，用着没问题。年底我们可能还要加一个售后模块，到时候再聊。',
        '好的，年底前我们约个时间，先把售后的需求梳理一下。',
      ],
    },
    // NARI's head of IT: the platform paused, the dashboard going ahead.
    {
      messages: [
        '你好，平台项目的预算还在等集团批复，估计要到明年一季度了。',
        '理解，黄主任。平台先放一放，批复下来我们再按原方案推进。',
        '不过巡检数据看板，部门自己的预算就能做，可以先启动。',
        '好的，看板用专业版就够，我先整理一份需求清单发您确认。',
        '需求清单看过了，没问题。另外安全部想做一个培训考试系统，能一起报价吗？',
        '可以，安全培训系统我们有现成的模板，标准版加实施就能上线。两份报价这周一起发您。',
      ],
    },
    // Guangzhou Restaurant's head of IT, on the dealer portal after it went live.
    {
      messages: [
        '你好，经销商管理系统那个项目，我们最后决定先在现有的门户上扩展，暂时不单独上了。',
        '理解，邓经理。门户这边有扩展的需要，我们随时支持。',
        '门户最近经销商下单量涨了不少，月底对账有点慢，有办法优化吗？',
        '可以，把对账单改成每天晚上自动生成，经销商第二天就能确认。我让工程师和钱工对一下方案。',
        '好，技术这块钱佳明负责，你们直接找他。',
        '对账单已经改成每晚自动生成，钱工那边验收通过了。',
        '收到，谢谢。',
        '不客气，有问题随时找我们。',
      ],
    },
    // GAC's head of digital, the contract in legal review.
    {
      messages: [
        '合同修订稿收到了，数据安全条款莫琳还在看。',
        '好的冯部长，莫经理有问题可以直接找我们，我们的法务也可以一起开个会。',
        '莫琳想约你们法务当面过一遍条款。',
        '可以，我们法务这两天都有空，我和莫经理约具体时间。',
        '条款过完了，基本一致。下周我们走签批。',
        '太好了，谢谢冯部长！签批中需要补什么材料随时告诉我。',
      ],
    },
    // New Hope's project manager, before the expansion's interview.
    {
      messages: [
        '质检表昨天发你邮箱了。访谈我们这边质检部的负责人也参加。',
        '收到唐经理，欢迎。访谈大概两个小时，问题清单我们整理好先发您。',
        '访谈就按约好的那天上午十点，我们在成都总部等你们。',
        '好的，我们两个人到现场，问题清单里的几项麻烦质检部提前看一下。',
      ],
    },
    // A lead referred by United Family's head of IT.
    {
      messages: [
        '您好，我是和睦家信息科的韩宓，王思菲推荐我加您。',
        '韩老师您好！思菲提过您这边的选型，有什么需要我先准备的吗？',
        '想先确认私有化部署和单点登录，详细问题我写在邮件里了。',
        '邮件回复您了，两点都支持，附了部署说明。',
      ],
    },
    // A delivery partner's lead, asking for the partner terms.
    {
      messages: [
        '你好，我是金山办公的于杰。合作伙伴的政策方便发我一份吗？',
        '于经理您好，已经发到您邮箱了，交付伙伴可以按项目授权。',
        '看了，按项目授权挺合适。我们的技术负责人冯睿会联系你们。',
        '好的，等冯工联系。',
      ],
    },
    // A nurtured lead building a prototype on the community edition.
    {
      messages: [
        '你好，展会上加的。我在用社区版搭研发项目管理的原型，迭代看板做好了。',
        '方工您好！有卡住的地方随时问我。',
        '子任务能不能在看板上展开？',
        '可以用树形表，看板卡片上显示子任务数，点开看明细。配置说明发您邮箱了。',
        '好的，等立项了再找你们正式聊。',
        '好的，期待好消息。',
      ],
    },
    // A nurtured lead collecting industry cases.
    {
      messages: [
        '你好，物业行业的案例能发几个给我吗？',
        '彭经理您好，两份物业和工程管理的案例已经发到您邮箱。',
        '收到，明年做规划的时候会用到。',
        '好的，之后每个季度我给您发一次新的案例。',
      ],
    },
    // An invalid lead, looking for freelance work.
    {
      messages: [
        '你好，我有两年 NocoBase 插件开发经验，你们有外包或者兼职的需求吗？',
        '您好，感谢关注。我们目前没有兼职需求，可以关注官网的招聘和合作伙伴页面。',
      ],
    },
    // The delivery partner's technical lead, on plugin development.
    {
      messages: [
        '你好，我是冯睿，于杰的同事。插件开发的文档在哪里可以看？',
        '冯工您好，开发文档在官网的开发者页面，我把链接和一个插件示例仓库发您。',
        '收到，我先看看，下周再找你。',
        '好的，有问题随时问。',
      ],
    },
    // A new trial, asking about month-end reports.
    {
      messages: [
        '你好，官网上看到这个号码。我们小组想先试用一下，有试用环境吗？',
        '杜工您好，试用环境的账号已经发到您邮箱，可以先导入客户和项目的表格试试。',
        '导入了，挺方便。月底报表能自动出吗？',
        '可以，设置成每月最后一天自动生成。我明天约您二十分钟演示一下。',
      ],
    },
  ],
};
