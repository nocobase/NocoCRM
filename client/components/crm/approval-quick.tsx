import { Handshake, ShieldCheck, Tag } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { Button } from '../ui/button.js';
import {
  editsAll,
  fieldLabelKey,
  toText,
  useCrmText,
  useMetadata,
  type Data,
} from './api.js';
import { approverChoices } from './approver-choices.js';
import { recordTitle } from './lookups.js';
import { useDebounced, useMatches } from './record-search.js';
import { TaskSearchChip, type SearchOption } from './task-quick.js';

// A new approval's chips (RecordForm's quick mode), as a new task's are:
// what kind of condition it asks for, the deal it is for, and who decides
// it. The topic and the deal are required; the approver is needed only to
// submit.

export function ApprovalChips({
  input,
  onChange,
  names,
  options,
  locked,
}: {
  input: Data;
  onChange: (changes: Data) => void;
  // The names the form already knows (the deal it opened with or picked).
  names: Record<string, string>;
  // The topics, labelled.
  options: { value: string; label: string }[];
  // Opened from a deal's page: the deal is that one.
  locked: boolean;
}): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const [search, setSearch] = useState('');
  const [looking, setLooking] = useState(false);
  // What was picked here, by id, so the chip names it at once.
  const [known, setKnown] = useState<Record<string, string>>({});
  // An approval is raised for a deal its applicant may edit, which for a
  // salesperson means their own.
  const deals = useMatches(
    'opportunities',
    useDebounced(search),
    looking && !locked,
    meta && !editsAll(meta, 'opportunities') ? { ownerId: meta.userId } : {},
  );
  if (!meta) return null;
  const dealId = toText(input.opportunityId ?? '');
  const deal = dealId
    ? (known[dealId] ?? names[dealId] ?? deals.titles[dealId] ?? '')
    : '';
  const topic = options.find((o) => o.value === input.topic)?.label;
  const approvers = approverChoices(meta.users, meta.userId).filter(
    (u) => u.roles.length,
  );
  const approver = approvers.find((u) => u.id === input.approverId)?.name;
  return (
    <>
      <TaskSearchChip
        icon={<Tag />}
        label={topic ?? text(fieldLabelKey('approvals', 'topic'))}
        empty={!topic}
        placeholder={toText(text('approvalQuick.searchTopics'))}
        groups={[
          {
            key: 'topics',
            options: options.map((o) => ({ id: o.value, label: o.label })),
          },
        ]}
        selected={new Set([toText(input.topic ?? '')])}
        onPick={(_group, option) => onChange({ topic: option.id })}
      />
      {locked ? (
        // The deal whose page it was opened from, not to be changed.
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled
          className='max-w-56 font-normal'
        >
          <Handshake />
          <span className='truncate'>{deal}</span>
        </Button>
      ) : (
        <TaskSearchChip
          icon={<Handshake />}
          label={deal || text(fieldLabelKey('approvals', 'opportunityId'))}
          empty={!deal}
          placeholder={toText(text('approvalQuick.searchDeals'))}
          groups={[
            {
              key: 'opportunities',
              options: deals.rows.map((record): SearchOption => ({
                id: toText(record.id),
                label: recordTitle('opportunities', record, {
                  ...deals.titles,
                  ...names,
                }),
              })),
            },
          ]}
          selected={new Set([dealId])}
          onSearch={setSearch}
          onOpenChange={(open) => {
            if (open) setLooking(true);
          }}
          onPick={(_group, option) => {
            setKnown((current) => ({ ...current, [option.id]: option.label }));
            onChange({ opportunityId: option.id });
          }}
        />
      )}
      <TaskSearchChip
        icon={<ShieldCheck />}
        label={approver ?? text(fieldLabelKey('approvals', 'approverId'))}
        empty={!approver}
        placeholder={toText(text('taskQuick.searchPeople'))}
        groups={[
          {
            key: 'users',
            options: approvers.map((u) => ({ id: u.id, label: u.name })),
          },
        ]}
        selected={new Set([toText(input.approverId ?? '')])}
        limit={8}
        onPick={(_group, option) => onChange({ approverId: option.id })}
      />
    </>
  );
}
