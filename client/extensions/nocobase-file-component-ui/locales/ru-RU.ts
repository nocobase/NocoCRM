import type { FileUiResource } from './en-US.js';

const resource: FileUiResource = {
  fileUi: {
    'files.ooxmlLoadFailed': 'Не удалось отобразить файл Office Open XML.',
    'files.ooxmlLoadTimedOut': 'Предпросмотр не загрузился за {{minutes}} мин.',
    'files.previewRequestFailed': 'Ошибка запроса предпросмотра ({{status}}).',
    uploadFailed: 'Не удалось загрузить файл.',
    fileLimitReached: 'Достигнуто максимальное количество файлов.',
    fileTooLarge: 'Размер файла превышает допустимый.',
    fileTypeNotAllowed: 'Этот тип файла не разрешён.',
    removalFailed: 'Не удалось удалить файл.',
    urlNotAllowed: 'Адрес файла не разрешён.',
    downloadFailed: 'Не удалось скачать файл.',
    invalidUrl: 'Адрес файла отсутствует или не разрешён.',
    pdfPreviewFailed: 'Не удалось загрузить предпросмотр PDF.',
    pdfPreviewMarkup: 'Вместо PDF адрес файла вернул HTML или XML.',
    previewFailed: 'Не удалось загрузить предпросмотр файла.',
    'files.empty': 'Нет файлов.',
    'files.preview': 'Предпросмотр',
    'files.download': 'Скачать',
    'files.remove': 'Удалить',
    'files.chooseMany': 'Выбрать файлы',
    'files.chooseOne': 'Выбрать файл',
    'files.retry': 'Повторить',
    'files.done': 'Готово',
    'files.uploading': 'Загрузка',
    'files.failed': 'Ошибка',
    'files.pending': 'Ожидание',
    'files.previous': 'Предыдущий файл',
    'files.next': 'Следующий файл',
    'files.loadingPreview': 'Загрузка предпросмотра…',
    'files.downloadFile': 'Скачать файл',
    'files.previewUnavailable': 'Предпросмотр для этого типа файла недоступен.',
    'files.imageFailed':
      'Не удалось отобразить изображение. Возможно, файл повреждён или его формат не поддерживается.',
    'files.officeFailed': 'Office Online не удалось загрузить файл.',
    'files.officeUrl':
      'Office Online требуется абсолютный адрес файла, доступный из интернета.',
    'files.cancelFile': 'Отменить {{filename}}',
    'files.status.uploading': 'Загрузка',
    'files.status.pending': 'Ожидание',
    'files.status.error': 'Ошибка',
  },
};

export default resource;
