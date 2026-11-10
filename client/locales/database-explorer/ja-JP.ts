import type { LocaleResource } from '@nocobase/i18n';
import type databaseExplorerEnUS from '../../pages/settings/database-explorer/en-US.js';

// The template's Database Explorer copy (client/pages/settings/database-explorer/en-US.ts), which the template's
// own copy (client/locales/system/) carries since 1.0.0-beta.92, in ja-JP.
const databaseExplorer: LocaleResource<typeof databaseExplorerEnUS> = {
  title: 'データベースエクスプローラー',
  description:
    'アプリケーションのデータベース接続、テーブル、フィールドを閲覧します。',
  connection: '接続',
  chooseConnection: '接続を選択',
  defaultConnection: 'デフォルト',
  schemaManagement: {
    managed: 'アプリケーションが管理',
    external: '外部で管理',
  },
  tables: 'テーブル',
  tablesIn: '{{connection}} のテーブル',
  searchTables: 'テーブル名またはタイトルで検索',
  clearSearch: '検索をクリア',
  tableCount_one: '{{count}} 件のテーブル',
  tableCount_other: '{{count}} 件のテーブル',
  tablesMatched_one: '{{total}} 件中 {{count}} 件のテーブルが一致',
  tablesMatched_other: '{{total}} 件中 {{count}} 件のテーブルが一致',
  loadingTables_one: 'テーブルを読み込み中… {{count}} 件読み込み済み',
  loadingTables_other: 'テーブルを読み込み中… {{count}} 件読み込み済み',
  truncated_one:
    '最初の {{count}} 件のテーブルのみ表示しています。検索対象はこのテーブルのみです。',
  truncated_other:
    '最初の {{count}} 件のテーブルのみ表示しています。検索対象はこれらのテーブルのみです。',
  partial_one:
    '{{count}} 件のテーブルで読み込みが停止しました。検索対象はこれらのテーブルのみです。',
  partial_other:
    '{{count}} 件のテーブルで読み込みが停止しました。検索対象はこれらのテーブルのみです。',
  selectedHidden: '開いているテーブル「{{table}}」は検索条件に一致しません。',
  kind: {
    table: 'テーブル',
    view: 'ビュー',
    materializedView: 'マテリアライズドビュー',
  },
  kindLabel: '種類',
  collectionName: '名前',
  tableName: 'テーブル',
  schema: 'スキーマ',
  fields: 'フィールド',
  fieldsOf: '{{table}} のフィールド',
  searchFields: 'フィールド名、タイトル、型で検索',
  fieldCount_one: '{{count}} 件のフィールド',
  fieldCount_other: '{{count}} 件のフィールド',
  fieldsMatched_one: '{{total}} 件中 {{count}} 件のフィールドが一致',
  fieldsMatched_other: '{{total}} 件中 {{count}} 件のフィールドが一致',
  column: {
    field: 'フィールド',
    type: '型',
    nullable: 'NULL 許可',
    references: '参照先',
  },
  primaryKey: '主キー',
  yes: 'はい',
  no: 'いいえ',
  notReported: '未報告',
  notApplicable: '該当なし',
  relationNullable: 'リレーション（列ではありません）',
  nullableTag: {
    yes: 'NULL 許可',
    no: 'NOT NULL',
    unknown: 'NULL 許可は未報告',
  },
  none: 'なし',
  warnings_one: '{{count}} 件の検査メモ',
  warnings_other: '{{count}} 件の検査メモ',
  warningDescription: '一部の詳細が不完全な可能性があります。',
  backToTables: 'すべてのテーブル',
  selectTable: 'テーブルを選択するとフィールドが表示されます。',
  loading: '読み込み中',
  signIn: 'サインイン',
  retry: '再試行',
  notice: {
    unauthenticated: 'セッションの有効期限が切れました',
    forbidden: 'データベースを閲覧する権限がありません',
    connectionNotFound: 'この接続は存在しません',
    tableNotFound: 'このテーブルはこの接続に存在しません',
    unavailable: 'データベースは現在利用できません',
    failed: 'データベース情報を読み込めません',
    noConnections: 'データベース接続が構成されていません',
    noTables: 'この接続にはテーブルがありません',
    noFields: 'このテーブルにはフィールドがありません',
    noResults: '結果がありません',
  },
};

export default databaseExplorer;
