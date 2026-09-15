// Seeds a Chinese demo dataset for 云策数字咨询 (a fictional digital consulting
// firm). Records carry no "demo" marker in their names or text; the manifest
// in crm_settings (demo-dataset-v1) and storage/demo-crm-manifest.json is
// what reset-demo-crm.mjs uses to find them again.
//
// Records belong to the sales team — manager 李明 and salespeople 王小芳, 陈小浩 —
// and the administrator (nocobase) owns nothing, so every role's view has the
// right shape: sellers see their own book, the manager the team, the admin
// everything. Approvals are raised by the applicant's own account.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
const root = process.cwd();
const require = createRequire(`${root}/package.json`);
const { createDatabaseManager, defineDatabase } = await import('@nocobase/db');
const { createAppAuthorization } = await import('@nocobase/app-plugin-authorization');
const { CrmService } = await import(pathToFileURL(`${root}/server/providers/crm/service.ts`));
const { registerCrmResources } = await import(pathToFileURL(`${root}/server/providers/crm/authorization.ts`));
const { convertLead } = await import(pathToFileURL(`${root}/server/providers/crm/conversion.ts`));
const { definitions, stages } = await import(pathToFileURL(`${root}/server/providers/crm/schema.ts`));
const { dashboard } = await import(pathToFileURL(`${root}/server/providers/crm/dashboard.ts`));
const Database = require('better-sqlite3');
const filename = `${root}/storage/crm.sqlite`;
const sqlite = new Database(filename, { fileMustExist: true });
const marker = 'demo-dataset-v1';
const existing = sqlite.prepare('SELECT value FROM crm_settings WHERE id = ?').get(marker);
if (existing) { console.log('Demo dataset already exists:', existing.value); sqlite.close(); process.exit(0); }
const users = sqlite.prepare('SELECT id, name, username FROM user').all();
const byUsername = (username) => {
  const user = users.find((u) => u.username === username);
  if (!user) throw new Error(`User "${username}" is missing; create the demo accounts first (nocobase, liming, zhaomin, wangxiaofang, chenxiaohao).`);
  return user;
};
const owner = byUsername('nocobase');
const manager = byUsername('liming');
const manager2 = byUsername('zhaomin');
const sellers = [byUsername('wangxiaofang'), byUsername('chenxiaohao')];
await mkdir(`${root}/storage/backups`, { recursive: true });
const backup = `${root}/storage/backups/pre-demo-${new Date().toISOString().replaceAll(':','-')}.sqlite`;
await sqlite.backup(backup); await chmod(backup, 0o600); sqlite.close();
const db = createDatabaseManager(defineDatabase({default:'main',connections:{main:{dialect:'sqlite',filename,schemaManagement:'managed'}}}));
await db.connect();
try {
 const authz = createAppAuthorization({connection:db.connection()}); registerCrmResources(authz);
 const service = new CrmService(db, authz);
 const actorFor = (user) => ({id:user.id,locale:'zh-CN',scope:authz.for({principal:{type:'user',id:user.id},subjects:[{type:'authenticated',id:'*'}]})});
 const actor = actorFor(owner);
 const managerActor = actorFor(manager);
 const sellerActors = sellers.map(actorFor);
 for (const a of [actor, managerActor, ...sellerActors]) await service.ensureActive(a.id);
 const settings = await service.settings();
 const calendarDay = new Intl.DateTimeFormat('en-CA',{timeZone:settings.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 // Scenarios are built in the installation's business timezone.
 if (settings.timeZone !== 'Asia/Shanghai') throw new Error('Update demo date construction for this business timezone.');
 const base = new Date(`${calendarDay}T00:00:00+08:00`).getTime();
 const at = (day, hour=10, minute=0) => new Date(base + day*86400000 + hour*3600000 + minute*60000).toISOString();
 const started = new Date().toISOString();
 const manifest = {version:4,label:'云策数字咨询 CRM 演示数据',businessProfile:'云策数字咨询',createdAt:started,businessDate:calendarDay,ownerId:actor.id,managerId:managerActor.id,sellerIds:sellers.map((u)=>u.id),backup,records:[]};
 const track = (entity,record) => {if (!manifest.records.some((r)=>r.id===record.id)) manifest.records.push({entity,id:record.id,name:record.name}); return record;};
 const ids = () => manifest.records.map((r)=>r.id);
 const historyAt = async (q, date) => {if(manifest.records.length) await q.updateTable('crmHistory').set({createdAt:date}).where('recordId','in',ids()).where('createdAt','>=',started).execute();};
 const saver = (prepared, q) => async (entity, input, day=-1, id) => {
  const record = track(entity, await service.save(prepared,entity,input,id,q));
  const date=at(day);const patch={updatedAt:date};
  if(!id) patch.createdAt=date;
  if(entity==='opportunities' && ['won','lost'].includes(record.stage)) patch.closedAt=date;
  if(entity==='activities' && record.status==='completed') patch.completedAt=input.endAt || record.endAt;
  await q.updateTable(definitions[entity].table).set(patch).where('id','=',record.id).execute();
  await historyAt(q, date);return service.get(prepared,entity,record.id,q);
 };
 const consultingInstructions = `# 公司定位
- 公司名称：云策数字咨询（企业数字化咨询公司）。
- 主要服务：CRM、ERP 和数据平台实施，业务流程自动化，数据治理与管理报表，AI 应用落地，系统集成以及上线后的持续服务。
- 目标客户：制造、零售、物流、医疗、教育、食品和能源等行业的中大型企业。
- 典型项目金额：8 万至 50 万元人民币；超过 50 万元视为大单，建议确认预算来源、决策链和交付范围。
- 典型决策角色：业务负责人、IT 或数据负责人、采购/法务、预算决策人和最终使用者。

# 商机推进标准
- 需求确认必须有客户明确的问题、目标、上线时间或预算范围。
- 方案验证必须有需求梳理、方案讲解或试点演示及客户反馈。
- 方案报价必须有正式方案或报价记录；商务谈判要记录价格、付款、交付范围或合同条款讨论。
- 不要仅凭一次沟通推进阶段，证据不足时先创建获取证据的活动。

# 跟进和审批
- 新线索超过 2 天未首次联系，建议创建首次联系活动。
- 线索或商机超过 14 天没有活动，建议安排下一步沟通。
- 预计成交日期 7 天内到达但仍未关闭，建议确认进展或调整日期。
- 折扣超过 10%、账期超过 30 天、修改标准合同或承诺特殊交付指标时，建议发起审批。
- 活动反馈要记录客户需求、已确认事实、下一步行动和负责人。

# 记录边界
- 不要虚构客户背景、预算、联系人身份、竞争对手或项目进度。
- 项目名称使用“客户名称 + 业务内容”。
- 所有新增、修改、删除、线索转化和审批操作都必须等待用户确认。`;
 // Who owns which account (by index): 王小芳 0,1,4 · 陈小浩 2,5,7 · 李明 3,6.
 // Leads rotate the same way by position; activities follow their record.
 const accountOwner = (i) => ([0,1,4].includes(i) ? sellerActors[0] : [2,5,7].includes(i) ? sellerActors[1] : managerActor);
 const leadOwner = (i) => [sellerActors[0], sellerActors[1], managerActor][i % 3];
 const ownerOf = (who) => who.id;
 const accounts=[]; const contacts=[]; const opportunities=[]; const leads=[];
 const companies=[
  ['华东智造集团','manufacturing','上海','qualified','exhibition','201-500','huadong-zhizao','旗下三家工厂希望统一生产数据、报表和销售流程。'],
  ['星桥零售集团','retail','杭州','qualified','customerReferral','501-1000','xingqiao-retail','多门店零售集团正在规划统一的客户数据平台和经营报表。'],
  ['安康医疗集团','healthcare','北京','qualified','website','201-500','ankang-health','医疗服务集团正在评估患者服务流程、权限管理和数据安全。'],
  ['远航物流','logistics','深圳','qualified','partner','51-200','yuanhang-logistics','区域物流企业正在评估调度、客户协同和管理报表。'],
  ['知行教育集团','education','苏州','prospect','marketing','51-200','zhixing-edu','教育集团希望统一招生、排课和客户跟进。'],
  ['视界数据服务','professionalServices','成都','qualified','outbound','11-50','shijie-data','数据服务团队需要统一的交付工作台、数据治理和管理报表。'],
  ['昊阳能源','energy','南京','inactive','search','201-500','haoyang-energy','能源企业的项目协同和巡检流程正在等待预算审批。'],
  ['丰味食品集团','foodAndBeverage','广州','qualified','partner','501-1000','fengwei-foods','食品经销商希望改善区域销售计划、客户数据和渠道协同。'],
 ];
 const people=[
  [['陈曼云','chen.manyun'],['吴逸辰','wu.yichen']],[['林欣怡','lin.xinyi'],['周昊','zhou.hao']],
  [['王思菲','wang.sifei'],['刘骁','liu.xiao']],[['张立昂','zhang.liang'],['孙怡宁','sun.yining']],
  [['徐雅琳','xu.yalin'],['唐睿','tang.rui']],[['赵陆','zhao.lu'],['郭萌','guo.meng']],
  [['黄雅雯','huang.yawen'],['何威','he.wei']],[['邓晓萱','deng.xiaoxuan'],['钱佳明','qian.jiaming']],
 ];
 const deals=[
  [0,'华东智造 生产数据与报表整合项目',320000,'proposal',28,'newBusiness',-28,-4],
  [1,'星桥零售 多门店客户数据平台',480000,'contract',5,'expansion',-25,-2],
  [2,'安康医疗 服务流程数字化项目',240000,'negotiation',-3,'newBusiness',-22,-3],
  [3,'远航物流 调度流程优化试点',125000,'validation',20,'newBusiness',-18,-5],
  [4,'知行教育 业务流程数字化项目',78000,'contact',45,'newBusiness',-5,-5],
  [5,'视界数据 数据治理与管理报表项目',145000,'won',-18,'newBusiness',-42,-18],
  [1,'星桥零售 经营分析项目',88000,'won',-3,'crossSell',-30,-3],
  [6,'昊阳能源 现场服务与巡检数字化项目',260000,'paused',60,'tender',-26,-8],
  [7,'丰味食品 区域销售流程优化项目',65000,'lost',-22,'newBusiness',-48,-22],
  [0,'华东智造 数字化平台持续服务续约',42000,'lost',-4,'renewal',-20,-4],
  // Closed in the five months before: enough won and lost each month for the
  // workspace's trend to have a shape. Appended so the indexes above hold.
  [5,'视界数据 客户数据平台咨询',96000,'won',-152,'newBusiness',-185,-152],
  [3,'远航物流 车队管理报表试点',58000,'lost',-148,'newBusiness',-178,-148,'price'],
  [1,'星桥零售 会员系统集成',210000,'won',-140,'expansion',-172,-140],
  [2,'安康医疗 门诊预约流程优化',132000,'won',-122,'newBusiness',-160,-122],
  [7,'丰味食品 渠道数据看板',47000,'lost',-118,'newBusiness',-150,-118,'noBudget'],
  [4,'知行教育 校区管理系统',86000,'lost',-112,'newBusiness',-145,-112,'timing'],
  [0,'华东智造 设备巡检 App',175000,'won',-95,'newBusiness',-130,-95],
  [6,'昊阳能源 项目协同平台一期',230000,'won',-88,'tender',-125,-88],
  [3,'远航物流 客户协同门户',72000,'won',-84,'crossSell',-115,-84],
  [5,'视界数据 报表自动化',39000,'lost',-80,'expansion',-110,-80,'noDecision'],
  [1,'星桥零售 门店排班系统',118000,'lost',-62,'newBusiness',-95,-62,'requirementMismatch'],
  [2,'安康医疗 数据安全加固',64000,'won',-55,'expansion',-90,-55],
  [7,'丰味食品 经销商门户',150000,'won',-40,'newBusiness',-75,-40],
  [0,'华东智造 供应链协同试点',98000,'lost',-36,'newBusiness',-70,-36,'toCompetitor'],
 ];
 const leadSpecs=[
  ['李佳恩','华东智造集团','new','exhibition',-16,'希望打通三家工厂的生产报表。','li.jiaen'],
  ['高晗','知行教育集团','working','website',-7,'教育团队希望拿到一份业务流程数字化方案。','gao.han'],
  ['沈可心','星桥零售集团','new','website',-1,'咨询客户数据平台项目的报价。','shen.kexin'],
  ['蒋煜','远航物流','new','exhibition',-6,'展会到访客户，首次数字化需求确认电话待安排。','jiang.yu'],
  ['罗雨萱','新域零售','new','marketing',-2,'下载了《数字化客户运营指南》。','luo.yuxuan'],
  ['郑亮','丰味食品集团','working','outbound',-9,'已完成需求摸底电话，需要梳理区域销售流程。','zheng.liang'],
  ['韩宓','安康医疗集团','working','customerReferral',-12,'关注审批、权限和数据安全流程。','han.mi'],
  ['于杰','佳拓设备','working','partner',-8,'计划安排系统集成与交付的技术介绍。','yu.jie'],
  ['秦思菲','星桥教育','nurturing','search',-17,'有意向，但预算下月才决策。','qin.sifei'],
  ['方博','汇川电子','nurturing','exhibition',-19,'希望在其产品发布之后再联系。','fang.bo'],
  ['彭雅然','北辰地产','nurturing','marketing',-8,'处于早期调研阶段，希望按季度跟进。','peng.yaran'],
  ['魏飞','江湾咨询','invalid','website',-10,'咨询内容不在公司数字化咨询服务范围内。','wei.fei'],
  ['谢卓','华岭纺织','invalid','outbound',-13,'联系方式无效。','xie.zhuo'],
  ['冯睿','佳拓设备','working','employeeReferral',-4,'销售经理正在评估客户交接和售前交付流程。','feng.rui'],
  ['曹薇','丰年农业','new','partner',-5,'合作伙伴推荐，待首次数字化需求确认电话。','cao.wei'],
  ['杜楠','森岳制造','working','search',-3,'小团队需要 CRM、项目交付和管理报表。','du.nan'],
 ];
 const phone = (n) => `138 0${String(100 + n).slice(-3)} ${String(2000 + n * 37).slice(-4)}`;
 const dealsWithActivities = [];
 await service.mutate(actor, async (prepared, q) => {
  if (await q.selectFrom('crmSettings').select('id').where('id','=',marker).executeTakeFirst()) throw new Error('Dataset has already been added.');
  await q.updateTable('crmSettings').set({value: JSON.stringify({...settings, aiInstructions: consultingInstructions})}).where('id','=','business').execute();
  const save = saver(prepared, q);
  for(let i=0;i<companies.length;i++) {
   const [name,industry,city,status,source,employees,slug,description]=companies[i];
   const ownerId = ownerOf(accountOwner(i));
   const account=await save('accounts',{name,ownerId,industry,city,country:'CN',status,source,employees,type:i===3?'partner':'direct',website:`https://www.${slug}.example`,description,notes:null},-75+i*5);
   accounts.push(account);const pair=[];
   for(let j=0;j<2;j++) {
    const [personName,mailbox]=people[i][j];
    pair.push(await save('contacts',{name:personName,ownerId,accountId:account.id,jobTitle:j===0?'运营总监':'解决方案经理',gender:j===0?'female':'male',source,email:i===4&&j===1?null:`${mailbox}@${slug}.example`,phone:i===4&&j===1?null:phone(i*2+j),employed:!(i===7&&j===1),primary:j===0,notes:j===0?'主要业务决策人。':'技术评估对接人。'},i===4?-4-j:-70+i*5+j));
   }
   contacts.push(pair);
  }
  for(const [a,name,amount,stage,close,businessType,created,changed,lostReason='toCompetitor'] of deals) {
   const ownerId = ownerOf(accountOwner(a));
   let deal=await save('opportunities',{name,ownerId,accountId:accounts[a].id,amount,currency:'CNY',source:companies[a][4],businessType,expectedCloseAt:at(close,17),description:companies[a][7],contacts:[{contactId:contacts[a][0].id,role:'decisionMaker'},{contactId:contacts[a][1].id,role:'evaluator'}]},created);
   const progression=['won','lost','paused'].includes(stage)?['qualification','proposal',stage]:stages.slice(1,stages.indexOf(stage)+1);
   for(let i=0;i<progression.length;i++) {
    const next=progression[i];const day=Math.round(created+(changed-created)*(i+1)/progression.length);
    deal=await save('opportunities',{stage:next,...(next==='lost'?{lostReason}:{}),...(next==='paused'?{pauseReason:'budgetDeferred',resumeAt:at(30)}:{})},day,deal.id);
   }
   opportunities.push(deal);
  }
  await save('accounts',{status:'churned',churnReason:'closedOrMerged',notes:'采购已集中到一家全国性供应商。'},-20,accounts[7].id);
  // Chronology on automatically promoted accounts follows the associated won deal.
  for(const [i,day] of [[5,-18],[1,-3]]) await q.updateTable('crmAccounts').set({updatedAt:at(day)}).where('id','=',accounts[i].id).execute();
  for(let i=0;i<leadSpecs.length;i++) {
   const [name,company,status,source,day,description,mailbox]=leadSpecs[i];
   leads.push(await save('leads',{name,company,status,source,ownerId:ownerOf(leadOwner(i)),email:`${mailbox}@lead-${i+1}.example`,phone:i%4===0?null:phone(40+i),jobTitle:i%2?'销售经理':'运营主管',country:'CN',city:['上海','北京','深圳','杭州'][i%4],industry:['manufacturing','education','retail','professionalServices'][i%4],message:description,...(status==='invalid'?{invalidReason:i===12?'badContact':'notTarget'}:{})},day));
  }
  const activity = async (name, links, day, hour, status='planned',type='call',feedback) => save('activities',{name,...links,startAt:at(day,hour),endAt:at(day,hour+1),status,type,description:'回顾最新进展，确认需求，并约定下一步行动。',feedback:feedback||null},Math.min(day-2,-1));
  const leadLinks = (i) => ({leadId:leads[i].id,ownerId:ownerOf(leadOwner(i))});
  await activity('华东智造 需求摸底电话',leadLinks(0),-12,10,'completed','call','确认了三家工厂、运营侧负责人，以及 32 万元的初步预算。');
  await activity('知行教育 招生业务介绍',leadLinks(1),-5,14,'completed','meeting','团队确认了意向，并引荐了招生总监。');
  for(const [i,accountIndex,contactIndex,day] of [[0,0,0,-10],[1,4,0,-4]]) {
   const converted=await convertLead(service,prepared,leads[i].id,{accountId:accounts[accountIndex].id,contactId:contacts[accountIndex][contactIndex].id,createOpportunity:false},q);
   await q.updateTable('crmLeads').set({convertedAt:at(day),updatedAt:at(day)}).where('id','=',converted.id).execute();
   await q.updateTable('crmActivities').set({updatedAt:at(day)}).where('leadId','=',converted.id).execute();
   await historyAt(q, at(day));leads[i]=converted;
  }
  // Completed notes and upcoming meetings across the active pipeline.
  const completedNames=['需求梳理工作坊','合同评审','安全评估','试点演示','招生需求调研','实施复盘'];
  const completedFeedback=['确定了初期范围，并记录了验收标准。','法务评审已完成，等待采购签批。','客户要求提供安全说明与部署方案概要。','试点团队确认了路径优化效果，待验证系统集成。','招生总监希望先做一个轻量的概念验证。','交付完成，客户对上线与报表都比较满意。'];
  const plannedNames=['方案跟进','最终条款沟通','采购决策跟进','技术集成工作坊','招生产品演示'];
  for(let i=0;i<6;i++) {
   const a=deals[i][0];const links={accountId:accounts[a].id,opportunityId:opportunities[i].id,ownerId:ownerOf(accountOwner(a)),externalParticipants:[contacts[a][0].id,contacts[a][1].id]};
   await activity(`${companies[a][0]} ${completedNames[i]}`,links,-6-i,10,'completed',i%2?'meeting':'demo',completedFeedback[i]);
   if(i<5) await activity(`${companies[a][0]} ${plannedNames[i]}`,links,[0,0,-2,2,5][i],[10,15,11,14,10][i],'planned',i===3?'meeting':'call');
   dealsWithActivities.push(i);
  }
  // Two late-evening calls today, so the workspace's "upcoming today" list
  // still has entries at the end of the working day.
  await activity('华东智造 晚间电话回访',{accountId:accounts[0].id,opportunityId:opportunities[0].id,ownerId:ownerOf(accountOwner(0)),externalParticipants:[contacts[0][0].id]},0,21.5,'planned','call');
  await activity('星桥零售 海外团队方案确认',{accountId:accounts[1].id,opportunityId:opportunities[1].id,ownerId:ownerOf(accountOwner(1)),externalParticipants:[contacts[1][1].id]},0,23.5,'planned','meeting');
  const leadActivities=[
   [2,1,11,'planned','call'],[5,-5,10,'completed','call'],[5,0,16,'planned','meeting'],
   [6,-7,14,'completed','email'],[7,3,11,'planned','demo'],[8,-10,10,'completed','call'],
   [9,-14,15,'completed','call'],[10,-3,10,'completed','email'],[13,-2,11,'completed','meeting'],
   [13,2,15,'planned','demo'],[15,4,10,'planned','call'],[4,-1,14,'cancelled','meeting'],
   [14,-2,11,'noShow','call'],[7,-1,16,'planned','task'],[6,7,10,'planned','call'],
  ];
  const activityLabel = (status) => status==='completed'?'需求记录':status==='cancelled'?'改期的初次沟通':status==='noShow'?'未到场的初次沟通':'下一次跟进';
  for(const [i,day,hour,status,type] of leadActivities) await activity(`${leadSpecs[i][1]} ${activityLabel(status)}`,leadLinks(i),day,hour,status,type,status==='completed'?'联系人已确认意向。发送简要纪要并约定下一步。':null);
 });
 // Approvals are raised by whoever owns the deal, submitted to 李明; one of
 // them 李明 has already decided, and one 李明 raised himself goes to the
 // other manager, 赵敏 (an administrator is not an approver).
 const raise = async (who, input, day, submitDay) => service.mutate(who, async (prepared, q) => {
  const save = saver(prepared, q);
  const record = await save('approvals', input, day);
  await service.approvalAction(prepared, record.id, 'submit', '', q);
  await q.updateTable('crmApprovals').set({submittedAt:at(submitDay,11),updatedAt:at(submitDay,11)}).where('id','=',record.id).execute();
  await historyAt(q, at(submitDay,11));
  return record;
 });
 await raise(accountOwner(0), {name:'华东智造 试点折扣特批',opportunityId:opportunities[0].id,topic:'discount',approverId:managerActor.id,description:'申请 10% 的试点折扣，以换取签署年度承诺。'}, -1, -1);
 const paymentTerms = await raise(accountOwner(1), {name:'星桥零售 付款节奏评审',opportunityId:opportunities[1].id,topic:'paymentTerms',approverId:managerActor.id,description:'客户要求首张发票采用 60 天账期。'}, -6, -6);
 await service.mutate(managerActor, async (prepared, q) => {
  await service.approvalAction(prepared, paymentTerms.id, 'approve', '同意 60 天账期，请在合同中注明首期发票金额。', q);
  await q.updateTable('crmApprovals').set({decidedAt:at(-5,15),updatedAt:at(-5,15)}).where('id','=',paymentTerms.id).execute();
  await historyAt(q, at(-5,15));
 });
 await raise(managerActor, {name:'远航物流 安全补充条款评审',opportunityId:opportunities[3].id,topic:'contractTerms',approverId:manager2.id,description:'签约前评审拟定的数据处理与安全条款。'}, -2, -2);
 // This marker makes the one-off population repeat-safe and records exactly which rows it created.
 await db.query().insertInto('crmSettings').values({id:marker,value:JSON.stringify(manifest),updatedAt:new Date()}).execute();
 await writeFile(`${root}/storage/demo-crm-manifest.json`,JSON.stringify(manifest,null,2),{mode:0o600});
 const report = await dashboard(service,actor,{});
 const counts={};for(const entity of Object.keys(definitions))counts[entity]=(await service.list(actor,entity,{pageSize:1})).total;
 console.log(JSON.stringify({counts,attention:report.attention,business:report.business,today:report.today.length,overdue:report.overdue.length,approvals:report.approvals.length,owner:owner.name,manager:manager.name,sellers:sellers.map((u)=>u.name),backup,manifest:`${root}/storage/demo-crm-manifest.json`},null,2));
} finally { await db.destroy(); }
