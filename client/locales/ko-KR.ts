import fileUi from '../extensions/nocobase-file-component-ui/locales/ko-KR.js';
import type { AppResource } from './en-US.js';
import { crmKoKR } from './crm/ko-KR.js';
import settingsKoKR from './settings/ko-KR.js';

// The pages in ko-KR: the template's copy (./system/), the AI skills'
// display text and the CRM's own (./crm/ko-KR.ts), with the same keys as
// ./en-US.ts. The template ships no ko-KR, so its copy is translated
// here; a template upgrade that adds keys fails the type check until they
// are translated.
const koKR: AppResource = {
  ...fileUi,
  'auth.passwordResetSuccess':
    '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인하세요.',
  'auth.requestNewResetLink': '새 재설정 링크 요청',
  'auth.preparingSession': '세션을 준비하는 중…',
  'auth.connectionFailed': '연결할 수 없습니다',
  'auth.connectionFailedDescription':
    '실시간 연결을 준비할 수 없습니다. 다시 시도해 애플리케이션에 들어가거나 로그아웃하세요.',
  'deviceApproval.title': '기기 인증',
  'deviceApproval.description':
    '명령줄이나 다른 기기에서 내 계정으로 로그인하려고 합니다. 직접 로그인을 시작한 경우에만 승인하세요.',
  'deviceApproval.enterCode': '기기에 표시된 코드를 입력하세요.',
  'deviceApproval.codeLabel': '코드',
  'deviceApproval.continue': '계속',
  'deviceApproval.checking': '코드를 확인하는 중…',
  'deviceApproval.confirm':
    '이 코드가 기기에 표시된 코드와 일치하는지 확인하세요.',
  'deviceApproval.client': '{{client}}에서 요청함',
  'deviceApproval.approve': '승인',
  'deviceApproval.approving': '승인하는 중…',
  'deviceApproval.deny': '거부',
  'deviceApproval.denying': '거부하는 중…',
  'deviceApproval.approved':
    '기기가 승인되었습니다. 터미널로 돌아가 계속하세요. 이 페이지는 닫아도 됩니다.',
  'deviceApproval.denied':
    '요청이 거부되었습니다. 기기는 로그인되지 않았습니다. 이 페이지는 닫아도 됩니다.',
  'deviceApproval.expired':
    '이 코드는 만료되었습니다. 기기에서 로그인을 다시 시작하세요.',
  'deviceApproval.invalid':
    '유효하지 않은 코드입니다. 기기에 표시된 코드와 비교한 후 다시 시도하세요.',
  'deviceApproval.notYours': '이 코드는 이미 다른 계정에서 승인 중입니다.',
  'deviceApproval.error': '문제가 발생했습니다. 다시 시도하세요.',
  'deviceApproval.retry': '다시 시도',
  'deviceApproval.otherCode': '다른 코드 입력',
  'inbox.title': '수신함',
  'inbox.description': '나에게 온 알림과 요청입니다.',
  'inbox.views.all': '알림',
  'inbox.views.todo': 'AI 제안',
  'inbox.kinds.label': '유형',
  'inbox.kinds.all': '모든 유형',
  'inbox.kinds.decision': '결정',
  'inbox.kinds.info': '알림',
  'inbox.tabs.decision': '내 결정 필요',
  'inbox.tabs.info': '알림',
  'inbox.clearFilter': '필터 지우기',
  'inbox.noMatchDescription': '모든 유형을 보려면 필터를 지우세요.',
  'inbox.readAll': '모두 읽음으로 표시',
  'inbox.allRead': '모두 읽음으로 표시했습니다.',
  'inbox.loading': '불러오는 중',
  'inbox.loadFailed': '수신함을 불러올 수 없습니다',
  'inbox.loadFailedDescription': '연결을 확인하고 다시 시도하세요.',
  'inbox.retry': '다시 시도',
  'inbox.loadMore': '더 불러오기',
  'inbox.emptyAll': '아무것도 없습니다',
  'inbox.empty.todo': '기다리고 있는 항목이 없습니다',
  'inbox.empty.decision': '결정을 기다리는 항목이 없습니다',
  'inbox.empty.info': '알림이 없습니다',
  'inbox.emptyDescription': '나에게 온 알림과 요청이 여기에 표시됩니다.',
  'inbox.unread': '읽지 않음',
  'inbox.unreadCount': '읽지 않음 {{count}}개',
  'inbox.pendingDecisions': '대기 중 {{count}}건',
  'inbox.resolved': '처리됨',
  'inbox.outcomes.approved': '승인됨',
  'inbox.outcomes.rejected': '반려됨',
  'inbox.outcomes.withdrawn': '철회됨',
  'inbox.count': '×{{count}}',
  'inbox.actionsFor': '{{title}} 작업',
  'inbox.actions.read': '읽음으로 표시',
  'inbox.actions.unread': '읽지 않음으로 표시',
  'inbox.actions.delete': '삭제',
  'inbox.deleted': '삭제했습니다.',
  'inbox.requestFailed': '요청에 실패했습니다. 다시 시도하세요.',
  'inbox.forbidden': '이 작업을 할 수 있는 권한이 없습니다.',
  'inbox.nothingSelected': '보려는 항목을 선택하세요',
  'inbox.back': '목록으로 돌아가기',
  'inbox.open': '열기',
  'inbox.keyMove': '이동',
  'inbox.keyOpen': '열기',
  'inbox.cancel': '취소',
  'inbox.request.approve': '승인',
  'inbox.request.reject': '반려',
  'inbox.request.commentPlaceholder': '내용을 입력하세요…',
  'inbox.request.commentFor': '{{action}}: {{title}}',
  'inbox.request.quickSend': '보내기',
  'inbox.request.newLine': '줄 바꿈',
  'inboxButton.title': '수신함',
  'inboxButton.pending': '수신함, 대기 중 {{count}}건',
  'inboxButton.unread': '수신함, 읽지 않음 {{count}}개',
  'inboxButton.pendingHint':
    '나를 기다리는 항목 {{count}}건이 있습니다. 처리하면 줄어듭니다.',
  'inboxButton.unreadHint':
    '읽지 않은 항목 {{count}}개가 있습니다. 읽으면 줄어듭니다.',
  'auth.welcome': '다시 오신 것을 환영합니다',
  'auth.loginDescription': '사용자 이름 또는 이메일과 비밀번호로 로그인하세요.',
  'auth.registerTitle': '계정 만들기',
  'auth.registerDescription': '시작하려면 계정을 만드세요.',
  'auth.forgotTitle': '비밀번호 찾기',
  'auth.forgotDescription':
    '이메일을 입력하면 계정이 있는 경우 재설정 링크를 보내 드립니다.',
  'auth.passwordResetUnavailable':
    '셀프 서비스 비밀번호 재설정이 활성화되어 있지 않습니다. 비밀번호를 재설정하려면 관리자에게 문의하세요.',
  'auth.capabilityLoadFailed':
    '비밀번호 재설정 사용 가능 여부를 확인할 수 없습니다.',
  'auth.retry': '다시 시도',
  'auth.loading': '불러오는 중',
  'auth.resetDescription': '계정의 새 비밀번호를 정하세요.',
  'auth.resetTitle': '비밀번호 재설정',
  'auth.identifier': '사용자 이름 또는 이메일',
  'auth.password': '비밀번호',
  'auth.signIn': '로그인',
  'auth.signingIn': '로그인하는 중…',
  'auth.hidePassword': '비밀번호 숨기기',
  'auth.showPassword': '비밀번호 표시',
  'auth.forgotLink': '비밀번호를 잊으셨나요?',
  'auth.noAccount': '계정이 없으신가요?',
  'auth.signUp': '가입하기',
  'auth.createAccount': '계정 만들기',
  'auth.creatingAccount': '계정을 만드는 중…',
  'auth.name': '이름',
  'auth.username': '사용자 이름',
  'auth.email': '이메일',
  'auth.confirmPassword': '비밀번호 확인',
  'auth.existingAccount': '이미 계정이 있으신가요?',
  'auth.passwordMismatch': '비밀번호가 일치하지 않습니다.',
  'auth.resetting': '재설정하는 중…',
  'auth.newPassword': '새 비밀번호',
  'auth.confirmNewPassword': '새 비밀번호 확인',
  'auth.invalidResetLink':
    '이 비밀번호 재설정 링크는 유효하지 않거나 만료되었습니다.',
  'auth.backToSignIn': '로그인으로 돌아가기',
  'auth.sendResetLink': '재설정 링크 보내기',
  'auth.sending': '보내는 중…',
  'auth.resetSent': '계정이 있는 경우 재설정 링크를 보냈습니다.',
  'auth.rememberPassword': '비밀번호가 기억나셨나요?',
  'auth.methods': '로그인 방법',
  'auth.or': '또는 다음으로 계속',
  'auth.continueWith': '{provider}(으)로 계속',
  'auth.about': '이 애플리케이션 정보',
  'auth.platform': 'AI 네이티브 애플리케이션 플랫폼',
  'auth.marketingTitleFirst': 'AI는 자유롭게 만들고,',
  'auth.marketingTitleSecond': 'NocoBase는',
  'auth.marketingTitleThird': '신뢰성을 지킵니다.',
  'auth.marketingDescription':
    'AI에게 유연한 프론트엔드 프레임워크를 제공해 모든 경험을 자유롭게 만들게 하고, 그 아래의 데이터, 권한, 거버넌스는 NocoBase가 지킵니다.',
  'auth.frontend': 'AI 네이티브 프론트엔드',
  'auth.frontendDescription':
    '유연한 프레임워크 위에서 자유롭게 인터페이스를 구성합니다.',
  'auth.foundation': 'NocoBase 기반',
  'auth.foundationDescription': '신뢰할 수 있는 데이터, 접근 제어, 거버넌스.',
  'auth.marketingFooter': '위에서는 자유롭게, 아래에서는 든든하게.',
  'status.loading': '불러오는 중',
  'status.loadingPage': '페이지를 불러오는 중',
  'status.denied': '접근 거부됨',
  'status.pageFailed': '페이지를 불러올 수 없습니다',
  'status.retry': '다시 시도',
  'navigation.brandHome': 'NocoCRM 홈',
  'navigation.brandApps': 'NocoBase 애플리케이션',
  'routeOverlay.close': '닫기',
  'status.deniedDescription': '{{label}}에 접근할 권한이 없습니다.',
  'status.routeFailedDescription':
    '{{packageName}}의 경로 {{label}}을(를) 불러올 수 없습니다.',
  shell: {
    buildFreely: 'AI는 자유롭게 만듭니다.',
    reliability: '<brand>NocoBase</brand>가 신뢰성을 지킵니다.',
  },
  home: {
    platform: 'NocoBase · AI 네이티브 애플리케이션 플랫폼',
    title: '설명하면 Agent가 만듭니다',
    description:
      '이 애플리케이션은 코딩 Agent와 대화하며 개발합니다. 비즈니스에 필요한 것을 쉬운 말로 설명하면, Agent가 이 프로젝트에 페이지, 데이터 모델, API, 비즈니스 프로세스를 작성합니다.',
    steps: {
      describe: {
        title: '요구 사항 설명',
        description:
          '누가 사용하는지, 어떤 데이터를 보관하는지, 무엇이 일어나야 하는지 설명하세요.',
      },
      build: {
        title: 'Agent가 만들기',
        description:
          'Agent가 이 프로젝트와 기본 제공 기능을 읽은 후 코드를 작성합니다.',
      },
      review: {
        title: '확인 및 개선',
        description:
          '페이지를 새로고침해 사용해 본 후, 같은 방식으로 변경을 요청하세요.',
      },
    },
    example: {
      title: '이런 요청을 해 보세요',
      text: '구매 주문 애플리케이션을 만들어 주세요.\n\n주문에는 번호, 품목, 신청자, 금액, 승인 상태가 있습니다. 신청자는 주문을 만들고 자신의 주문만 볼 수 있으며, 검토자는 대기 중인 모든 주문을 보고 승인하거나 반려합니다.\n결정 후에는 수신함으로 신청자에게 주문 링크와 함께 알림을 보내세요.',
      hint: '이 프로젝트에서 연 Claude Code, Codex, Cursor 또는 다른 코딩 Agent에 붙여 넣으세요.',
    },
    capabilitiesTitle: '기본 제공 기능',
    capabilitiesDescription:
      'Agent는 처음부터 만드는 대신 이 기능을 바로 사용합니다. 하나를 열면 편집하고 복사할 수 있는 프롬프트가 나옵니다.',
    viewPrompts: '프롬프트 보기 ({{count}})',
    prompt: {
      label: '프롬프트',
      hint: '복사하기 전에 비즈니스에 맞게 프롬프트를 편집하세요. 대화 상자를 닫으면 변경 사항은 저장되지 않습니다.',
      copy: '복사',
      copiedShort: '복사됨',
      copied: '프롬프트를 복사했습니다',
      copyFailed: '복사할 수 없습니다. 텍스트를 선택해 직접 복사하세요.',
      reset: '기본값으로 복원',
    },
    capabilities: {
      auth: {
        title: '인증',
        description: '로그인, 가입, 비밀번호 재설정, 회사 통합 로그인(SSO).',
        prompts: {
          disableSignUp: {
            label: '가입 닫기',
            text: '이 애플리케이션은 회사 직원 전용입니다. 모든 계정은 관리자가 만듭니다.\n셀프 가입을 비활성화하고 로그인 페이지에서 가입 링크를 제거하세요.\n기존 직원은 계속 자신의 계정과 비밀번호로 로그인할 수 있어야 합니다.\n비밀번호 찾기 링크는 유지하세요.',
          },
          companySso: {
            label: '회사 SSO',
            text: '직원이 OIDC를 사용해 회사 ID 플랫폼으로 로그인할 수 있게 해 주세요.\n\n계정-비밀번호 로그인은 유지하고 회사 계정 버튼을 추가하세요.\n이 버튼은 회사 ID 플랫폼을 엽니다. 로그인에 성공하면 애플리케이션의 홈페이지로 돌아갑니다.\n\n처음 로그인할 때 애플리케이션 계정을 만들 수 있게 하고, 플랫폼의 고정된 사용자 식별자로 식별하세요.\n이름이나 이메일을 비교해 계정을 자동으로 연결하지 마세요. 새 계정은 애플리케이션의 기본 권한을 사용합니다.\n\nID 플랫폼 관리자가 제공해야 하는 정보와 등록해야 하는 콜백 URL을 알려 주세요.',
          },
          apiKeys: {
            label: 'API 키',
            text: '애플리케이션의 기본 제공 API 키 기능을 사용해 사용자 메뉴에 통합 키 항목을 추가하세요.\n직원은 자신이 만든 키만 관리하며, 용도와 유효 기간(일)을 입력합니다.\n전체 키는 생성 직후 한 번만 표시하고, 바로 복사해 보관하라는 안내를 보여 주세요.\n각 키의 이름, 식별 가능한 일부, 상태, 만료일, 마지막 사용을 나열하고, 확인 후 키를 폐기할 수 있게 하세요.\n목록, 로그, 세부 정보에는 전체 키를 절대 표시하지 마세요.',
          },
        },
      },
      dataSources: {
        title: '데이터 소스',
        description:
          '애플리케이션 데이터베이스를 선택하고 기존 외부 데이터베이스의 비즈니스 데이터를 사용합니다.',
        prompts: {
          postgres: {
            label: '데이터베이스 전환',
            text: '애플리케이션 데이터베이스를 SQLite에서 PostgreSQL로 전환하세요.\n연결 정보는 소스 코드가 아닌 서버의 런타임 설정에서 읽으세요.\n설치할 데이터베이스 드라이버와 입력할 설정을 설명하고, 기존 데이터는 자동으로 마이그레이션되지 않는다는 점을 알려 주세요.',
          },
          externalDatabase: {
            label: '외부 데이터베이스',
            text: '회사의 기존 재무 데이터베이스를 읽기 전용 외부 데이터 소스로 연결하고, 테이블은 수정하지 마세요.\n공급업체 번호로 레코드를 매칭하고, 공급업체 세부 정보에 정산 주기, 신용 한도, 정산 상태를 보여 주는 정산 섹션을 추가하며 출처를 표시하세요.\n공급업체 연락처 정보는 계속 애플리케이션 데이터베이스에서 읽고, 정산 데이터는 가져오지 않고 외부 데이터베이스에서 직접 읽으세요.\n연결 자격 증명은 서버의 런타임 설정에서 읽으세요.',
          },
        },
      },
      authorization: {
        title: '권한',
        description:
          '누가 어떤 페이지를 열고, 어떤 작업을 실행하고, 어떤 레코드를 볼 수 있는지 제어합니다.',
        prompts: {
          jobs: {
            label: '직무',
            text: '애플리케이션에 구매 신청자와 주문 검토자 직무를 만드세요.\n구매 신청자는 주문 페이지에 들어가 자신이 신청한 주문을 볼 수 있습니다.\n주문 검토자는 주문 페이지에 들어가 주문을 보고, 대기 중인 주문을 승인하거나 반려할 수 있습니다.\n권한과 할당은 애플리케이션 관리자만 변경할 수 있습니다.\n애플리케이션의 기존 권한 기능을 사용해 관리자가 나중에 권한을 조정하고 사람을 할당할 수 있게 하세요.',
          },
          dataScopes: {
            label: '데이터 범위',
            text: '구매 신청자는 자신의 주문만 볼 수 있게 하고, 주문의 신청자 필드로 소유자를 판단하세요.\n주문 검토자는 모든 주문을 보고 대기 중인 승인을 처리할 수 있습니다.\n관리자는 각 직무의 권한 세트에서 주문 조회 범위를 조정할 수 있습니다.',
          },
          restrictions: {
            label: '제한',
            text: 'Bob은 임시로 구매 주문 검토를 돕고 있으며, 금액이 2,000 이하인 주문만 볼 수 있습니다.\n그의 주문 보기 작업에 금액 제한을 추가하되, 기존 직무와 데이터 범위는 유지하세요.\n제한은 그 자신의 주문과 그에게 공유된 주문에 적용하세요.\n관리자는 금액을 변경하거나 규칙을 제거할 수 있으며, 제거하기 전에 그가 볼 수 있는 범위가 넓어질 수 있다고 설명하세요.',
          },
        },
      },
      workflow: {
        title: '워크플로',
        description:
          '대기, 시간 초과, 재시도와 누가 무엇을 했는지에 대한 기록과 함께 비즈니스 레코드를 단계별로 진행합니다.',
        prompts: {
          stages: {
            label: '단계',
            text: '구매 주문에 프로세스를 추가하세요: 승인 대기 → 구매 대기 → 입고됨 → 완료.\n검토자는 승인하거나 반려하며, 반려할 때는 이유가 필요하고 주문은 신청자에게 돌아가 수정 후 다시 제출됩니다.\n구매 담당자가 구매를 진행하면 주문은 구매 대기 상태가 되고, 서명된 수령증으로 배송을 확인하면 입고됨으로 이동하며, 신청자가 확인하면 완료됩니다.\n주문 세부 정보에는 현재 단계의 작업만 표시하고, 일반 편집으로는 단계를 변경할 수 없게 하세요.\n단계와 필수 정보는 서버에서 확인하고, 다른 사람이 이미 제출한 결과를 절대 덮어쓰지 마세요.',
          },
          backgroundExport: {
            label: '백그라운드 내보내기',
            text: '기존 주문을 CSV로 내보내는 주문 보고서 페이지를 추가하세요.\n제출 후 내보내기는 처리 대기 상태가 되고, 백그라운드에서 생성되며, 다운로드 링크와 함께 완료됩니다.\n현재 단계, 파일 이름, 내보낸 주문 수, 제출 및 시스템 처리 기록을 표시하세요.\n생성에 실패하면 규칙에 따라 재시도하고, 최종 실패는 소유자가 처리하도록 남겨 두세요. 다시 실행해도 보고서 파일이 중복 생성되어서는 안 됩니다.\n페이지를 새로고침해도 진행 상황과 결과가 보이게 하고, 권한이 있는 사람만 주문을 내보낼 수 있게 하세요.',
          },
          history: {
            label: '기록',
            text: '주문 세부 정보에 현재 단계와 처리 기록을 표시하세요.\n각 항목에는 수행자, 시간, 작업, 이전 및 이후 단계, 반려 사유나 서명된 수령증을 표시합니다.\n자동으로 수행된 작업은 시스템이 수행한 것으로 표시하세요.\n페이지를 새로고침해도 진행 상황과 기록이 유지되어 완료 후 전체 프로세스를 검토할 수 있게 하세요.',
          },
        },
      },
      scheduler: {
        title: '예약 작업',
        description:
          '정해진 시간에 비즈니스 작업을 실행하고, 다음 실행과 결과를 확인합니다.',
        prompts: {
          reminder: {
            label: '일일 알림',
            text: '기존 주문 애플리케이션에 대기 중인 주문 알림을 추가하세요.\n\n평일 매일 베이징 시간 09:00에 승인 대기 중인 주문을 찾아 검토자별로 묶고, 각 검토자에게 앱 내 알림을 하나씩 보내세요.\n대기 중인 주문 수와 대기 중인 주문 목록 링크를 포함하세요. 대기 중인 주문이 없으면 아무것도 보내지 마세요.\n관리자는 일정과 실행 기록을 보고 알림을 일시 중지하거나 재개할 수 있습니다.',
          },
          weeklyReport: {
            label: '주간 보고서',
            text: '매주 월요일 베이징 시간 08:00에 지난주 영업 요약을 생성하고 영업 관리자에게 알리세요.\n매출, 주문 수, 지역별 합계를 포함하세요. 관리자는 작업과 실행 기록을 볼 수 있습니다.',
          },
        },
      },
      notification: {
        title: '알림',
        description:
          '어떤 일이 발생하면 앱 내 메시지, 이메일 또는 그룹 봇 메시지를 보냅니다.',
        prompts: {
          inApp: {
            label: '앱 내 메시지',
            text: '현재 애플리케이션에 주문 승인을 추가하고, 앱 내 메시지로 신청자에게 결과를 알리세요.\n\n주문에는 번호, 이름, 신청자, 금액, 승인 상태가 포함됩니다.\n신청자는 자신의 주문을 볼 수 있습니다. 검토자는 대기 중인 주문을 보고 승인하거나 반려할 수 있습니다. 기존 주문 및 승인 기능이 있다면 재사용하세요.\n\n승인 또는 반려 후에는 주문 신청자에게만 앱 내 메시지를 하나 보내세요.\n제목에는 주문이 승인되었는지 반려되었는지 표시합니다. 본문에는 주문 번호, 이름, 승인 결과를 포함합니다.\n메시지를 클릭하면 해당 주문 세부 정보가 열립니다.\n승인 대기 중에는 보내지 마세요. 같은 승인 결과에 대해서는 한 번만 알리세요.\n알림 실패는 저장된 승인 결과에 영향을 주지 않습니다.',
          },
          email: {
            label: '이메일',
            text: '애플리케이션에 설정된 이메일 채널을 사용해 기존 주문 승인 알림에 이메일을 추가하세요.\n\n주문이 승인되거나 반려되면 신청자의 계정 이메일로 결과를 보내세요.\n제목에는 주문 번호를, 본문에는 주문 이름과 결과를 포함하세요.\n기존 앱 내 메시지는 유지하세요. 신청자에게 이메일 주소가 없으면 앱 내 메시지만 보내세요.\n이메일 실패는 승인 결과나 앱 내 메시지에 영향을 주어서는 안 됩니다.',
          },
        },
      },
      mail: {
        title: '메일',
        description:
          '개인 메일함을 연결해 업무 이메일을 읽고, 답장하고, 보냅니다.',
        prompts: {
          providers: {
            label: '메일 제공업체',
            text: '서버 설정의 mail.providers에 애플리케이션용 mailbox.org를 설정하세요:\n- IMAP 수신 서버: imap.mailbox.org, 포트 993, SSL/TLS.\n- SMTP 발신 서버: smtp.mailbox.org, 포트 465, SSL/TLS.\n사용자는 메일함 계정 페이지에서 자신의 이메일 주소, 사용자 이름, 비밀번호를 입력하고 첫 동기화를 시작할 날짜를 선택합니다. 메일함 비밀번호를 설정이나 소스 코드에 절대 기록하지 마세요.',
          },
          mailCenter: {
            label: '메일 센터',
            text: '메일은 이 애플리케이션에 기본 제공됩니다. 다시 만들거나 다른 플러그인을 설치하지 말고 재사용하세요.\n메일 기능이 제공하는 메일 워크스페이스와 메일함 계정 페이지를 사용해 탐색 메뉴에 메일 센터와 메일함 계정 페이지를 추가하세요.\n사용자는 자신의 메일함을 연결하고, 수신 메시지를 동기화하고, 메시지와 첨부 파일을 읽고, 원래 제목과 대화 맥락을 유지한 채 원래 발신자에게 답장할 수 있습니다.\n각 사용자는 자신이 연결한 메일함으로 작업합니다.',
          },
          correspondence: {
            label: '고객 이메일',
            text: '애플리케이션의 기본 제공 메일 읽기 및 작성 컴포넌트를 재사용해 고객 세부 정보에 서신 섹션을 추가하세요.\n발신자나 수신자가 현재 고객의 연락처 이메일 주소와 일치하는 메시지를 표시하세요. 영업 사원은 자신이 연결한 메일함으로 메시지를 읽고, 첨부 파일을 보고, 답장할 수 있습니다.',
          },
        },
      },
      file: {
        title: '파일',
        description:
          '파일을 업로드해 레코드에 첨부하고, 미리 보거나 다운로드합니다.',
        prompts: {
          attachments: {
            label: '첨부 파일',
            text: '기존 주문 관리 애플리케이션에 구매 첨부 파일을 추가하세요.\n\n주문 세부 정보에 첨부 파일 영역을 추가하세요. 각 주문에는 PDF, 이미지, DOCX를 포함한 여러 파일을 첨부할 수 있습니다.\n파일 이름과 크기를 표시하고, 첨부 파일을 미리 보기, 다운로드, 제거하는 작업을 제공하세요.\n업로드 후 사용자가 첨부 파일을 현재 주문에 저장할 수 있게 하세요. 주문을 다시 열어도 첨부 파일을 사용할 수 있어야 합니다.\n주문에 접근할 수 있는 사람은 누구나 첨부 파일을 보고 다운로드할 수 있습니다. 신청자와 검토자는 첨부 파일을 추가하거나 제거할 수 있습니다.\n첨부 파일을 제거하면 현재 주문과의 연결만 해제되며, 파일은 유지됩니다.',
          },
          avatar: {
            label: '아바타',
            text: '각 직원에게 이미지 한 장으로 된 아바타를 추가하세요.\n아바타 업로드와 교체를 지원하고, 직원 목록과 세부 정보에 표시하세요.\n교체 후에는 새 아바타를 사용하고, 페이지를 새로고침해도 계속 보이게 하세요.',
          },
        },
      },
      i18n: {
        title: '언어',
        description:
          '인터페이스 언어를 전환하고, 언어를 추가하고, 기본 언어를 설정합니다.',
        prompts: {
          addLanguage: {
            label: '언어 추가',
            text: '내 애플리케이션에 스페인어를 추가하세요. 인터페이스와 서버 메시지를 번역하고, 언어 메뉴에 스페인어를 추가하세요.',
          },
          defaultLanguage: {
            label: '기본 언어',
            text: '언어를 선택하지 않은 사람을 위해 중국어 간체를 애플리케이션의 기본 언어로 설정하세요. 언어 메뉴에서 영어는 계속 사용할 수 있게 하세요.',
          },
        },
      },
      theme: {
        title: '테마',
        description:
          '색상, 글꼴, 밀도를 조정하고 라이트와 다크 모드를 전환합니다.',
        prompts: {
          changeTheme: {
            label: '테마 변경',
            text: 'Compact 테마를 업데이트하세요. 기본 색상으로 파란색을 사용하고 모서리 반경을 약간 늘리세요. 현재 글꼴, 글자 크기, 촘촘한 간격은 유지하세요.',
          },
          newTheme: {
            label: '새 테마',
            text: '녹색을 기본 색상으로 하고, 부드러운 배경, 적당히 둥근 모서리, 은은한 그림자를 가진 Forest 테마를 만드세요.',
          },
        },
      },
    },
  },
  appearance: {
    title: '화면 모양',
    mode: '색상 모드',
    preset: '테마',
    light: '라이트',
    dark: '다크',
    system: '시스템',
    themes: {
      default: '여유롭게',
      compact: '촘촘하게',
    },
  },
  app: {
    title: 'NocoCRM',
  },
  actions: {
    close: '닫기',
    save: '저장',
    cancel: '취소',
    confirm: '확인',
    language: '언어',
  },
  notices: {
    serverLocaleFallback:
      '서버가 이 언어를 지원하지 않아 서버 메시지는 영어로 표시됩니다.',
    languageChangeFailed: '언어를 변경할 수 없습니다. 다시 시도하세요.',
  },
  account: {
    signOutFailed: '로그아웃할 수 없습니다. 다시 시도하세요.',
    openMenu: '계정 메뉴 열기',
    fallback: '계정',
    signOut: '로그아웃',
    signingOut: '로그아웃하는 중…',
  },
  navigation: {
    home: '개요',
    open: '탐색 메뉴 열기',
    close: '탐색 메뉴 닫기',
    expand: '탐색 메뉴 펼치기',
    collapse: '탐색 메뉴 접기',
    toggle: '탐색 메뉴 펼치기 또는 접기',
    label: '애플리케이션 탐색',
    description: '이 애플리케이션의 페이지로 이동합니다.',
    breadcrumb: '이동 경로',
    breadcrumbMore: '중간 단계 표시',
    back: '뒤로',
  },
  dataTable: {
    noResults: '결과가 없습니다.',
    sortAscending: '오름차순',
    sortDescending: '내림차순',
    hideColumn: '숨기기',
    view: '보기',
    toggleColumns: '열 표시 전환',
    selectedCount: '{{total}}개 행 중 {{selected}}개 선택됨.',
    rowsPerPage: '페이지당 행 수',
    pageOf: '{{page}} / {{pageCount}} 페이지',
    firstPage: '첫 페이지로 이동',
    previousPage: '이전 페이지로 이동',
    nextPage: '다음 페이지로 이동',
    lastPage: '마지막 페이지로 이동',
  },
  datePicker: {
    placeholder: '날짜 선택',
    rangePlaceholder: '날짜 범위 선택',
  },
  'Lead follow-up': '리드 후속 조치',
  'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    '리드에 관한 현재 정보(리드 자체, 작업, 댓글, CRM의 관련 레코드)를 모두 검토하고 계속 후속 조치, 육성, 전환 또는 무효 중 다음 단계를 이유와 함께 권장합니다. 후속 조치를 권장할 때는 어떻게 후속 조치할지와 구체적으로 무엇을 할지 명확히 설명합니다. 새 리드가 들어왔을 때, 사용자가 리드의 후속 조치나 재후속 조치를 요청할 때, 또는 "이 리드로 다음에 무엇을 해야 하나요?"라고 물을 때 사용합니다.',
  'Opportunity follow-up': '영업 기회 후속 조치',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    '영업 기회의 현재 상황(영업 기회 자체, 회사, 연락처와 그 역할, 작업, 댓글, 승인, 원본 리드)을 모두 검토하고, 현재 단계가 타당한지와 다음에 할 일(다음 단계로 진행, 현 단계 유지, 보류 또는 실주로 표시)을 이유, 위험 요소, 보완할 점과 함께 판단합니다. 진행을 권장할 때는 구체적으로 무엇을 할지 설명합니다. 리드 전환으로 새 영업 기회가 열렸을 때, 영업 기회 작업의 결과가 기록되었을 때, 사용자가 후속 조치를 요청할 때, 또는 "이 영업 기회의 다음 단계는 무엇인가요?"라고 물을 때 사용합니다.',
  'Approval review': '승인 검토',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    '승인자가 승인 요청(할인, 결제 조건, 계약 조건, 납품 약속)을 승인할 가치가 있는지 판단하도록 돕습니다. 요청 조건이 표준과 얼마나 다른지, 금액과 수금에 미치는 영향, 영업 기회의 상황과 이번 양보를 뒷받침하는 근거, 같은 영업 기회에서 함께 제출된 다른 승인, 같은 유형의 이전 요청이 어떻게 결정되었는지, 위험 요소와 신청자가 불분명하게 남긴 부분을 살핀 후 승인, 조건부 승인, 반려 또는 추가 정보 요청을 권장하고 결정 의견 초안을 작성합니다. 승인이 제출된 후나 승인자가 "이 승인을 승인해야 하나요?"라고 물을 때 사용합니다.',
  'Task preparation': '작업 준비',
  "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.":
    '영업 사원이 고객과 곧 진행할 작업(통화, 회의, 방문, 데모)을 준비하도록 돕습니다. 작업의 목표, 레코드의 작업·댓글·메일로 본 현재 상황, 상대방이 누구이며 각자 어떤 역할을 하는지, 질문할 내용, 가져갈 것, 위험 요소, 순서대로 다룰 내용을 정리합니다. 작업 당일 아침이나 작업 담당자가 준비를 요청할 때 사용합니다.',
  flowDiagram: {
    controls: '다이어그램 컨트롤',
    fitView: '화면에 맞추기',
    fullscreen: '전체 화면',
    exitFullscreen: '전체 화면 종료',
    escapeHint: 'Esc 키를 눌러 종료',
    leavesTo: '다음으로 이동',
    arrivesFrom: '이전 상태',
    otherRoutes: '다른 경로',
    minimap: '다이어그램 개요',
    configure: '설정',
    overview: '다이어그램 개요',
    actualSize: '실제 크기',
    states: '상태',
    transitions: '전환',
    configurable: '매개변수',
    current: '현재',
    visited: '거쳐 감',
    initial: '시작',
    final: '최종',
    state: '상태',
    zoomOut: '축소',
    zoomIn: '확대',
    fit: '화면에 맞추기',
    empty: '표시할 상태가 없습니다.',
    loading: '다이어그램을 배치하는 중…',
    failed: '이 다이어그램을 배치할 수 없습니다.',
    nodeHelp: 'Enter 또는 Space 키를 눌러 상태를 선택하세요.',
    edgeHelp: 'Enter 또는 Space 키를 눌러 전환을 선택하세요.',
  },
  loginActivity: {
    heading: '첫 리드부터 계약 체결까지.',
    description:
      'AI 영업팀이 모든 리드와 영업 기회를 후속 조치하고, 모든 회의와 승인을 준비하며, 결정은 내가 내립니다.',
    phases: {
      lead: '리드',
      deal: '영업 기회',
      won: '성사',
    },
    participants: {
      rep: 'Sophie Bennett',
      leadAgent: 'AI 리드 후속 조치',
      prepAgent: 'AI 작업 어시스턴트',
      dealAgent: 'AI 영업 기회 후속 조치',
      approvalAgent: 'AI 승인 검토',
      manager: 'Daniel Brooks',
      customer: 'Emma Walsh',
    },
    capabilities: {
      capture: 'AI 캡처',
      followUp: 'AI 후속 조치',
      pipeline: '파이프라인',
      prep: '작업 준비',
      mail: '메일',
      approval: '승인',
    },
    timeline: '타임라인',
    lead: {
      kind: '리드',
      title: 'Emma Walsh / Northwind Logistics',
      need: '차량 배차, 트럭 200대 · 이메일에서',
      grade: 'A등급',
    },
    deal: {
      kind: '영업 기회',
      title: '차량 배차 플랫폼 (Enterprise)',
      company: 'Northwind Logistics',
      amount: '$48,000',
      owner: 'Sophie Bennett',
      won: '수주',
    },
    leadStatuses: {
      new: '신규',
      working: '진행 중',
      converted: '전환됨',
    },
    stages: {
      qualification: '자격 검증',
      proposal: '제안',
      negotiation: '협상',
      won: '수주',
    },
    steps: {
      captured: {
        who: 'AI',
        what: '이메일에서 리드를 정리했습니다',
      },
      leadFollowUp: {
        who: 'AI 후속 조치',
        what: 'A등급, 오늘 오후 3시에 전화',
      },
      converted: {
        who: 'Sophie Bennett',
        what: '리드를 영업 기회로 전환했습니다',
      },
      prepared: {
        who: 'AI',
        what: '고객의 실제 운행 경로로 내일 데모를 준비했습니다',
      },
      replied: {
        who: 'Emma Walsh',
        what: '청구서 발행 후 60일 뒤에 결제해도 될까요?',
      },
      dealFollowUp: {
        who: 'AI 후속 조치',
        what: '협상 단계로 진행, 60일 조건은 승인 필요',
      },
      reviewed: {
        who: 'AI 검토',
        what: '조건부 승인',
      },
      approved: {
        who: 'Daniel Brooks',
        what: '60일 결제 조건을 승인했습니다',
      },
      won: {
        who: 'Sophie Bennett',
        what: '서명된 계약서가 돌아왔습니다',
      },
    },
  },
  // The template's Settings copy, translated in ./settings/.
  settings: settingsKoKR,
  crm: crmKoKR,
};

export default koKR;
