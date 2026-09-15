import { useMemo, type ReactElement } from 'react';
import { Choice } from './form.js';
import { useCrmQuery, useCrmText } from './api.js';

interface GeographyData {
  subdivisions: { value: string; label: string }[];
}

// Country names come from the browser's own locale data, so no country name
// list is bundled or translated by hand.
function countryLabel(code: string, language: string): string {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function useSubdivisions(country: string): GeographyData | undefined {
  const { data } = useCrmQuery<GeographyData>(
    `geography?country=${encodeURIComponent(country)}`,
    Boolean(country),
  );
  return data;
}

export function CountryLabel({ code }: { code: string }): ReactElement {
  const { language } = useCrmText();
  return <>{countryLabel(code, language)}</>;
}

export function SubdivisionLabel({
  country,
  code,
}: {
  country: string;
  code: string;
}): ReactElement {
  const data = useSubdivisions(country);
  return (
    <>{data?.subdivisions.find((s) => s.value === code)?.label ?? code}</>
  );
}

export function CountryChoice({
  value,
  codes,
  onChange,
  label,
  onOpenChange,
}: {
  value: string;
  codes: string[];
  onChange: (value: string) => void;
  label: string;
  onOpenChange?: (open: boolean) => void;
}): ReactElement {
  const { language } = useCrmText();
  const choices = useMemo(
    () =>
      codes
        .map((code) => ({ value: code, label: countryLabel(code, language) }))
        .sort((left, right) => left.label.localeCompare(right.label, language)),
    [codes, language],
  );
  return (
    <Choice
      label={label}
      value={value}
      onChange={onChange}
      choices={choices}
      onOpenChange={onOpenChange}
    />
  );
}

export function SubdivisionChoice({
  value,
  country,
  onChange,
  label,
  onOpenChange,
}: {
  value: string;
  country: string;
  onChange: (value: string) => void;
  label: string;
  onOpenChange?: (open: boolean) => void;
}): ReactElement {
  const { text } = useCrmText();
  const data = useSubdivisions(country);
  return (
    <Choice
      label={label}
      value={value}
      onChange={onChange}
      choices={data?.subdivisions ?? []}
      disabled={!country}
      emptyLabel={country ? undefined : text('selectCountryFirst')}
      onOpenChange={onOpenChange}
    />
  );
}
