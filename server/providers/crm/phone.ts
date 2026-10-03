// A phone number as the CRM keeps it, however it was written: a Chinese
// mobile as its 11 digits (13800005217, without +86); a Chinese landline
// with its area code and a hyphen (0571-88888888, 010-12345678, also from
// +86 571 8888 8888); a number abroad as + and its digits (+14155550134);
// an extension after a hyphen (0571-88888888-8021). Spaces, dots and
// brackets go. What reads as none of these keeps its digits (a 400 service
// line, a local number without its area code); text that is no number at
// all is left as written. No imports, so the browser bundle takes it too.

// Mainland area codes: 010 and 020–029 are three digits, the rest four.
function landline(digits: string): string {
  const area = /^0[12]/.test(digits) ? 3 : 4;
  return `${digits.slice(0, area)}-${digits.slice(area)}`;
}

export function normalizePhone(value: string): string {
  const text = value.trim();
  if (!text) return '';
  // Already as the CRM keeps it: left so, extension and all.
  if (
    /^(?:1[3-9]\d{9}|0\d{2,3}-\d{7,8}|\+(?!86)\d{6,15}|\d{5,12})(?:-\d{1,6})?$/.test(
      text,
    ) &&
    !/^861[3-9]\d{9}$/.test(text)
  )
    return text;
  // An extension at the end: 转 8021, ext. 8021, x8021, #8021.
  const extMatch = /\s*(?:转|分机|ext\.?|x|#)\s*(\d{1,6})\s*$/i.exec(text);
  const main = extMatch ? text.slice(0, extMatch.index) : text;
  const ext = extMatch ? `-${extMatch[1]}` : '';
  // Anything but digits and the separators people write: not a number.
  if (/[^\d\s+().\-–—/]/.test(main)) return text;
  const plus = main.trimStart().startsWith('+');
  let digits = main.replace(/\D/g, '');
  if (digits.length < 5) return text;
  // China's country code: +86, 0086, or 86 before a mobile. A number with
  // another country code stays international.
  let china = false;
  if (digits.startsWith('0086')) {
    digits = digits.slice(4);
    china = true;
  } else if (plus && digits.startsWith('86')) {
    digits = digits.slice(2);
    china = true;
  } else if (/^861[3-9]\d{9}$/.test(digits)) digits = digits.slice(2);
  else if (plus) return `+${digits}${ext}`;
  if (/^1[3-9]\d{9}$/.test(digits)) return `${digits}${ext}`;
  // A landline written from abroad drops its trunk 0: put it back.
  if (china && !digits.startsWith('0')) digits = `0${digits}`;
  if (/^0\d{9,11}$/.test(digits)) return `${landline(digits)}${ext}`;
  return `${digits}${ext}`;
}
