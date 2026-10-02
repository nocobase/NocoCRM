import { useId, type ReactElement } from 'react';
import { Checkbox } from '../ui/checkbox.js';
import { useCrmText, useMetadata } from './api.js';

// "Let the AI follow up at once", beside the button that creates a lead (the
// lead form, the review of leads the AI organised): ticked by default, and
// left out while the AI employee is off, when no follow-up would run anyway.
export function FollowUpOption({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text } = useCrmText();
  const id = useId();
  if (!meta?.assistant) return null;
  return (
    <label
      htmlFor={id}
      className='mr-auto flex items-center gap-2 self-center text-sm text-muted-foreground'
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
      />
      {text('leadFollowUpNow')}
    </label>
  );
}
