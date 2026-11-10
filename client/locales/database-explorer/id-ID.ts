import type { LocaleResource } from '@nocobase/i18n';
import type databaseExplorerEnUS from '../../pages/settings/database-explorer/en-US.js';

// The template's Database Explorer copy (client/pages/settings/database-explorer/en-US.ts), which the template's
// own copy (client/locales/system/) carries since 1.0.0-beta.92, in id-ID.
const databaseExplorer: LocaleResource<typeof databaseExplorerEnUS> = {
  title: 'Penjelajah basis data',
  description: 'Telusuri koneksi basis data, tabel, dan field aplikasi.',
  connection: 'Koneksi',
  chooseConnection: 'Pilih koneksi',
  defaultConnection: 'Default',
  schemaManagement: {
    managed: 'Dikelola oleh aplikasi',
    external: 'Dikelola secara eksternal',
  },
  tables: 'Tabel',
  tablesIn: 'Tabel di {{connection}}',
  searchTables: 'Cari berdasarkan nama atau judul tabel',
  clearSearch: 'Hapus pencarian',
  tableCount_one: '{{count}} tabel',
  tableCount_other: '{{count}} tabel',
  tablesMatched_one: '{{count}} dari {{total}} tabel cocok',
  tablesMatched_other: '{{count}} dari {{total}} tabel cocok',
  loadingTables_one: 'Memuat tabel… {{count}} sudah dibaca',
  loadingTables_other: 'Memuat tabel… {{count}} sudah dibaca',
  truncated_one:
    'Hanya {{count}} tabel pertama yang ditampilkan; pencarian hanya mencakup tabel ini.',
  truncated_other:
    'Hanya {{count}} tabel pertama yang ditampilkan; pencarian hanya mencakup tabel-tabel ini.',
  partial_one:
    'Pemuatan berhenti setelah {{count}} tabel; pencarian hanya mencakup tabel-tabel ini.',
  partial_other:
    'Pemuatan berhenti setelah {{count}} tabel; pencarian hanya mencakup tabel-tabel ini.',
  selectedHidden:
    'Tabel yang terbuka “{{table}}” tidak cocok dengan pencarian.',
  kind: {
    table: 'Tabel',
    view: 'View',
    materializedView: 'View terwujud',
  },
  kindLabel: 'Jenis',
  collectionName: 'Nama',
  tableName: 'Tabel',
  schema: 'Skema',
  fields: 'Field',
  fieldsOf: 'Field dari {{table}}',
  searchFields: 'Cari berdasarkan nama, judul, atau tipe field',
  fieldCount_one: '{{count}} field',
  fieldCount_other: '{{count}} field',
  fieldsMatched_one: '{{count}} dari {{total}} field cocok',
  fieldsMatched_other: '{{count}} dari {{total}} field cocok',
  column: {
    field: 'Field',
    type: 'Tipe',
    nullable: 'Boleh kosong',
    references: 'Merujuk ke',
  },
  primaryKey: 'Kunci utama',
  yes: 'Ya',
  no: 'Tidak',
  notReported: 'Tidak dilaporkan',
  notApplicable: 'Tidak berlaku',
  relationNullable: 'Relasi, bukan kolom',
  nullableTag: {
    yes: 'Boleh kosong',
    no: 'Tidak boleh kosong',
    unknown: 'Status kosong tidak dilaporkan',
  },
  none: 'Tidak ada',
  warnings_one: '{{count}} catatan pemeriksaan',
  warnings_other: '{{count}} catatan pemeriksaan',
  warningDescription: 'Beberapa detail mungkin tidak lengkap.',
  backToTables: 'Semua tabel',
  selectTable: 'Pilih tabel untuk melihat field-nya.',
  loading: 'Memuat',
  signIn: 'Masuk',
  retry: 'Coba lagi',
  notice: {
    unauthenticated: 'Sesi telah berakhir',
    forbidden: 'Anda tidak memiliki izin untuk menelusuri basis data',
    connectionNotFound: 'Koneksi ini tidak ada',
    tableNotFound: 'Tabel ini tidak ada di koneksi tersebut',
    unavailable: 'Basis data sedang tidak tersedia',
    failed: 'Tidak dapat memuat informasi basis data',
    noConnections: 'Belum ada koneksi basis data yang dikonfigurasi',
    noTables: 'Koneksi ini tidak memiliki tabel',
    noFields: 'Tabel ini tidak memiliki field',
    noResults: 'Tidak ada hasil',
  },
};

export default databaseExplorer;
