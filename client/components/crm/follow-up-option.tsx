import { useId, type ReactElement } from 'react';
import { Checkbox } from '../ui/checkbox.js';
import { useCrmText, useMetadata } from './api.js';

// "Let the AI follow up at once", beside the button that creates a lead (the
// lead form, the review of leads the AI organised) and under the deal a
// conversion opens (`label`): ticked by default, and left out while the AI
// employee is off, when no follow-up would run anyway.
export function FollowUpOption({
  checked,
  onChange,
  disabled,
  label = 'leadFollowUpNow',
  className = 'mr-auto self-center',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text } = useCrmText();
  const id = useId();
  if (!meta?.assistant) return null;
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
      />
      {text(label)}
    </label>
  );
}
