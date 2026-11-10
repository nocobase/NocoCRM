import type { ReactElement, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { TabRow } from './tab-row.js';
import { tabClass } from './tab-class.js';

// Tabs that are addresses (Auto follow-up's agents),
// drawn as a record page's tabs (DetailTabBar in pages/crm-detail.tsx):
// underlined on a thin rule, the open one in the foreground over a 2px line
// of it, the others muted until hovered, each led by its icon (or what it
// gives in its place, an agent's avatar) and followed by what it adds (a
// count, a state). A click replaces the address, so the
// browser's back leaves the page rather than stepping through its tabs. One
// line, scrolling sideways when they do not fit (TabRow); a phone leaves out
// the icons, keeping what stands for someone (an agent's avatar).
export function LinkTabs({
  tabs,
  label,
  className = '',
}: {
  tabs: readonly {
    to: string;
    label: ReactNode;
    icon: LucideIcon;
    // Drawn in the icon's place.
    lead?: ReactNode;
    selected: boolean;
    extra?: ReactNode;
  }[];
  label?: string;
  // Where the page places it: close under its heading.
  className?: string;
}): ReactElement {
  const navigate = useNavigate();
  return (
    <TabRow
      label={label}
      selected={tabs.find((tab) => tab.selected)?.to}
      tabCount={tabs.length}
      className={className}
    >
      {tabs.map(({ to, label: name, icon: Icon, lead, selected, extra }) => (
        <button
          key={to}
          type='button'
          role='tab'
          aria-selected={selected}
          onClick={() => void navigate(to, { replace: true })}
          className={tabClass(selected)}
        >
          {lead ?? <Icon className='size-4 max-md:hidden' />}
          {name}
          {extra}
        </button>
      ))}
    </TabRow>
  );
}
