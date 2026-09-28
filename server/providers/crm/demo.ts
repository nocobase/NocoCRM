import type { QueryAdapter, Row } from '@nocobase/db';
import type { AppAuthorization } from '@nocobase/app-plugin-authorization/server';
import { convertLead } from './conversion.js';
import { CrmError, definitions, object, stages, toText } from './schema.js';
import { CrmService } from './service.js';
import {
  listUsers,
  requireCapability,
  roleKey,
  type Actor,
} from './authorization.js';

// The demo dataset: 云策数字咨询, a fictional digital consulting firm, with
// accounts, contacts, leads, opportunities, activities and approvals dated
// relative to the day it is imported. Imported and removed from the settings
// page by an administrator; a manifest row in crm_settings records exactly
// which rows the import created, so removal touches nothing else.
export const DEMO_MARKER = 'demo-dataset-v1';

export const demoPassword = (username: string): string => `${username}123`;

export interface DemoAccount {
  readonly username: string;
  readonly name: string;
  readonly role: 'sales-manager' | 'sales-representative';
}

// The people the dataset belongs to. The administrator importing it owns
// nothing, as administrators do; the manager and the two sellers own the
// records, the other two accounts exist for signing in. The password is the
// username followed by 123 (liming123): the users plugin wants eight
// characters, and the platform's own administrator is admin123.
export const demoAccounts: readonly DemoAccount[] = [
  { username: 'liming', name: '李明', role: 'sales-manager' },
  { username: 'zhaomin', name: '赵敏', role: 'sales-manager' },
  { username: 'wangxiaofang', name: '王小芳', role: 'sales-representative' },
  { username: 'chenxiaohao', name: '陈小浩', role: 'sales-representative' },
  { username: 'liuxiaoyang', name: '刘小洋', role: 'sales-representative' },
];

// How the import gets an account it needs: the users plugin in the running
// application, a stub in tests.
export interface DemoAccountCreator {
  create(input: {
    name: string;
    username: string;
    email: string;
    password: string;
    role: string;
  }): Promise<{ id: string }>;
  // An account that already exists is reused, and its password set back to
  // the demo one, so the password the settings page states always holds.
  resetPassword(id: string, password: string): Promise<void>;
}

export interface DemoStatus {
  present: boolean;
  createdAt: string | null;
  records: number;
  accounts: readonly { username: string; name: string; role: string }[];
}

interface Manifest {
  version: number;
  label: string;
  createdAt: string;
  businessDate: string;
  ownerId: string;
  records: { entity: string; id: string; name: string }[];
}

export async function demoStatus(
  service: CrmService,
  actor: Actor,
): Promise<DemoStatus> {
  await requireCapability(actor, 'manage', 'settings');
  const row = await service.database
    .query()
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', DEMO_MARKER)
    .executeTakeFirst();
  const manifest = row ? (parseManifest(row.value) ?? null) : null;
  return {
    present: Boolean(manifest),
    createdAt: manifest?.createdAt ?? null,
    records: manifest?.records.length ?? 0,
    accounts: demoAccounts.map(({ username, name, role }) => ({
      username,
      name,
      role,
    })),
  };
}

function parseManifest(value: unknown): Manifest | undefined {
  const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  const record = object(parsed);
  return Array.isArray(record.records)
    ? (record as unknown as Manifest)
    : undefined;
}

// The offset of a zone on a given instant, so days can be built at local
// midnight in the business timezone without a calendar library.
function zoneOffsetMinutes(timeZone: string, date: Date): number {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = /GMT([+-])(\d{2}):?(\d{2})?/.exec(part ?? '');
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '-' ? -minutes : minutes;
}

export async function populateDemo(
  service: CrmService,
  authz: AppAuthorization,
  actor: Actor,
  accounts: DemoAccountCreator,
): Promise<DemoStatus> {
  await requireCapability(actor, 'manage', 'settings');
  const query = service.database.query();
  if (
    await query
      .selectFrom('crmSettings')
      .select('id')
      .where('id', '=', DEMO_MARKER)
      .executeTakeFirst()
  )
    throw new CrmError('demoExists', 409);

  // Accounts: reuse one that exists by username, create the rest, and make
  // sure each holds its demo role and nothing else among the CRM roles.
  const existing = await listUsers(service.database);
  const userIds: Record<string, string> = {};
  for (const account of demoAccounts) {
    const found = existing.find((u) => u.username === account.username);
    if (found)
      await accounts.resetPassword(found.id, demoPassword(account.username));
    const id = found
      ? found.id
      : (
          await accounts.create({
            name: account.name,
            username: account.username,
            email: `${account.username}@demo.example`,
            password: demoPassword(account.username),
            role: roleKey(account.role),
          })
        ).id;
    await authz.permissionSets.replaceSubjectAssignments({
      subject: { type: 'user', id },
      managedPermissionSets: [
        'sales-representative',
        'sales-manager',
        'system-administrator',
      ].map(roleKey),
      permissionSets: [roleKey(account.role)],
    });
    userIds[account.username] = id;
  }
  const actorFor = (id: string): Actor => ({
    id,
    locale: 'zh-CN',
    scope: authz.for({
      principal: { type: 'user', id },
      subjects: [{ type: 'authenticated', id: '*' }],
    }),
  });
  const owner = actorFor(actor.id);
  const managerActor = actorFor(userIds.liming);
  const manager2 = { id: userIds.zhaomin };
  const sellerActors = [
    actorFor(userIds.wangxiaofang),
    actorFor(userIds.chenxiaohao),
  ];

  const settings = await service.settings();
  const timeZone = settings.timeZone || 'Asia/Shanghai';
  const now = new Date();
  const calendarDay = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  // Local midnight of today in the business timezone.
  const base =
    Date.parse(`${calendarDay}T00:00:00Z`) -
    zoneOffsetMinutes(timeZone, now) * 60000;
  const at = (day: number, hour = 10, minute = 0): string =>
    new Date(
      base + day * 86400000 + hour * 3600000 + minute * 60000,
    ).toISOString();
  const started = now.toISOString();
  const manifest: Manifest = {
    version: 6,
    label: '云策数字咨询 CRM 演示数据',
    createdAt: started,
    businessDate: calendarDay,
    ownerId: actor.id,
    records: [],
  };
  const track = (entity: string, record: Row): Row => {
    if (!manifest.records.some((r) => r.id === record.id))
      manifest.records.push({
        entity,
        id: toText(record.id),
        name: toText(record.name),
      });
    return record;
  };
  const ids = (): string[] => manifest.records.map((r) => r.id);
  const historyAt = async (q: QueryAdapter, date: string): Promise<void> => {
    if (manifest.records.length)
      await q
        .updateTable('crmHistory')
        .set({ createdAt: date })
        .where('recordId', 'in', ids())
        .where('createdAt', '>=', started)
        .execute();
  };
  type Entity = keyof typeof definitions;
  const saver =
    (prepared: Actor, q: QueryAdapter) =>
    async (entity: Entity, input: Row, day = -1, id?: string): Promise<Row> => {
      const record = track(
        entity,
        await service.save(prepared, entity, input, id, q),
      );
      const date = at(day);
      const patch: Row = { updatedAt: date };
      if (!id) patch.createdAt = date;
      if (
        entity === 'opportunities' &&
        ['won', 'lost'].includes(toText(record.stage))
      )
        patch.closedAt = date;
      if (entity === 'activities' && record.status === 'completed')
        patch.completedAt = input.endAt ?? record.endAt;
      await q
        .updateTable(definitions[entity].table)
        .set(patch)
        .where('id', '=', record.id)
        .execute();
      await historyAt(q, date);
      return service.get(prepared, entity, toText(record.id), q);
    };

  // Who owns which account (by index): 王小芳 0,1,4 · 陈小浩 2,5,7 · 李明 3,6.
  // Leads rotate the same way by position; activities follow their record.
  const accountOwner = (i: number): Actor =>
    [0, 1, 4].includes(i)
      ? sellerActors[0]
      : [2, 5, 7].includes(i)
        ? sellerActors[1]
        : managerActor;
  const leadOwner = (i: number): Actor =>
    [sellerActors[0], sellerActors[1], managerActor][i % 3];
  const accounts_: Row[] = [];
  const contacts: Row[][] = [];
  const opportunities: Row[] = [];
  const leads: Row[] = [];
  const companies: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ][] = [
    [
      '华东智造集团',
      'manufacturing',
      '上海',
      'qualified',
      'exhibition',
      '201-500',
      'huadong-zhizao',
      '旗下三家工厂希望统一生产数据、报表和销售流程。',
    ],
    [
      '星桥零售集团',
      'retail',
      '杭州',
      'qualified',
      'customerReferral',
      '501-1000',
      'xingqiao-retail',
      '多门店零售集团正在规划统一的客户数据平台和经营报表。',
    ],
    [
      '安康医疗集团',
      'healthcare',
      '北京',
      'qualified',
      'website',
      '201-500',
      'ankang-health',
      '医疗服务集团正在评估患者服务流程、权限管理和数据安全。',
    ],
    [
      '远航物流',
      'logistics',
      '深圳',
      'qualified',
      'partner',
      '51-200',
      'yuanhang-logistics',
      '区域物流企业正在评估调度、客户协同和管理报表。',
    ],
    [
      '知行教育集团',
      'education',
      '苏州',
      'prospect',
      'marketing',
      '51-200',
      'zhixing-edu',
      '教育集团希望统一招生、排课和客户跟进。',
    ],
    [
      '视界数据服务',
      'professionalServices',
      '成都',
      'qualified',
      'outbound',
      '11-50',
      'shijie-data',
      '数据服务团队需要统一的交付工作台、数据治理和管理报表。',
    ],
    [
      '昊阳能源',
      'energy',
      '南京',
      'inactive',
      'search',
      '201-500',
      'haoyang-energy',
      '能源企业的项目协同和巡检流程正在等待预算审批。',
    ],
    [
      '丰味食品集团',
      'foodAndBeverage',
      '广州',
      'qualified',
      'partner',
      '501-1000',
      'fengwei-foods',
      '食品经销商希望改善区域销售计划、客户数据和渠道协同。',
    ],
  ];
  const people: [string, string][][] = [
    [
      ['陈曼云', 'chen.manyun'],
      ['吴逸辰', 'wu.yichen'],
    ],
    [
      ['林欣怡', 'lin.xinyi'],
      ['周昊', 'zhou.hao'],
    ],
    [
      ['王思菲', 'wang.sifei'],
      ['刘骁', 'liu.xiao'],
    ],
    [
      ['张立昂', 'zhang.liang'],
      ['孙怡宁', 'sun.yining'],
    ],
    [
      ['徐雅琳', 'xu.yalin'],
      ['唐睿', 'tang.rui'],
    ],
    [
      ['赵陆', 'zhao.lu'],
      ['郭萌', 'guo.meng'],
    ],
    [
      ['黄雅雯', 'huang.yawen'],
      ['何威', 'he.wei'],
    ],
    [
      ['邓晓萱', 'deng.xiaoxuan'],
      ['钱佳明', 'qian.jiaming'],
    ],
  ];
  // [account, name, amount, stage, close day, business type, created day, last change day, lost reason]
  const deals: [
    number,
    string,
    number,
    string,
    number,
    string,
    number,
    number,
    string?,
  ][] = [
    [
      0,
      '生产数据与报表整合项目',
      320000,
      'proposal',
      28,
      'newBusiness',
      -28,
      -4,
    ],
    [1, '多门店客户数据平台', 480000, 'contract', 5, 'expansion', -25, -2],
    [
      2,
      '服务流程数字化项目',
      240000,
      'negotiation',
      -3,
      'newBusiness',
      -22,
      -3,
    ],
    [3, '调度流程优化试点', 125000, 'validation', 20, 'newBusiness', -18, -5],
    [4, '业务流程数字化项目', 78000, 'contact', 45, 'newBusiness', -5, -5],
    [5, '数据治理与管理报表项目', 145000, 'won', -18, 'newBusiness', -42, -18],
    [1, '经营分析项目', 88000, 'won', -3, 'crossSell', -30, -3],
    [6, '现场服务与巡检数字化项目', 260000, 'paused', 60, 'tender', -26, -8],
    [7, '区域销售流程优化项目', 65000, 'lost', -22, 'newBusiness', -48, -22],
    [0, '数字化平台持续服务续约', 42000, 'lost', -4, 'renewal', -20, -4],
    // Closed in the five months before: enough won and lost each month for the
    // workspace's trend to have a shape. Appended so the indexes above hold.
    [5, '客户数据平台咨询', 96000, 'won', -152, 'newBusiness', -185, -152],
    [
      3,
      '车队管理报表试点',
      58000,
      'lost',
      -148,
      'newBusiness',
      -178,
      -148,
      'price',
    ],
    [1, '会员系统集成', 210000, 'won', -140, 'expansion', -172, -140],
    [2, '门诊预约流程优化', 132000, 'won', -122, 'newBusiness', -160, -122],
    [
      7,
      '渠道数据看板',
      47000,
      'lost',
      -118,
      'newBusiness',
      -150,
      -118,
      'noBudget',
    ],
    [
      4,
      '校区管理系统',
      86000,
      'lost',
      -112,
      'newBusiness',
      -145,
      -112,
      'timing',
    ],
    [0, '设备巡检 App', 175000, 'won', -95, 'newBusiness', -130, -95],
    [6, '项目协同平台一期', 230000, 'won', -88, 'tender', -125, -88],
    [3, '客户协同门户', 72000, 'won', -84, 'crossSell', -115, -84],
    [5, '报表自动化', 39000, 'lost', -80, 'expansion', -110, -80, 'noDecision'],
    [
      1,
      '门店排班系统',
      118000,
      'lost',
      -62,
      'newBusiness',
      -95,
      -62,
      'requirementMismatch',
    ],
    [2, '数据安全加固', 64000, 'won', -55, 'expansion', -90, -55],
    [7, '经销商门户', 150000, 'won', -40, 'newBusiness', -75, -40],
    [
      0,
      '供应链协同试点',
      98000,
      'lost',
      -36,
      'newBusiness',
      -70,
      -36,
      'toCompetitor',
    ],
    // Early-stage deals, so the first board columns carry more than one card.
    [6, '巡检数据分析咨询', 56000, 'qualification', 35, 'newBusiness', -6, -2],
    [6, '安全培训管理咨询', 48000, 'contact', 55, 'newBusiness', -2, -2],
    [2, '患者随访流程咨询', 68000, 'contact', 50, 'newBusiness', -3, -3],
    [4, '招生数据看板', 52000, 'qualification', 40, 'crossSell', -9, -4],
    [3, '网点绩效看板', 73000, 'validation', 32, 'crossSell', -14, -6],
    [1, '供应商协同门户', 156000, 'proposal', 24, 'newBusiness', -20, -5],
  ];
  const leadSpecs: [string, string, string, string, number, string, string][] =
    [
      [
        '李佳恩',
        '华东智造集团',
        'new',
        'exhibition',
        -16,
        '希望打通三家工厂的生产报表。',
        'li.jiaen',
      ],
      [
        '高晗',
        '知行教育集团',
        'working',
        'website',
        -7,
        '教育团队希望拿到一份业务流程数字化方案。',
        'gao.han',
      ],
      [
        '沈可心',
        '星桥零售集团',
        'new',
        'website',
        -1,
        '咨询客户数据平台项目的报价。',
        'shen.kexin',
      ],
      [
        '蒋煜',
        '远航物流',
        'new',
        'exhibition',
        -6,
        '展会到访客户，首次数字化需求确认电话待安排。',
        'jiang.yu',
      ],
      [
        '罗雨萱',
        '新域零售',
        'new',
        'marketing',
        -2,
        '下载了《数字化客户运营指南》。',
        'luo.yuxuan',
      ],
      [
        '郑亮',
        '丰味食品集团',
        'working',
        'outbound',
        -9,
        '已完成需求摸底电话，需要梳理区域销售流程。',
        'zheng.liang',
      ],
      [
        '韩宓',
        '安康医疗集团',
        'working',
        'customerReferral',
        -12,
        '关注审批、权限和数据安全流程。',
        'han.mi',
      ],
      [
        '于杰',
        '佳拓设备',
        'working',
        'partner',
        -8,
        '计划安排系统集成与交付的技术介绍。',
        'yu.jie',
      ],
      [
        '秦思菲',
        '星桥教育',
        'nurturing',
        'search',
        -17,
        '有意向，但预算下月才决策。',
        'qin.sifei',
      ],
      [
        '方博',
        '汇川电子',
        'nurturing',
        'exhibition',
        -19,
        '希望在其产品发布之后再联系。',
        'fang.bo',
      ],
      [
        '彭雅然',
        '北辰地产',
        'nurturing',
        'marketing',
        -8,
        '处于早期调研阶段，希望按季度跟进。',
        'peng.yaran',
      ],
      [
        '魏飞',
        '江湾咨询',
        'invalid',
        'website',
        -10,
        '咨询内容不在公司数字化咨询服务范围内。',
        'wei.fei',
      ],
      [
        '谢卓',
        '华岭纺织',
        'invalid',
        'outbound',
        -13,
        '联系方式无效。',
        'xie.zhuo',
      ],
      [
        '冯睿',
        '佳拓设备',
        'working',
        'employeeReferral',
        -4,
        '销售经理正在评估客户交接和售前交付流程。',
        'feng.rui',
      ],
      [
        '曹薇',
        '丰年农业',
        'new',
        'partner',
        -5,
        '合作伙伴推荐，待首次数字化需求确认电话。',
        'cao.wei',
      ],
      [
        '杜楠',
        '森岳制造',
        'working',
        'search',
        -3,
        '小团队需要 CRM、项目交付和管理报表。',
        'du.nan',
      ],
    ];
  // The province of each demo city (ISO 3166-2, as the region field
  // stores it), so a demo record carries the whole region: country,
  // province and city.
  const provinceOf: Record<string, string> = {
    北京: 'CN-11',
    上海: 'CN-31',
    南京: 'CN-32',
    苏州: 'CN-32',
    杭州: 'CN-33',
    广州: 'CN-44',
    深圳: 'CN-44',
    成都: 'CN-51',
  };
  const phone = (n: number): string =>
    `138 0${String(100 + n).slice(-3)} ${String(2000 + n * 37).slice(-4)}`;

  await service.mutate(owner, async (prepared, q) => {
    const save = saver(prepared, q);
    for (let i = 0; i < companies.length; i++) {
      const [
        name,
        industry,
        city,
        status,
        source,
        employees,
        slug,
        description,
      ] = companies[i];
      const ownerId = accountOwner(i).id;
      const account = await save(
        'accounts',
        {
          name,
          ownerId,
          industry,
          city,
          state: provinceOf[city],
          country: 'CN',
          status,
          source,
          employees,
          type: i === 3 ? 'partner' : 'direct',
          website: `https://www.${slug}.example`,
          description,
          notes: null,
        },
        -75 + i * 5,
      );
      accounts_.push(account);
      const pair: Row[] = [];
      for (let j = 0; j < 2; j++) {
        const [personName, mailbox] = people[i][j];
        pair.push(
          await save(
            'contacts',
            {
              name: personName,
              ownerId,
              accountId: account.id,
              jobTitle: j === 0 ? '运营总监' : '解决方案经理',
              gender: j === 0 ? 'female' : 'male',
              source,
              email: i === 4 && j === 1 ? null : `${mailbox}@${slug}.example`,
              phone: i === 4 && j === 1 ? null : phone(i * 2 + j),
              employed: !(i === 7 && j === 1),
              primary: j === 0,
              notes: j === 0 ? '主要业务决策人。' : '技术评估对接人。',
            },
            i === 4 ? -4 - j : -70 + i * 5 + j,
          ),
        );
      }
      contacts.push(pair);
    }
    for (const [
      a,
      name,
      amount,
      stage,
      close,
      businessType,
      created,
      changed,
      lostReason = 'toCompetitor',
    ] of deals) {
      const ownerId = accountOwner(a).id;
      let deal = await save(
        'opportunities',
        {
          name,
          ownerId,
          accountId: accounts_[a].id,
          amount,
          currency: 'CNY',
          source: companies[a][4],
          businessType,
          expectedCloseAt: at(close, 17),
          description: companies[a][7],
          contacts: [
            { contactId: contacts[a][0].id, role: 'decisionMaker' },
            { contactId: contacts[a][1].id, role: 'evaluator' },
          ],
        },
        created,
      );
      const progression = ['won', 'lost', 'paused'].includes(stage)
        ? ['qualification', 'proposal', stage]
        : stages.slice(1, stages.indexOf(stage) + 1);
      for (let i = 0; i < progression.length; i++) {
        const next = progression[i];
        const day = Math.round(
          created + ((changed - created) * (i + 1)) / progression.length,
        );
        deal = await save(
          'opportunities',
          {
            stage: next,
            ...(next === 'lost' ? { lostReason } : {}),
            ...(next === 'paused'
              ? { pauseReason: 'budgetDeferred', resumeAt: at(30) }
              : {}),
          },
          day,
          toText(deal.id),
        );
      }
      opportunities.push(deal);
    }
    await save(
      'accounts',
      {
        status: 'churned',
        churnReason: 'closedOrMerged',
        notes: '采购已集中到一家全国性供应商。',
      },
      -20,
      toText(accounts_[7].id),
    );
    // Chronology on automatically promoted accounts follows the associated won deal.
    for (const [i, day] of [
      [5, -18],
      [1, -3],
    ] as const)
      await q
        .updateTable('crmAccounts')
        .set({ updatedAt: at(day) })
        .where('id', '=', accounts_[i].id)
        .execute();
    for (let i = 0; i < leadSpecs.length; i++) {
      const [name, company, status, source, day, description, mailbox] =
        leadSpecs[i];
      leads.push(
        await save(
          'leads',
          {
            name,
            company,
            status,
            source,
            ownerId: leadOwner(i).id,
            email: `${mailbox}@lead-${i + 1}.example`,
            phone: i % 4 === 0 ? null : phone(40 + i),
            jobTitle: i % 2 ? '销售经理' : '运营主管',
            country: 'CN',
            state: provinceOf[['上海', '北京', '深圳', '杭州'][i % 4]],
            city: ['上海', '北京', '深圳', '杭州'][i % 4],
            industry: [
              'manufacturing',
              'education',
              'retail',
              'professionalServices',
            ][i % 4],
            message: description,
            ...(status === 'invalid'
              ? { invalidReason: i === 12 ? 'badContact' : 'notTarget' }
              : {}),
          },
          day,
        ),
      );
    }
    const activity = async (
      name: string,
      links: Row,
      day: number,
      hour: number,
      status = 'planned',
      type = 'call',
      feedback?: string | null,
    ): Promise<Row> =>
      save(
        'activities',
        {
          name,
          ...links,
          startAt: at(day, hour),
          endAt: at(day, hour + 1),
          status,
          type,
          description: '回顾最新进展，确认需求，并约定下一步行动。',
          feedback: feedback ?? null,
        },
        Math.min(day - 2, -1),
      );
    const leadLinks = (i: number): Row => ({
      leadId: leads[i].id,
      ownerId: leadOwner(i).id,
    });
    await activity(
      '华东智造 需求摸底电话',
      leadLinks(0),
      -12,
      10,
      'completed',
      'call',
      '确认了三家工厂、运营侧负责人，以及 32 万元的初步预算。',
    );
    await activity(
      '知行教育 招生业务介绍',
      leadLinks(1),
      -5,
      14,
      'completed',
      'meeting',
      '团队确认了意向，并引荐了招生总监。',
    );
    for (const [i, accountIndex, contactIndex, day] of [
      [0, 0, 0, -10],
      [1, 4, 0, -4],
    ] as const) {
      const converted = await convertLead(
        service,
        prepared,
        toText(leads[i].id),
        {
          accountId: accounts_[accountIndex].id,
          contactId: contacts[accountIndex][contactIndex].id,
          createOpportunity: false,
        },
        q,
      );
      await q
        .updateTable('crmLeads')
        .set({ convertedAt: at(day), updatedAt: at(day) })
        .where('id', '=', converted.id)
        .execute();
      await q
        .updateTable('crmActivities')
        .set({ updatedAt: at(day) })
        .where('leadId', '=', converted.id)
        .execute();
      await historyAt(q, at(day));
      leads[i] = converted;
    }
    // Completed notes and upcoming meetings across the active pipeline.
    const completedNames = [
      '需求梳理工作坊',
      '合同评审',
      '安全评估',
      '试点演示',
      '招生需求调研',
      '实施复盘',
    ];
    const completedFeedback = [
      '确定了初期范围，并记录了验收标准。',
      '法务评审已完成，等待采购签批。',
      '客户要求提供安全说明与部署方案概要。',
      '试点团队确认了路径优化效果，待验证系统集成。',
      '招生总监希望先做一个轻量的概念验证。',
      '交付完成，客户对上线与报表都比较满意。',
    ];
    const plannedNames = [
      '方案跟进',
      '最终条款沟通',
      '采购决策跟进',
      '技术集成工作坊',
      '招生产品演示',
    ];
    for (let i = 0; i < 6; i++) {
      const a = deals[i][0];
      const links: Row = {
        accountId: accounts_[a].id,
        opportunityId: opportunities[i].id,
        ownerId: accountOwner(a).id,
        externalParticipants: [contacts[a][0].id, contacts[a][1].id],
      };
      await activity(
        `${companies[a][0]} ${completedNames[i]}`,
        links,
        -6 - i,
        10,
        'completed',
        i % 2 ? 'meeting' : 'demo',
        completedFeedback[i],
      );
      if (i < 5)
        await activity(
          `${companies[a][0]} ${plannedNames[i]}`,
          links,
          [0, 0, -2, 2, 5][i],
          [10, 15, 11, 14, 10][i],
          'planned',
          i === 3 ? 'meeting' : 'call',
        );
    }
    // Two late-evening calls today, so the workspace's "upcoming today" list
    // still has entries at the end of the working day.
    await activity(
      '华东智造 晚间电话回访',
      {
        accountId: accounts_[0].id,
        opportunityId: opportunities[0].id,
        ownerId: accountOwner(0).id,
        externalParticipants: [contacts[0][0].id],
      },
      0,
      21.5,
      'planned',
      'call',
    );
    await activity(
      '星桥零售 海外团队方案确认',
      {
        accountId: accounts_[1].id,
        opportunityId: opportunities[1].id,
        ownerId: accountOwner(1).id,
        externalParticipants: [contacts[1][1].id],
      },
      0,
      23.5,
      'planned',
      'meeting',
    );
    const leadActivities: [number, number, number, string, string][] = [
      [2, 1, 11, 'planned', 'call'],
      [5, -5, 10, 'completed', 'call'],
      [5, 0, 16, 'planned', 'meeting'],
      [6, -7, 14, 'completed', 'email'],
      [7, 3, 11, 'planned', 'demo'],
      [8, -10, 10, 'completed', 'call'],
      [9, -14, 15, 'completed', 'call'],
      [10, -3, 10, 'completed', 'email'],
      [13, -2, 11, 'completed', 'meeting'],
      [13, 2, 15, 'planned', 'demo'],
      [15, 4, 10, 'planned', 'call'],
      [4, -1, 14, 'cancelled', 'meeting'],
      [14, -2, 11, 'noShow', 'call'],
      [7, -1, 16, 'planned', 'task'],
      [6, 7, 10, 'planned', 'call'],
    ];
    const activityLabel = (status: string): string =>
      status === 'completed'
        ? '需求记录'
        : status === 'cancelled'
          ? '改期的初次沟通'
          : status === 'noShow'
            ? '未到场的初次沟通'
            : '下一次跟进';
    for (const [i, day, hour, status, type] of leadActivities)
      await activity(
        `${leadSpecs[i][1]} ${activityLabel(status)}`,
        leadLinks(i),
        day,
        hour,
        status,
        type,
        status === 'completed'
          ? '联系人已确认意向。发送简要纪要并约定下一步。'
          : null,
      );
    // A steady cadence beyond the hand-placed fortnight, so the calendar
    // and the day's agenda have something on every working day from a
    // month back to three months ahead, whichever day the demo is opened
    // on: past days are completed (with the odd no-show or cancellation),
    // future days are planned. The work rotates over the live deals and
    // the open leads, owned by whoever owns the record.
    const activeDeals = opportunities
      .map((deal, index) => ({ deal, index }))
      .filter(
        ({ index }) => !['won', 'lost', 'paused'].includes(deals[index][3]),
      );
    const openLeads = leads
      .map((lead, index) => ({ lead, index }))
      .filter(
        ({ lead }) => !['converted', 'invalid'].includes(toText(lead.status)),
      );
    const cadenceNames = [
      '周度进展沟通',
      '方案细节确认',
      '需求澄清会议',
      '演示准备',
      '合同条款跟进',
      '试点验收',
      '阶段复盘',
      '采购流程跟进',
      '培训计划沟通',
      '续约意向沟通',
    ];
    const cadenceTypes = [
      'call',
      'meeting',
      'demo',
      'email',
      'task',
      'call',
      'meeting',
    ];
    const cadenceFeedback = [
      '同步了本周进展，确认了下一步。',
      '客户补充了两条需求，已记录。',
      '确认了时间表与参与人。',
      '演示材料已按反馈调整。',
    ];
    const weekdayOf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    let n = 0;
    for (let day = -30; day <= 90; day++) {
      if (day >= -14 && day <= 7) continue;
      // Noon, so the weekday is the business day whatever the zone offset.
      const weekday = weekdayOf.format(
        new Date(base + day * 86400000 + 12 * 3600000),
      );
      if (weekday === 'Sat' || weekday === 'Sun') continue;
      const perDay = day % 3 === 0 ? 2 : 1;
      for (let k = 0; k < perDay; k++, n++) {
        const hour = [9, 10, 11, 14, 15, 16][n % 6];
        const name = cadenceNames[n % cadenceNames.length];
        const type = cadenceTypes[n % cadenceTypes.length];
        const status =
          day < 0
            ? n % 9 === 4
              ? 'noShow'
              : n % 11 === 6
                ? 'cancelled'
                : 'completed'
            : 'planned';
        const feedback =
          status === 'completed'
            ? cadenceFeedback[n % cadenceFeedback.length]
            : null;
        if (n % 3 === 2 && openLeads.length) {
          const { lead, index } = openLeads[n % openLeads.length];
          await activity(
            `${toText(lead.company)} ${name}`,
            leadLinks(index),
            day,
            hour,
            status,
            type,
            feedback,
          );
        } else {
          const { deal, index } = activeDeals[n % activeDeals.length];
          const a = deals[index][0];
          await activity(
            `${companies[a][0]} ${name}`,
            {
              accountId: accounts_[a].id,
              opportunityId: deal.id,
              ownerId: accountOwner(a).id,
              externalParticipants: [contacts[a][0].id],
            },
            day,
            hour,
            status,
            type,
            feedback,
          );
        }
      }
    }
  });

  // Approvals are raised by whoever owns the deal, submitted to 李明; one of
  // them 李明 has already decided, and one 李明 raised himself goes to the
  // other manager, 赵敏 (an administrator is not an approver).
  const raise = (
    who: Actor,
    input: Row,
    day: number,
    submitDay: number,
  ): Promise<Row> =>
    service.mutate(who, async (prepared, q) => {
      const save = saver(prepared, q);
      const record = await save('approvals', input, day);
      await service.approvalAction(
        prepared,
        toText(record.id),
        'submit',
        '',
        q,
      );
      await q
        .updateTable('crmApprovals')
        .set({ submittedAt: at(submitDay, 11), updatedAt: at(submitDay, 11) })
        .where('id', '=', record.id)
        .execute();
      await historyAt(q, at(submitDay, 11));
      return record;
    });
  await raise(
    accountOwner(0),
    {
      name: '华东智造 试点折扣特批',
      opportunityId: opportunities[0].id,
      topic: 'discount',
      approverId: managerActor.id,
      description: '申请 10% 的试点折扣，以换取签署年度承诺。',
    },
    -1,
    -1,
  );
  const paymentTerms = await raise(
    accountOwner(1),
    {
      name: '星桥零售 付款节奏评审',
      opportunityId: opportunities[1].id,
      topic: 'paymentTerms',
      approverId: managerActor.id,
      description: '客户要求首张发票采用 60 天账期。',
    },
    -6,
    -6,
  );
  await service.mutate(managerActor, async (prepared, q) => {
    await service.approvalAction(
      prepared,
      toText(paymentTerms.id),
      'approve',
      '同意 60 天账期，请在合同中注明首期发票金额。',
      q,
    );
    await q
      .updateTable('crmApprovals')
      .set({ decidedAt: at(-5, 15), updatedAt: at(-5, 15) })
      .where('id', '=', paymentTerms.id)
      .execute();
    await historyAt(q, at(-5, 15));
  });
  await raise(
    managerActor,
    {
      name: '远航物流 安全补充条款评审',
      opportunityId: opportunities[3].id,
      topic: 'contractTerms',
      approverId: manager2.id,
      description: '签约前评审拟定的数据处理与安全条款。',
    },
    -2,
    -2,
  );

  // The manifest makes the import repeat-safe and records exactly which rows
  // it created, so removal can find them again.
  await query
    .insertInto('crmSettings')
    .values({
      id: DEMO_MARKER,
      value: JSON.stringify(manifest),
      updatedAt: new Date(),
    })
    .execute();
  // The import queued a notification for every assignment; a demo inbox
  // full of "assigned to you" would drown what the demo is meant to show.
  await query.deleteFrom('crmOutbox').where('recordId', 'in', ids()).execute();
  return demoStatus(service, actor);
}

// Removes exactly the rows the import created, in dependency order. The demo
// accounts stay: they are ordinary accounts now, and deleting people is the
// Users page's job.
export async function resetDemo(
  service: CrmService,
  actor: Actor,
): Promise<DemoStatus> {
  await requireCapability(actor, 'manage', 'settings');
  const query = service.database.query();
  const row = await query
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', DEMO_MARKER)
    .executeTakeFirst();
  const manifest = row ? parseManifest(row.value) : undefined;
  if (!manifest) throw new CrmError('demoMissing', 404);
  const byEntity = new Map<string, string[]>();
  for (const record of manifest.records) {
    const list = byEntity.get(record.entity) ?? [];
    list.push(record.id);
    byEntity.set(record.entity, list);
  }
  const all = manifest.records.map((r) => r.id);
  await service.database.transaction(async ({ query: q }) => {
    if (all.length) {
      await q.deleteFrom('crmHistory').where('recordId', 'in', all).execute();
      await q.deleteFrom('crmOutbox').where('recordId', 'in', all).execute();
    }
    for (const [entity, table] of [
      ['activities', 'crmActivities'],
      ['approvals', 'crmApprovals'],
      ['opportunities', 'crmOpportunities'],
      ['contacts', 'crmContacts'],
      ['leads', 'crmLeads'],
      ['accounts', 'crmAccounts'],
    ] as const) {
      const ids = byEntity.get(entity) ?? [];
      if (ids.length)
        await q.deleteFrom(table).where('id', 'in', ids).execute();
    }
    await q.deleteFrom('crmSettings').where('id', '=', DEMO_MARKER).execute();
  });
  return demoStatus(service, actor);
}
