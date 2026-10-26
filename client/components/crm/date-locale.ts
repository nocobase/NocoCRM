import type { Locale } from 'date-fns';
import {
  de,
  enUS,
  es,
  fr,
  id,
  ja,
  ko,
  ptBR,
  ru,
  vi,
  zhCN,
  zhTW,
} from 'date-fns/locale';
import {
  de as dayDe,
  enUS as dayEnUS,
  es as dayEs,
  fr as dayFr,
  id as dayId,
  ja as dayJa,
  ko as dayKo,
  ptBR as dayPtBR,
  ru as dayRu,
  vi as dayVi,
  zhCN as dayZhCN,
  zhTW as dayZhTW,
  type DayPickerLocale,
} from 'react-day-picker/locale';

// The calendars' and date formats' language for each language the pages
// offer (client/locales/index.ts), English for any other.
const DATE_LOCALES: Record<string, Locale> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ja-JP': ja,
  'es-ES': es,
  'pt-BR': ptBR,
  'fr-FR': fr,
  'de-DE': de,
  'vi-VN': vi,
  'id-ID': id,
  'ko-KR': ko,
  'ru-RU': ru,
};
export const dateLocale = (language: string): Locale =>
  DATE_LOCALES[language] ?? enUS;

// The same for the day picker's own locales, which carry its labels too.
const DAY_PICKER_LOCALES: Record<string, DayPickerLocale> = {
  'en-US': dayEnUS,
  'zh-CN': dayZhCN,
  'zh-TW': dayZhTW,
  'ja-JP': dayJa,
  'es-ES': dayEs,
  'pt-BR': dayPtBR,
  'fr-FR': dayFr,
  'de-DE': dayDe,
  'vi-VN': dayVi,
  'id-ID': dayId,
  'ko-KR': dayKo,
  'ru-RU': dayRu,
};
export const dayPickerLocale = (language: string): DayPickerLocale =>
  DAY_PICKER_LOCALES[language] ?? dayEnUS;
