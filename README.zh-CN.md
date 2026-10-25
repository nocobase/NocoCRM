# NocoCRM

[English](README.MD) | 中文

NocoCRM 是面向 B2B 销售团队的 CRM，基于 [NocoBase 3](https://www.nocobase.com) 构建。它管理线索、公司、联系人、商机、任务和审批，并给团队配了一组 AI Agent：一个可以对话的助手，以及跟进线索和商机、评审审批、准备任务、关注客户公司动态的 Agent。每个 Agent 都只在它所服务的人的权限范围内工作，它提出的每项更改都要等人确认。

## 开始使用

在自己电脑上运行 NocoCRM 只需要 Node.js 和 pnpm：数据默认保存在一个 SQLite 文件里（也可以用 PostgreSQL 或 MySQL），除 AI 外的所有功能都不需要任何账号或密钥。可以让编程 Agent 来安装，也可以手动安装（大约十分钟），装好后登录，再看接下来做什么。

### 用编程 Agent 安装

最省事的方法是让编程 Agent 来装。在准备放 NocoCRM 的文件夹里打开 Claude Code、Codex、Cursor 或其他编程 Agent，把下面这段发给它：

```text
在这台电脑上安装并启动 NocoCRM（https://github.com/nocobase/NocoCRM）。
克隆到 NocoCRM 文件夹，确认有 Node.js 24 或更高版本和 pnpm 11，
然后按仓库里的 AGENTS.md 和 README 操作。
数据库：用默认的 SQLite。
用 pnpm dev 启动，告诉我 Local: 地址和怎么登录。
```

想用 PostgreSQL 或 MySQL，把数据库那一行改成连接信息，例如：`数据库：PostgreSQL，主机 localhost，端口 5432，数据库名 nococrm，用户名 postgres，密码单独告诉你。`

仓库里的 `AGENTS.md` 会指导 Agent 操作，之后还可以让它接入模型服务或邮箱，或者直接修改应用。装好后接着看[登录](#登录)。

### 手动安装

#### 1. 安装工具

- **Node.js 24 或更高版本**。用 `node -v` 查看版本。
- **pnpm 11**。运行一次 `corepack enable`，pnpm 就会使用 `package.json` 指定的版本；也可以用 `npm install -g pnpm@11` 安装。
- **可选：一个大模型服务的 API 密钥**，助手和 AI Agent 需要它，比如 DeepSeek、OpenAI、Claude、Gemini、通义千问。应用启动后再添加（见[接下来做什么](#接下来做什么)）。

#### 2. 获取代码

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
```

#### 3. 生成配置

```bash
pnpm nocobase config init --dialect sqlite
```

这会生成配置文件 `config.yml`，其中的 `secrets` 节包括一个自动生成的密钥，用来加密保存模型密钥、邮箱密码等。`config.yml` 不会提交到 Git。`--dialect sqlite` 表示数据保存在一个文件里；要改用 PostgreSQL 或 MySQL，见[配置](#配置)里的“数据库”。

#### 4. 启动应用

```bash
pnpm dev
```

第一次启动会创建并初始化数据库 `storage/crm.sqlite`。准备好后会打印一个 `Local:` 地址，通常是 `http://127.0.0.1:13000/main/`，在浏览器里打开它。如果 13000 端口被占用，会自动换到下一个空闲端口，所以请以打印出来的地址为准。

### 登录

用初始管理员登录：用户名 `nocobase`，密码 `admin123`。登录后可以在 **设置 → 用户** 里修改密码。应用没有自助注册，其他账号都由管理员创建。

界面默认是英文，右上角头像菜单里可以切换语言。想让所有人默认用中文，在 `config.yml` 里设置 `i18n.defaultLocale: zh-CN`。

### 接下来做什么

1. **用演示数据先看看。** 页面顶部的横幅会提示导入，也可以打开 **设置 → 演示数据**，选择中文或英文后导入。它会加入一个销售团队，带有客户、商机、任务、审批、邮件和对话（见下面的[演示数据](#演示数据)）。
2. **添加团队成员。** 在 **设置 → 用户** 里创建账号或发送邀请，并给每个人分配角色（见下面的[角色](#角色)）。每个角色能做什么，在 **设置 → 角色** 里设置。
3. **需要时连接邮箱和 WhatsApp**（见[配置](#配置)）。
4. **使用 AI。** 先在 **Agent 团队 → 模型** 里添加一个模型服务并填入密钥（DeepSeek、OpenAI、Claude、Gemini、通义千问等都可以）。然后就可以在工作台的输入框里和助手对话；在 **Agent 团队 → 业务指导** 里写下你卖什么、版本和价格、有哪些规则，让 Agent 了解你的业务；在 **Agent 团队 → Agent 工作** 里开关后台 Agent。不接入模型的话，除 AI 外的功能都能正常使用。
5. **正式使用。** 在 **设置 → 演示数据** 里清除演示数据，你自己的记录会保留。

### 演示数据

页面顶部的横幅会提供 **演示数据**，在 **设置 → 演示数据** 里导入和清除，有中文和英文两种。它会创建几个销售账号，密码为用户名加 `123`：

| 语言 | 销售经理            | 销售人员                      |
| ---- | ------------------- | ----------------------------- |
| 英文 | `daniel`、`emily`   | `sophie`、`oliver`            |
| 中文 | `liming`、`zhaomin` | `wangxiaofang`、`chenxiaohao` |

导入的管理员也会成为销售经理，有自己的记录、审批、AI 建议和对话。每个账号有一个演示邮箱（`<用户名>@demo.example`），里面是这套数据里的客户往来；还有一个演示 WhatsApp 号码，里面有几段客户对话。所以不连接任何服务就能试用邮件和 WhatsApp。演示邮件不会发到这套数据的 `.example` 地址以外。清除演示数据时会一并删除这些内容，并停用演示账号。演示数据的金额以人民币计，导入时会把货币设为 CNY；清除后如需其他货币，在 **设置 → 通用** 里修改。

### 角色

账号在 **设置 → 用户** 里创建，每个账号可以有一个或多个角色；没有自助注册。

| 角色     | 能做什么                                                             |
| -------- | -------------------------------------------------------------------- |
| 管理员   | 配置 CRM、Agent 和集成，可以看到所有内容                             |
| 销售经理 | 查看和编辑所有销售记录、分配负责人、审批、导出；可删除自己创建的记录 |
| 销售人员 | 查看团队的记录，编辑自己的记录，发起审批                             |

### 常见问题

| 遇到的情况                        | 怎么办                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install` 拒绝运行或提示版本 | 使用 Node.js 24 或更高版本和 pnpm 11（见[安装工具](#1-安装工具)）。                                                                                           |
| 页面打不开                        | 使用 `pnpm dev` 打印的 `Local:` 地址，包括 `/main/`。同一个目录只能运行一个 `pnpm dev`，先停掉另一个。                                                        |
| 提示"助手暂时不可用"              | 还没有接入模型。在 **Agent 团队 → 模型** 里添加一个模型服务并填入密钥。                                                                                       |
| 忘记管理员密码                    | 让另一位管理员在 **设置 → 用户** 里重置。本地使用的话，也可以按下面的方法重新开始，并在 `config.yml` 里设新密码。                                             |
| 已保存的密钥或邮箱不能用了        | `config.yml` 丢了或被重新生成。恢复备份的 `config.yml`，或者重新填写密钥、重新连接邮箱。                                                                      |
| 想从空数据库重新开始              | 停掉 `pnpm dev`，删除 `storage/crm.sqlite`、`storage/objects/` 和 `storage/ai-files/`，再重新启动。这会删除所有本地数据。                                     |
| 想更新到最新版本                  | `git pull`，然后 `pnpm install` 和 `pnpm dev`。数据库变更会在启动时自动应用；如果数据重要，请先备份 `storage/`。                                              |
| 启动时提示迁移的 checksum 不一致  | 新版本改写了数据库已经执行过的迁移，但它做的事没有变（为了也能在 PostgreSQL 和 MySQL 上运行）。在终端里运行一次 `pnpm nocobase db repair`，记下新的写法即可。 |

## Agent

CRM 的所有 AI 都基于 Agents 插件，使用为应用配置的模型服务（见[配置](#配置)）。

**销售专家。** 每个页面底部都浮着一个对话框，工作台打开时也有一个，以往的对话在对话页。销售专家根据当前用户能看到的记录回答，能读取上传的文件，也知道用户正在看哪条记录。需要改动时，它会给出一份计划（建任务、改商机、推进线索），由用户逐步确认。它以该用户的身份写入，绝不超出该用户的权限。

**Agent 工作。** 五个 Agent 在后台工作，各自由事件触发，管理员可以逐个开关：

| Agent    | 触发时机                                                                 | 产出                                                             |
| -------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 线索跟进 | 新线索、任务完成、客户回复、所在公司有变化、线索合并、每日检查           | 下一步、评级、缺口、待补字段、邮件草稿，或建议转化               |
| 商机跟进 | 新商机、任务完成、审批有结论、客户回复、每日检查                         | 下一步、建议推进到的阶段、成交可能性、需要审批的条款             |
| 审批助手 | 提交审批                                                                 | 给审批人的评审：申请了什么、对照业务指导、建议的结论             |
| 任务准备 | 每日检查即将到来的任务                                                   | 每场会议或电话的准备：谁参加、之前发生过什么、要问什么           |
| 公司情报 | 新建公司时；每天早上检查有在谈商机或被标为关注的公司，也可以随时手动检查 | 新公司的基本资料；联网搜到的融资、招聘、高管变动、业务动向和风险 |

跟进、评审和准备的结果进入负责人的 **收件箱 → AI 建议**，逐条接受、修改或忽略；负责人决定之前，什么都不会改。公司信号记在公司的「信号」标签页和时间线上并通知负责人，重要的信号会触发这家公司在谈商机的跟进。

**智能建档。** 把邮件、聊天记录或名片上的文字粘贴进来，「AI 整理」会先和已有记录核对，再整理成新线索或一个商机，你核对后保存。

**按你的方式工作。** 每个 Agent 遵循的方法是一个技能，在 **Agent 团队 → 技能** 里编辑；公司自己的情况（卖什么、版本和价格、什么时候跟进、什么需要审批）是 **业务指导**，在 **Agent 团队 → 业务指导** 里编辑。Agent、模型和 token 用量分别在 **Agent 团队 → Agent**、**模型** 和 **用量** 里。Agent 自己写的内容使用 **AI 工作语言** 设置的语言（中文或英文）；助手用提问所用的语言回答。

## 其他功能

- **记录。** 线索、公司、联系人、商机、任务和审批。有列表、看板、记录页和抽屉，带评论和 @ 提及的时间线、附件和变更历史。
- **工作台。** 今天和逾期的工作、销售漏斗和最近的对话，可看自己的记录或整个团队的。
- **收件箱。** 等你处理的 AI 建议和各类通知：分配、审批、提及、评论和任务提醒，每一类都可以在设置里关闭。
- **报表。** 关键指标、收入和预测、输单和节奏、线索来源和团队业绩。
- **全局搜索。** ⌘K / Ctrl+K 搜索所有记录，也可以把问题直接交给助手。
- **线索。** 转化为公司、联系人和商机，转化前与已有记录核对；发现并合并重复线索。
- **邮件。** 每个人连接自己的邮箱，在 CRM 里收发邮件；与客户的往来显示在相关记录上。
- **WhatsApp。** 连接公司的 WhatsApp Business 号码，客户消息自动关联到线索和联系人，并显示在记录上。
- **审批。** 可设置谁有权审批。
- **角色。** 管理员、销售经理和销售人员，由服务端按记录控制，可以在 **设置 → 角色** 里调整。
- **LinkedIn。** 线索、联系人和公司可记录 LinkedIn 地址，用于查找重复，粘贴的文字里有时 AI 会自动填上。
- **语言。** 界面支持 10 种语言：简体中文、繁体中文、英文、日文、德文、法文、西班牙文、葡萄牙文（巴西）、印尼文和越南文。演示数据和 AI 工作语言为中文或英文。

## 配置

`config.yml` 保存密钥，不提交到仓库；`config.example.yml` 说明了每个选项。用 `pnpm nocobase config set key=value` 修改配置。

**AI。** 默认的模型服务是 DeepSeek，通过环境变量 `DEEPSEEK_API_KEY` 提供密钥。该服务在 `server/config/ai.ts` 里声明；没有密钥时不会创建，一个服务都没有时 AI 关闭。启动时，**Agent 团队 → 模型** 里还没有的服务会自动创建，之后由该页面管理。其他服务商（如 OpenAI、Anthropic 的 Claude、Google 的 Gemini、通义千问）在该页面填入 key 即可添加（也可在 `config.yml` 的 `ai.llmServices` 下声明），再到 **Agent 团队 → Agent 工作** 里用「设置模型和指令」为各个 Agent 选择模型。助手和跟进类 Agent 优先使用 DeepSeek。公司调研用它的模型联网搜索，需要选能联网搜索的模型：DeepSeek、OpenAI、Anthropic（Claude）、Google（Gemini）或通义千问。

**通知。** 站内收件箱需要 `inbox` 通道（`notification.channels.inbox: { type: in-app }`，`config.example.yml` 里已有）。每一类通知都可以在 **设置 → 通用 → 提醒设置** 里关闭。

**邮件。** 在 `mail.providers` 下声明允许连接的邮件服务器（示例见 `config.example.yml`）；每个人在 **邮箱 → 管理邮箱账户** 里连接自己的邮箱。Gmail 和 Microsoft 365 还需要一个 OAuth 客户端，回调地址为 `<origin><base path>/mail/oauth/callback`。

**WhatsApp。** 管理员在 **WhatsApp → 管理 WhatsApp 连接** 里填入 Meta 应用的密钥和号码的访问令牌，再把页面上显示的 Webhook 地址和验证令牌登记到 Meta 应用里。

**访问地址。** `APP_BASE_PATH` 是挂载路径（默认 `/main`），`APP_PUBLIC_ORIGIN` 是不含路径的公开源地址。

**数据库。** 默认使用 SQLite，文件为 `storage/crm.sqlite`；启动时自动执行迁移。NocoCRM 也可以运行在 PostgreSQL 和 MySQL 上（MariaDB 使用 MySQL 驱动）。这两个驱动只为开发和测试安装，构建出的包只带 SQLite；要使用其中一个：

1. 用 `pnpm add --save-prod @nocobase/db-postgres`（或 `@nocobase/db-mysql`）把驱动移到构建时打包的 dependencies 里。
2. 创建一个空数据库（MySQL 使用 `utf8mb4` 字符集），以及一个可以在其中建表的用户。
3. 用 `pnpm nocobase config init --dialect postgres`（或 `mysql`；已有 `config.yml` 时加 `--force` 替换）生成配置，用 `pnpm nocobase config set database.connections.main.host=… database.connections.main.port=… database.connections.main.database=… database.connections.main.username=…` 设置连接，用 `pnpm nocobase config set --from-env database.connections.main.password=<环境变量名>` 设置密码，再用 `pnpm nocobase config check` 检查。
4. 用 `pnpm dev` 启动，或按下文构建和部署：第一次启动会建表。在 PostgreSQL 上，它还会在连接的 schema 里添加两个小函数，以及使用它们的 `json` 与 `text` 之间的 `LIKE` 运算符，让 CRM 能像在 SQLite 和 MySQL 上一样匹配 JSON 列。

环境变量 `DB_DIALECT`、`DB_HOST`、`DB_PORT`、`DB_DATABASE`、`DB_USERNAME` 和 `DB_PASSWORD` 会覆盖 `config.yml`。更换数据库不会迁移数据：新库是空的，可以用 **设置 → 演示数据** 填充。测试默认在 SQLite 上运行；`NOCOBASE_TEST_DB_DIALECT=postgres` 让数据库测试在 PostgreSQL 服务器上运行（服务器读自 `PGHOST`、`PGPORT`、`PGUSER`、`PGPASSWORD` 和 `PGDATABASE`，每个测试使用自己的 schema），`NOCOBASE_TEST_DB_DIALECT=mysql` 则在 MySQL 服务器上运行（`MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_ADMIN_USER` 和 `MYSQL_ADMIN_PASSWORD`，每个测试使用自己的数据库）。

## 基于 NocoBase 3

NocoBase 3 是用编码 Agent 构建业务软件的应用底座。它的 App Foundation 提供每个业务应用都需要的基础设施，应用不必再自己搭一遍。NocoCRM 是一个 NocoBase Solution：由 NocoBase 应用模板生成的完整应用，在底座之上有自己的数据模型、服务、API 和页面。

| 来自 NocoBase 3              | NocoCRM 用它做什么                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| 应用服务器、数据库层和命令行 | 服务端、迁移和种子数据、配置、构建和部署                                            |
| 应用模板和 UI Library        | 布局、路由、主题、登录页，以及每个页面所用的组件                                    |
| 认证、用户和 API 密钥        | 登录、用户账号和个人 API 密钥                                                       |
| 授权（权限集、记录访问规则） | 三个角色、每条记录的可见和可编辑范围、页面授权，以及角色设置                        |
| Agents 插件                  | Agent、对话、技能、模型服务、用量，以及 CRM 提供给 Agent 的命令                     |
| 通知插件                     | 站内收件箱                                                                          |
| 生命周期库                   | 审批的状态和流转、每次流转触发的动作、审批人规则，以及「设置 → 审批流程」里的流程图 |
| 定时任务                     | 每日跟进检查、任务准备和公司信号检查                                                |
| 邮件插件                     | 每个人的邮箱：同步、阅读、撰写和发送                                                |
| 文件和多语言插件             | 附件及其预览，10 种界面语言                                                         |
| 数据库浏览器                 | 以只读方式浏览应用的数据表                                                          |

## 部署

为服务器构建一个压缩包。它包含代码和生产依赖，不含配置、数据库和上传的文件：

```bash
pnpm build --target linux-x64 --tar   # 生成 storage/exports/dist.tar.gz
```

- **使用 NocoBase app-installer（推荐）。** 服务器需要 Node.js 24 和全局安装的 pm2。安装器会解压压缩包、生成 `config.yml`、执行迁移，并用 pm2 运行应用；升级时先备份 SQLite 数据库，新版本启动失败会自动回滚。

  ```bash
  npx @nocobase/app-installer@beta install /srv/nocobase/crm --archive dist.tar.gz --origin https://crm.example.com --base-path /crm
  npx @nocobase/app-installer@beta upgrade --dir /srv/nocobase/crm --archive dist.tar.gz
  ```

- **手动部署。** 解压后在 `dist/` 里运行 `pnpm nocobase config init`（构建包里有不止一个数据库驱动时加上 `--dialect`）和 `pnpm nocobase config check`，再用进程管理器运行 `node ./dist/server/standalone.js`；更新时保留 `dist/` 旁边的 `config.yml` 和 `storage/`。

如果要通过 CDN 提供前端静态文件，构建时设置 `CDN_BASE_URL=https://cdn.example.com/crm/v1/ pnpm build`，把 `dist/client/` 按原路径上传到 CDN，并允许应用的源地址跨域访问；服务器上也要保留 `dist/client/`，它仍然负责返回 HTML。

放在反向代理后面时，保留公开的主机名和协议，并转发 WebSocket 升级。部署后设置 AI 密钥，检查 `<base path>/api/healthz`。升级前备份数据库和 `storage/`。

## 开发

`AGENTS.md` 是开发这份代码的指南，适用于 Claude Code 或任何编码 Agent。常用命令：

| 命令                     | 作用                         |
| ------------------------ | ---------------------------- |
| `pnpm dev`               | 以热更新方式运行服务端和前端 |
| `pnpm build`             | 构建到 `dist/`               |
| `pnpm start`             | 运行构建结果                 |
| `pnpm test`              | 运行 `tests/` 里的测试       |
| `pnpm typecheck`         | 对前端和服务端做类型检查     |
| `pnpm lint`              | 代码检查                     |
| `pnpm check`             | 以上全部再加一次构建         |
| `pnpm nocobase db apply` | 不重启即执行待处理的迁移     |
| `pnpm nocobase --help`   | 列出其他所有命令             |

## 许可证

MIT
