import type { AppResource } from './en-US.js';
import { crmViVN } from './crm/vi-VN.js';
import settingsViVN from './settings/vi-VN.js';

// The pages in vi-VN: the template's copy (./system/), the AI skills'
// display text and the CRM's own (./crm/vi-VN.ts), with the same keys as
// ./en-US.ts. The template ships no vi-VN, so its copy is translated
// here; a template upgrade that adds keys fails the type check until they
// are translated.
const viVN: AppResource = {
  'auth.passwordResetSuccess':
    'Mật khẩu của bạn đã được đặt lại. Hãy đăng nhập bằng mật khẩu mới.',
  'auth.requestNewResetLink': 'Yêu cầu liên kết đặt lại mới',
  'auth.preparingSession': 'Đang chuẩn bị phiên của bạn…',
  'auth.connectionFailed': 'Không thể kết nối',
  'auth.connectionFailedDescription':
    'Không thể chuẩn bị kết nối thời gian thực. Hãy thử lại để vào ứng dụng hoặc đăng xuất.',
  'deviceApproval.title': 'Cấp quyền cho thiết bị',
  'deviceApproval.description':
    'Một dòng lệnh hoặc thiết bị khác đang yêu cầu đăng nhập bằng tài khoản của bạn. Chỉ chấp thuận nếu chính bạn đã bắt đầu đăng nhập.',
  'deviceApproval.enterCode': 'Nhập mã hiển thị trên thiết bị của bạn.',
  'deviceApproval.codeLabel': 'Mã',
  'deviceApproval.continue': 'Tiếp tục',
  'deviceApproval.checking': 'Đang kiểm tra mã…',
  'deviceApproval.confirm':
    'Kiểm tra xem mã này có khớp với mã hiển thị trên thiết bị của bạn không.',
  'deviceApproval.client': 'Yêu cầu bởi {{client}}',
  'deviceApproval.approve': 'Chấp thuận',
  'deviceApproval.approving': 'Đang chấp thuận…',
  'deviceApproval.deny': 'Từ chối',
  'deviceApproval.denying': 'Đang từ chối…',
  'deviceApproval.approved':
    'Đã chấp thuận thiết bị. Quay lại terminal để tiếp tục; bạn có thể đóng trang này.',
  'deviceApproval.denied':
    'Đã từ chối yêu cầu. Thiết bị chưa được đăng nhập; bạn có thể đóng trang này.',
  'deviceApproval.expired':
    'Mã này đã hết hạn. Hãy bắt đầu đăng nhập lại trên thiết bị của bạn.',
  'deviceApproval.invalid':
    'Mã này không hợp lệ. Hãy đối chiếu với thiết bị của bạn và thử lại.',
  'deviceApproval.notYours': 'Mã này đang được một tài khoản khác chấp thuận.',
  'deviceApproval.error': 'Đã xảy ra lỗi. Hãy thử lại.',
  'deviceApproval.retry': 'Thử lại',
  'deviceApproval.otherCode': 'Nhập mã khác',
  'inbox.title': 'Hộp thư đến',
  'inbox.description': 'Thông báo và yêu cầu gửi đến bạn.',
  'inbox.views.all': 'Thông báo',
  'inbox.views.todo': 'Đề xuất AI',
  'inbox.kinds.label': 'Loại',
  'inbox.kinds.all': 'Tất cả các loại',
  'inbox.kinds.decision': 'Quyết định',
  'inbox.kinds.info': 'Thông báo',
  'inbox.tabs.decision': 'Cần tôi quyết định',
  'inbox.tabs.info': 'Thông báo',
  'inbox.clearFilter': 'Xóa bộ lọc',
  'inbox.noMatchDescription': 'Xóa bộ lọc để xem mọi loại.',
  'inbox.readAll': 'Đánh dấu tất cả là đã đọc',
  'inbox.allRead': 'Đã đánh dấu tất cả là đã đọc.',
  'inbox.loading': 'Đang tải',
  'inbox.loadFailed': 'Không thể tải hộp thư đến',
  'inbox.loadFailedDescription': 'Kiểm tra kết nối và thử lại.',
  'inbox.retry': 'Thử lại',
  'inbox.loadMore': 'Tải thêm',
  'inbox.emptyAll': 'Không có gì ở đây',
  'inbox.empty.todo': 'Không có gì đang chờ bạn',
  'inbox.empty.decision': 'Không có quyết định nào đang chờ bạn',
  'inbox.empty.info': 'Không có thông báo',
  'inbox.emptyDescription':
    'Thông báo và yêu cầu gửi đến bạn sẽ hiển thị ở đây.',
  'inbox.unread': 'Chưa đọc',
  'inbox.unreadCount': '{{count}} chưa đọc',
  'inbox.pendingDecisions': '{{count}} đang chờ',
  'inbox.resolved': 'Đã xử lý',
  'inbox.outcomes.approved': 'Đã phê duyệt',
  'inbox.outcomes.rejected': 'Đã từ chối',
  'inbox.outcomes.withdrawn': 'Đã rút lại',
  'inbox.count': '×{{count}}',
  'inbox.actionsFor': 'Thao tác cho {{title}}',
  'inbox.actions.read': 'Đánh dấu là đã đọc',
  'inbox.actions.unread': 'Đánh dấu là chưa đọc',
  'inbox.actions.delete': 'Xóa',
  'inbox.deleted': 'Đã xóa.',
  'inbox.requestFailed': 'Yêu cầu không thành công. Hãy thử lại.',
  'inbox.forbidden': 'Bạn không có quyền thực hiện thao tác này.',
  'inbox.nothingSelected': 'Chọn một mục để xem',
  'inbox.back': 'Quay lại danh sách',
  'inbox.open': 'Mở',
  'inbox.keyMove': 'Di chuyển',
  'inbox.keyOpen': 'Mở',
  'inbox.cancel': 'Hủy',
  'inbox.request.approve': 'Phê duyệt',
  'inbox.request.reject': 'Từ chối',
  'inbox.request.commentPlaceholder': 'Viết gì đó…',
  'inbox.request.commentFor': '{{action}}: {{title}}',
  'inbox.request.quickSend': 'để gửi',
  'inbox.request.newLine': 'để xuống dòng',
  'inboxButton.title': 'Hộp thư đến',
  'inboxButton.pending': 'Hộp thư đến, {{count}} đang chờ',
  'inboxButton.unread': 'Hộp thư đến, {{count}} chưa đọc',
  'inboxButton.pendingHint':
    '{{count}} mục đang chờ bạn; số này giảm khi chúng được xử lý.',
  'inboxButton.unreadHint':
    '{{count}} mục chưa đọc; số này giảm khi bạn đọc chúng.',
  'auth.welcome': 'Chào mừng trở lại',
  'auth.loginDescription':
    'Đăng nhập bằng tên người dùng hoặc email và mật khẩu.',
  'auth.registerTitle': 'Tạo tài khoản',
  'auth.registerDescription': 'Tạo tài khoản để bắt đầu.',
  'auth.forgotTitle': 'Quên mật khẩu',
  'auth.forgotDescription':
    'Nhập email của bạn, chúng tôi sẽ gửi liên kết đặt lại nếu tài khoản tồn tại.',
  'auth.passwordResetUnavailable':
    'Tính năng tự đặt lại mật khẩu chưa được bật. Hãy liên hệ quản trị viên để đặt lại mật khẩu.',
  'auth.capabilityLoadFailed': 'Không thể kiểm tra tính năng đặt lại mật khẩu.',
  'auth.retry': 'Thử lại',
  'auth.loading': 'Đang tải',
  'auth.resetDescription': 'Chọn mật khẩu mới cho tài khoản của bạn.',
  'auth.resetTitle': 'Đặt lại mật khẩu',
  'auth.identifier': 'Tên người dùng hoặc email',
  'auth.password': 'Mật khẩu',
  'auth.signIn': 'Đăng nhập',
  'auth.signingIn': 'Đang đăng nhập…',
  'auth.hidePassword': 'Ẩn mật khẩu',
  'auth.showPassword': 'Hiện mật khẩu',
  'auth.forgotLink': 'Quên mật khẩu?',
  'auth.noAccount': 'Chưa có tài khoản?',
  'auth.signUp': 'Đăng ký',
  'auth.createAccount': 'Tạo tài khoản',
  'auth.creatingAccount': 'Đang tạo tài khoản…',
  'auth.name': 'Họ tên',
  'auth.username': 'Tên người dùng',
  'auth.email': 'Email',
  'auth.confirmPassword': 'Xác nhận mật khẩu',
  'auth.existingAccount': 'Đã có tài khoản?',
  'auth.passwordMismatch': 'Mật khẩu không khớp.',
  'auth.resetting': 'Đang đặt lại…',
  'auth.newPassword': 'Mật khẩu mới',
  'auth.confirmNewPassword': 'Xác nhận mật khẩu mới',
  'auth.invalidResetLink':
    'Liên kết đặt lại mật khẩu này không hợp lệ hoặc đã hết hạn.',
  'auth.backToSignIn': 'Quay lại đăng nhập',
  'auth.sendResetLink': 'Gửi liên kết đặt lại',
  'auth.sending': 'Đang gửi…',
  'auth.resetSent': 'Nếu tài khoản tồn tại, liên kết đặt lại đã được gửi.',
  'auth.rememberPassword': 'Bạn đã nhớ mật khẩu?',
  'auth.methods': 'Phương thức đăng nhập',
  'auth.or': 'Hoặc tiếp tục với',
  'auth.continueWith': 'Tiếp tục với {provider}',
  'auth.about': 'Giới thiệu ứng dụng',
  'auth.platform': 'Nền tảng ứng dụng AI-native',
  'auth.marketingTitleFirst': 'Để AI tự do xây dựng.',
  'auth.marketingTitleSecond': 'NocoBase giữ cho mọi thứ',
  'auth.marketingTitleThird': 'đáng tin cậy.',
  'auth.marketingDescription':
    'Trao cho AI một framework frontend linh hoạt để định hình từng trải nghiệm, trong khi NocoBase bảo vệ dữ liệu, quyền hạn và quản trị bên dưới.',
  'auth.frontend': 'Frontend AI-native',
  'auth.frontendDescription':
    'Tự do tạo giao diện trên một framework linh hoạt.',
  'auth.foundation': 'Nền tảng NocoBase',
  'auth.foundationDescription':
    'Dữ liệu, kiểm soát truy cập và quản trị đáng tin cậy.',
  'auth.marketingFooter': 'Tự do ở trên. Vững chắc bên dưới.',
  'status.loading': 'Đang tải',
  'status.loadingPage': 'Đang tải trang',
  'status.denied': 'Truy cập bị từ chối',
  'status.pageFailed': 'Không thể tải trang',
  'status.retry': 'Thử lại',
  'navigation.brandHome': 'Trang chủ NocoCRM',
  'navigation.brandApps': 'Ứng dụng NocoBase',
  'routeOverlay.close': 'Đóng',
  'status.deniedDescription': 'Bạn không có quyền truy cập {{label}}.',
  'status.routeFailedDescription':
    'Không thể tải route {{label}} từ {{packageName}}.',
  shell: {
    buildFreely: 'AI tự do xây dựng.',
    reliability: '<brand>NocoBase</brand> giữ cho mọi thứ đáng tin cậy.',
  },
  home: {
    platform: 'NocoBase · Nền tảng ứng dụng AI-native',
    title: 'Hãy mô tả, agent của bạn sẽ xây dựng',
    description:
      'Ứng dụng này được phát triển bằng cách trò chuyện với coding agent của bạn. Hãy nói nhu cầu nghiệp vụ bằng lời đơn giản, agent sẽ viết các trang, mô hình dữ liệu, API và quy trình nghiệp vụ trong dự án này.',
    steps: {
      describe: {
        title: 'Mô tả nhu cầu',
        description:
          'Cho biết ai sử dụng, lưu trữ dữ liệu gì và điều gì cần xảy ra.',
      },
      build: {
        title: 'Để agent xây dựng',
        description:
          'Agent đọc dự án này cùng các tính năng có sẵn, rồi viết mã.',
      },
      review: {
        title: 'Kiểm tra và tinh chỉnh',
        description:
          'Làm mới trang để dùng thử, rồi yêu cầu thay đổi theo cách tương tự.',
      },
    },
    example: {
      title: 'Thử một yêu cầu như sau',
      text: 'Xây dựng ứng dụng đơn mua hàng.\n\nMỗi đơn có số đơn, mặt hàng, người đề nghị, số tiền và trạng thái phê duyệt. Người đề nghị tạo đơn và chỉ xem đơn của mình; người duyệt xem mọi đơn đang chờ và phê duyệt hoặc từ chối.\nSau khi có quyết định, thông báo cho người đề nghị trong hộp thư đến kèm liên kết đến đơn.',
      hint: 'Dán vào Claude Code, Codex, Cursor hoặc bất kỳ coding agent nào được mở trong dự án này.',
    },
    capabilitiesTitle: 'Tính năng có sẵn',
    capabilitiesDescription:
      'Agent của bạn dùng trực tiếp các tính năng này thay vì xây dựng từ đầu. Mở một mục để lấy prompt bạn có thể chỉnh sửa và sao chép.',
    viewPrompts: 'Xem prompt ({{count}})',
    prompt: {
      label: 'Prompt',
      hint: 'Chỉnh sửa prompt cho phù hợp với doanh nghiệp trước khi sao chép. Thay đổi không được lưu sau khi đóng hộp thoại.',
      copy: 'Sao chép',
      copiedShort: 'Đã sao chép',
      copied: 'Đã sao chép prompt',
      copyFailed: 'Không thể sao chép. Hãy chọn văn bản và sao chép thủ công.',
      reset: 'Khôi phục mặc định',
    },
    capabilities: {
      auth: {
        title: 'Xác thực',
        description:
          'Đăng nhập, đăng ký, đặt lại mật khẩu và đăng nhập một lần (SSO) của công ty.',
        prompts: {
          disableSignUp: {
            label: 'Đóng đăng ký',
            text: 'Ứng dụng này chỉ dành cho nhân viên công ty. Quản trị viên tạo tất cả tài khoản.\nTắt tính năng tự đăng ký và bỏ liên kết đăng ký khỏi trang đăng nhập.\nNhân viên hiện có vẫn phải đăng nhập được bằng tài khoản và mật khẩu của mình.\nGiữ liên kết quên mật khẩu.',
          },
          companySso: {
            label: 'SSO của công ty',
            text: 'Cho phép nhân viên đăng nhập bằng nền tảng định danh của công ty qua OIDC.\n\nGiữ đăng nhập bằng tài khoản và mật khẩu, đồng thời thêm nút Tài khoản công ty.\nNút này mở nền tảng định danh của công ty. Sau khi đăng nhập thành công, quay về trang chủ của ứng dụng.\n\nCho phép lần đăng nhập đầu tiên tạo tài khoản ứng dụng, được nhận diện bằng mã định danh người dùng cố định của nền tảng.\nKhông tự động liên kết tài khoản theo tên hoặc email trùng khớp. Tài khoản mới dùng quyền mặc định của ứng dụng.\n\nLiệt kê các thông tin mà quản trị viên nền tảng định danh phải cung cấp và URL callback họ cần đăng ký.',
          },
          apiKeys: {
            label: 'Khóa API',
            text: 'Thêm mục Khóa tích hợp vào menu người dùng, dùng tính năng khóa API có sẵn của ứng dụng.\nNhân viên chỉ quản lý các khóa do mình tạo, nhập mục đích và thời hạn hiệu lực tính theo ngày.\nChỉ hiển thị toàn bộ khóa một lần sau khi tạo, kèm lời nhắc sao chép và lưu lại ngay.\nLiệt kê tên, một đoạn nhận dạng, trạng thái, ngày hết hạn và lần dùng gần nhất của mỗi khóa, và cho phép thu hồi sau khi xác nhận.\nKhông bao giờ hiển thị toàn bộ khóa trong danh sách, nhật ký hay chi tiết.',
          },
        },
      },
      dataSources: {
        title: 'Nguồn dữ liệu',
        description:
          'Chọn cơ sở dữ liệu của ứng dụng và dùng dữ liệu nghiệp vụ từ các cơ sở dữ liệu bên ngoài hiện có.',
        prompts: {
          postgres: {
            label: 'Đổi cơ sở dữ liệu',
            text: 'Chuyển cơ sở dữ liệu của ứng dụng từ SQLite sang PostgreSQL.\nĐọc thông tin kết nối từ cấu hình chạy của máy chủ, không phải từ mã nguồn.\nGiải thích cần cài driver cơ sở dữ liệu nào và cần điền những thiết lập nào, đồng thời nhắc tôi rằng dữ liệu hiện có không được tự động di chuyển.',
          },
          externalDatabase: {
            label: 'Cơ sở dữ liệu ngoài',
            text: 'Kết nối cơ sở dữ liệu tài chính hiện có của công ty làm nguồn dữ liệu bên ngoài chỉ đọc; không sửa đổi các bảng của nó.\nĐối chiếu bản ghi theo mã nhà cung cấp và thêm mục Thanh toán vào chi tiết nhà cung cấp, hiển thị chu kỳ thanh toán, hạn mức tín dụng và trạng thái thanh toán, có ghi rõ nguồn.\nTiếp tục đọc thông tin liên hệ của nhà cung cấp từ cơ sở dữ liệu của ứng dụng, và đọc dữ liệu thanh toán trực tiếp từ cơ sở dữ liệu bên ngoài mà không nhập vào.\nĐọc thông tin xác thực kết nối từ cấu hình chạy của máy chủ.',
          },
        },
      },
      authorization: {
        title: 'Phân quyền',
        description:
          'Kiểm soát ai được mở trang nào, thực hiện thao tác nào và xem bản ghi nào.',
        prompts: {
          jobs: {
            label: 'Vị trí công việc',
            text: 'Tạo các vị trí Người đề nghị mua hàng và Người duyệt đơn cho ứng dụng.\nNgười đề nghị mua hàng được vào trang đơn hàng và xem các đơn do mình đề nghị.\nNgười duyệt đơn được vào trang đơn hàng, xem đơn và phê duyệt hoặc từ chối các đơn đang chờ.\nChỉ quản trị viên ứng dụng được thay đổi quyền và phân công.\nDùng tính năng phân quyền có sẵn của ứng dụng để quản trị viên có thể điều chỉnh quyền và phân công người sau này.',
          },
          dataScopes: {
            label: 'Phạm vi dữ liệu',
            text: 'Chỉ cho người đề nghị mua hàng xem đơn của chính mình, dùng trường người đề nghị của đơn để xác định quyền sở hữu.\nNgười duyệt đơn được xem mọi đơn và xử lý các phê duyệt đang chờ.\nQuản trị viên có thể điều chỉnh phạm vi xem đơn của từng vị trí trong bộ quyền của vị trí đó.',
          },
          restrictions: {
            label: 'Giới hạn',
            text: 'Bob tạm thời hỗ trợ duyệt đơn mua hàng và chỉ được xem các đơn từ 2.000 trở xuống.\nThêm giới hạn số tiền vào thao tác Xem đơn của anh ấy, giữ nguyên vị trí và phạm vi dữ liệu hiện có.\nÁp dụng giới hạn cho đơn của chính anh ấy và các đơn được chia sẻ với anh ấy.\nQuản trị viên có thể đổi số tiền hoặc gỡ quy tắc; trước khi gỡ, hãy giải thích rằng phạm vi anh ấy xem được có thể rộng hơn.',
          },
        },
      },
      workflow: {
        title: 'Quy trình',
        description:
          'Đưa bản ghi nghiệp vụ qua các giai đoạn, có chờ đợi, hết thời gian, thử lại và lịch sử ai đã làm gì.',
        prompts: {
          stages: {
            label: 'Giai đoạn',
            text: 'Thêm quy trình cho đơn mua hàng: Chờ phê duyệt → Chờ mua → Đã nhận hàng → Hoàn tất.\nNgười duyệt phê duyệt hoặc từ chối; từ chối phải có lý do và trả đơn về cho người đề nghị để sửa và gửi lại.\nSau khi người mua hàng đặt mua, đơn ở trạng thái chờ mua; xác nhận giao hàng kèm biên nhận có chữ ký sẽ chuyển đơn sang Đã nhận hàng, và xác nhận của người đề nghị sẽ hoàn tất đơn.\nChi tiết đơn chỉ hiển thị các thao tác của giai đoạn hiện tại, và chỉnh sửa thông thường không thể thay đổi giai đoạn.\nKiểm tra giai đoạn và thông tin bắt buộc trên máy chủ, và không bao giờ ghi đè kết quả người khác đã gửi.',
          },
          backgroundExport: {
            label: 'Xuất dữ liệu nền',
            text: 'Thêm trang báo cáo đơn hàng để xuất các đơn hiện có ra CSV.\nSau khi gửi, yêu cầu xuất chờ được xử lý, được tạo ở chế độ nền và hoàn tất kèm liên kết tải xuống.\nHiển thị giai đoạn hiện tại, tên tệp, số đơn đã xuất, cùng bản ghi gửi và bản ghi xử lý của hệ thống.\nThử lại việc tạo bị lỗi theo quy tắc, và giữ lỗi cuối cùng để người phụ trách xử lý; chạy lại không được tạo trùng tệp báo cáo.\nGiữ tiến độ và kết quả hiển thị sau khi làm mới trang, và chỉ cho phép người được cấp quyền xuất đơn.',
          },
          history: {
            label: 'Lịch sử',
            text: 'Hiển thị giai đoạn hiện tại và lịch sử xử lý trong chi tiết đơn.\nMỗi mục cho biết ai đã thực hiện, khi nào, thao tác gì, giai đoạn trước và sau, cùng lý do từ chối hoặc biên nhận có chữ ký nếu có.\nĐánh dấu các thao tác tự động là do hệ thống thực hiện.\nGiữ tiến độ và lịch sử sau khi làm mới trang, để có thể xem lại toàn bộ quy trình khi đã hoàn tất.',
          },
        },
      },
      scheduler: {
        title: 'Tác vụ định kỳ',
        description:
          'Chạy công việc nghiệp vụ vào thời điểm định sẵn, xem lần chạy kế tiếp và kết quả.',
        prompts: {
          reminder: {
            label: 'Nhắc nhở hằng ngày',
            text: 'Thêm lời nhắc Đơn đang chờ vào ứng dụng đơn hàng hiện có.\n\nLúc 09:00 giờ Bắc Kinh mỗi ngày làm việc, tìm các đơn đang chờ phê duyệt, nhóm theo người duyệt và gửi cho mỗi người duyệt một thông báo trong ứng dụng.\nNêu số đơn đang chờ và liên kết đến danh sách đơn đang chờ. Không gửi gì khi không có đơn đang chờ.\nQuản trị viên có thể xem lịch chạy và bản ghi thực thi, cũng như tạm dừng hoặc tiếp tục lời nhắc.',
          },
          weeklyReport: {
            label: 'Báo cáo tuần',
            text: 'Lúc 08:00 giờ Bắc Kinh mỗi thứ Hai, tạo bản tổng hợp doanh số tuần trước và thông báo cho quản lý bán hàng.\nBao gồm doanh thu bán hàng, số đơn và tổng theo khu vực. Quản trị viên có thể xem tác vụ và bản ghi thực thi.',
          },
        },
      },
      notification: {
        title: 'Thông báo',
        description:
          'Gửi tin nhắn trong ứng dụng, email hoặc tin nhắn bot nhóm khi có sự kiện xảy ra.',
        prompts: {
          inApp: {
            label: 'Tin nhắn trong ứng dụng',
            text: 'Thêm phê duyệt đơn hàng vào ứng dụng hiện tại và thông báo kết quả cho người đề nghị qua tin nhắn trong ứng dụng.\n\nĐơn hàng gồm số đơn, tên, người đề nghị, số tiền và trạng thái phê duyệt.\nNgười đề nghị có thể xem đơn của mình. Người duyệt có thể xem các đơn đang chờ và phê duyệt hoặc từ chối. Dùng lại tính năng đơn hàng và phê duyệt hiện có nếu có.\n\nSau khi phê duyệt hoặc từ chối, chỉ gửi một tin nhắn trong ứng dụng cho người đề nghị của đơn.\nTiêu đề cho biết đơn được phê duyệt hay bị từ chối. Nội dung gồm số đơn, tên đơn và kết quả phê duyệt.\nNhấp vào tin nhắn sẽ mở chi tiết đơn tương ứng.\nKhông gửi khi phê duyệt còn đang chờ. Chỉ thông báo một lần cho cùng một kết quả phê duyệt.\nLỗi gửi thông báo không ảnh hưởng đến kết quả phê duyệt đã lưu.',
          },
          email: {
            label: 'Email',
            text: 'Thêm email vào các thông báo phê duyệt đơn hàng hiện có, dùng kênh email đã cấu hình của ứng dụng.\n\nSau khi đơn được phê duyệt hoặc bị từ chối, gửi kết quả đến email tài khoản của người đề nghị.\nĐưa số đơn vào tiêu đề, tên đơn và kết quả vào nội dung.\nGiữ các tin nhắn trong ứng dụng hiện có. Nếu người đề nghị không có địa chỉ email, chỉ gửi tin nhắn trong ứng dụng.\nLỗi gửi email không được ảnh hưởng đến kết quả phê duyệt hay tin nhắn trong ứng dụng.',
          },
        },
      },
      mail: {
        title: 'Email',
        description:
          'Kết nối hộp thư cá nhân, rồi đọc, trả lời và gửi email công việc.',
        prompts: {
          providers: {
            label: 'Nhà cung cấp email',
            text: 'Cấu hình mailbox.org cho ứng dụng trong mail.providers của cấu hình máy chủ:\n- Máy chủ nhận thư IMAP: imap.mailbox.org, cổng 993, SSL/TLS.\n- Máy chủ gửi thư SMTP: smtp.mailbox.org, cổng 465, SSL/TLS.\nNgười dùng tự nhập địa chỉ email, tên người dùng và mật khẩu của mình trên trang tài khoản hộp thư và chọn ngày bắt đầu đồng bộ lần đầu; không bao giờ ghi mật khẩu hộp thư vào cấu hình hay mã nguồn.',
          },
          mailCenter: {
            label: 'Trung tâm email',
            text: 'Email được tích hợp sẵn trong ứng dụng này; hãy dùng lại thay vì xây dựng lại hay cài thêm plugin khác.\nThêm các trang Trung tâm email và Tài khoản hộp thư vào thanh điều hướng, dùng trang làm việc email và trang tài khoản hộp thư mà tính năng email cung cấp.\nNgười dùng có thể kết nối hộp thư của mình, đồng bộ thư đến, đọc thư và tệp đính kèm, và trả lời, giữ nguyên tiêu đề gốc và ngữ cảnh cuộc hội thoại, gửi thư trả lời đến người gửi ban đầu.\nMỗi người dùng làm việc với các hộp thư đã kết nối của riêng mình.',
          },
          correspondence: {
            label: 'Email khách hàng',
            text: 'Thêm mục thư từ vào chi tiết khách hàng, dùng lại các thành phần đọc và soạn email có sẵn của ứng dụng.\nHiển thị các thư có người gửi hoặc người nhận trùng với địa chỉ email liên hệ của khách hàng hiện tại. Nhân viên bán hàng có thể đọc thư, xem tệp đính kèm và trả lời bằng hộp thư đã kết nối của mình.',
          },
        },
      },
      file: {
        title: 'Tệp',
        description:
          'Tải tệp lên, đính kèm vào bản ghi, xem trước hoặc tải xuống.',
        prompts: {
          attachments: {
            label: 'Tệp đính kèm',
            text: 'Thêm tệp đính kèm mua hàng vào ứng dụng quản lý đơn hàng hiện có của tôi.\n\nThêm khu vực tệp đính kèm vào chi tiết đơn. Mỗi đơn có thể có nhiều tệp, gồm PDF, hình ảnh và DOCX.\nHiển thị tên tệp và kích thước, kèm các thao tác xem trước, tải xuống và gỡ tệp đính kèm.\nSau khi tải lên, cho phép người dùng lưu tệp đính kèm vào đơn hiện tại. Giữ chúng khi mở lại đơn.\nBất kỳ ai có quyền truy cập đơn đều có thể xem và tải xuống tệp đính kèm của đơn. Người đề nghị và người duyệt có thể thêm hoặc gỡ tệp đính kèm.\nGỡ tệp đính kèm chỉ hủy liên kết tệp với đơn hiện tại; vẫn giữ lại tệp.',
          },
          avatar: {
            label: 'Ảnh đại diện',
            text: 'Thêm ảnh đại diện cho mỗi nhân viên, mỗi nhân viên một ảnh.\nHỗ trợ tải lên và thay ảnh đại diện, và hiển thị ảnh trong danh sách và chi tiết nhân viên.\nDùng ảnh đại diện mới sau khi thay và giữ ảnh hiển thị sau khi làm mới trang.',
          },
        },
      },
      i18n: {
        title: 'Ngôn ngữ',
        description:
          'Chuyển ngôn ngữ giao diện, thêm ngôn ngữ và đặt ngôn ngữ mặc định.',
        prompts: {
          addLanguage: {
            label: 'Thêm ngôn ngữ',
            text: 'Thêm tiếng Tây Ban Nha vào ứng dụng của tôi. Dịch giao diện và thông báo của máy chủ, và thêm tiếng Tây Ban Nha vào menu ngôn ngữ.',
          },
          defaultLanguage: {
            label: 'Ngôn ngữ mặc định',
            text: 'Đặt tiếng Trung giản thể làm ngôn ngữ mặc định của ứng dụng cho những người chưa chọn ngôn ngữ. Giữ tiếng Anh trong menu ngôn ngữ.',
          },
        },
      },
      theme: {
        title: 'Giao diện',
        description:
          'Điều chỉnh màu sắc, phông chữ và mật độ, và chuyển giữa chế độ sáng và tối.',
        prompts: {
          changeTheme: {
            label: 'Đổi giao diện',
            text: 'Cập nhật giao diện Gọn: dùng màu xanh dương làm màu chính và tăng nhẹ độ bo góc. Giữ nguyên phông chữ, cỡ chữ và khoảng cách gọn hiện tại.',
          },
          newTheme: {
            label: 'Giao diện mới',
            text: 'Tạo giao diện Rừng xanh với màu xanh lá làm màu chính, nền dịu, góc bo vừa phải và đổ bóng nhẹ.',
          },
        },
      },
    },
  },
  appearance: {
    title: 'Hiển thị',
    mode: 'Chế độ màu',
    preset: 'Giao diện',
    light: 'Sáng',
    dark: 'Tối',
    system: 'Theo hệ thống',
    themes: {
      default: 'Rộng rãi',
      compact: 'Gọn',
    },
  },
  app: {
    title: 'NocoCRM',
  },
  actions: {
    close: 'Đóng',
    save: 'Lưu',
    cancel: 'Hủy',
    confirm: 'Xác nhận',
    language: 'Ngôn ngữ',
  },
  notices: {
    serverLocaleFallback:
      'Máy chủ không hỗ trợ ngôn ngữ này, nên thông báo của máy chủ sẽ dùng tiếng Anh.',
    languageChangeFailed:
      'Không thể hoàn tất việc đổi ngôn ngữ. Vui lòng thử lại.',
  },
  account: {
    signOutFailed: 'Không thể đăng xuất. Vui lòng thử lại.',
    openMenu: 'Mở menu tài khoản',
    fallback: 'Tài khoản',
    signOut: 'Đăng xuất',
    signingOut: 'Đang đăng xuất…',
  },
  navigation: {
    home: 'Tổng quan',
    open: 'Mở thanh điều hướng',
    close: 'Đóng thanh điều hướng',
    expand: 'Mở rộng thanh điều hướng',
    collapse: 'Thu gọn thanh điều hướng',
    toggle: 'Mở rộng hoặc thu gọn thanh điều hướng',
    label: 'Điều hướng ứng dụng',
    description: 'Đi đến một trang của ứng dụng này.',
    breadcrumb: 'Đường dẫn',
    breadcrumbMore: 'Hiện các cấp ở giữa',
    back: 'Quay lại',
  },
  dataTable: {
    noResults: 'Không có kết quả.',
    sortAscending: 'Tăng dần',
    sortDescending: 'Giảm dần',
    hideColumn: 'Ẩn',
    view: 'Hiển thị',
    toggleColumns: 'Ẩn/hiện cột',
    selectedCount: 'Đã chọn {{selected}} trên {{total}} hàng.',
    rowsPerPage: 'Số hàng mỗi trang',
    pageOf: 'Trang {{page}} / {{pageCount}}',
    firstPage: 'Đến trang đầu',
    previousPage: 'Đến trang trước',
    nextPage: 'Đến trang sau',
    lastPage: 'Đến trang cuối',
  },
  datePicker: {
    placeholder: 'Chọn ngày',
    rangePlaceholder: 'Chọn khoảng ngày',
  },
  'Lead follow-up': 'Theo dõi khách hàng tiềm năng',
  'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    'Xem xét mọi thông tin hiện có của một khách hàng tiềm năng (bản thân khách hàng tiềm năng, các công việc, bình luận và bản ghi liên quan trong CRM) và đề xuất bước tiếp theo — tiếp tục theo dõi, nuôi dưỡng, chuyển đổi hay đánh dấu không hợp lệ — kèm lý do; khi tiếp tục theo dõi, nêu rõ cách theo dõi và cụ thể cần làm gì. Dùng khi có khách hàng tiềm năng mới, khi người dùng yêu cầu theo dõi hoặc theo dõi lại một khách hàng tiềm năng, hoặc hỏi "tôi nên làm gì tiếp với khách hàng tiềm năng này".',
  'Opportunity follow-up': 'Theo dõi cơ hội',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    'Xem xét mọi thông tin hiện tại của một cơ hội (bản thân cơ hội, công ty, các liên hệ và vai trò của họ, công việc, bình luận, phê duyệt, khách hàng tiềm năng nguồn) và đánh giá giai đoạn hiện tại có hợp lý không cũng như nên làm gì tiếp — chuyển sang giai đoạn tiếp theo, tiếp tục ở giai đoạn hiện tại, tạm dừng hay đánh dấu thua — kèm lý do, rủi ro và những thiếu sót cần bổ sung; khi chuyển giai đoạn, nêu cụ thể cần làm gì. Dùng khi việc chuyển đổi một khách hàng tiềm năng mở ra cơ hội mới, khi kết quả một công việc của cơ hội đã được ghi lại, khi người dùng yêu cầu theo dõi, hoặc khi được hỏi "bước tiếp theo của cơ hội này là gì?".',
  'Approval review': 'Xem xét phê duyệt',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    'Giúp người phê duyệt đánh giá một yêu cầu phê duyệt (chiết khấu, điều khoản thanh toán, điều khoản hợp đồng, cam kết giao hàng) có đáng phê duyệt không — điều kiện được yêu cầu chênh lệch bao nhiêu so với tiêu chuẩn, ảnh hưởng đến số tiền và việc thu tiền, tình hình của cơ hội và bằng chứng ủng hộ nhượng bộ này, các phê duyệt khác được gửi cùng trên cùng cơ hội, các yêu cầu cùng loại trước đây đã được quyết định thế nào, các rủi ro và những điểm người đề nghị chưa làm rõ — rồi đề xuất phê duyệt, phê duyệt có điều kiện, từ chối hoặc yêu cầu bổ sung thông tin, và soạn sẵn bình luận cho quyết định. Dùng sau khi một phê duyệt được gửi, hoặc khi người phê duyệt hỏi "có nên phê duyệt yêu cầu này không?".',
  'Task preparation': 'Chuẩn bị công việc',
  "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.":
    'Giúp nhân viên bán hàng chuẩn bị cho một công việc sắp làm với khách hàng (cuộc gọi, cuộc họp, chuyến thăm, buổi demo) — công việc cần đạt được gì, tình hình hiện tại dựa trên các công việc, bình luận và email của bản ghi, phía bên kia gồm những ai và mỗi người đóng vai trò gì, các câu hỏi cần đặt ra, những gì cần mang theo, các rủi ro, và các điểm cần trao đổi theo thứ tự. Dùng vào buổi sáng ngày diễn ra công việc, hoặc khi người phụ trách công việc yêu cầu được chuẩn bị.',
  flowDiagram: {
    controls: 'Điều khiển sơ đồ',
    fitView: 'Vừa khung nhìn',
    fullscreen: 'Toàn màn hình',
    exitFullscreen: 'Thoát toàn màn hình',
    escapeHint: 'Nhấn Esc để thoát',
    leavesTo: 'Dẫn đến',
    arrivesFrom: 'Đến từ',
    otherRoutes: 'Đường khác',
    minimap: 'Tổng quan sơ đồ',
    configure: 'Cấu hình',
    overview: 'Tổng quan sơ đồ',
    actualSize: 'Kích thước thực',
    states: 'Trạng thái',
    transitions: 'Chuyển tiếp',
    configurable: 'Tham số',
    current: 'Hiện tại',
    visited: 'Đã qua',
    initial: 'Ban đầu',
    final: 'Kết thúc',
    state: 'Trạng thái',
    zoomOut: 'Thu nhỏ',
    zoomIn: 'Phóng to',
    fit: 'Vừa khung nhìn',
    empty: 'Không có trạng thái nào để hiển thị.',
    loading: 'Đang sắp xếp sơ đồ…',
    failed: 'Không thể sắp xếp sơ đồ này.',
    nodeHelp: 'Nhấn Enter hoặc Space để chọn một trạng thái.',
    edgeHelp: 'Nhấn Enter hoặc Space để chọn một bước chuyển.',
  },
  loginActivity: {
    heading: 'Từ khách hàng tiềm năng đầu tiên đến hợp đồng được ký.',
    description:
      'Đội ngũ bán hàng AI của bạn theo dõi mọi khách hàng tiềm năng và cơ hội, chuẩn bị mọi cuộc họp và mọi phê duyệt, còn bạn là người quyết định.',
    phases: {
      lead: 'Khách hàng tiềm năng',
      deal: 'Cơ hội',
      won: 'Đã chốt',
    },
    participants: {
      rep: 'Sophie Bennett',
      leadAgent: 'AI theo dõi khách hàng tiềm năng',
      prepAgent: 'Trợ lý công việc AI',
      dealAgent: 'AI theo dõi cơ hội',
      approvalAgent: 'AI xem xét phê duyệt',
      manager: 'Daniel Brooks',
      customer: 'Emma Walsh',
    },
    capabilities: {
      capture: 'AI thu thập',
      followUp: 'AI theo dõi',
      pipeline: 'Pipeline',
      prep: 'Chuẩn bị công việc',
      mail: 'Email',
      approval: 'Phê duyệt',
    },
    timeline: 'Dòng thời gian',
    lead: {
      kind: 'Khách hàng tiềm năng',
      title: 'Emma Walsh / Northwind Logistics',
      need: 'Điều phối đội xe, 200 xe tải · từ một email',
      grade: 'Hạng A',
    },
    deal: {
      kind: 'Cơ hội',
      title: 'Nền tảng điều phối đội xe (Enterprise)',
      company: 'Northwind Logistics',
      amount: '$48,000',
      owner: 'Sophie Bennett',
      won: 'Thắng',
    },
    leadStatuses: {
      new: 'Mới',
      working: 'Đang xử lý',
      converted: 'Đã chuyển đổi',
    },
    stages: {
      qualification: 'Đánh giá',
      proposal: 'Đề xuất',
      negotiation: 'Đàm phán',
      won: 'Thắng',
    },
    steps: {
      captured: {
        who: 'AI',
        what: 'đã tạo khách hàng tiềm năng từ một email',
      },
      leadFollowUp: {
        who: 'AI theo dõi',
        what: 'hạng A, gọi điện hôm nay lúc 3 giờ chiều',
      },
      converted: {
        who: 'Sophie Bennett',
        what: 'đã chuyển đổi khách hàng tiềm năng thành cơ hội',
      },
      prepared: {
        who: 'AI',
        what: 'đã chuẩn bị buổi demo ngày mai trên chính tuyến đường của họ',
      },
      replied: {
        who: 'Emma Walsh',
        what: 'chúng tôi có thể thanh toán 60 ngày sau khi nhận hóa đơn không?',
      },
      dealFollowUp: {
        who: 'AI theo dõi',
        what: 'chuyển sang đàm phán; 60 ngày cần phê duyệt',
      },
      reviewed: {
        who: 'AI xem xét',
        what: 'phê duyệt có điều kiện',
      },
      approved: {
        who: 'Daniel Brooks',
        what: 'đã phê duyệt điều khoản 60 ngày',
      },
      won: {
        who: 'Sophie Bennett',
        what: 'hợp đồng đã ký đã được gửi lại',
      },
    },
  },
  // The template's Settings copy, translated in ./settings/.
  settings: settingsViVN,
  crm: crmViVN,
};

export default viVN;
