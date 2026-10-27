import fileUi from '../extensions/nocobase-file-component-ui/locales/ja-JP.js';
import type { AppResource } from './en-US.js';
import { crmJaJP } from './crm/ja-JP.js';
import settingsJaJP from './settings/ja-JP.js';

// The pages in ja-JP: the template's copy (./system/), the AI skills'
// display text and the CRM's own (./crm/ja-JP.ts), with the same keys as
// ./en-US.ts. The template ships no ja-JP, so its copy is translated
// here; a template upgrade that adds keys fails the type check until they
// are translated.
const jaJP: AppResource = {
  ...fileUi,
  'auth.passwordResetSuccess':
    'パスワードがリセットされました。新しいパスワードでログインしてください。',
  'auth.requestNewResetLink': 'リセットリンクを再申請',
  'auth.preparingSession': 'セッションを準備しています…',
  'auth.connectionFailed': '接続できません',
  'auth.connectionFailedDescription':
    'リアルタイム接続を準備できませんでした。再試行してアプリに入るか、ログアウトしてください。',
  'deviceApproval.title': 'デバイスを認可',
  'deviceApproval.description':
    'コマンドラインまたは別のデバイスが、あなたとしてログインしようとしています。ご自身でログインを開始した場合にのみ承認してください。',
  'deviceApproval.enterCode':
    'デバイスに表示されているコードを入力してください。',
  'deviceApproval.codeLabel': 'コード',
  'deviceApproval.continue': '続行',
  'deviceApproval.checking': 'コードを確認中…',
  'deviceApproval.confirm':
    'このコードがデバイスに表示されているものと一致することを確認してください。',
  'deviceApproval.client': '{{client}} からのリクエスト',
  'deviceApproval.approve': '承認',
  'deviceApproval.approving': '承認中…',
  'deviceApproval.deny': '拒否',
  'deviceApproval.denying': '拒否中…',
  'deviceApproval.approved':
    'デバイスを承認しました。ターミナルに戻って操作を続けてください。このページは閉じてかまいません。',
  'deviceApproval.denied':
    'リクエストを拒否しました。デバイスはログインしていません。このページは閉じてかまいません。',
  'deviceApproval.expired':
    'このコードは有効期限が切れています。デバイスでもう一度ログインを開始してください。',
  'deviceApproval.invalid':
    'このコードは無効です。デバイスの表示と照らし合わせて、もう一度お試しください。',
  'deviceApproval.notYours': 'このコードは別のアカウントで承認処理中です。',
  'deviceApproval.error': '問題が発生しました。もう一度お試しください。',
  'deviceApproval.retry': '再試行',
  'deviceApproval.otherCode': '別のコードを入力',
  'inbox.title': '受信トレイ',
  'inbox.description': 'あなた宛ての通知とリクエスト。',
  'inbox.views.all': '通知',
  'inbox.views.todo': 'AI 提案',
  'inbox.kinds.label': '種類',
  'inbox.kinds.all': 'すべての種類',
  'inbox.kinds.decision': '判断',
  'inbox.kinds.info': '通知',
  'inbox.tabs.decision': '判断待ち',
  'inbox.tabs.info': '通知',
  'inbox.clearFilter': 'フィルターをクリア',
  'inbox.noMatchDescription':
    'フィルターをクリアすると、すべての種類が表示されます。',
  'inbox.readAll': 'すべて既読にする',
  'inbox.allRead': 'すべて既読にしました。',
  'inbox.loading': '読み込み中',
  'inbox.loadFailed': '受信トレイを読み込めません',
  'inbox.loadFailedDescription': '接続を確認して、もう一度お試しください。',
  'inbox.retry': '再試行',
  'inbox.loadMore': 'さらに読み込む',
  'inbox.emptyAll': '何もありません',
  'inbox.empty.todo': '対応待ちの項目はありません',
  'inbox.empty.decision': '判断待ちの項目はありません',
  'inbox.empty.info': '通知はありません',
  'inbox.emptyDescription':
    'あなた宛ての通知とリクエストがここに表示されます。',
  'inbox.unread': '未読',
  'inbox.unreadCount': '未読 {{count}} 件',
  'inbox.pendingDecisions': '対応待ち {{count}} 件',
  'inbox.resolved': '対応済み',
  'inbox.outcomes.approved': '承認済み',
  'inbox.outcomes.rejected': '却下済み',
  'inbox.outcomes.withdrawn': '取り下げ済み',
  'inbox.count': '×{{count}}',
  'inbox.actionsFor': '{{title}} の操作',
  'inbox.actions.read': '既読にする',
  'inbox.actions.unread': '未読にする',
  'inbox.actions.delete': '削除',
  'inbox.deleted': '削除しました。',
  'inbox.requestFailed': 'リクエストに失敗しました。もう一度お試しください。',
  'inbox.forbidden': 'この操作を行う権限がありません。',
  'inbox.nothingSelected': '表示する項目を選択してください',
  'inbox.back': '一覧に戻る',
  'inbox.open': '開く',
  'inbox.keyMove': '移動',
  'inbox.keyOpen': '開く',
  'inbox.cancel': 'キャンセル',
  'inbox.request.approve': '承認',
  'inbox.request.reject': '却下',
  'inbox.request.commentPlaceholder': 'コメントを入力…',
  'inbox.request.commentFor': '{{action}}：{{title}}',
  'inbox.request.quickSend': 'で送信',
  'inbox.request.newLine': 'で改行',
  'inboxButton.title': '受信トレイ',
  'inboxButton.pending': '受信トレイ、対応待ち {{count}} 件',
  'inboxButton.unread': '受信トレイ、未読 {{count}} 件',
  'inboxButton.pendingHint':
    '対応待ちが {{count}} 件あります。対応すると減ります。',
  'inboxButton.unreadHint': '未読が {{count}} 件あります。読むと減ります。',
  'auth.welcome': 'おかえりなさい',
  'auth.loginDescription':
    'ユーザー名またはメールアドレスとパスワードでログインしてください。',
  'auth.registerTitle': 'アカウントを作成',
  'auth.registerDescription': 'アカウントを作成して始めましょう。',
  'auth.forgotTitle': 'パスワードをお忘れの場合',
  'auth.forgotDescription':
    'メールアドレスを入力してください。アカウントが存在する場合、リセットリンクをお送りします。',
  'auth.passwordResetUnavailable':
    'セルフサービスのパスワードリセットは有効になっていません。パスワードのリセットは管理者にお問い合わせください。',
  'auth.capabilityLoadFailed':
    'パスワードリセットが利用可能か確認できませんでした。',
  'auth.retry': '再試行',
  'auth.loading': '読み込み中',
  'auth.resetDescription': 'アカウントの新しいパスワードを設定してください。',
  'auth.resetTitle': 'パスワードをリセット',
  'auth.identifier': 'ユーザー名またはメールアドレス',
  'auth.password': 'パスワード',
  'auth.signIn': 'ログイン',
  'auth.signingIn': 'ログイン中…',
  'auth.hidePassword': 'パスワードを隠す',
  'auth.showPassword': 'パスワードを表示',
  'auth.forgotLink': 'パスワードをお忘れですか？',
  'auth.noAccount': 'アカウントをお持ちでない場合',
  'auth.signUp': '新規登録',
  'auth.createAccount': 'アカウントを作成',
  'auth.creatingAccount': 'アカウントを作成中…',
  'auth.name': '氏名',
  'auth.username': 'ユーザー名',
  'auth.email': 'メールアドレス',
  'auth.confirmPassword': 'パスワード（確認）',
  'auth.existingAccount': 'すでにアカウントをお持ちの場合',
  'auth.passwordMismatch': 'パスワードが一致しません。',
  'auth.resetting': 'リセット中…',
  'auth.newPassword': '新しいパスワード',
  'auth.confirmNewPassword': '新しいパスワード（確認）',
  'auth.invalidResetLink':
    'このパスワードリセットリンクは無効か、有効期限が切れています。',
  'auth.backToSignIn': 'ログインに戻る',
  'auth.sendResetLink': 'リセットリンクを送信',
  'auth.sending': '送信中…',
  'auth.resetSent': 'アカウントが存在する場合、リセットリンクを送信しました。',
  'auth.rememberPassword': 'パスワードを思い出した場合',
  'auth.methods': 'ログイン方法',
  'auth.or': 'または次の方法で続行',
  'auth.continueWith': '{provider} で続行',
  'auth.about': 'このアプリケーションについて',
  'auth.platform': 'AI ネイティブなアプリケーションプラットフォーム',
  'auth.marketingTitleFirst': 'AI は自由に構築し、',
  'auth.marketingTitleSecond': 'NocoBase が',
  'auth.marketingTitleThird': '信頼性を支える。',
  'auth.marketingDescription':
    'AI には柔軟なフロントエンドフレームワークで自在に体験を作らせ、その下のデータ、権限、ガバナンスは NocoBase が守ります。',
  'auth.frontend': 'AI ネイティブなフロントエンド',
  'auth.frontendDescription':
    '柔軟なフレームワーク上で、画面を自由に構成できます。',
  'auth.foundation': 'NocoBase の基盤',
  'auth.foundationDescription': '信頼できるデータ、アクセス制御、ガバナンス。',
  'auth.marketingFooter': '上は自由に。下は確実に。',
  'status.loading': '読み込み中',
  'status.loadingPage': 'ページを読み込み中',
  'status.denied': 'アクセスが拒否されました',
  'status.pageFailed': 'ページを読み込めません',
  'status.retry': '再試行',
  'navigation.brandHome': 'NocoCRM ホーム',
  'navigation.brandApps': 'NocoBase アプリケーション',
  'routeOverlay.close': '閉じる',
  'status.deniedDescription': '{{label}} にアクセスする権限がありません。',
  'status.routeFailedDescription':
    '{{packageName}} のルート {{label}} を読み込めませんでした。',
  shell: {
    buildFreely: 'AI は自由に構築する。',
    reliability: '<brand>NocoBase</brand> が信頼性を支える。',
  },
  home: {
    platform: 'NocoBase · AI ネイティブなアプリケーションプラットフォーム',
    title: '伝えれば、Agent が構築します',
    description:
      'このアプリケーションは、コーディング Agent との対話で開発します。業務に必要なことを普段の言葉で伝えると、このプロジェクトのページ、データモデル、API、業務プロセスを Agent が書きます。',
    steps: {
      describe: {
        title: '要件を伝える',
        description:
          '誰が使うのか、どのデータを保持するのか、何が起きるべきかを伝えます。',
      },
      build: {
        title: 'Agent に構築させる',
        description:
          'このプロジェクトと組み込み機能を読み込んでから、コードを書きます。',
      },
      review: {
        title: '確認して調整',
        description:
          'ページを再読み込みして試し、変更があれば同じように依頼します。',
      },
    },
    example: {
      title: 'このように依頼してみましょう',
      text: '発注アプリケーションを作成してください。\n\n発注には、番号、品目、申請者、金額、承認ステータスがあります。申請者は発注を作成でき、自分の発注だけを閲覧できます。審査者は承認待ちのすべての発注を閲覧し、承認または却下します。\n判断が出たら、発注へのリンク付きで申請者に受信トレイで通知してください。',
      hint: 'このプロジェクトで開いた Claude Code、Codex、Cursor などのコーディング Agent に貼り付けてください。',
    },
    capabilitiesTitle: '組み込み機能',
    capabilitiesDescription:
      'Agent はこれらをゼロから作らず、そのまま利用します。いずれかを開くと、編集してコピーできるプロンプトが表示されます。',
    viewPrompts: 'プロンプトを表示（{{count}}）',
    prompt: {
      label: 'プロンプト',
      hint: 'コピーする前に、業務に合わせてプロンプトを編集してください。ダイアログを閉じると変更は保存されません。',
      copy: 'コピー',
      copiedShort: 'コピーしました',
      copied: 'プロンプトをコピーしました',
      copyFailed:
        'コピーできません。テキストを選択して手動でコピーしてください。',
      reset: '既定に戻す',
    },
    capabilities: {
      auth: {
        title: '認証',
        description:
          'ログイン、登録、パスワードリセット、社内シングルサインオン。',
        prompts: {
          disableSignUp: {
            label: '新規登録を停止',
            text: 'このアプリケーションは社員専用です。アカウントはすべて管理者が作成します。\nセルフ登録を無効にし、ログインページから登録リンクを削除してください。\n既存の社員は、引き続き自分のアカウントとパスワードでログインできるようにしてください。\nパスワードを忘れた場合のリンクは残してください。',
          },
          companySso: {
            label: '社内 SSO',
            text: '社員が OIDC を使って社内の ID プラットフォームでログインできるようにしてください。\n\nアカウントとパスワードによるログインは残し、「社内アカウント」ボタンを追加してください。\nボタンを押すと社内の ID プラットフォームが開き、ログインに成功したらアプリケーションのホームページに戻ります。\n\n初回ログイン時にアプリケーションのアカウントを作成できるようにし、プラットフォームの不変のユーザー識別子で識別してください。\n名前やメールアドレスの一致でアカウントを自動的に紐付けないでください。新しいアカウントにはアプリケーションの既定の権限を適用します。\n\nID プラットフォームの管理者が提供する必要がある情報と、登録が必要なコールバック URL を一覧にしてください。',
          },
          apiKeys: {
            label: 'API キー',
            text: 'アプリケーションの組み込みの API キー機能を使い、ユーザーメニューに「連携キー」の項目を追加してください。\n社員は自分が作成したキーだけを管理でき、作成時に用途と有効日数を入力します。\nキーの全体は作成直後に一度だけ表示し、すぐにコピーして保管するよう促してください。\n各キーの名前、識別できる一部の文字列、ステータス、有効期限、最終使用日時を一覧表示し、確認のうえ失効できるようにしてください。\n一覧、ログ、詳細のいずれにもキーの全体を表示しないでください。',
          },
        },
      },
      dataSources: {
        title: 'データソース',
        description:
          'アプリケーションのデータベースを選び、既存の外部データベースの業務データを利用します。',
        prompts: {
          postgres: {
            label: 'データベースを切り替え',
            text: 'アプリケーションのデータベースを SQLite から PostgreSQL に切り替えてください。\n接続情報はソースコードではなく、サーバーの実行時設定から読み込んでください。\nインストールが必要なデータベースドライバーと入力が必要な設定を説明し、既存のデータは自動では移行されないことを知らせてください。',
          },
          externalDatabase: {
            label: '外部データベース',
            text: '社内の既存の財務データベースを読み取り専用の外部データソースとして接続してください。そのテーブルは変更しないでください。\n仕入先番号でレコードを照合し、仕入先の詳細に「決済情報」セクションを追加して、決済サイクル、与信限度額、決済ステータスを出典を明記して表示してください。\n仕入先の連絡先情報は引き続きアプリケーションのデータベースから読み込み、決済データはインポートせずに外部データベースから直接読み込んでください。\n接続の認証情報はサーバーの実行時設定から読み込んでください。',
          },
        },
      },
      authorization: {
        title: '権限',
        description:
          '誰がどのページを開き、どの操作を実行し、どのレコードを閲覧できるかを制御します。',
        prompts: {
          jobs: {
            label: '職務',
            text: 'アプリケーションに「購買申請者」と「発注審査者」の職務を作成してください。\n購買申請者は発注ページに入り、自分が申請した発注を閲覧できます。\n発注審査者は発注ページに入り、発注を閲覧し、承認待ちの発注を承認または却下できます。\n権限と割り当てを変更できるのはアプリケーション管理者だけです。\nアプリケーションの既存の権限機能を使い、管理者が後から権限を調整したり担当者を割り当てたりできるようにしてください。',
          },
          dataScopes: {
            label: 'データ範囲',
            text: '購買申請者が自分の発注だけを閲覧できるようにし、発注の申請者フィールドで所有者を判定してください。\n発注審査者はすべての発注を閲覧し、承認待ちの発注を処理できます。\n管理者は各職務の権限セットで、発注の閲覧範囲を調整できます。',
          },
          restrictions: {
            label: '制限ルール',
            text: 'Bob は一時的に発注の確認を手伝っており、閲覧できるのは金額 2,000 以下の発注だけです。\n既存の職務とデータ範囲はそのままに、彼の「発注を閲覧」操作に金額の上限を追加してください。\nこの制限は、彼自身の発注と彼に共有された発注の両方に適用してください。\n管理者は金額を変更したりルールを削除したりできます。削除する前に、彼の閲覧範囲が広がる可能性があることを説明してください。',
          },
        },
      },
      workflow: {
        title: 'ワークフロー',
        description:
          '業務レコードをフェーズごとに進め、待機、タイムアウト、再試行、誰が何をしたかの履歴を扱います。',
        prompts: {
          stages: {
            label: 'フェーズ',
            text: '発注にプロセスを追加してください：承認待ち → 購買待ち → 入荷済み → 完了。\n審査者は承認または却下します。却下には理由が必須で、発注は申請者に差し戻され、修正して再提出されます。\n購買担当者が発注すると購買待ちになり、受領書付きで入荷を確認すると入荷済みに、申請者が確認すると完了になります。\n発注の詳細には現在のフェーズの操作だけを表示し、通常の編集ではフェーズを変更できないようにしてください。\nフェーズと必須情報はサーバーで確認し、他の人がすでに提出した結果を上書きしないでください。',
          },
          backgroundExport: {
            label: 'バックグラウンドエクスポート',
            text: '既存の発注を CSV にエクスポートする発注レポートページを追加してください。\n送信後、エクスポートは処理待ちとなり、バックグラウンドで生成され、ダウンロードリンク付きで完了します。\n現在のフェーズ、ファイル名、エクスポートした発注の件数、送信とシステム処理の記録を表示してください。\n生成に失敗した場合はルールに従って再試行し、最終的な失敗は担当者が対応できるよう残してください。再実行してもレポートファイルが重複して作成されないようにしてください。\nページを再読み込みしても進捗と結果を確認できるようにし、発注をエクスポートできるのは権限のある人だけにしてください。',
          },
          history: {
            label: '履歴',
            text: '発注の詳細に、現在のフェーズと処理履歴を表示してください。\n各記録には、操作した人、日時、操作、前後のフェーズ、却下理由や受領書を表示します。\n自動で実行された操作は、システムが実行したことを明示してください。\nページを再読み込みしても進捗と履歴を保持し、完了後にプロセス全体を振り返れるようにしてください。',
          },
        },
      },
      scheduler: {
        title: 'スケジュールタスク',
        description:
          '決まった時刻に業務処理を実行し、次回の実行と結果を確認できます。',
        prompts: {
          reminder: {
            label: '毎日のリマインダー',
            text: '既存の発注アプリケーションに「承認待ち発注のリマインダー」を追加してください。\n\n平日の毎朝 9:00（北京時間）に承認待ちの発注を検索し、審査者ごとにまとめて、各審査者にアプリ内通知を 1 件送信してください。\n通知には承認待ちの発注件数を含め、承認待ち発注の一覧へリンクしてください。承認待ちの発注がない場合は何も送信しません。\n管理者はスケジュールと実行記録を確認し、リマインダーを一時停止または再開できます。',
          },
          weeklyReport: {
            label: '週次レポート',
            text: '毎週月曜日の 8:00（北京時間）に先週の売上サマリーを生成し、営業マネージャーに通知してください。\n売上高、受注件数、地域別の合計を含めてください。管理者はタスクと実行記録を確認できます。',
          },
        },
      },
      notification: {
        title: '通知',
        description:
          '何かが起きたときに、アプリ内メッセージ、メール、グループのボットメッセージを送信します。',
        prompts: {
          inApp: {
            label: 'アプリ内メッセージ',
            text: '現在のアプリケーションに発注の承認を追加し、結果をアプリ内メッセージで申請者に通知してください。\n\n発注には、番号、名称、申請者、金額、承認ステータスがあります。\n申請者は自分の発注を閲覧できます。審査者は承認待ちの発注を閲覧し、承認または却下できます。既存の発注機能や承認機能があれば再利用してください。\n\n承認または却下の後、その発注の申請者だけにアプリ内メッセージを 1 件送信してください。\nタイトルには承認か却下かを示し、本文には発注番号、名称、承認結果を含めます。\nメッセージをクリックすると、該当する発注の詳細が開きます。\n承認待ちの間は送信しないでください。同じ承認結果については一度だけ通知します。\n通知に失敗しても、保存された承認結果には影響しません。',
          },
          email: {
            label: 'メール',
            text: 'アプリケーションで設定済みのメールチャネルを使い、既存の発注承認の通知にメールを追加してください。\n\n発注が承認または却下された後、申請者のアカウントのメールアドレスに結果を送信してください。\n件名には発注番号を、本文には発注の名称と結果を含めてください。\n既存のアプリ内メッセージは残してください。申請者にメールアドレスがない場合は、アプリ内メッセージだけを送信します。\nメールの送信に失敗しても、承認結果やアプリ内メッセージに影響しないようにしてください。',
          },
        },
      },
      mail: {
        title: 'メール',
        description:
          '個人のメールボックスを接続し、業務メールの閲覧、返信、送信を行います。',
        prompts: {
          providers: {
            label: 'メールプロバイダー',
            text: 'サーバー設定の mail.providers に、アプリケーション用の mailbox.org を設定してください：\n- IMAP 受信サーバー：imap.mailbox.org、ポート 993、SSL/TLS。\n- SMTP 送信サーバー：smtp.mailbox.org、ポート 465、SSL/TLS。\nユーザーはメールボックスアカウントのページで自分のメールアドレス、ユーザー名、パスワードを入力し、初回同期の開始日を選択します。メールボックスのパスワードは設定ファイルやソースコードに書かないでください。',
          },
          mailCenter: {
            label: 'メールセンター',
            text: 'メールはこのアプリケーションに組み込まれています。作り直したり別のプラグインをインストールしたりせず、再利用してください。\nメール機能が提供するメールワークスペースとメールボックスアカウントのページを使い、ナビゲーションに「メールセンター」と「メールボックスアカウント」のページを追加してください。\nユーザーは自分のメールボックスを接続し、受信メッセージを同期し、メッセージと添付ファイルを閲覧し、返信できます。返信では元の件名と会話の文脈を保ち、宛先は元の送信者にします。\n各ユーザーは自分が接続したメールボックスだけを扱います。',
          },
          correspondence: {
            label: '顧客とのメール',
            text: 'アプリケーションの組み込みのメール閲覧・作成コンポーネントを再利用して、顧客の詳細にやり取りのセクションを追加してください。\n送信者または受信者が現在の顧客の連絡先メールアドレスと一致するメッセージを表示します。営業担当は、自分が接続したメールボックスを使ってメッセージの閲覧、添付ファイルの表示、返信ができます。',
          },
        },
      },
      file: {
        title: 'ファイル',
        description:
          'ファイルをアップロードしてレコードに添付し、プレビューやダウンロードができます。',
        prompts: {
          attachments: {
            label: '添付ファイル',
            text: '既存の発注管理アプリケーションに、購買の添付ファイルを追加してください。\n\n発注の詳細に添付ファイルエリアを追加してください。各発注には、PDF、画像、DOCX を含む複数のファイルを添付できます。\nファイル名とサイズを表示し、添付ファイルのプレビュー、ダウンロード、削除の操作を用意してください。\nアップロード後、ユーザーが添付ファイルを現在の発注に保存できるようにし、発注を開き直しても表示されるようにしてください。\n発注にアクセスできる人は誰でも添付ファイルを閲覧・ダウンロードできます。申請者と審査者は添付ファイルを追加・削除できます。\n添付ファイルを削除しても現在の発注との紐付けを解除するだけで、ファイル自体は保持します。',
          },
          avatar: {
            label: 'アバター',
            text: '各社員にアバターを追加してください。社員 1 人につき画像は 1 枚です。\nアバターのアップロードと差し替えに対応し、社員の一覧と詳細に表示してください。\n差し替え後は新しいアバターを使い、ページを再読み込みしても表示されるようにしてください。',
          },
        },
      },
      i18n: {
        title: '言語',
        description:
          '画面の言語を切り替え、言語を追加し、既定の言語を設定します。',
        prompts: {
          addLanguage: {
            label: '言語を追加',
            text: 'アプリケーションにスペイン語を追加してください。画面とサーバーのメッセージを翻訳し、言語メニューにスペイン語を追加してください。',
          },
          defaultLanguage: {
            label: '既定の言語',
            text: '言語を選択していない人向けに、アプリケーションの既定の言語を簡体字中国語にしてください。言語メニューでは英語を引き続き選択できるようにしてください。',
          },
        },
      },
      theme: {
        title: 'テーマ',
        description:
          '色、フォント、密度を調整し、ライトとダークを切り替えます。',
        prompts: {
          changeTheme: {
            label: 'テーマを変更',
            text: '「コンパクト」テーマを更新してください：プライマリカラーを青にし、角の丸みを少し大きくします。現在のフォント、文字サイズ、コンパクトな余白はそのままにしてください。',
          },
          newTheme: {
            label: '新しいテーマ',
            text: '緑をプライマリカラーとし、柔らかな背景、ほどよく丸い角、控えめな影を持つ「フォレスト」テーマを作成してください。',
          },
        },
      },
    },
  },
  appearance: {
    title: '外観',
    mode: 'カラーモード',
    preset: 'テーマ',
    light: 'ライト',
    dark: 'ダーク',
    system: 'システム設定に従う',
    themes: {
      default: 'ゆったり',
      compact: 'コンパクト',
    },
  },
  app: {
    title: 'NocoCRM',
  },
  actions: {
    close: '閉じる',
    save: '保存',
    cancel: 'キャンセル',
    confirm: '確定',
    language: '言語',
  },
  notices: {
    serverLocaleFallback:
      'サーバーはこの言語に対応していないため、サーバーからのメッセージは英語で表示されます。',
    languageChangeFailed:
      '言語を切り替えられませんでした。もう一度お試しください。',
  },
  account: {
    signOutFailed: 'ログアウトできませんでした。もう一度お試しください。',
    openMenu: 'アカウントメニューを開く',
    fallback: 'アカウント',
    signOut: 'ログアウト',
    signingOut: 'ログアウト中…',
  },
  navigation: {
    home: 'ホーム',
    open: 'ナビゲーションを開く',
    close: 'ナビゲーションを閉じる',
    expand: 'ナビゲーションを展開',
    collapse: 'ナビゲーションを折りたたむ',
    toggle: 'ナビゲーションの展開／折りたたみ',
    label: 'アプリケーションのナビゲーション',
    description: 'このアプリケーションのページに移動します。',
    breadcrumb: 'パンくずリスト',
    breadcrumbMore: '中間の階層を表示',
    back: '戻る',
  },
  dataTable: {
    noResults: '結果がありません。',
    sortAscending: '昇順',
    sortDescending: '降順',
    hideColumn: '非表示',
    view: '表示',
    toggleColumns: '列の表示切り替え',
    selectedCount: '{{total}} 行中 {{selected}} 行を選択中。',
    rowsPerPage: '1 ページあたりの行数',
    pageOf: '{{page}} / {{pageCount}} ページ',
    firstPage: '最初のページへ',
    previousPage: '前のページへ',
    nextPage: '次のページへ',
    lastPage: '最後のページへ',
  },
  datePicker: {
    placeholder: '日付を選択',
    rangePlaceholder: '期間を選択',
  },
  'Lead follow-up': 'リードのフォローアップ',
  'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    'リードの現在の情報（リード自体、そのタスク、コメント、CRM 内の関連レコード）をすべて確認し、次のステップ（フォローアップの継続、ナーチャリング、コンバート、無効）を理由とともに提案します。フォローアップを続ける場合は、どのようにフォローアップし、具体的に何をするかを明確に示します。新しいリードが入ったとき、ユーザーがリードのフォローアップや再フォローアップを依頼したとき、または「このリードは次に何をすべきか」と尋ねたときに使います。',
  'Opportunity follow-up': '商談のフォローアップ',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    '商談の現状に関するすべての情報（商談自体、会社、連絡先とその役割、タスク、コメント、承認、元のリード）を確認し、現在のフェーズが妥当か、次に何をすべきか（次のフェーズへ進める、現在のフェーズで継続する、保留する、失注とする）を、理由、リスク、埋めるべき不足点とともに判断します。進める場合は、具体的に何をするかを明示します。リードのコンバートで新しい商談が作成されたとき、商談のタスクの結果が記録されたとき、ユーザーがフォローアップを依頼したとき、または「この商談の次のステップは？」と尋ねられたときに使います。',
  'Approval review': '承認レビュー',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    '承認者が承認申請（値引き、支払条件、契約条件、納期の確約）を承認すべきかどうか判断するのを支援します。申請された条件が標準からどれだけ離れているか、金額と回収への影響、商談の状況とこの譲歩を裏付ける根拠、同じ商談で一緒に提出された他の承認、過去の同種の申請がどう判断されたか、リスクと申請者が明確にしていない点を確認したうえで、承認、条件付き承認、却下、追加情報の要求のいずれかを提案し、判断コメントの下書きを作成します。承認が申請された後、または承認者が「この承認は承認すべきか」と尋ねたときに使います。',
  'Task preparation': 'タスクの準備',
  "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.":
    '営業担当が顧客と行う予定のタスク（電話、会議、訪問、デモ）の準備を支援します。タスクで達成すべきこと、レコードのタスク・コメント・メールから見た現状、先方の参加者とそれぞれの役割、尋ねるべき質問、持参するもの、リスク、順に押さえるべきポイントをまとめます。タスク当日の朝、またはタスクの担当者が準備を依頼したときに使います。',
  flowDiagram: {
    controls: '図の操作',
    fitView: '全体を表示',
    fullscreen: '全画面表示',
    exitFullscreen: '全画面表示を終了',
    escapeHint: 'Esc キーで終了',
    leavesTo: '遷移先',
    arrivesFrom: '遷移元',
    otherRoutes: 'その他の経路',
    minimap: '図の概観',
    configure: '設定',
    overview: '図の概観',
    actualSize: '実寸',
    states: '状態',
    transitions: '遷移',
    configurable: 'パラメーター',
    current: '現在',
    visited: '通過済み',
    initial: '初期状態',
    final: '終了状態',
    state: '状態',
    zoomOut: '縮小',
    zoomIn: '拡大',
    fit: '全体を表示',
    empty: '表示する状態がありません。',
    loading: '図をレイアウト中…',
    failed: 'この図をレイアウトできません。',
    nodeHelp: 'Enter キーまたは Space キーで状態を選択します。',
    edgeHelp: 'Enter キーまたは Space キーで遷移を選択します。',
  },
  loginActivity: {
    heading: '最初のリードから、契約締結まで。',
    description:
      'AI 営業チームがすべてのリードと商談をフォローアップし、すべての打ち合わせと承認を準備します。決めるのはあなたです。',
    phases: {
      lead: 'リード',
      deal: '商談',
      won: '成約',
    },
    participants: {
      rep: 'Sophie Bennett',
      leadAgent: 'AI リードフォローアップ',
      prepAgent: 'AI タスクアシスタント',
      dealAgent: 'AI 商談フォローアップ',
      approvalAgent: 'AI 承認レビュー',
      manager: 'Daniel Brooks',
      customer: 'Emma Walsh',
    },
    capabilities: {
      capture: 'AI 取り込み',
      followUp: 'AI フォローアップ',
      pipeline: 'パイプライン',
      prep: 'タスクの準備',
      mail: 'メール',
      approval: '承認',
    },
    timeline: 'タイムライン',
    lead: {
      kind: 'リード',
      title: 'Emma Walsh / Northwind Logistics',
      need: '車両 200 台の配車管理 · メールから',
      grade: 'グレード A',
    },
    deal: {
      kind: '商談',
      title: '配車管理プラットフォーム（Enterprise）',
      company: 'Northwind Logistics',
      amount: '$48,000',
      owner: 'Sophie Bennett',
      won: '受注',
    },
    leadStatuses: {
      new: '新規',
      working: '対応中',
      converted: 'コンバート済み',
    },
    stages: {
      qualification: '要件確認',
      proposal: '提案',
      negotiation: '交渉',
      won: '受注',
    },
    steps: {
      captured: {
        who: 'AI',
        what: 'メールからリードを整理しました',
      },
      leadFollowUp: {
        who: 'AI フォローアップ',
        what: 'グレード A、本日 15:00 に電話',
      },
      converted: {
        who: 'Sophie Bennett',
        what: 'リードを商談にコンバートしました',
      },
      prepared: {
        who: 'AI',
        what: '先方の実際のルートで明日のデモを準備しました',
      },
      replied: {
        who: 'Emma Walsh',
        what: '請求書発行から 60 日後の支払いは可能でしょうか？',
      },
      dealFollowUp: {
        who: 'AI フォローアップ',
        what: '交渉フェーズへ。60 日の支払条件には承認が必要です',
      },
      reviewed: {
        who: 'AI レビュー',
        what: '条件付きで承認',
      },
      approved: {
        who: 'Daniel Brooks',
        what: '60 日の支払条件を承認しました',
      },
      won: {
        who: 'Sophie Bennett',
        what: '署名済みの契約書が戻ってきました',
      },
    },
  },
  // The template's Settings copy, translated in ./settings/.
  settings: settingsJaJP,
  crm: crmJaJP,
};

export default jaJP;
