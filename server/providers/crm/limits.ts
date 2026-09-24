// How much one field holds, shared by the service that enforces it and the
// forms that stop typing at it. A single-line value fits the 255-character
// column every text field is created with (SQLite ignores that length;
// PostgreSQL and MySQL do not); a long text is a text column. Kept free of
// imports so the browser bundle can take it.
export const TEXT_LIMIT = 255;
export const LONG_TEXT_LIMIT = 30000;
// Choices, contacts or files on one field.
export const LIST_LIMIT = 100;

// The most characters a typed field of this type takes.
export const lengthLimit = (type: string | undefined): number =>
  type === 'textarea' ? LONG_TEXT_LIMIT : TEXT_LIMIT;
