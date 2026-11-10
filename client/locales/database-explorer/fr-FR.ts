import type { LocaleResource } from '@nocobase/i18n';
import type databaseExplorerEnUS from '../../pages/settings/database-explorer/en-US.js';

// The template's Database Explorer copy (client/pages/settings/database-explorer/en-US.ts), which the template's
// own copy (client/locales/system/) carries since 1.0.0-beta.92, in fr-FR.
const databaseExplorer: LocaleResource<typeof databaseExplorerEnUS> = {
  title: 'Explorateur de base de données',
  description:
    'Parcourez les connexions de base de données, les tables et les champs de l’application.',
  connection: 'Connexion',
  chooseConnection: 'Choisir une connexion',
  defaultConnection: 'Par défaut',
  schemaManagement: {
    managed: 'Géré par l’application',
    external: 'Géré en externe',
  },
  tables: 'Tables',
  tablesIn: 'Tables de {{connection}}',
  searchTables: 'Rechercher par nom ou titre de table',
  clearSearch: 'Effacer la recherche',
  tableCount_one: '{{count}} table',
  tableCount_other: '{{count}} tables',
  tablesMatched_one: '{{count}} table sur {{total}} correspond',
  tablesMatched_other: '{{count}} tables sur {{total}} correspondent',
  loadingTables_one: 'Chargement des tables… {{count}} lues jusqu’ici',
  loadingTables_other: 'Chargement des tables… {{count}} lues jusqu’ici',
  truncated_one:
    'Seule la première table ({{count}}) est listée ; la recherche ne porte que sur elle.',
  truncated_other:
    'Seules les {{count}} premières tables sont listées ; la recherche ne porte que sur ces tables.',
  partial_one:
    'Le chargement s’est arrêté après {{count}} table ; la recherche ne porte que sur ces tables.',
  partial_other:
    'Le chargement s’est arrêté après {{count}} tables ; la recherche ne porte que sur ces tables.',
  selectedHidden:
    'La table ouverte « {{table}} » ne correspond pas à la recherche.',
  kind: {
    table: 'Table',
    view: 'Vue',
    materializedView: 'Vue matérialisée',
  },
  kindLabel: 'Type',
  collectionName: 'Nom',
  tableName: 'Table',
  schema: 'Schéma',
  fields: 'Champs',
  fieldsOf: 'Champs de {{table}}',
  searchFields: 'Rechercher par nom, titre ou type de champ',
  fieldCount_one: '{{count}} champ',
  fieldCount_other: '{{count}} champs',
  fieldsMatched_one: '{{count}} champ sur {{total}} correspond',
  fieldsMatched_other: '{{count}} champs sur {{total}} correspondent',
  column: {
    field: 'Champ',
    type: 'Type',
    nullable: 'Nullable',
    references: 'Référence',
  },
  primaryKey: 'Clé primaire',
  yes: 'Oui',
  no: 'Non',
  notReported: 'Non renseigné',
  notApplicable: 'Sans objet',
  relationNullable: 'Relation, pas une colonne',
  nullableTag: {
    yes: 'Nullable',
    no: 'Non nul',
    unknown: 'Nullabilité non renseignée',
  },
  none: 'Aucun',
  warnings_one: '{{count}} remarque d’inspection',
  warnings_other: '{{count}} remarques d’inspection',
  warningDescription: 'Certains détails peuvent être incomplets.',
  backToTables: 'Toutes les tables',
  selectTable: 'Sélectionnez une table pour voir ses champs.',
  loading: 'Chargement',
  signIn: 'Se connecter',
  retry: 'Réessayer',
  notice: {
    unauthenticated: 'Session expirée',
    forbidden:
      'Vous n’avez pas l’autorisation de parcourir les bases de données',
    connectionNotFound: 'Cette connexion n’existe pas',
    tableNotFound: 'Cette table n’existe pas dans la connexion',
    unavailable: 'La base de données est indisponible pour le moment',
    failed: 'Impossible de charger les informations de la base de données',
    noConnections: 'Aucune connexion de base de données n’est configurée',
    noTables: 'Cette connexion n’a aucune table',
    noFields: 'Cette table n’a aucun champ',
    noResults: 'Aucun résultat',
  },
};

export default databaseExplorer;
