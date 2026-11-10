import type { LocaleResource } from '@nocobase/i18n';
import type databaseExplorerEnUS from '../../pages/settings/database-explorer/en-US.js';

// The template's Database Explorer copy (client/pages/settings/database-explorer/en-US.ts), which the template's
// own copy (client/locales/system/) carries since 1.0.0-beta.92, in es-ES.
const databaseExplorer: LocaleResource<typeof databaseExplorerEnUS> = {
  title: 'Explorador de base de datos',
  description:
    'Explora las conexiones de base de datos, las tablas y los campos de la aplicación.',
  connection: 'Conexión',
  chooseConnection: 'Elige una conexión',
  defaultConnection: 'Predeterminada',
  schemaManagement: {
    managed: 'Gestionado por la aplicación',
    external: 'Gestionado externamente',
  },
  tables: 'Tablas',
  tablesIn: 'Tablas en {{connection}}',
  searchTables: 'Buscar por nombre o título de tabla',
  clearSearch: 'Borrar búsqueda',
  tableCount_one: '{{count}} tabla',
  tableCount_other: '{{count}} tablas',
  tablesMatched_one: '{{count}} de {{total}} tablas coincide',
  tablesMatched_other: '{{count}} de {{total}} tablas coinciden',
  loadingTables_one: 'Cargando tablas… {{count}} leídas hasta ahora',
  loadingTables_other: 'Cargando tablas… {{count}} leídas hasta ahora',
  truncated_one:
    'Solo se muestra la primera tabla ({{count}}); la búsqueda solo la incluye a ella.',
  truncated_other:
    'Solo se muestran las primeras {{count}} tablas; la búsqueda solo incluye estas tablas.',
  partial_one:
    'La carga se detuvo tras {{count}} tabla; la búsqueda solo incluye estas tablas.',
  partial_other:
    'La carga se detuvo tras {{count}} tablas; la búsqueda solo incluye estas tablas.',
  selectedHidden: 'La tabla abierta «{{table}}» no coincide con la búsqueda.',
  kind: {
    table: 'Tabla',
    view: 'Vista',
    materializedView: 'Vista materializada',
  },
  kindLabel: 'Tipo',
  collectionName: 'Nombre',
  tableName: 'Tabla',
  schema: 'Esquema',
  fields: 'Campos',
  fieldsOf: 'Campos de {{table}}',
  searchFields: 'Buscar por nombre, título o tipo de campo',
  fieldCount_one: '{{count}} campo',
  fieldCount_other: '{{count}} campos',
  fieldsMatched_one: '{{count}} de {{total}} campos coincide',
  fieldsMatched_other: '{{count}} de {{total}} campos coinciden',
  column: {
    field: 'Campo',
    type: 'Tipo',
    nullable: 'Admite nulos',
    references: 'Referencia a',
  },
  primaryKey: 'Clave primaria',
  yes: 'Sí',
  no: 'No',
  notReported: 'No informado',
  notApplicable: 'No aplicable',
  relationNullable: 'Relación, no columna',
  nullableTag: {
    yes: 'Admite nulos',
    no: 'No nulo',
    unknown: 'Nulabilidad no informada',
  },
  none: 'Ninguno',
  warnings_one: '{{count}} nota de inspección',
  warnings_other: '{{count}} notas de inspección',
  warningDescription: 'Algunos detalles pueden estar incompletos.',
  backToTables: 'Todas las tablas',
  selectTable: 'Selecciona una tabla para ver sus campos.',
  loading: 'Cargando',
  signIn: 'Iniciar sesión',
  retry: 'Reintentar',
  notice: {
    unauthenticated: 'La sesión ha caducado',
    forbidden: 'No tienes permiso para explorar bases de datos',
    connectionNotFound: 'Esta conexión no existe',
    tableNotFound: 'Esta tabla no existe en la conexión',
    unavailable: 'La base de datos no está disponible en este momento',
    failed: 'No se pudo cargar la información de la base de datos',
    noConnections: 'No hay conexiones de base de datos configuradas',
    noTables: 'Esta conexión no tiene tablas',
    noFields: 'Esta tabla no tiene campos',
    noResults: 'Sin resultados',
  },
};

export default databaseExplorer;
