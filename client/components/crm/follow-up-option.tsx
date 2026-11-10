import { useId, type ReactElement } from 'react';
import { Checkbox } from '../ui/checkbox.js';
import { agentRuns, useCrmText, useMetadata } from './api.js';
import { AgentSentence } from './work-agent.js';
import { useWorkAgentName } from './work-agent-name.js';

// Each option's words naming the agent that follows up, used while it has
// its own: the lead's or the deal's follow-up.
const AGENT_LABELS: Record<string, string> = {
  leadFollowUpNow: 'agentWork.followUp.now',
  dealFollowUpNow: 'agentWork.followUp.now',
  'merge.followUp': 'agentWork.followUp.merged',
  'evaluation.followUpAfter': 'agentWork.followUp.afterTask',
};

// "Let the AI follow up at once", beside the button that creates a lead (the
// lead form, the review of leads the AI organised) and under the deal a
// conversion opens (`label`): ticked by default, and left out while its
// agent or that trigger is switched off on the Agent work page (`agentRuns`),
// when no follow-up would run anyway. It names the agent
// following up, "让 线索跟进 立刻跟进", while that agent is there.
export function FollowUpOption({
  checked,
  onChange,
  disabled,
  label = 'leadFollowUpNow',
  className = 'mr-auto self-center',
  agent,
  trigger,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  // The agent and trigger the follow-up would start: offered only while
  // that agent runs on it (the Agents pages switch them).
  agent: 'leads' | 'opportunities';
  trigger: string;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text } = useCrmText();
  const id = useId();
  const agentName = useWorkAgentName(agent);
  const agentLabel = AGENT_LABELS[label];
  if (!meta?.assistant || !agentRuns(meta, agent, trigger)) return null;
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
      {agentName && agentLabel ? (
        <AgentSentence textKey={agentLabel} name={agentName} />
      ) : (
        text(label)
      )}
    </label>
  );
}
