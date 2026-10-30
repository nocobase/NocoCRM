import { fieldLabelKey, toText, type Entity, type Field } from './api.js';

// The labels a form shows, as AI organise sends them with its request
// (server/providers/crm/form-capture.ts): a field's under its key, a
// choice's options under `key.value`, so the AI names them in its reply as
// the person reads them here. `as` gives a field the capture names
// differently from the form (an opportunity's company by its name).
export function captureLabels(
  entity: Entity,
  keys: readonly string[],
  fields: readonly Field[],
  options: Readonly<Record<string, string[]>>,
  text: (key: string, options?: Record<string, unknown>) => string,
  as: Readonly<Record<string, string>> = {},
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const key of keys) {
    const formKey = as[key] ?? key;
    labels[key] = toText(text(fieldLabelKey(entity, formKey)));
    const field = fields.find((f) => f.key === formKey);
    if (field?.type !== 'select' && field?.type !== 'multi') continue;
    for (const value of options[formKey] ?? field.options ?? [])
      labels[`${key}.${value}`] = toText(
        text(`options.${value}`, { defaultValue: value }),
      );
  }
  return labels;
}
