// A chat reply often breaks lines the way a message does, one thought per
// line without a blank line between; Markdown would run those together,
// so outside fenced code every single line break becomes a hard break.
export function keepLineBreaks(text: string): string {
  return text
    .split(/(```[\s\S]*?```)/)
    .map((part, i) => (i % 2 ? part : part.replace(/(?<!\n)\n(?!\n)/g, '  \n')))
    .join('');
}
