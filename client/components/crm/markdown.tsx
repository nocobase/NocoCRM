import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactElement } from 'react';
import { SafeImage } from '../safe-image.js';
import { keepLineBreaks } from './line-breaks.js';

// Markdown rendered with the application's typography: the assistant's
// replies and Markdown attachments. HTML inside the text is escaped rather
// than rendered, so neither a model nor an upload can put markup in the
// page, and an image from another origin is shown as a link rather than
// fetched (SafeImage). "compact" is the chat size: tighter headings and spacing so a
// reply reads as a message, not a document.
const prose =
  '[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em] [&_hr]:my-3 [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5 [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-medium';

const document =
  '[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h3]:mt-3 [&_h3]:mb-1 [&_h4]:mt-3 [&_li]:my-0.5 [&_p]:my-2 [&_pre]:my-2 [&_table]:my-2';

const compact =
  '[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-base [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h4]:mt-2 [&_li]:my-0.5 [&_p]:my-1.5 [&_pre]:my-1.5 [&_table]:my-1.5 [&_>*:first-child]:mt-0 [&_>*:last-child]:mb-0';

export function Markdown({
  children,
  compact: isCompact = false,
  className = '',
}: {
  children: string;
  compact?: boolean;
  className?: string;
}): ReactElement {
  return (
    <div className={`${prose} ${isCompact ? compact : document} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ node: _node, ...props }) => <SafeImage {...props} />,
        }}
      >
        {isCompact ? keepLineBreaks(children) : children}
      </ReactMarkdown>
    </div>
  );
}
