import type { LocaleResource } from '@nocobase/i18n';
import type databaseExplorerEnUS from '../../pages/settings/database-explorer/en-US.js';

// The template's Database Explorer copy (client/pages/settings/database-explorer/en-US.ts), which the template's
// own copy (client/locales/system/) carries since 1.0.0-beta.92, in de-DE.
const databaseExplorer: LocaleResource<typeof databaseExplorerEnUS> = {
  title: 'Datenbank-Explorer',
  description:
    'Datenbankverbindungen, Tabellen und Felder der Anwendung durchsuchen.',
  connection: 'Verbindung',
  chooseConnection: 'Verbindung auswählen',
  defaultConnection: 'Standard',
  schemaManagement: {
    managed: 'Von der Anwendung verwaltet',
    external: 'Extern verwaltet',
  },
  tables: 'Tabellen',
  tablesIn: 'Tabellen in {{connection}}',
  searchTables: 'Nach Tabellenname oder Titel suchen',
  clearSearch: 'Suche löschen',
  tableCount_one: '{{count}} Tabelle',
  tableCount_other: '{{count}} Tabellen',
  tablesMatched_one: '{{count}} von {{total}} Tabellen passt',
  tablesMatched_other: '{{count}} von {{total}} Tabellen passen',
  loadingTables_one: 'Tabellen werden geladen… {{count}} bisher gelesen',
  loadingTables_other: 'Tabellen werden geladen… {{count}} bisher gelesen',
  truncated_one:
    'Nur die erste Tabelle ({{count}}) wird aufgeführt; die Suche umfasst nur sie.',
  truncated_other:
    'Nur die ersten {{count}} Tabellen werden aufgeführt; die Suche umfasst nur diese Tabellen.',
  partial_one:
    'Das Laden wurde nach {{count}} Tabelle abgebrochen; die Suche umfasst nur diese Tabellen.',
  partial_other:
    'Das Laden wurde nach {{count}} Tabellen abgebrochen; die Suche umfasst nur diese Tabellen.',
  selectedHidden: 'Die geöffnete Tabelle „{{table}}“ passt nicht zur Suche.',
  kind: {
    table: 'Tabelle',
    view: 'Ansicht',
    materializedView: 'Materialisierte Ansicht',
  },
  kindLabel: 'Art',
  collectionName: 'Name',
  tableName: 'Tabelle',
  schema: 'Schema',
  fields: 'Felder',
  fieldsOf: 'Felder von {{table}}',
  searchFields: 'Nach Feldname, Titel oder Typ suchen',
  fieldCount_one: '{{count}} Feld',
  fieldCount_other: '{{count}} Felder',
  fieldsMatched_one: '{{count}} von {{total}} Feldern passt',
  fieldsMatched_other: '{{count}} von {{total}} Feldern passen',
  column: {
    field: 'Feld',
    type: 'Typ',
    nullable: 'Nullwerte erlaubt',
    references: 'Verweist auf',
  },
  primaryKey: 'Primärschlüssel',
  yes: 'Ja',
  no: 'Nein',
  notReported: 'Nicht angegeben',
  notApplicable: 'Nicht zutreffend',
  relationNullable: 'Beziehung, keine Spalte',
  nullableTag: {
    yes: 'Nullwerte erlaubt',
    no: 'Nicht null',
    unknown: 'Nullwerte nicht angegeben',
  },
  none: 'Keine',
  warnings_one: '{{count}} Prüfhinweis',
  warnings_other: '{{count}} Prüfhinweise',
  warningDescription: 'Einige Angaben sind möglicherweise unvollständig.',
  backToTables: 'Alle Tabellen',
  selectTable: 'Wählen Sie eine Tabelle, um ihre Felder anzuzeigen.',
  loading: 'Wird geladen',
  signIn: 'Anmelden',
  retry: 'Erneut versuchen',
  notice: {
    unauthenticated: 'Sitzung abgelaufen',
    forbidden: 'Sie haben keine Berechtigung, Datenbanken zu durchsuchen',
    connectionNotFound: 'Diese Verbindung existiert nicht',
    tableNotFound: 'Diese Tabelle existiert in der Verbindung nicht',
    unavailable: 'Die Datenbank ist derzeit nicht verfügbar',
    failed: 'Datenbankinformationen konnten nicht geladen werden',
    noConnections: 'Es sind keine Datenbankverbindungen konfiguriert',
    noTables: 'Diese Verbindung hat keine Tabellen',
    noFields: 'Diese Tabelle hat keine Felder',
    noResults: 'Keine Ergebnisse',
  },
};

export default databaseExplorer;
