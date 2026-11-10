import type { LocaleResource } from '@nocobase/i18n';
import type databaseExplorerEnUS from '../../pages/settings/database-explorer/en-US.js';

// The template's Database Explorer copy (client/pages/settings/database-explorer/en-US.ts), which the template's
// own copy (client/locales/system/) carries since 1.0.0-beta.92, in pt-BR.
const databaseExplorer: LocaleResource<typeof databaseExplorerEnUS> = {
  title: 'Explorador de banco de dados',
  description:
    'Navegue pelas conexões de banco de dados, tabelas e campos da aplicação.',
  connection: 'Conexão',
  chooseConnection: 'Escolha uma conexão',
  defaultConnection: 'Padrão',
  schemaManagement: {
    managed: 'Gerenciado pela aplicação',
    external: 'Gerenciado externamente',
  },
  tables: 'Tabelas',
  tablesIn: 'Tabelas em {{connection}}',
  searchTables: 'Pesquisar por nome ou título da tabela',
  clearSearch: 'Limpar pesquisa',
  tableCount_one: '{{count}} tabela',
  tableCount_other: '{{count}} tabelas',
  tablesMatched_one: '{{count}} de {{total}} tabelas corresponde',
  tablesMatched_other: '{{count}} de {{total}} tabelas correspondem',
  loadingTables_one: 'Carregando tabelas… {{count}} lidas até agora',
  loadingTables_other: 'Carregando tabelas… {{count}} lidas até agora',
  truncated_one:
    'Apenas a primeira tabela ({{count}}) é listada; a pesquisa abrange somente ela.',
  truncated_other:
    'Apenas as primeiras {{count}} tabelas são listadas; a pesquisa abrange somente essas tabelas.',
  partial_one:
    'O carregamento parou após {{count}} tabela; a pesquisa abrange somente essas tabelas.',
  partial_other:
    'O carregamento parou após {{count}} tabelas; a pesquisa abrange somente essas tabelas.',
  selectedHidden: 'A tabela aberta “{{table}}” não corresponde à pesquisa.',
  kind: {
    table: 'Tabela',
    view: 'View',
    materializedView: 'View materializada',
  },
  kindLabel: 'Tipo',
  collectionName: 'Nome',
  tableName: 'Tabela',
  schema: 'Esquema',
  fields: 'Campos',
  fieldsOf: 'Campos de {{table}}',
  searchFields: 'Pesquisar por nome, título ou tipo do campo',
  fieldCount_one: '{{count}} campo',
  fieldCount_other: '{{count}} campos',
  fieldsMatched_one: '{{count}} de {{total}} campos corresponde',
  fieldsMatched_other: '{{count}} de {{total}} campos correspondem',
  column: {
    field: 'Campo',
    type: 'Tipo',
    nullable: 'Aceita nulo',
    references: 'Referencia',
  },
  primaryKey: 'Chave primária',
  yes: 'Sim',
  no: 'Não',
  notReported: 'Não informado',
  notApplicable: 'Não se aplica',
  relationNullable: 'Relação, não coluna',
  nullableTag: {
    yes: 'Aceita nulo',
    no: 'Não nulo',
    unknown: 'Nulidade não informada',
  },
  none: 'Nenhum',
  warnings_one: '{{count}} observação de inspeção',
  warnings_other: '{{count}} observações de inspeção',
  warningDescription: 'Alguns detalhes podem estar incompletos.',
  backToTables: 'Todas as tabelas',
  selectTable: 'Selecione uma tabela para ver seus campos.',
  loading: 'Carregando',
  signIn: 'Entrar',
  retry: 'Tentar novamente',
  notice: {
    unauthenticated: 'Sessão expirada',
    forbidden: 'Você não tem permissão para navegar pelos bancos de dados',
    connectionNotFound: 'Esta conexão não existe',
    tableNotFound: 'Esta tabela não existe na conexão',
    unavailable: 'O banco de dados está indisponível no momento',
    failed: 'Não foi possível carregar as informações do banco de dados',
    noConnections: 'Nenhuma conexão de banco de dados está configurada',
    noTables: 'Esta conexão não tem tabelas',
    noFields: 'Esta tabela não tem campos',
    noResults: 'Nenhum resultado',
  },
};

export default databaseExplorer;
