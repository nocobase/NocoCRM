import type { ComponentPropsWithoutRef, ReactElement } from 'react';

// Markdown written by a model, or by whoever wrote the text it read, must not
// make the browser fetch another origin on its own: an image URL can carry
// CRM data out in its query string the moment it renders, which is how the
// published prompt-injection leaks against AI CRMs exfiltrated records. Only
// images of this page's own origin, and inline `data:` and `blob:` images
// (charts, attachment previews), load; any other image is shown as a link
// the reader can see and choose to open. `index.html` sets the same limit as
// the page's `img-src` policy, which also covers report previews.
function isSafeImageSource(src: string | undefined): boolean {
  if (!src) return false;
  if (/^(data:image\/|blob:)/i.test(src)) return true;
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function SafeImage({
  src,
  alt,
  ...props
}: ComponentPropsWithoutRef<'img'>): ReactElement | null {
  const source = typeof src === 'string' ? src : undefined;
  if (isSafeImageSource(source))
    return <img src={source} alt={alt} {...props} />;
  if (!source) return null;
  return (
    <a href={source} target='_blank' rel='noopener noreferrer nofollow'>
      {alt || source}
    </a>
  );
}
