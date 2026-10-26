import type { AppResource } from './en-US.js';
import { crmPtBR } from './crm/pt-BR.js';
import settingsPtBR from './settings/pt-BR.js';

// The pages in pt-BR: the template's copy (./system/), the AI skills'
// display text and the CRM's own (./crm/pt-BR.ts), with the same keys as
// ./en-US.ts. The template ships no pt-BR, so its copy is translated
// here; a template upgrade that adds keys fails the type check until they
// are translated.
const ptBR: AppResource = {
  'auth.passwordResetSuccess':
    'Sua senha foi redefinida. Entre com a nova senha.',
  'auth.requestNewResetLink': 'Solicitar um novo link de redefinição',
  'auth.preparingSession': 'Preparando sua sessão…',
  'auth.connectionFailed': 'Não foi possível conectar',
  'auth.connectionFailedDescription':
    'Não foi possível preparar a conexão em tempo real. Tente novamente para entrar no aplicativo ou saia.',
  'deviceApproval.title': 'Autorizar um dispositivo',
  'deviceApproval.description':
    'Uma linha de comando ou outro dispositivo pediu para entrar com a sua conta. Aprove somente se você mesmo iniciou o acesso.',
  'deviceApproval.enterCode': 'Digite o código exibido no seu dispositivo.',
  'deviceApproval.codeLabel': 'Código',
  'deviceApproval.continue': 'Continuar',
  'deviceApproval.checking': 'Verificando o código…',
  'deviceApproval.confirm':
    'Confira se este código é igual ao exibido no seu dispositivo.',
  'deviceApproval.client': 'Solicitado por {{client}}',
  'deviceApproval.approve': 'Aprovar',
  'deviceApproval.approving': 'Aprovando…',
  'deviceApproval.deny': 'Negar',
  'deviceApproval.denying': 'Negando…',
  'deviceApproval.approved':
    'Dispositivo aprovado. Volte ao terminal para continuar; você pode fechar esta página.',
  'deviceApproval.denied':
    'Solicitação negada. O dispositivo não foi conectado à sua conta; você pode fechar esta página.',
  'deviceApproval.expired':
    'Este código expirou. Inicie o acesso novamente no seu dispositivo.',
  'deviceApproval.invalid':
    'Este código não é válido. Compare-o com o do seu dispositivo e tente novamente.',
  'deviceApproval.notYours':
    'Este código já está sendo aprovado por outra conta.',
  'deviceApproval.error': 'Algo deu errado. Tente novamente.',
  'deviceApproval.retry': 'Tentar novamente',
  'deviceApproval.otherCode': 'Digitar outro código',
  'inbox.title': 'Caixa de entrada',
  'inbox.description': 'Notificações e solicitações enviadas a você.',
  'inbox.views.all': 'Notificações',
  'inbox.views.todo': 'Sugestões da IA',
  'inbox.kinds.label': 'Tipo',
  'inbox.kinds.all': 'Todos os tipos',
  'inbox.kinds.decision': 'Decisões',
  'inbox.kinds.info': 'Notificações',
  'inbox.tabs.decision': 'Aguardando minha decisão',
  'inbox.tabs.info': 'Notificações',
  'inbox.clearFilter': 'Limpar filtro',
  'inbox.noMatchDescription': 'Limpe o filtro para ver todos os tipos.',
  'inbox.readAll': 'Marcar tudo como lido',
  'inbox.allRead': 'Tudo marcado como lido.',
  'inbox.loading': 'Carregando',
  'inbox.loadFailed': 'Não foi possível carregar a caixa de entrada',
  'inbox.loadFailedDescription': 'Verifique sua conexão e tente novamente.',
  'inbox.retry': 'Tentar novamente',
  'inbox.loadMore': 'Carregar mais',
  'inbox.emptyAll': 'Nada por aqui',
  'inbox.empty.todo': 'Nada aguardando você',
  'inbox.empty.decision': 'Nenhuma decisão aguardando você',
  'inbox.empty.info': 'Nenhuma notificação',
  'inbox.emptyDescription':
    'As notificações e solicitações enviadas a você aparecem aqui.',
  'inbox.unread': 'Não lidas',
  'inbox.unreadCount': '{{count}} não lidas',
  'inbox.pendingDecisions': '{{count}} pendentes',
  'inbox.resolved': 'Resolvido',
  'inbox.outcomes.approved': 'Aprovado',
  'inbox.outcomes.rejected': 'Rejeitado',
  'inbox.outcomes.withdrawn': 'Retirado',
  'inbox.count': '×{{count}}',
  'inbox.actionsFor': 'Ações para {{title}}',
  'inbox.actions.read': 'Marcar como lida',
  'inbox.actions.unread': 'Marcar como não lida',
  'inbox.actions.delete': 'Excluir',
  'inbox.deleted': 'Excluído.',
  'inbox.requestFailed': 'A solicitação falhou. Tente novamente.',
  'inbox.forbidden': 'Você não tem permissão para fazer isso.',
  'inbox.nothingSelected': 'Selecione um item para visualizá-lo',
  'inbox.back': 'Voltar à lista',
  'inbox.open': 'Abrir',
  'inbox.keyMove': 'Mover',
  'inbox.keyOpen': 'Abrir',
  'inbox.cancel': 'Cancelar',
  'inbox.request.approve': 'Aprovar',
  'inbox.request.reject': 'Rejeitar',
  'inbox.request.commentPlaceholder': 'Escreva algo…',
  'inbox.request.commentFor': '{{action}}: {{title}}',
  'inbox.request.quickSend': 'para enviar',
  'inbox.request.newLine': 'para nova linha',
  'inboxButton.title': 'Caixa de entrada',
  'inboxButton.pending': 'Caixa de entrada, {{count}} pendentes',
  'inboxButton.unread': 'Caixa de entrada, {{count}} não lidas',
  'inboxButton.pendingHint':
    '{{count}} aguardando você; o número diminui à medida que forem tratados.',
  'inboxButton.unreadHint':
    '{{count}} não lidas; o número diminui conforme você as lê.',
  'auth.welcome': 'Bem-vindo de volta',
  'auth.loginDescription':
    'Entre com seu nome de usuário ou e-mail e sua senha.',
  'auth.registerTitle': 'Criar uma conta',
  'auth.registerDescription': 'Crie uma conta para começar.',
  'auth.forgotTitle': 'Esqueci a senha',
  'auth.forgotDescription':
    'Informe seu e-mail e enviaremos um link de redefinição se a conta existir.',
  'auth.passwordResetUnavailable':
    'A redefinição de senha por autoatendimento não está ativada. Entre em contato com um administrador para redefinir sua senha.',
  'auth.capabilityLoadFailed':
    'Não foi possível verificar se a redefinição de senha está disponível.',
  'auth.retry': 'Tentar novamente',
  'auth.loading': 'Carregando',
  'auth.resetDescription': 'Escolha uma nova senha para sua conta.',
  'auth.resetTitle': 'Redefinir senha',
  'auth.identifier': 'Nome de usuário ou e-mail',
  'auth.password': 'Senha',
  'auth.signIn': 'Entrar',
  'auth.signingIn': 'Entrando…',
  'auth.hidePassword': 'Ocultar senha',
  'auth.showPassword': 'Mostrar senha',
  'auth.forgotLink': 'Esqueceu a senha?',
  'auth.noAccount': 'Não tem uma conta?',
  'auth.signUp': 'Cadastre-se',
  'auth.createAccount': 'Criar conta',
  'auth.creatingAccount': 'Criando conta…',
  'auth.name': 'Nome',
  'auth.username': 'Nome de usuário',
  'auth.email': 'E-mail',
  'auth.confirmPassword': 'Confirmar senha',
  'auth.existingAccount': 'Já tem uma conta?',
  'auth.passwordMismatch': 'As senhas não coincidem.',
  'auth.resetting': 'Redefinindo…',
  'auth.newPassword': 'Nova senha',
  'auth.confirmNewPassword': 'Confirmar nova senha',
  'auth.invalidResetLink':
    'Este link de redefinição de senha é inválido ou expirou.',
  'auth.backToSignIn': 'Voltar para o login',
  'auth.sendResetLink': 'Enviar link de redefinição',
  'auth.sending': 'Enviando…',
  'auth.resetSent': 'Se a conta existir, um link de redefinição foi enviado.',
  'auth.rememberPassword': 'Lembrou a senha?',
  'auth.methods': 'Métodos de login',
  'auth.or': 'Ou continue com',
  'auth.continueWith': 'Continuar com {provider}',
  'auth.about': 'Sobre este aplicativo',
  'auth.platform': 'Plataforma de aplicativos nativa de IA',
  'auth.marketingTitleFirst': 'Deixe a IA construir livremente.',
  'auth.marketingTitleSecond': 'O NocoBase garante',
  'auth.marketingTitleThird': 'a confiabilidade.',
  'auth.marketingDescription':
    'Dê à IA um framework de frontend flexível para moldar cada experiência, enquanto o NocoBase protege os dados, as permissões e a governança por trás.',
  'auth.frontend': 'Frontend nativo de IA',
  'auth.frontendDescription':
    'Componha interfaces livremente sobre um framework flexível.',
  'auth.foundation': 'Base NocoBase',
  'auth.foundationDescription':
    'Dados confiáveis, controle de acesso e governança.',
  'auth.marketingFooter': 'Liberdade em cima. Confiança embaixo.',
  'status.loading': 'Carregando',
  'status.loadingPage': 'Carregando página',
  'status.denied': 'Acesso negado',
  'status.pageFailed': 'Não foi possível carregar a página',
  'status.retry': 'Tentar novamente',
  'navigation.brandHome': 'Início do NocoCRM',
  'navigation.brandApps': 'Aplicativos NocoBase',
  'routeOverlay.close': 'Fechar',
  'status.deniedDescription': 'Você não tem permissão para acessar {{label}}.',
  'status.routeFailedDescription':
    'Não foi possível carregar a rota {{label}} de {{packageName}}.',
  shell: {
    buildFreely: 'A IA constrói livremente.',
    reliability: 'O <brand>NocoBase</brand> garante a confiabilidade.',
  },
  home: {
    platform: 'NocoBase · Plataforma de aplicativos nativa de IA',
    title: 'Descreva, e o seu Agent constrói',
    description:
      'Este aplicativo é desenvolvido conversando com o seu Coding Agent. Diga em palavras simples o que o negócio precisa, e ele escreve as páginas, os modelos de dados, as APIs e os processos de negócio neste projeto.',
    steps: {
      describe: {
        title: 'Descreva a necessidade',
        description:
          'Diga quem vai usar, quais dados serão guardados e o que deve acontecer.',
      },
      build: {
        title: 'Deixe o Agent construir',
        description:
          'Ele lê este projeto e os recursos integrados, e então escreve o código.',
      },
      review: {
        title: 'Confira e ajuste',
        description:
          'Atualize a página para testar e peça alterações da mesma forma.',
      },
    },
    example: {
      title: 'Experimente um pedido como este',
      text: 'Crie um aplicativo de pedidos de compra.\n\nUm pedido tem número, item, solicitante, valor e status de aprovação. Os solicitantes criam pedidos e veem apenas os seus; os revisores veem todos os pedidos pendentes e os aprovam ou rejeitam.\nApós a decisão, notifique o solicitante na caixa de entrada com um link para o pedido.',
      hint: 'Cole no Claude Code, Codex, Cursor ou em qualquer Coding Agent aberto neste projeto.',
    },
    capabilitiesTitle: 'Recursos integrados',
    capabilitiesDescription:
      'O seu Agent usa estes recursos diretamente, em vez de construí-los do zero. Abra um para obter um prompt que você pode editar e copiar.',
    viewPrompts: 'Ver prompts ({{count}})',
    prompt: {
      label: 'Prompt',
      hint: 'Edite o prompt para adequá-lo ao seu negócio antes de copiar. As alterações não são salvas quando a caixa de diálogo é fechada.',
      copy: 'Copiar',
      copiedShort: 'Copiado',
      copied: 'Prompt copiado',
      copyFailed:
        'Não foi possível copiar. Selecione o texto e copie manualmente.',
      reset: 'Restaurar padrão',
    },
    capabilities: {
      auth: {
        title: 'Autenticação',
        description:
          'Login, cadastro, redefinição de senha e login único (SSO) da empresa.',
        prompts: {
          disableSignUp: {
            label: 'Desativar cadastro',
            text: 'Este aplicativo é exclusivo para funcionários da empresa. Os administradores criam todas as contas.\nDesative o autocadastro e remova o link de cadastro da página de login.\nOs funcionários existentes devem continuar conseguindo entrar com suas contas e senhas.\nMantenha o link de esqueci a senha.',
          },
          companySso: {
            label: 'SSO da empresa',
            text: 'Permita que os funcionários entrem com a plataforma de identidade da empresa usando OIDC.\n\nMantenha o login com conta e senha e adicione um botão Conta da empresa.\nO botão abre a plataforma de identidade da empresa. Após o login bem-sucedido, volte para a página inicial do aplicativo.\n\nPermita que o primeiro login crie uma conta no aplicativo, identificada pelo identificador de usuário estável da plataforma.\nNão vincule contas automaticamente por nomes ou e-mails iguais. As novas contas usam as permissões padrão do aplicativo.\n\nListe as informações que o administrador da plataforma de identidade deve fornecer e a URL de callback que ele precisa registrar.',
          },
          apiKeys: {
            label: 'Chaves de API',
            text: 'Adicione uma entrada Chaves de integração ao menu do usuário, usando o recurso de chaves de API integrado do aplicativo.\nOs funcionários gerenciam apenas as chaves que criaram, informando uma finalidade e um prazo de validade em dias.\nMostre a chave completa apenas uma vez após a criação, com um aviso para copiá-la e guardá-la imediatamente.\nListe o nome de cada chave, um fragmento identificável, o status, a validade e o último uso, e permita revogá-la após confirmação.\nNunca mostre a chave completa na lista, nos logs ou nos detalhes.',
          },
        },
      },
      dataSources: {
        title: 'Fontes de dados',
        description:
          'Escolha o banco de dados do aplicativo e use dados de negócio de bancos de dados externos existentes.',
        prompts: {
          postgres: {
            label: 'Trocar banco de dados',
            text: 'Troque o banco de dados do aplicativo de SQLite para PostgreSQL.\nLeia os dados de conexão da configuração de execução do servidor, não do código-fonte.\nExplique qual driver de banco de dados instalar e quais configurações preencher, e me lembre de que os dados existentes não são migrados automaticamente.',
          },
          externalDatabase: {
            label: 'Banco de dados externo',
            text: 'Conecte o banco de dados financeiro existente da empresa como uma fonte de dados externa somente leitura; não modifique as tabelas dele.\nRelacione os registros pelo número do fornecedor e adicione uma seção Liquidação aos detalhes do fornecedor, mostrando o ciclo de liquidação, o limite de crédito e o status de liquidação, com a indicação da origem.\nContinue lendo os dados de contato do fornecedor do banco de dados do aplicativo e leia os dados de liquidação diretamente do banco de dados externo, sem importá-los.\nLeia as credenciais de conexão da configuração de execução do servidor.',
          },
        },
      },
      authorization: {
        title: 'Permissões',
        description:
          'Controle quem pode abrir quais páginas, executar quais ações e ver quais registros.',
        prompts: {
          jobs: {
            label: 'Cargos',
            text: 'Crie os cargos Solicitante de compras e Revisor de pedidos para o aplicativo.\nOs solicitantes de compras podem acessar a página de pedidos e ver os pedidos que solicitaram.\nOs revisores de pedidos podem acessar a página de pedidos, ver os pedidos e aprovar ou rejeitar pedidos pendentes.\nSomente os administradores do aplicativo podem alterar permissões e atribuições.\nUse o recurso de autorização existente do aplicativo para que os administradores possam ajustar permissões e atribuir pessoas depois.',
          },
          dataScopes: {
            label: 'Escopos de dados',
            text: 'Permita que os solicitantes de compras vejam apenas os próprios pedidos, usando o campo de solicitante do pedido para determinar a quem ele pertence.\nOs revisores de pedidos podem ver todos os pedidos e processar as aprovações pendentes.\nOs administradores podem ajustar o escopo de visualização de pedidos de cada cargo no respectivo conjunto de permissões.',
          },
          restrictions: {
            label: 'Restrições',
            text: 'Bob está ajudando temporariamente a revisar pedidos de compra e só pode ver pedidos de até 2.000.\nAdicione um limite de valor à ação Ver pedidos dele, mantendo o cargo e os escopos de dados existentes.\nAplique o limite aos pedidos dele e aos pedidos compartilhados com ele.\nOs administradores podem alterar o valor ou remover a regra; antes da remoção, explique que o escopo visível dele pode aumentar.',
          },
        },
      },
      workflow: {
        title: 'Fluxos de trabalho',
        description:
          'Faça os registros de negócio avançarem por etapas, com espera, tempos limite, novas tentativas e um histórico de quem fez o quê.',
        prompts: {
          stages: {
            label: 'Etapas',
            text: 'Adicione um processo aos pedidos de compra: Aguardando aprovação → Aguardando compra → Recebido → Concluído.\nOs revisores aprovam ou rejeitam; uma rejeição exige um motivo e devolve o pedido ao solicitante para revisão e reenvio.\nDepois que o comprador efetua a compra, o pedido fica aguardando compra; confirmar a entrega com um comprovante de recebimento assinado o move para Recebido, e a confirmação do solicitante o conclui.\nOs detalhes do pedido oferecem apenas as ações da etapa atual, e edições comuns não podem alterar a etapa.\nVerifique as etapas e as informações obrigatórias no servidor e nunca sobrescreva um resultado que outra pessoa já enviou.',
          },
          backgroundExport: {
            label: 'Exportação em segundo plano',
            text: 'Adicione uma página de relatório de pedidos que exporte os pedidos existentes para CSV.\nApós o envio, a exportação aguarda processamento, é gerada em segundo plano e é concluída com um link de download.\nMostre a etapa atual, o nome do arquivo, o número de pedidos exportados e os registros de envio e de processamento do sistema.\nRepita a geração com falha de acordo com regras e mantenha uma falha definitiva para o responsável tratar; executá-la novamente não deve criar arquivos de relatório duplicados.\nMantenha o progresso e o resultado visíveis após atualizar a página e permita que apenas pessoas autorizadas exportem pedidos.',
          },
          history: {
            label: 'Histórico',
            text: 'Mostre a etapa atual e o histórico de processamento nos detalhes do pedido.\nCada entrada mostra quem agiu, quando, a ação, a etapa antes e depois, e o motivo da rejeição ou o comprovante de recebimento assinado, se houver.\nMarque as ações executadas automaticamente como feitas pelo sistema.\nMantenha o progresso e o histórico após atualizar a página, para que todo o processo possa ser revisado depois de concluído.',
          },
        },
      },
      scheduler: {
        title: 'Tarefas agendadas',
        description:
          'Execute trabalhos de negócio em horários definidos e veja a próxima execução e os resultados.',
        prompts: {
          reminder: {
            label: 'Lembrete diário',
            text: 'Adicione um lembrete de Pedidos pendentes ao aplicativo de pedidos existente.\n\nÀs 09:00, horário de Pequim, todo dia útil, encontre os pedidos aguardando aprovação, agrupe-os por revisor e envie a cada revisor uma notificação no aplicativo.\nInclua a quantidade de pedidos pendentes e um link para a lista de pedidos pendentes. Não envie nada quando não houver pedidos pendentes.\nOs administradores podem ver o agendamento e os registros de execução, e pausar ou retomar os lembretes.',
          },
          weeklyReport: {
            label: 'Relatório semanal',
            text: 'Às 08:00, horário de Pequim, toda segunda-feira, gere o resumo de vendas da semana anterior e notifique o gerente de vendas.\nInclua a receita de vendas, a quantidade de pedidos e os totais por região. Os administradores podem ver a tarefa e os registros de execução.',
          },
        },
      },
      notification: {
        title: 'Notificações',
        description:
          'Envie mensagens no aplicativo, e-mails ou mensagens de bot de grupo quando algo acontecer.',
        prompts: {
          inApp: {
            label: 'Mensagem no aplicativo',
            text: 'Adicione a aprovação de pedidos ao aplicativo atual e notifique os solicitantes sobre os resultados por mensagens no aplicativo.\n\nOs pedidos incluem número, nome, solicitante, valor e status de aprovação.\nOs solicitantes podem ver os próprios pedidos. Os revisores podem ver os pedidos pendentes e aprová-los ou rejeitá-los. Reutilize os recursos de pedidos e aprovações existentes, se houver.\n\nApós a aprovação ou rejeição, envie uma mensagem no aplicativo apenas ao solicitante do pedido.\nO título indica se o pedido foi aprovado ou rejeitado. O corpo inclui o número do pedido, o nome e o resultado da aprovação.\nClicar na mensagem abre os detalhes do pedido correspondente.\nNão envie enquanto a aprovação estiver pendente. Notifique apenas uma vez para o mesmo resultado de aprovação.\nUma falha na notificação não afeta o resultado de aprovação salvo.',
          },
          email: {
            label: 'E-mail',
            text: 'Adicione e-mail às notificações de aprovação de pedidos existentes, usando o canal de e-mail configurado no aplicativo.\n\nDepois que um pedido for aprovado ou rejeitado, envie o resultado para o e-mail da conta do solicitante.\nInclua o número do pedido no assunto e o nome do pedido e o resultado no corpo.\nMantenha as mensagens no aplicativo existentes. Se o solicitante não tiver endereço de e-mail, envie apenas a mensagem no aplicativo.\nUma falha no e-mail não deve afetar o resultado da aprovação nem a mensagem no aplicativo.',
          },
        },
      },
      mail: {
        title: 'E-mail',
        description:
          'Conecte caixas de e-mail pessoais e leia, responda e envie e-mails de negócio.',
        prompts: {
          providers: {
            label: 'Provedor de e-mail',
            text: 'Configure o mailbox.org para o aplicativo em mail.providers, na configuração do servidor:\n- Servidor de entrada IMAP: imap.mailbox.org, porta 993, SSL/TLS.\n- Servidor de saída SMTP: smtp.mailbox.org, porta 465, SSL/TLS.\nOs usuários informam o próprio endereço de e-mail, nome de usuário e senha na página de contas de e-mail e escolhem a data a partir da qual a primeira sincronização começa; nunca grave senhas de e-mail na configuração ou no código-fonte.',
          },
          mailCenter: {
            label: 'Central de e-mail',
            text: 'O e-mail já vem integrado a este aplicativo; reutilize-o em vez de construí-lo novamente ou instalar outro plugin.\nAdicione as páginas Central de e-mail e Contas de e-mail à navegação, usando o espaço de trabalho de e-mail e as páginas de contas de e-mail fornecidas pelo recurso de e-mail.\nOs usuários podem conectar as próprias caixas de e-mail, sincronizar as mensagens recebidas, ler mensagens e anexos e responder, mantendo o assunto original e o contexto da conversa e endereçando a resposta ao remetente original.\nCada usuário trabalha com as próprias caixas de e-mail conectadas.',
          },
          correspondence: {
            label: 'E-mails do cliente',
            text: 'Adicione uma seção de correspondência aos detalhes do cliente, reutilizando os componentes integrados de leitura e redação de e-mail do aplicativo.\nMostre as mensagens cujo remetente ou destinatário corresponda aos endereços de e-mail dos contatos do cliente atual. Os vendedores podem ler mensagens, ver anexos e responder usando as próprias caixas de e-mail conectadas.',
          },
        },
      },
      file: {
        title: 'Arquivos',
        description:
          'Envie arquivos, anexe-os a registros e visualize ou baixe-os.',
        prompts: {
          attachments: {
            label: 'Anexos',
            text: 'Adicione anexos de compra ao meu aplicativo de gestão de pedidos existente.\n\nAdicione uma área de anexos aos detalhes do pedido. Cada pedido pode ter vários arquivos, incluindo PDF, imagens e DOCX.\nMostre os nomes e tamanhos dos arquivos, com ações para visualizar, baixar e remover anexos.\nApós o upload, permita que os usuários salvem os anexos no pedido atual. Mantenha-os disponíveis quando o pedido for reaberto.\nQualquer pessoa com acesso a um pedido pode ver e baixar os anexos dele. Solicitantes e revisores podem adicionar ou remover anexos.\nRemover um anexo apenas o desvincula do pedido atual; mantenha o arquivo.',
          },
          avatar: {
            label: 'Avatar',
            text: 'Adicione um avatar a cada funcionário, com uma imagem por funcionário.\nPermita enviar e substituir o avatar e mostre-o nas listas e nos detalhes de funcionários.\nUse o novo avatar após a substituição e mantenha-o visível após atualizar a página.',
          },
        },
      },
      i18n: {
        title: 'Idiomas',
        description:
          'Troque o idioma da interface, adicione idiomas e defina o padrão.',
        prompts: {
          addLanguage: {
            label: 'Adicionar um idioma',
            text: 'Adicione o espanhol ao meu aplicativo. Traduza a interface e as mensagens do servidor e inclua o espanhol no menu de idiomas.',
          },
          defaultLanguage: {
            label: 'Idioma padrão',
            text: 'Defina o chinês simplificado como idioma padrão do aplicativo para quem ainda não escolheu um. Mantenha o inglês disponível no menu de idiomas.',
          },
        },
      },
      theme: {
        title: 'Temas',
        description:
          'Ajuste cores, fontes e densidade, e alterne entre claro e escuro.',
        prompts: {
          changeTheme: {
            label: 'Alterar um tema',
            text: 'Atualize o tema Compacto: use azul como cor principal e aumente levemente o raio dos cantos. Mantenha as fontes, os tamanhos de texto e o espaçamento compacto atuais.',
          },
          newTheme: {
            label: 'Novo tema',
            text: 'Crie um tema Floresta com verde como cor principal, fundos suaves, cantos moderadamente arredondados e sombras sutis.',
          },
        },
      },
    },
  },
  appearance: {
    title: 'Aparência',
    mode: 'Modo de cor',
    preset: 'Tema',
    light: 'Claro',
    dark: 'Escuro',
    system: 'Sistema',
    themes: {
      default: 'Espaçoso',
      compact: 'Compacto',
    },
  },
  app: {
    title: 'NocoCRM',
  },
  actions: {
    close: 'Fechar',
    save: 'Salvar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    language: 'Idioma',
  },
  notices: {
    serverLocaleFallback:
      'O servidor não oferece suporte a este idioma, então as mensagens do servidor serão exibidas em inglês.',
    languageChangeFailed:
      'Não foi possível concluir a troca de idioma. Tente novamente.',
  },
  account: {
    signOutFailed: 'Não foi possível sair. Tente novamente.',
    openMenu: 'Abrir menu da conta',
    fallback: 'Conta',
    signOut: 'Sair',
    signingOut: 'Saindo…',
  },
  navigation: {
    home: 'Início',
    open: 'Abrir navegação',
    close: 'Fechar navegação',
    expand: 'Expandir navegação',
    collapse: 'Recolher navegação',
    toggle: 'Expandir ou recolher navegação',
    label: 'Navegação do aplicativo',
    description: 'Acesse uma página deste aplicativo.',
    breadcrumb: 'Trilha de navegação',
    breadcrumbMore: 'Mostrar os níveis intermediários',
    back: 'Voltar',
  },
  dataTable: {
    noResults: 'Nenhum resultado.',
    sortAscending: 'Crescente',
    sortDescending: 'Decrescente',
    hideColumn: 'Ocultar',
    view: 'Exibir',
    toggleColumns: 'Alternar colunas',
    selectedCount: '{{selected}} de {{total}} linha(s) selecionada(s).',
    rowsPerPage: 'Linhas por página',
    pageOf: 'Página {{page}} de {{pageCount}}',
    firstPage: 'Ir para a primeira página',
    previousPage: 'Ir para a página anterior',
    nextPage: 'Ir para a próxima página',
    lastPage: 'Ir para a última página',
  },
  datePicker: {
    placeholder: 'Selecione uma data',
    rangePlaceholder: 'Selecione um intervalo de datas',
  },
  'Lead follow-up': 'Acompanhamento de leads',
  'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    'Analise tudo o que um lead tem agora (o próprio lead, suas tarefas, comentários e registros relacionados no CRM) e recomende o próximo passo — continuar acompanhando, colocar em nutrição, converter ou marcar como inválido — com os motivos; ao continuar acompanhando, diga claramente como acompanhar e o que exatamente fazer. Use quando chegar um novo lead, quando o usuário pedir para acompanhar um lead ou retomar o acompanhamento, ou perguntar "o que devo fazer agora com este lead".',
  'Opportunity follow-up': 'Acompanhamento de oportunidades',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    'Analisa tudo sobre uma oportunidade como está agora (a própria oportunidade, a empresa, os contatos e seus papéis, tarefas, comentários, aprovações, o lead de origem) e avalia se a etapa se sustenta e o que fazer em seguida — avançar para a próxima etapa, continuar trabalhando na etapa atual, pausar ou marcá-la como perdida — com os motivos, os riscos e as lacunas a preencher; ao avançar, detalha exatamente o que fazer. Use quando a conversão de um lead abrir uma nova oportunidade, quando o resultado de uma tarefa da oportunidade tiver sido registrado, quando o usuário pedir um acompanhamento ou quando perguntarem "qual é o próximo passo para esta oportunidade?".',
  'Approval review': 'Análise de aprovação',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    'Ajuda um aprovador a avaliar se uma solicitação de aprovação (desconto, condições de pagamento, cláusulas contratuais, compromisso de entrega) merece ser aprovada — quanto as condições pedidas se distanciam do padrão, o efeito sobre o valor e sobre o recebimento, a situação da oportunidade e as evidências que sustentam esta concessão, as outras aprovações enviadas junto com ela na mesma oportunidade, como solicitações anteriores do mesmo tipo foram decididas, os riscos e o que o solicitante deixou sem esclarecer — e então recomenda aprovar, aprovar com condições, rejeitar ou pedir mais informações, e redige o comentário da decisão. Use depois que uma aprovação for enviada ou quando o aprovador perguntar "esta aprovação deve ser aprovada?".',
  'Task preparation': 'Preparação de tarefas',
  "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.":
    'Prepara um vendedor para uma tarefa que ele está prestes a realizar com um cliente (uma ligação, uma reunião, uma visita, uma demonstração) — o que a tarefa deve alcançar, em que pé estão as coisas segundo as tarefas, os comentários e os e-mails do registro, quem está do outro lado e qual é o papel de cada um, as perguntas a fazer, o que levar, os riscos e os pontos a abordar, em ordem. Use na manhã da tarefa ou quando o responsável pela tarefa pedir para ser preparado.',
  flowDiagram: {
    controls: 'Controles do diagrama',
    fitView: 'Ajustar à tela',
    fullscreen: 'Tela cheia',
    exitFullscreen: 'Sair da tela cheia',
    escapeHint: 'Pressione Esc para sair',
    leavesTo: 'Leva a',
    arrivesFrom: 'Vem de',
    otherRoutes: 'Outros caminhos',
    minimap: 'Visão geral do diagrama',
    configure: 'Configurar',
    overview: 'Visão geral do diagrama',
    actualSize: 'Tamanho real',
    states: 'Estados',
    transitions: 'Transições',
    configurable: 'Parâmetros',
    current: 'Atual',
    visited: 'Percorrido',
    initial: 'Inicial',
    final: 'Final',
    state: 'Estado',
    zoomOut: 'Diminuir zoom',
    zoomIn: 'Aumentar zoom',
    fit: 'Ajustar à tela',
    empty: 'Nenhum estado para exibir.',
    loading: 'Organizando o diagrama…',
    failed: 'Não foi possível organizar este diagrama.',
    nodeHelp: 'Pressione Enter ou Espaço para selecionar um estado.',
    edgeHelp: 'Pressione Enter ou Espaço para selecionar uma transição.',
  },
  loginActivity: {
    heading: 'Do primeiro lead ao negócio fechado.',
    description:
      'Sua equipe de vendas de IA acompanha cada lead e oportunidade, prepara cada reunião e cada aprovação, e você toma a decisão.',
    phases: {
      lead: 'Lead',
      deal: 'Oportunidade',
      won: 'Fechado',
    },
    participants: {
      rep: 'Sophie Bennett',
      leadAgent: 'Acompanhamento de leads com IA',
      prepAgent: 'Assistente de tarefas com IA',
      dealAgent: 'Acompanhamento de oportunidades com IA',
      approvalAgent: 'Análise de aprovação com IA',
      manager: 'Daniel Brooks',
      customer: 'Emma Walsh',
    },
    capabilities: {
      capture: 'Captura com IA',
      followUp: 'Acompanhamento com IA',
      pipeline: 'Pipeline',
      prep: 'Preparação de tarefas',
      mail: 'E-mail',
      approval: 'Aprovações',
    },
    timeline: 'Linha do tempo',
    lead: {
      kind: 'Lead',
      title: 'Emma Walsh / Northwind Logistics',
      need: 'Despacho de frota, 200 caminhões · de um e-mail',
      grade: 'Classificação A',
    },
    deal: {
      kind: 'Oportunidade',
      title: 'Plataforma de despacho de frota (Enterprise)',
      company: 'Northwind Logistics',
      amount: 'US$ 48.000',
      owner: 'Sophie Bennett',
      won: 'Ganha',
    },
    leadStatuses: {
      new: 'Novo',
      working: 'Em andamento',
      converted: 'Convertido',
    },
    stages: {
      qualification: 'Qualificação',
      proposal: 'Proposta',
      negotiation: 'Negociação',
      won: 'Ganha',
    },
    steps: {
      captured: {
        who: 'IA',
        what: 'organizou o lead a partir de um e-mail',
      },
      leadFollowUp: {
        who: 'Acompanhamento com IA',
        what: 'classificação A, ligar hoje às 15h',
      },
      converted: {
        who: 'Sophie Bennett',
        what: 'converteu o lead em oportunidade',
      },
      prepared: {
        who: 'IA',
        what: 'preparou a demonstração de amanhã com as rotas do próprio cliente',
      },
      replied: {
        who: 'Emma Walsh',
        what: 'podemos pagar 60 dias após a fatura?',
      },
      dealFollowUp: {
        who: 'Acompanhamento com IA',
        what: 'avança para negociação; prazo de 60 dias requer aprovação',
      },
      reviewed: {
        who: 'Análise com IA',
        what: 'aprovar com condições',
      },
      approved: {
        who: 'Daniel Brooks',
        what: 'aprovou o prazo de 60 dias',
      },
      won: {
        who: 'Sophie Bennett',
        what: 'o contrato assinado voltou',
      },
    },
  },
  // The template's Settings copy, translated in ./settings/.
  settings: settingsPtBR,
  crm: crmPtBR,
};

export default ptBR;
