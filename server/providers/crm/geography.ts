import iso from 'iso-3166-2';

// ISO 3166-2 ships English subdivision names only; the CRM is bilingual, so
// China's 34 subdivisions carry a Chinese label. Other countries fall back to
// the ISO name in both locales.
const chineseSubdivisions: Record<string, string> = {
  'CN-11': '北京市',
  'CN-12': '天津市',
  'CN-13': '河北省',
  'CN-14': '山西省',
  'CN-15': '内蒙古自治区',
  'CN-21': '辽宁省',
  'CN-22': '吉林省',
  'CN-23': '黑龙江省',
  'CN-31': '上海市',
  'CN-32': '江苏省',
  'CN-33': '浙江省',
  'CN-34': '安徽省',
  'CN-35': '福建省',
  'CN-36': '江西省',
  'CN-37': '山东省',
  'CN-41': '河南省',
  'CN-42': '湖北省',
  'CN-43': '湖南省',
  'CN-44': '广东省',
  'CN-45': '广西壮族自治区',
  'CN-46': '海南省',
  'CN-50': '重庆市',
  'CN-51': '四川省',
  'CN-52': '贵州省',
  'CN-53': '云南省',
  'CN-54': '西藏自治区',
  'CN-61': '陕西省',
  'CN-62': '甘肃省',
  'CN-63': '青海省',
  'CN-64': '宁夏回族自治区',
  'CN-65': '新疆维吾尔自治区',
  'CN-71': '台湾省',
  'CN-91': '香港特别行政区',
  'CN-92': '澳门特别行政区',
};

export interface Subdivision {
  code: string;
  name: string;
  chineseName?: string;
}

export const countryCodes: string[] = Object.keys(iso.data).sort();

export function subdivisions(country: string): Subdivision[] {
  const entry = iso.data[country];
  if (!entry) return [];
  return Object.entries(entry.sub)
    .map(([code, value]) => ({
      code,
      name: value.name,
      ...(chineseSubdivisions[code]
        ? { chineseName: chineseSubdivisions[code] }
        : {}),
    }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

export function isCountry(code: string): boolean {
  return Object.hasOwn(iso.data, code);
}

export function isSubdivision(country: string, code: string): boolean {
  const entry = iso.data[country];
  return Boolean(entry && Object.hasOwn(entry.sub, code));
}

// A subdivision given by name rather than code — "江西省", "江西", "Jiangxi" —
// resolved to its ISO code, or undefined when nothing matches. Model output
// and imports name places the way people do, not by code.
export function subdivisionCode(
  country: string,
  value: string,
): string | undefined {
  const wanted = value.trim().toLowerCase();
  if (!wanted) return undefined;
  const strip = (name: string): string =>
    name
      .toLowerCase()
      .replace(/(省|市|自治区|特别行政区|壮族|回族|维吾尔)/g, '')
      .replace(/\s+(province|municipality|sheng|shi)$/u, '')
      .trim();
  for (const item of subdivisions(country)) {
    const names = [item.code, item.name, item.chineseName ?? ''];
    if (names.some((n) => n.toLowerCase() === wanted)) return item.code;
    if (names.slice(1).some((n) => n && strip(n) === strip(value)))
      return item.code;
  }
  return undefined;
}
