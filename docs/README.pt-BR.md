<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/nococrm-logo-dark.svg">
    <img src="images/nococrm-logo.svg" width="240" alt="NocoCRM">
  </picture>
</h1>

<p align="center"><strong>Suas vendas ganharam uma equipe de agentes 24/7.</strong></p>

<p align="center">CRM de código aberto para vendas B2B · Construído sobre o NocoBase</p>

<p align="center">
  <a href="../LICENSE.txt"><img src="https://img.shields.io/badge/license-NocoBase-blue" alt="NocoBase License"></a>
  <a href="https://github.com/nocobase/NocoCRM/tags"><img src="https://img.shields.io/github/v/tag/nocobase/NocoCRM?label=version&sort=semver&include_prereleases" alt="version"></a>
  <a href="https://www.nocobase.com"><img src="https://img.shields.io/badge/built%20on-NocoBase-1f6feb" alt="Built on NocoBase"></a>
</p>

<p align="center">
  <a href="https://solutions.nocobase.com/crm/"><strong>Experimente online</strong></a> · <a href="https://www.nocobase.com/pt-BR/solution-crm/">Site</a>
</p>

<p align="center">
  <a href="../README.MD">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja-JP.md">日本語</a> · <a href="README.ko-KR.md">한국어</a> · <a href="README.de-DE.md">Deutsch</a> · <a href="README.fr-FR.md">Français</a> · <a href="README.es-ES.md">Español</a> · <strong>Português</strong> · <a href="README.ru-RU.md">Русский</a> · <a href="README.id-ID.md">Bahasa Indonesia</a> · <a href="README.vi-VN.md">Tiếng Việt</a>
</p>

O NocoCRM é um CRM de código aberto para vendas B2B, construído sobre o [NocoBase](https://www.nocobase.com). Ele vem com 6 agentes de vendas e se integra ao seu e-mail e ao WhatsApp: acompanha leads e oportunidades, responde mensagens na hora e revisa aprovações com você. Os agentes sugerem; você decide.

https://github.com/user-attachments/assets/5fea8e15-692a-45ff-b73f-83df648f8fca

## Funcionalidades

- **Acompanhamento automático.** Um novo lead ou negócio, a resposta de um cliente, uma tarefa concluída, a verificação da manhã: um agente lê todo o contexto e coloca o próximo passo na sua caixa de entrada, com a recomendação, a confiança e os motivos. Os registros só mudam quando você aceita.
- **Todos os canais em uma só linha do tempo.** Cada pessoa conecta a própria caixa de e-mail (Gmail, Microsoft 365 ou qualquer servidor IMAP/SMTP), e a empresa o seu número do WhatsApp Business. As mensagens são associadas a leads e contatos, e as respostas são redigidas para sair da sua própria conta.
- **6 agentes de vendas.** O Sales Expert para conversar em qualquer página, além de cinco que trabalham em segundo plano: acompanhamento de leads, acompanhamento de oportunidades, análise de aprovação, preparação de tarefas e pesquisa de empresas, cada um com seus gatilhos, habilidades e um registro das execuções.
- **Cadastro inteligente.** Cole um e-mail, uma conversa ou um cartão de visita: a IA compara com os registros existentes e transforma em leads ou em uma oportunidade, que você revisa antes de salvar. Para uma empresa nova, basta o nome: a IA completa os dados dela pela web. Leads duplicados são encontrados e mesclados.
- **Sinais de empresas.** Toda manhã, a pesquisa de empresas busca na web notícias das empresas com oportunidades em aberto ou que você acompanha: captações, contratações, mudanças na liderança, movimentos do negócio e riscos, com as fontes. Um sinal importante dispara o acompanhamento das oportunidades em aberto.
- **As aprovações não travam mais.** O agente de aprovações confronta um desconto ou uma condição com as suas regras e decisões anteriores, e redige uma recomendação e um comentário para quem aprova.
- **O ciclo de vendas completo.** Leads, empresas, contatos, oportunidades, tarefas, aprovações e relatórios, com quadro de oportunidades, calendário de tarefas, busca em todos os registros (⌘K / Ctrl+K) e papéis aplicados pelo servidor registro a registro.
- **Personalizável.** Escreva seus preços, limites de desconto e ritmo de acompanhamento em texto simples nas orientações de negócio, e todo agente segue; o método de cada agente é uma habilidade que você pode editar. O código é aberto, então um agente de programação pode mudar o resto.
- **Auto-hospedado.** Seus dados ficam nos seus servidores, com os modelos que você escolher: DeepSeek, OpenAI, Claude, Gemini, Qwen e outros.

## Início rápido

Só quer dar uma olhada? [Experimente online](https://solutions.nocobase.com/crm/): você entra com uma conta de demonstração, e todos os dados são fictícios.

### 1. Instalar

**Com um agente de programação.** O jeito mais fácil. Abra o Claude Code, o Codex ou o Cursor na pasta onde o NocoCRM vai ficar e diga:

```text
Instale o NocoCRM a partir de https://github.com/nocobase/NocoCRM e inicie-o, seguindo o AGENTS.md e o README do repositório.
```

**Manualmente.** Você precisa do Node.js 24 ou mais recente e do pnpm 11 (`corepack enable`). Os dados ficam por padrão em um arquivo SQLite; PostgreSQL e MySQL também funcionam.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Entrar

Abra o endereço `Local:` que o `pnpm dev` exibe, normalmente `http://127.0.0.1:13000/main/`, e entre como `nocobase` com a senha `admin123`.

### 3. Importar os dados de demonstração

O banner no topo oferece a importação, ou abra **Configurações → Dados de demonstração**. Eles trazem uma equipe de vendas com clientes, negócios, tarefas, aprovações, e-mails e conversas; remova-os na mesma página quando for usar de verdade.

### 4. Configurar um modelo de IA

Adicione um serviço de modelo com a chave em **Equipe de Agents → Modelos**, como DeepSeek, OpenAI, Claude, Gemini ou Qwen. O assistente e os agentes precisam dele; todo o resto funciona sem.

O [guia](guide.md) (em inglês) cobre os próximos passos, as contas de demonstração, os papéis, a configuração (IA, e-mail, WhatsApp, bancos de dados), a implantação e o desenvolvimento.

Para produção, veja [Implantação](guide.md#deployment); para PostgreSQL e MySQL, veja [Configuração](guide.md#configuration).

## Licença

O NocoCRM é construído sobre o NocoBase e publicado sob a [Licença NocoBase](../LICENSE.txt).
