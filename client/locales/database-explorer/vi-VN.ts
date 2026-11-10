import type { LocaleResource } from '@nocobase/i18n';
import type databaseExplorerEnUS from '../../pages/settings/database-explorer/en-US.js';

// The template's Database Explorer copy (client/pages/settings/database-explorer/en-US.ts), which the template's
// own copy (client/locales/system/) carries since 1.0.0-beta.92, in vi-VN.
const databaseExplorer: LocaleResource<typeof databaseExplorerEnUS> = {
  title: 'Trình duyệt cơ sở dữ liệu',
  description: 'Duyệt các kết nối cơ sở dữ liệu, bảng và trường của ứng dụng.',
  connection: 'Kết nối',
  chooseConnection: 'Chọn kết nối',
  defaultConnection: 'Mặc định',
  schemaManagement: {
    managed: 'Do ứng dụng quản lý',
    external: 'Được quản lý bên ngoài',
  },
  tables: 'Bảng',
  tablesIn: 'Các bảng trong {{connection}}',
  searchTables: 'Tìm theo tên hoặc tiêu đề bảng',
  clearSearch: 'Xóa tìm kiếm',
  tableCount_one: '{{count}} bảng',
  tableCount_other: '{{count}} bảng',
  tablesMatched_one: '{{count}} trên {{total}} bảng khớp',
  tablesMatched_other: '{{count}} trên {{total}} bảng khớp',
  loadingTables_one: 'Đang tải bảng… đã đọc {{count}}',
  loadingTables_other: 'Đang tải bảng… đã đọc {{count}}',
  truncated_one:
    'Chỉ liệt kê {{count}} bảng đầu tiên; tìm kiếm chỉ bao gồm bảng này.',
  truncated_other:
    'Chỉ liệt kê {{count}} bảng đầu tiên; tìm kiếm chỉ bao gồm các bảng này.',
  partial_one:
    'Việc tải dừng sau {{count}} bảng; tìm kiếm chỉ bao gồm các bảng này.',
  partial_other:
    'Việc tải dừng sau {{count}} bảng; tìm kiếm chỉ bao gồm các bảng này.',
  selectedHidden: 'Bảng đang mở “{{table}}” không khớp với tìm kiếm.',
  kind: {
    table: 'Bảng',
    view: 'View',
    materializedView: 'View cụ thể hóa',
  },
  kindLabel: 'Loại',
  collectionName: 'Tên',
  tableName: 'Bảng',
  schema: 'Lược đồ',
  fields: 'Trường',
  fieldsOf: 'Các trường của {{table}}',
  searchFields: 'Tìm theo tên, tiêu đề hoặc kiểu trường',
  fieldCount_one: '{{count}} trường',
  fieldCount_other: '{{count}} trường',
  fieldsMatched_one: '{{count}} trên {{total}} trường khớp',
  fieldsMatched_other: '{{count}} trên {{total}} trường khớp',
  column: {
    field: 'Trường',
    type: 'Kiểu',
    nullable: 'Cho phép null',
    references: 'Tham chiếu đến',
  },
  primaryKey: 'Khóa chính',
  yes: 'Có',
  no: 'Không',
  notReported: 'Không được báo cáo',
  notApplicable: 'Không áp dụng',
  relationNullable: 'Quan hệ, không phải cột',
  nullableTag: {
    yes: 'Cho phép null',
    no: 'Không null',
    unknown: 'Không báo cáo khả năng null',
  },
  none: 'Không có',
  warnings_one: '{{count}} ghi chú kiểm tra',
  warnings_other: '{{count}} ghi chú kiểm tra',
  warningDescription: 'Một số chi tiết có thể chưa đầy đủ.',
  backToTables: 'Tất cả bảng',
  selectTable: 'Chọn một bảng để xem các trường của nó.',
  loading: 'Đang tải',
  signIn: 'Đăng nhập',
  retry: 'Thử lại',
  notice: {
    unauthenticated: 'Phiên đã hết hạn',
    forbidden: 'Bạn không có quyền duyệt cơ sở dữ liệu',
    connectionNotFound: 'Kết nối này không tồn tại',
    tableNotFound: 'Bảng này không tồn tại trong kết nối',
    unavailable: 'Cơ sở dữ liệu hiện không khả dụng',
    failed: 'Không thể tải thông tin cơ sở dữ liệu',
    noConnections: 'Chưa cấu hình kết nối cơ sở dữ liệu nào',
    noTables: 'Kết nối này không có bảng nào',
    noFields: 'Bảng này không có trường nào',
    noResults: 'Không có kết quả',
  },
};

export default databaseExplorer;
