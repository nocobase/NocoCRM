<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/nococrm-logo-dark.svg">
    <img src="images/nococrm-logo.svg" width="240" alt="NocoCRM">
  </picture>
</h1>

<p align="center"><strong>给你的销售，配一支 7×24 的 Agent 团队。</strong></p>

<p align="center">开源 B2B 销售 CRM · 基于 NocoBase 构建</p>

<p align="center">
  <a href="../LICENSE.txt"><img src="https://img.shields.io/badge/license-NocoBase-blue" alt="NocoBase License"></a>
  <a href="https://github.com/nocobase/NocoCRM/tags"><img src="https://img.shields.io/github/v/tag/nocobase/NocoCRM?label=version&sort=semver&include_prereleases" alt="version"></a>
  <a href="https://www.nocobase.com"><img src="https://img.shields.io/badge/built%20on-NocoBase-1f6feb" alt="Built on NocoBase"></a>
</p>

<p align="center">
  <a href="https://solutions-cn.nocobase.com/crm/"><strong>在线体验</strong></a> · <a href="https://www.nocobase.com/zh-CN/solution-crm/">官网介绍</a>
</p>

<p align="center">
  <a href="../README.MD">English</a> · <strong>简体中文</strong> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja-JP.md">日本語</a> · <a href="README.ko-KR.md">한국어</a> · <a href="README.de-DE.md">Deutsch</a> · <a href="README.fr-FR.md">Français</a> · <a href="README.es-ES.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.ru-RU.md">Русский</a> · <a href="README.id-ID.md">Bahasa Indonesia</a> · <a href="README.vi-VN.md">Tiếng Việt</a>
</p>

NocoCRM 是基于 [NocoBase](https://www.nocobase.com) 的开源 B2B 销售 CRM。它内置 6 个销售 Agent，并集成邮箱与 WhatsApp：自动跟进线索与商机，即时回复来信，审批时帮你分析。Agent 给建议，人来拍板。

https://github.com/user-attachments/assets/1941589c-4597-41d6-b4e3-5f5ca807b213

## 功能

- **自动跟进。** 新线索、新商机、客户回信、任务完成、每天早晨的巡检，Agent 都会自动触发，读完上下文后把下一步建议送进收件箱，写明结论、把握和依据。只有你采纳后才修改记录。
- **全渠道归到一条时间线。** 每个人连接自己的邮箱（Gmail、Microsoft 365 或任意 IMAP/SMTP 邮箱），公司连接 WhatsApp Business 号码。来信自动匹配到线索和联系人，回复起草好，由你的账号发出。
- **6 个销售 Agent。** 每个页面都能对话的销售专家，加上在后台工作的线索跟进、商机跟进、审批助手、任务助手和公司情报，各有触发条件、技能和运行记录。
- **智能建档。** 粘贴一封邮件、一段聊天或一张名片，AI 对照已有记录，整理成线索或商机，由你确认后保存；新建公司只要写上名字，AI 会联网补全公司资料。重复的线索会被找出并合并。
- **公司动态。** 每天早上，公司情报联网查找有在谈商机或被关注的公司的新闻：融资、招聘、高管变动、业务动向和风险，附上来源。重要的动态会触发这些商机的跟进。
- **审批不再卡壳。** 审批助手对照你的规则和历史同类，核算折扣和条款，给审批人起草建议和审批意见。
- **从线索到成交。** 线索、公司、联系人、商机、任务、审批和报表，带商机看板、任务日历和覆盖所有记录的搜索（⌘K / Ctrl+K），按角色由服务端逐条控制记录权限。
- **按你的方式定制。** 用几句话把价格、折扣上限和跟进节奏写进业务指导，每个 Agent 都照着做；每个 Agent 的工作方法是一个可以修改的技能。源码开放，其余的交给编程 Agent 来改。
- **私有部署。** 数据留在你自己的服务器上，模型自己选：DeepSeek、OpenAI、Claude、Gemini、通义千问等。

## 快速开始

只想先看看？[在线体验](https://solutions-cn.nocobase.com/crm/)：打开即以演示账号登录，所有数据都是虚构的。

### 1. 安装

**用编程 Agent 安装。** 最简单的方式。在要放 NocoCRM 的目录里打开 Claude Code、Codex 或 Cursor，告诉它：

```text
从 https://github.com/nocobase/NocoCRM 安装 NocoCRM 并启动，按仓库的 AGENTS.md 和 README 操作。
```

**手动安装。** 需要 Node.js 24 或更高版本和 pnpm 11（`corepack enable`）。数据默认存在一个 SQLite 文件里，也可以用 PostgreSQL 和 MySQL。

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. 登录

打开 `pnpm dev` 打印的 `Local:` 地址（通常是 `http://127.0.0.1:13000/main/`），用 `nocobase` 和密码 `admin123` 登录。

### 3. 导入演示数据

页面顶部的横幅会提示导入，也可以打开 **设置 → 演示数据**。它会加入一个销售团队，带有客户、商机、任务、审批、邮件和对话；正式使用前在同一页移除。

### 4. 配置 AI 模型

在 **Agent 团队 → 模型** 里添加一个模型服务并填入密钥，比如 DeepSeek、OpenAI、Claude、Gemini 或通义千问。助手和各个 Agent 需要它，其他功能都不需要。

[使用指南](guide.md)（英文）介绍上手步骤、演示账号、角色、配置（AI、邮件、WhatsApp、数据库）、部署和开发。

正式部署见[部署](guide.md#deployment)；使用 PostgreSQL 或 MySQL 见[配置](guide.md#configuration)。

## 许可证

NocoCRM 基于 NocoBase 构建，以 [NocoBase 许可协议](../LICENSE.txt)发布。
