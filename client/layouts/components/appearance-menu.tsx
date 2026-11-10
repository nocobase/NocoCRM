import { useTranslation } from '@nocobase/i18n/client';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { ReactElement } from 'react';

import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '#components/ui/dropdown-menu';

import { useThemePreset } from '../../theme/theme-context.js';
import { themePresets } from '../../theme/theme-presets.js';

const COLOR_MODES = [
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
  { id: 'system', icon: Monitor },
] as const;

// Application change: the colour mode and the theme from the account menu,
// beside the language, in place of the header's own palette button, which
// left the header too crowded for the whole brand on a phone. The choices
// and their words are the template's (theme/theme-settings.tsx), which since
// template 1.0.0-beta.92 is an account-menu sub-menu as well; this one stays
// because it names the current colour mode beside its trigger and is
// labelled Appearance (the CRM keeps `appearance.title` so, see its locales),
// its two choices grouped under their headings. A choice keeps the menu
// open, so the next can be compared at once.
export function AppearanceMenu(): ReactElement {
  const { theme, setTheme } = useTheme();
  const { preset, setPreset } = useThemePreset();
  const { t } = useTranslation();
  const modeLabel = (mode: string): string =>
    t('appearance.' + mode, {
      defaultValue: mode[0].toUpperCase() + mode.slice(1),
    });
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className='gap-2'>
        <Palette aria-hidden='true' className='size-4' />
        <span className='flex-1'>
          {t('appearance.title', { defaultValue: 'Appearance' })}
        </span>
        {theme ? (
          <span className='text-muted-foreground'>{modeLabel(theme)}</span>
        ) : null}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className='min-w-40'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {t('appearance.mode', { defaultValue: 'Color mode' })}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => setTheme(String(value))}
          >
            {COLOR_MODES.map(({ id: mode, icon: ModeIcon }) => (
              <DropdownMenuRadioItem key={mode} value={mode}>
                <ModeIcon aria-hidden='true' />
                {modeLabel(mode)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {t('appearance.preset', { defaultValue: 'Theme' })}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={preset}
            onValueChange={(value) => {
              const selected = themePresets.find((item) => item.id === value);
              if (selected) setPreset(selected.id);
            }}
          >
            {themePresets.map((item) => (
              <DropdownMenuRadioItem key={item.id} value={item.id}>
                {t(item.labelKey, {
                  defaultValue:
                    item.id.charAt(0).toUpperCase() + item.id.slice(1),
                })}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
