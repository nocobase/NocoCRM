// A chat reply often breaks lines the way a message does, one thought per
// line without a blank line between; Markdown would run those together,
// so outside fenced code every single line break becomes a hard break.
export function keepLineBreaks(text: string): string {
  return text
    .split(/(```[\s\S]*?```)/)
    .map((part, i) => (i % 2 ? part : part.replace(/(?<!\n)\n(?!\n)/g, '  \n')))
    .join('');
}

// Markdown read as one line of plain text, for the places that show a long
// text cut to a line (a note's excerpt, a change on the timeline): its
// marks dropped, links and images by their text, lines run together. A
// heading (a line that is only a heading or bold text, as the AI writes an
// activity's outcome) ends with a colon, so it reads as leading what
// follows rather than running into it.
export function markdownLine(text: string): string {
  return (
    text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(
        /^\s{0,3}(?:#{1,6}\s+(.+?)|\*\*([^*\n]+)\*\*|__([^_\n]+)__)\s*:?\s*$/gm,
        (
          _,
          a: string | undefined,
          b: string | undefined,
          c: string | undefined,
        ) => {
          const heading = (a ?? b ?? c ?? '').trim().replace(/[:：]$/, '');
          return /[\u3000-\u9fff]/.test(heading)
            ? `${heading}：`
            : `${heading}:`;
        },
      )
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/gm, '')
      .replace(/(\*\*|__|~~|`)/g, '')
      .replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, '$1$2')
      .replace(/\s+/g, ' ')
      // A full-width colon needs no space after it.
      .replace(/：\s/g, '：')
      .trim()
  );
}
