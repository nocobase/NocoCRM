import type { LocaleResource } from '@nocobase/i18n';
import type databaseExplorerEnUS from '../../pages/settings/database-explorer/en-US.js';

// The template's Database Explorer copy (client/pages/settings/database-explorer/en-US.ts), which the template's
// own copy (client/locales/system/) carries since 1.0.0-beta.92, in ru-RU.
const databaseExplorer: LocaleResource<typeof databaseExplorerEnUS> = {
  title: 'Обозреватель базы данных',
  description:
    'Просмотр подключений к базам данных, таблиц и полей приложения.',
  connection: 'Подключение',
  chooseConnection: 'Выберите подключение',
  defaultConnection: 'По умолчанию',
  schemaManagement: {
    managed: 'Управляется приложением',
    external: 'Управляется извне',
  },
  tables: 'Таблицы',
  tablesIn: 'Таблицы в {{connection}}',
  searchTables: 'Поиск по имени или названию таблицы',
  clearSearch: 'Очистить поиск',
  tableCount_one: '{{count}} таблица',
  tableCount_other: 'Таблиц: {{count}}',
  tablesMatched_one: 'Подходит {{count}} из {{total}} таблиц',
  tablesMatched_other: 'Подходит таблиц: {{count}} из {{total}}',
  loadingTables_one: 'Загрузка таблиц… прочитано: {{count}}',
  loadingTables_other: 'Загрузка таблиц… прочитано: {{count}}',
  truncated_one:
    'Показана только первая таблица ({{count}}); поиск охватывает только её.',
  truncated_other:
    'Показаны только первые таблицы ({{count}}); поиск охватывает только их.',
  partial_one:
    'Загрузка остановилась после {{count}} таблицы; поиск охватывает только эти таблицы.',
  partial_other:
    'Загрузка остановилась, прочитано таблиц: {{count}}; поиск охватывает только их.',
  selectedHidden: 'Открытая таблица «{{table}}» не соответствует поиску.',
  kind: {
    table: 'Таблица',
    view: 'Представление',
    materializedView: 'Материализованное представление',
  },
  kindLabel: 'Вид',
  collectionName: 'Имя',
  tableName: 'Таблица',
  schema: 'Схема',
  fields: 'Поля',
  fieldsOf: 'Поля таблицы {{table}}',
  searchFields: 'Поиск по имени, названию или типу поля',
  fieldCount_one: '{{count}} поле',
  fieldCount_other: 'Полей: {{count}}',
  fieldsMatched_one: 'Подходит {{count}} из {{total}} полей',
  fieldsMatched_other: 'Подходит полей: {{count}} из {{total}}',
  column: {
    field: 'Поле',
    type: 'Тип',
    nullable: 'Допускает NULL',
    references: 'Ссылается на',
  },
  primaryKey: 'Первичный ключ',
  yes: 'Да',
  no: 'Нет',
  notReported: 'Не сообщается',
  notApplicable: 'Неприменимо',
  relationNullable: 'Связь, а не столбец',
  nullableTag: {
    yes: 'Допускает NULL',
    no: 'NOT NULL',
    unknown: 'Допустимость NULL не сообщается',
  },
  none: 'Нет',
  warnings_one: '{{count}} замечание проверки',
  warnings_other: 'Замечаний проверки: {{count}}',
  warningDescription: 'Некоторые сведения могут быть неполными.',
  backToTables: 'Все таблицы',
  selectTable: 'Выберите таблицу, чтобы увидеть её поля.',
  loading: 'Загрузка',
  signIn: 'Войти',
  retry: 'Повторить',
  notice: {
    unauthenticated: 'Сеанс истёк',
    forbidden: 'У вас нет прав на просмотр баз данных',
    connectionNotFound: 'Такого подключения нет',
    tableNotFound: 'Такой таблицы нет в этом подключении',
    unavailable: 'База данных сейчас недоступна',
    failed: 'Не удалось загрузить сведения о базе данных',
    noConnections: 'Подключения к базам данных не настроены',
    noTables: 'В этом подключении нет таблиц',
    noFields: 'В этой таблице нет полей',
    noResults: 'Ничего не найдено',
  },
};

export default databaseExplorer;
