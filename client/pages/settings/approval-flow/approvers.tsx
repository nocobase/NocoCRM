import { useState, type ReactElement } from 'react';

import { Button } from '../../../components/ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog.js';
import { Field, FieldLabel } from '../../../components/ui/field.js';
import { ErrorNotice, Loading } from '../../../components/crm/common.js';
import { MultiChoice } from '../../../components/crm/form.js';
import {
  localDate,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
} from '../../../components/crm/api.js';
import { DEFAULT_TIME_ZONE } from '../../../../server/providers/crm/zone-time.js';

// Who may approve: the approver rule (GET/PUT /api/approverRule), the roles
// and the people an applicant may choose as approver, any one of them
// enough. Each save is a new version of the lifecycle's parameter; it
// governs the pickers and the next submissions, while a request already
// submitted keeps its approver. Whoever is named must also be active and
// hold the approve capability, so the people it names now are what the page
// shows beside the diagram, above its steps; the rule is edited in a dialog, opened from there
// or from the diagram, where the rule is the parameter of its submit step.

const ROLES = ['sales-manager', 'system-administrator', 'sales-representative'];

export interface ApproverRule {
  roles: string[];
  users: string[];
  revision: number;
  updatedById: string | null;
  updatedAt: string | null;
  approvers: string[];
}

// The people the rule names now, and the way to change it.
export function ApproverRuleSummary({
  onEdit,
}: {
  onEdit: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const rule = useCrmQuery<ApproverRule>('approverRule');
  const names = useApproverNames();
  if (rule.isLoading) return <Loading />;
  if (!rule.data) return <ErrorNotice error={rule.error} />;
  return (
    <section
      aria-label={toText(text('approvalFlow.approvers.title'))}
      className='grid gap-2 rounded-xl border border-border bg-card p-4 text-sm shadow-xs'
    >
      <div className='flex items-center justify-between gap-3'>
        <h2 className='font-medium'>{text('approvalFlow.approvers.title')}</h2>
        <Button variant='outline' size='sm' onClick={onEdit}>
          {text('edit')}
        </Button>
      </div>
      <p className='text-muted-foreground'>
        <ApproversNow rule={rule.data} names={names} />
      </p>
    </section>
  );
}

// Users' names by id, and a list of them as the language joins it.
function useApproverNames() {
  const { language } = useCrmText();
  const users = useMetadata().data?.users ?? [];
  const nameOf = (id: string) =>
    users.find((user) => user.id === id)?.name ?? id;
  return {
    nameOf,
    join: (ids: readonly string[]) =>
      ids.map(nameOf).join(language.startsWith('zh') ? '、' : ', '),
  };
}

function ApproversNow({
  rule,
  names,
}: {
  rule: ApproverRule;
  names: ReturnType<typeof useApproverNames>;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <>
      {rule.approvers.length
        ? text('approvalFlow.approvers.now', {
            names: names.join(rule.approvers),
          })
        : text('approvalFlow.approvers.nobody')}
    </>
  );
}

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item) => b.includes(item));

// The rule being edited, from the version it started on, and its save.
function useApproverRuleEditor(rule: ApproverRule) {
  const api = useCrmApi();
  const refresh = useRefresh();
  const [roles, setRoles] = useState(rule.roles);
  const [people, setPeople] = useState(rule.users);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const changed = !same(roles, rule.roles) || !same(people, rule.users);
  const save = async (): Promise<boolean> => {
    setBusy(true);
    setError(undefined);
    try {
      await api('approverRule', 'PUT', {
        roles,
        users: people,
        revision: rule.revision,
        requestId: crypto.randomUUID(),
      });
      // The pickers' approvers are in the workspace metadata.
      await refresh();
      return true;
    } catch (cause) {
      setError(cause);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return {
    rule,
    roles,
    setRoles,
    people,
    setPeople,
    busy,
    error,
    canSave: changed && !busy && (roles.length > 0 || people.length > 0),
    save,
  };
}

type ApproverRuleEditor = ReturnType<typeof useApproverRuleEditor>;

// The rule in a dialog, opened from the summary or the diagram; closes once
// saved.
export function ApproverRuleDialog({
  onClose,
}: {
  onClose: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const rule = useCrmQuery<ApproverRule>('approverRule');
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{text('approvalFlow.approvers.title')}</DialogTitle>
          <DialogDescription>
            {text('approvalFlow.approvers.hint')}
          </DialogDescription>
        </DialogHeader>
        {rule.data ? (
          <ApproverRuleDialogForm
            key={rule.data.revision}
            rule={rule.data}
            onClose={onClose}
          />
        ) : rule.isLoading ? (
          <Loading />
        ) : (
          <ErrorNotice error={rule.error} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ApproverRuleDialogForm({
  rule,
  onClose,
}: {
  rule: ApproverRule;
  onClose: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const editor = useApproverRuleEditor(rule);
  return (
    <>
      <ApproverRuleFields editor={editor} />
      <DialogFooter>
        <Button variant='outline' disabled={editor.busy} onClick={onClose}>
          {text('cancel')}
        </Button>
        <Button
          disabled={!editor.canSave}
          onClick={() =>
            void editor.save().then((saved) => {
              if (saved) onClose();
            })
          }
        >
          {editor.busy ? text('saving') : text('save')}
        </Button>
      </DialogFooter>
    </>
  );
}

function ApproverRuleFields({
  editor,
}: {
  editor: ApproverRuleEditor;
}): ReactElement {
  const { text, language } = useCrmText();
  const meta = useMetadata().data;
  const users = meta?.users ?? [];
  const names = useApproverNames();
  const { rule, roles, setRoles, people, setPeople } = editor;
  return (
    <>
      <ErrorNotice error={editor.error} />
      <div className='grid gap-4 md:grid-cols-2'>
        <Field>
          <FieldLabel>{text('approvalFlow.approvers.roles')}</FieldLabel>
          <MultiChoice
            label={toText(text('approvalFlow.approvers.roles'))}
            value={roles}
            onChange={setRoles}
            choices={ROLES.map((role) => ({
              value: role,
              label: toText(text(`options.${role}`)),
            }))}
          />
        </Field>
        <Field>
          <FieldLabel>{text('approvalFlow.approvers.people')}</FieldLabel>
          <MultiChoice
            label={toText(text('approvalFlow.approvers.people'))}
            value={people}
            onChange={setPeople}
            searchable
            // A disabled user already named stays visible, to be taken off.
            choices={users
              .filter((user) => !user.disabled || people.includes(user.id))
              .map((user) => ({ value: user.id, label: user.name }))}
          />
        </Field>
      </div>
      <p className='text-sm'>
        <ApproversNow rule={rule} names={names} />
      </p>
      <p className='text-xs text-muted-foreground'>
        {rule.updatedAt
          ? text('approvalFlow.approvers.changed', {
              name: names.nameOf(rule.updatedById ?? ''),
              time: localDate(
                rule.updatedAt,
                language,
                meta?.settings.timeZone ?? DEFAULT_TIME_ZONE,
              ),
              revision: rule.revision,
            })
          : text('approvalFlow.approvers.default')}
      </p>
    </>
  );
}
