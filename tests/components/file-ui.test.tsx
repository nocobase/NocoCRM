import {
  createTestI18nRuntime,
  TestI18nProvider,
} from '@nocobase/i18n/testing';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import {
  FileList,
  type FileRecord,
} from '../../client/extensions/nocobase-file-component-ui/index.js';
import enUS from '../../client/locales/en-US.js';
import zhCN from '../../client/locales/zh-CN.js';

const image: FileRecord = {
  id: 'photo',
  filename: 'photo.png',
  ext: 'png',
  mimeType: 'image/png',
  size: 12,
  createdAt: '2026-10-27T00:00:00Z',
  updatedAt: '2026-10-27T00:00:00Z',
  contentUrl: '/main/api/files/photo/content',
};

it.each([
  { locale: 'en-US', resources: enUS },
  { locale: 'zh-CN', resources: zhCN },
])(
  'preserves custom downloads from the image preview and its failure fallback in $locale',
  async ({ locale, resources }) => {
    const runtime = await createTestI18nRuntime({
      application: { namespace: 'crm', resources },
      locale,
    });
    const download = vi.fn();
    const preview = vi.fn();
    render(
      <TestI18nProvider runtime={runtime}>
        <FileList files={[image]} onDownload={download} onPreview={preview} />
      </TestI18nProvider>,
    );
    const text = resources.fileUi;
    await userEvent.click(
      screen.getByRole('button', {
        name: `${text['files.preview']}: photo.png`,
      }),
    );
    expect(preview).toHaveBeenCalledWith(image);
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(
      dialog.getByRole('button', {
        name: `${text['files.download']}: photo.png`,
      }),
    );
    expect(download).toHaveBeenCalledWith(image);
    download.mockClear();
    fireEvent.error(dialog.getByRole('img', { name: 'photo.png' }));
    expect(dialog.getByText(text['files.imageFailed'])).toBeInTheDocument();
    await userEvent.click(
      dialog.getByRole('button', { name: text['files.downloadFile'] }),
    );
    expect(download).toHaveBeenCalledWith(image);
  },
);
