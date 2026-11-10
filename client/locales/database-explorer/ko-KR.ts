import type { LocaleResource } from '@nocobase/i18n';
import type databaseExplorerEnUS from '../../pages/settings/database-explorer/en-US.js';

// The template's Database Explorer copy (client/pages/settings/database-explorer/en-US.ts), which the template's
// own copy (client/locales/system/) carries since 1.0.0-beta.92, in ko-KR.
const databaseExplorer: LocaleResource<typeof databaseExplorerEnUS> = {
  title: '데이터베이스 탐색기',
  description: '애플리케이션의 데이터베이스 연결, 테이블, 필드를 살펴봅니다.',
  connection: '연결',
  chooseConnection: '연결 선택',
  defaultConnection: '기본',
  schemaManagement: {
    managed: '애플리케이션에서 관리',
    external: '외부에서 관리',
  },
  tables: '테이블',
  tablesIn: '{{connection}}의 테이블',
  searchTables: '테이블 이름 또는 제목으로 검색',
  clearSearch: '검색 지우기',
  tableCount_one: '테이블 {{count}}개',
  tableCount_other: '테이블 {{count}}개',
  tablesMatched_one: '테이블 {{total}}개 중 {{count}}개 일치',
  tablesMatched_other: '테이블 {{total}}개 중 {{count}}개 일치',
  loadingTables_one: '테이블 불러오는 중… 지금까지 {{count}}개 읽음',
  loadingTables_other: '테이블 불러오는 중… 지금까지 {{count}}개 읽음',
  truncated_one:
    '처음 {{count}}개 테이블만 표시합니다. 검색은 이 테이블만 대상으로 합니다.',
  truncated_other:
    '처음 {{count}}개 테이블만 표시합니다. 검색은 이 테이블들만 대상으로 합니다.',
  partial_one:
    '테이블 {{count}}개에서 불러오기가 중단되었습니다. 검색은 이 테이블들만 대상으로 합니다.',
  partial_other:
    '테이블 {{count}}개에서 불러오기가 중단되었습니다. 검색은 이 테이블들만 대상으로 합니다.',
  selectedHidden:
    '열려 있는 테이블 “{{table}}”이(가) 검색 조건과 일치하지 않습니다.',
  kind: {
    table: '테이블',
    view: '뷰',
    materializedView: '구체화된 뷰',
  },
  kindLabel: '종류',
  collectionName: '이름',
  tableName: '테이블',
  schema: '스키마',
  fields: '필드',
  fieldsOf: '{{table}}의 필드',
  searchFields: '필드 이름, 제목 또는 유형으로 검색',
  fieldCount_one: '필드 {{count}}개',
  fieldCount_other: '필드 {{count}}개',
  fieldsMatched_one: '필드 {{total}}개 중 {{count}}개 일치',
  fieldsMatched_other: '필드 {{total}}개 중 {{count}}개 일치',
  column: {
    field: '필드',
    type: '유형',
    nullable: 'Null 허용',
    references: '참조 대상',
  },
  primaryKey: '기본 키',
  yes: '예',
  no: '아니요',
  notReported: '보고되지 않음',
  notApplicable: '해당 없음',
  relationNullable: '관계(열 아님)',
  nullableTag: {
    yes: 'Null 허용',
    no: 'Not null',
    unknown: 'Null 허용 여부 보고되지 않음',
  },
  none: '없음',
  warnings_one: '검사 메모 {{count}}개',
  warnings_other: '검사 메모 {{count}}개',
  warningDescription: '일부 세부 정보가 불완전할 수 있습니다.',
  backToTables: '모든 테이블',
  selectTable: '필드를 보려면 테이블을 선택하세요.',
  loading: '불러오는 중',
  signIn: '로그인',
  retry: '다시 시도',
  notice: {
    unauthenticated: '세션이 만료되었습니다',
    forbidden: '데이터베이스를 탐색할 권한이 없습니다',
    connectionNotFound: '이 연결이 존재하지 않습니다',
    tableNotFound: '이 테이블이 연결에 존재하지 않습니다',
    unavailable: '지금은 데이터베이스를 사용할 수 없습니다',
    failed: '데이터베이스 정보를 불러올 수 없습니다',
    noConnections: '구성된 데이터베이스 연결이 없습니다',
    noTables: '이 연결에는 테이블이 없습니다',
    noFields: '이 테이블에는 필드가 없습니다',
    noResults: '결과 없음',
  },
};

export default databaseExplorer;
