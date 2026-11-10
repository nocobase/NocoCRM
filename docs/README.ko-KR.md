<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/nococrm-logo-dark.svg">
    <img src="images/nococrm-logo.svg" width="240" alt="NocoCRM">
  </picture>
</h1>

<p align="center"><strong>영업팀에 24시간 에이전트 팀을.</strong></p>

<p align="center">오픈소스 B2B 영업 CRM · NocoBase 기반</p>

<p align="center">
  <a href="../LICENSE.txt"><img src="https://img.shields.io/badge/license-NocoBase-blue" alt="NocoBase License"></a>
  <a href="https://github.com/nocobase/NocoCRM/tags"><img src="https://img.shields.io/github/v/tag/nocobase/NocoCRM?label=version&sort=semver&include_prereleases" alt="version"></a>
  <a href="https://www.nocobase.com"><img src="https://img.shields.io/badge/built%20on-NocoBase-1f6feb" alt="Built on NocoBase"></a>
</p>

<p align="center">
  <a href="https://solutions.nocobase.com/crm/"><strong>온라인 체험</strong></a> · <a href="https://www.nocobase.com/ko-KR/solution-crm/">웹사이트</a>
</p>

<p align="center">
  <a href="../README.MD">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja-JP.md">日本語</a> · <strong>한국어</strong> · <a href="README.de-DE.md">Deutsch</a> · <a href="README.fr-FR.md">Français</a> · <a href="README.es-ES.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.ru-RU.md">Русский</a> · <a href="README.id-ID.md">Bahasa Indonesia</a> · <a href="README.vi-VN.md">Tiếng Việt</a>
</p>

NocoCRM은 [NocoBase](https://www.nocobase.com)로 만든 오픈소스 B2B 영업 CRM입니다. 영업 에이전트 6종이 내장되어 있고 이메일과 WhatsApp이 연동됩니다. 리드와 영업 기회를 후속 조치하고, 메시지에 바로 답하고, 승인 검토를 함께합니다. 제안은 에이전트가, 결정은 사람이 합니다.

https://github.com/user-attachments/assets/ac3df8c9-dc36-4e0b-9775-ebf6c70c7f3c

## 기능

- **자동 후속 조치.** 새 리드나 거래, 고객의 답장, 완료된 작업, 아침 점검이 있을 때마다 에이전트가 전체 맥락을 읽고 판단, 확신도, 근거와 함께 다음 단계를 받은편지함에 넣어 줍니다. 레코드는 사용자가 수락할 때만 바뀝니다.
- **모든 채널을 하나의 타임라인에.** 각자 자신의 메일함(Gmail, Microsoft 365 또는 모든 IMAP/SMTP 서버)을, 회사는 WhatsApp Business 번호를 연결합니다. 메시지는 리드와 연락처에 자동으로 연결되고, 답장 초안은 사용자 본인의 계정에서 발송됩니다.
- **영업 에이전트 6종.** 어느 페이지에서나 대화할 수 있는 Sales Expert와 함께, 백그라운드에서 일하는 리드 후속 조치, 영업 기회 후속 조치, 승인 검토, 작업 준비, 회사 리서치가 각자의 트리거, 스킬, 실행 기록을 갖고 있습니다.
- **스마트 등록.** 이메일, 채팅, 명함을 붙여 넣으면 AI가 기존 레코드와 대조해 리드나 영업 기회로 정리하고, 확인한 뒤 저장합니다. 새 회사는 이름만 입력하면 AI가 웹에서 회사 정보를 채웁니다. 중복된 리드는 찾아서 병합합니다.
- **회사 동향.** 매일 아침 회사 리서치가 진행 중인 영업 기회가 있거나 관심 목록에 있는 회사의 소식을 웹에서 찾습니다. 투자 유치, 채용, 경영진 변화, 사업 동향과 리스크를 출처와 함께 알려 주고, 중요한 소식이면 해당 영업 기회의 후속 조치가 시작됩니다.
- **승인이 멈추지 않습니다.** 승인 에이전트가 할인이나 조건을 회사 규칙과 과거 결정에 비추어 검토하고, 승인자를 위한 권고와 의견을 작성합니다.
- **영업의 전 과정.** 리드, 회사, 연락처, 영업 기회, 작업, 승인, 보고서. 영업 기회 보드, 작업 캘린더, 모든 레코드를 찾는 검색(⌘K / Ctrl+K)이 있고, 역할별 권한은 서버가 레코드마다 적용합니다.
- **원하는 대로 맞춤화.** 가격, 할인 한도, 후속 조치 주기를 비즈니스 가이드에 평범한 문장으로 적으면 모든 에이전트가 따릅니다. 각 에이전트의 작업 방식은 수정할 수 있는 스킬입니다. 소스 코드가 공개되어 있으니 나머지는 코딩 에이전트에게 바꾸게 하면 됩니다.
- **직접 호스팅.** 데이터는 내 서버에 두고, 모델은 원하는 것으로 고릅니다: DeepSeek, OpenAI, Claude, Gemini, Qwen 등.

## 빠른 시작

먼저 둘러보고 싶다면 [온라인 체험](https://solutions.nocobase.com/crm/): 데모 계정으로 로그인된 상태로 열리며, 모든 데이터는 가상입니다.

### 1. 설치

**코딩 에이전트로 설치.** 가장 쉬운 방법입니다. NocoCRM을 둘 폴더에서 Claude Code, Codex 또는 Cursor를 열고 이렇게 말하세요.

```text
https://github.com/nocobase/NocoCRM 에서 NocoCRM을 설치하고 실행해 줘. 저장소의 AGENTS.md와 README를 따라 줘.
```

**직접 설치.** Node.js 24 이상과 pnpm 11(`corepack enable`)이 필요합니다. 데이터는 기본적으로 SQLite 파일에 저장되며, PostgreSQL과 MySQL도 사용할 수 있습니다.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. 로그인

`pnpm dev`가 출력하는 `Local:` 주소(보통 `http://127.0.0.1:13000/main/`)를 열고 사용자 이름 `nocobase`, 비밀번호 `admin123`으로 로그인합니다.

### 3. 데모 데이터 가져오기

화면 상단의 배너나 **설정 → 데모 데이터**에서 가져옵니다. 고객, 거래, 작업, 승인, 메일, 대화가 있는 영업팀이 추가됩니다. 실제로 사용하기 전에 같은 페이지에서 삭제하세요.

### 4. AI 모델 설정

**Agent 팀 → 모델**에서 DeepSeek, OpenAI, Claude, Gemini, Qwen 같은 모델 서비스를 키와 함께 추가합니다. 어시스턴트와 에이전트에 필요하며, 나머지 기능은 없어도 동작합니다.

[가이드](guide.md)(영어)에서 이후 단계, 데모 계정, 역할, 설정(AI, 메일, WhatsApp, 데이터베이스), 배포와 개발을 설명합니다.

운영 환경 배포는 [배포](guide.md#deployment)를, PostgreSQL이나 MySQL에서 실행하려면 [설정](guide.md#configuration)을 참고하세요.

## 라이선스

NocoCRM은 NocoBase로 만들어졌으며 [NocoBase 라이선스](../LICENSE.txt)로 배포됩니다.
