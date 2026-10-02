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
// marks dropped, links and images by their text, lines run together.
export function markdownLine(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/(\*\*|__|~~|`)/g, '')
    .replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}
