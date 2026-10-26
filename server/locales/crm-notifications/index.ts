const labels = {
  // The object is named: "Lead assigned to you", not "record".
  assigned: ['{{entity}} assigned to you', '{{entity}}已分配给你'],
  invited: ['You were added to a task', '你被加入任务'],
  removed: ['You were removed from a task', '你被移出任务'],
  cancelled: ['Task cancelled', '任务已取消'],
  rescheduled: ['Task rescheduled', '任务时间已变更'],
  // A colleague's comment on a record named the reader.
  mentioned: [
    'Someone mentions you in {{record}}',
    '有人在{{entity}}的评论里提到了你',
  ],
  // Someone answered a comment the reader wrote or replied to.
  replied: ['{{entity}} has a new reply', '{{entity}}有新回复'],
  starting: ['Task coming up', '任务时间快到了'],
  // The AI found news about a company the reader sells to
  // (company-signals.ts).
  signal: ['{{entity}} has news', '{{entity}}有新动态'],
  // A customer wrote on WhatsApp: on the lead or contact they are, or in a
  // conversation linked to no record yet. Nothing queues these since
  // 2026-10-16; kept for those queued before (index.ts).
  whatsapp: [
    '{{entity}} has a new WhatsApp message',
    '{{entity}}有新的 WhatsApp 消息',
  ],
  whatsappNew: ['New WhatsApp conversation', '新的 WhatsApp 对话'],
  pending: ['Approval requested', '待审批申请'],
  withdrawn: ['Request withdrawn', '审批已撤回'],
  approved: ['Request approved', '审批已通过'],
  rejected: ['Request rejected', '审批已拒绝'],
} satisfies Record<string, [string, string]>;
const entityLabels = {
  leads: ['Lead', '线索'],
  companies: ['Company', '公司'],
  contacts: ['Contact', '联系人'],
  opportunities: ['Opportunity', '商机'],
  tasks: ['Task', '任务'],
  approvals: ['Approval', '审批'],
} satisfies Record<string, [string, string]>;
// The object as a sentence names it, inside a title: "a lead", "an
// opportunity" (`record`); in Chinese the object's own name.
const recordLabels = {
  leads: ['a lead', '线索'],
  companies: ['a company', '公司'],
  contacts: ['a contact', '联系人'],
  opportunities: ['an opportunity', '商机'],
  tasks: ['a task', '任务'],
  approvals: ['an approval', '审批'],
} satisfies Record<string, [string, string]>;
// Every other language's titles and names, in full: `{{entity}}` is the
// object's name ("Lead"), `{{record}}` the object inside a sentence ("a
// lead"), each language taking the one its grammar needs.
type Table = {
  titles: Record<keyof typeof labels, string>;
  entities: Record<keyof typeof entityLabels, string>;
  records: Record<keyof typeof recordLabels, string>;
};
const translations: Record<string, Table> = {
  // Traditional Chinese, as Taiwan writes it.
  'zh-TW': {
    titles: {
      assigned: '{{entity}}已指派給你',
      invited: '你被加入任務',
      removed: '你被移出任務',
      cancelled: '任務已取消',
      rescheduled: '任務時間已變更',
      mentioned: '有人在{{entity}}的評論中提到了你',
      replied: '{{entity}}有新回覆',
      starting: '任務時間快到了',
      signal: '{{entity}}有新動態',
      whatsapp: '{{entity}}有新的 WhatsApp 訊息',
      whatsappNew: '新的 WhatsApp 對話',
      pending: '待審批申請',
      withdrawn: '審批已撤回',
      approved: '審批已通過',
      rejected: '審批已拒絕',
    },
    entities: {
      leads: '線索',
      companies: '公司',
      contacts: '聯絡人',
      opportunities: '商機',
      tasks: '任務',
      approvals: '審批',
    },
    records: {
      leads: '線索',
      companies: '公司',
      contacts: '聯絡人',
      opportunities: '商機',
      tasks: '任務',
      approvals: '審批',
    },
  },
  'ja-JP': {
    titles: {
      assigned: '{{entity}}があなたに割り当てられました',
      invited: 'タスクに追加されました',
      removed: 'タスクから外されました',
      cancelled: 'タスクがキャンセルされました',
      rescheduled: 'タスクの日時が変更されました',
      mentioned: '{{entity}}のコメントであなたがメンションされました',
      replied: '{{entity}}に新しい返信があります',
      starting: 'まもなくタスクの時間です',
      signal: '{{entity}}に新しい動きがあります',
      whatsapp: '{{entity}}に新しい WhatsApp メッセージがあります',
      whatsappNew: '新しい WhatsApp の会話',
      pending: '承認の依頼',
      withdrawn: '申請が取り下げられました',
      approved: '申請が承認されました',
      rejected: '申請が却下されました',
    },
    entities: {
      leads: 'リード',
      companies: '会社',
      contacts: '連絡先',
      opportunities: '商談',
      tasks: 'タスク',
      approvals: '承認',
    },
    records: {
      leads: 'リード',
      companies: '会社',
      contacts: '連絡先',
      opportunities: '商談',
      tasks: 'タスク',
      approvals: '承認',
    },
  },
  'es-ES': {
    titles: {
      assigned: 'Se te ha asignado {{record}}',
      invited: 'Te han añadido a una tarea',
      removed: 'Te han quitado de una tarea',
      cancelled: 'Tarea cancelada',
      rescheduled: 'Tarea reprogramada',
      mentioned: 'Alguien te menciona en {{record}}',
      replied: 'Nueva respuesta en {{record}}',
      starting: 'Una tarea está a punto de empezar',
      signal: 'Novedades sobre {{record}}',
      whatsapp: 'Nuevo mensaje de WhatsApp en {{record}}',
      whatsappNew: 'Nueva conversación de WhatsApp',
      pending: 'Aprobación solicitada',
      withdrawn: 'Solicitud retirada',
      approved: 'Solicitud aprobada',
      rejected: 'Solicitud rechazada',
    },
    entities: {
      leads: 'Lead',
      companies: 'Empresa',
      contacts: 'Contacto',
      opportunities: 'Oportunidad',
      tasks: 'Tarea',
      approvals: 'Aprobación',
    },
    records: {
      leads: 'un lead',
      companies: 'una empresa',
      contacts: 'un contacto',
      opportunities: 'una oportunidad',
      tasks: 'una tarea',
      approvals: 'una aprobación',
    },
  },
  'pt-BR': {
    titles: {
      assigned: '{{entity}} atribuído a você',
      invited: 'Você foi adicionado a uma tarefa',
      removed: 'Você foi removido de uma tarefa',
      cancelled: 'Tarefa cancelada',
      rescheduled: 'Tarefa reagendada',
      mentioned: 'Alguém mencionou você em {{record}}',
      replied: 'Nova resposta em {{record}}',
      starting: 'Uma tarefa está prestes a começar',
      signal: 'Novidades sobre {{record}}',
      whatsapp: 'Nova mensagem de WhatsApp em {{record}}',
      whatsappNew: 'Nova conversa de WhatsApp',
      pending: 'Aprovação solicitada',
      withdrawn: 'Solicitação retirada',
      approved: 'Solicitação aprovada',
      rejected: 'Solicitação rejeitada',
    },
    entities: {
      leads: 'Lead',
      companies: 'Empresa',
      contacts: 'Contato',
      opportunities: 'Oportunidade',
      tasks: 'Tarefa',
      approvals: 'Aprovação',
    },
    records: {
      leads: 'um lead',
      companies: 'uma empresa',
      contacts: 'um contato',
      opportunities: 'uma oportunidade',
      tasks: 'uma tarefa',
      approvals: 'uma aprovação',
    },
  },
  'fr-FR': {
    titles: {
      assigned: 'On vous a attribué {{record}}',
      invited: 'Vous avez été ajouté à une tâche',
      removed: 'Vous avez été retiré d’une tâche',
      cancelled: 'Tâche annulée',
      rescheduled: 'Tâche replanifiée',
      mentioned: 'Quelqu’un vous mentionne dans {{record}}',
      replied: 'Nouvelle réponse dans {{record}}',
      starting: 'Une tâche va bientôt commencer',
      signal: 'Du nouveau sur {{record}}',
      whatsapp: 'Nouveau message WhatsApp sur {{record}}',
      whatsappNew: 'Nouvelle conversation WhatsApp',
      pending: 'Approbation demandée',
      withdrawn: 'Demande retirée',
      approved: 'Demande approuvée',
      rejected: 'Demande refusée',
    },
    entities: {
      leads: 'Prospect',
      companies: 'Entreprise',
      contacts: 'Contact',
      opportunities: 'Opportunité',
      tasks: 'Tâche',
      approvals: 'Approbation',
    },
    records: {
      leads: 'un prospect',
      companies: 'une entreprise',
      contacts: 'un contact',
      opportunities: 'une opportunité',
      tasks: 'une tâche',
      approvals: 'une approbation',
    },
  },
  'de-DE': {
    titles: {
      assigned: 'Ihnen wurde {{record}} zugewiesen',
      invited: 'Sie wurden zu einer Aufgabe hinzugefügt',
      removed: 'Sie wurden aus einer Aufgabe entfernt',
      cancelled: 'Aufgabe abgesagt',
      rescheduled: 'Aufgabe verschoben',
      mentioned: 'Jemand erwähnt Sie in {{record}}',
      replied: 'Neue Antwort in {{record}}',
      starting: 'Eine Aufgabe beginnt bald',
      signal: 'Neuigkeiten zu {{record}}',
      whatsapp: 'Neue WhatsApp-Nachricht zu {{record}}',
      whatsappNew: 'Neue WhatsApp-Unterhaltung',
      pending: 'Genehmigung angefragt',
      withdrawn: 'Antrag zurückgezogen',
      approved: 'Antrag genehmigt',
      rejected: 'Antrag abgelehnt',
    },
    entities: {
      leads: 'Lead',
      companies: 'Unternehmen',
      contacts: 'Kontakt',
      opportunities: 'Verkaufschance',
      tasks: 'Aufgabe',
      approvals: 'Genehmigung',
    },
    records: {
      leads: 'einem Lead',
      companies: 'einem Unternehmen',
      contacts: 'einem Kontakt',
      opportunities: 'einer Verkaufschance',
      tasks: 'einer Aufgabe',
      approvals: 'einer Genehmigung',
    },
  },
  'vi-VN': {
    titles: {
      assigned: '{{entity}} đã được giao cho bạn',
      invited: 'Bạn đã được thêm vào một công việc',
      removed: 'Bạn đã bị gỡ khỏi một công việc',
      cancelled: 'Công việc đã bị hủy',
      rescheduled: 'Công việc đã được đổi lịch',
      mentioned: 'Có người nhắc đến bạn trong {{record}}',
      replied: '{{entity}} có phản hồi mới',
      starting: 'Sắp đến giờ thực hiện công việc',
      signal: '{{entity}} có tin mới',
      whatsapp: '{{entity}} có tin nhắn WhatsApp mới',
      whatsappNew: 'Cuộc trò chuyện WhatsApp mới',
      pending: 'Yêu cầu phê duyệt',
      withdrawn: 'Yêu cầu đã được rút lại',
      approved: 'Yêu cầu đã được phê duyệt',
      rejected: 'Yêu cầu đã bị từ chối',
    },
    entities: {
      leads: 'Khách hàng tiềm năng',
      companies: 'Công ty',
      contacts: 'Liên hệ',
      opportunities: 'Cơ hội',
      tasks: 'Công việc',
      approvals: 'Phê duyệt',
    },
    records: {
      leads: 'một khách hàng tiềm năng',
      companies: 'một công ty',
      contacts: 'một liên hệ',
      opportunities: 'một cơ hội',
      tasks: 'một công việc',
      approvals: 'một phê duyệt',
    },
  },
  'id-ID': {
    titles: {
      assigned: '{{entity}} ditugaskan kepada Anda',
      invited: 'Anda ditambahkan ke sebuah tugas',
      removed: 'Anda dikeluarkan dari sebuah tugas',
      cancelled: 'Tugas dibatalkan',
      rescheduled: 'Jadwal tugas diubah',
      mentioned: 'Seseorang menyebut Anda di {{record}}',
      replied: 'Ada balasan baru di {{record}}',
      starting: 'Tugas akan segera dimulai',
      signal: 'Ada kabar baru tentang {{record}}',
      whatsapp: 'Pesan WhatsApp baru di {{record}}',
      whatsappNew: 'Percakapan WhatsApp baru',
      pending: 'Permintaan persetujuan',
      withdrawn: 'Permintaan ditarik',
      approved: 'Permintaan disetujui',
      rejected: 'Permintaan ditolak',
    },
    entities: {
      leads: 'Prospek',
      companies: 'Perusahaan',
      contacts: 'Kontak',
      opportunities: 'Peluang',
      tasks: 'Tugas',
      approvals: 'Persetujuan',
    },
    records: {
      leads: 'sebuah prospek',
      companies: 'sebuah perusahaan',
      contacts: 'sebuah kontak',
      opportunities: 'sebuah peluang',
      tasks: 'sebuah tugas',
      approvals: 'sebuah persetujuan',
    },
  },
  // Korean: the object named as is; Korean needs no article.
  'ko-KR': {
    titles: {
      assigned: '{{entity}}이(가) 배정되었습니다',
      invited: '작업에 추가되었습니다',
      removed: '작업에서 제외되었습니다',
      cancelled: '작업이 취소되었습니다',
      rescheduled: '작업 일정이 변경되었습니다',
      mentioned: '{{entity}} 댓글에서 회원님이 언급되었습니다',
      replied: '{{entity}}에 새 답글이 있습니다',
      starting: '곧 작업 시간입니다',
      signal: '{{entity}}에 새 소식이 있습니다',
      whatsapp: '{{entity}}에 새 WhatsApp 메시지가 있습니다',
      whatsappNew: '새 WhatsApp 대화',
      pending: '승인 요청',
      withdrawn: '요청이 철회되었습니다',
      approved: '요청이 승인되었습니다',
      rejected: '요청이 거절되었습니다',
    },
    entities: {
      leads: '리드',
      companies: '회사',
      contacts: '연락처',
      opportunities: '영업 기회',
      tasks: '작업',
      approvals: '승인',
    },
    records: {
      leads: '리드',
      companies: '회사',
      contacts: '연락처',
      opportunities: '영업 기회',
      tasks: '작업',
      approvals: '승인',
    },
  },
  // Russian: the object's name before a colon, so no word has to agree
  // with its gender.
  'ru-RU': {
    titles: {
      assigned: 'Вам назначено: {{entity}}',
      invited: 'Вас добавили в задачу',
      removed: 'Вас исключили из задачи',
      cancelled: 'Задача отменена',
      rescheduled: 'Время задачи изменено',
      mentioned: '{{entity}}: вас упомянули в комментарии',
      replied: '{{entity}}: новый ответ',
      starting: 'Скоро начало задачи',
      signal: '{{entity}}: новые события',
      whatsapp: '{{entity}}: новое сообщение WhatsApp',
      whatsappNew: 'Новый разговор в WhatsApp',
      pending: 'Запрос на согласование',
      withdrawn: 'Запрос отозван',
      approved: 'Запрос согласован',
      rejected: 'Запрос отклонён',
    },
    entities: {
      leads: 'Лид',
      companies: 'Компания',
      contacts: 'Контакт',
      opportunities: 'Сделка',
      tasks: 'Задача',
      approvals: 'Согласование',
    },
    records: {
      leads: 'лид',
      companies: 'компания',
      contacts: 'контакт',
      opportunities: 'сделка',
      tasks: 'задача',
      approvals: 'согласование',
    },
  },
};
const pick = (
  table: Record<string, [string, string]>,
  index: 0 | 1,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(table).map(([key, pair]) => [key, pair[index]]),
  );
export const notificationLocales = {
  'en-US': async (): Promise<{
    titles: Record<string, string>;
    entities: Record<string, string>;
    records: Record<string, string>;
    body: string;
  }> => ({
    titles: pick(labels, 0),
    entities: pick(entityLabels, 0),
    records: pick(recordLabels, 0),
    // The record's name alone: the inbox shows the title itself.
    body: '{{name}}',
  }),
  'zh-CN': async (): Promise<{
    titles: Record<string, string>;
    entities: Record<string, string>;
    records: Record<string, string>;
    body: string;
  }> => ({
    titles: pick(labels, 1),
    entities: pick(entityLabels, 1),
    records: pick(recordLabels, 1),
    body: '{{name}}',
  }),
  ...Object.fromEntries(
    Object.entries(translations).map(([locale, table]) => [
      locale,
      async (): Promise<Table & { body: string }> => ({
        ...table,
        body: '{{name}}',
      }),
    ]),
  ),
};
