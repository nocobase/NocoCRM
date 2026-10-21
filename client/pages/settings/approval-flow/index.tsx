import { useState, type ReactElement } from 'react';
import type { LifecycleDescription } from '@nocobase/lifecycle';
import { ArrowRight } from 'lucide-react';

import { LifecycleDiagram } from '#components/lifecycle-diagram';
import { PageContainer } from '../../../components/page-container.js';
import { PageHeader } from '../../../components/page-header.js';
import {
  ErrorNotice,
  Loading,
  Status,
} from '../../../components/crm/common.js';
import {
  toText,
  useCrmQuery,
  useCrmText,
} from '../../../components/crm/api.js';
import { ApproverRuleDialog, ApproverRuleSummary } from './approvers.js';

// Settings → Approval process: how an approval moves, and who may approve.
// The process is the approvals' lifecycle (server/lifecycles/approvals.ts),
// written in code, which GET /api/approvalLifecycle describes: its states,
// those that end a request, and the transitions between them, drawn by the
// UI Library's lifecycle diagram, with who may take each one beside it;
// nothing here changes it. What an administrator sets is its approver rule
// (approvers.tsx): who it names now is shown beside the diagram, above its steps, and the rule
// is edited in a dialog, opened from there or from the diagram, where it is
// the parameter the lifecycle binds to its submit step (that step and the
// states it leaves).

// What a transition is called where a person takes it: the approval
// page's buttons.
// The one parameter this page edits: the approver rule, under the group
// key server/lifecycles/approvals.ts stores it with.
const APPROVER_GROUP = 'approvers';
const APPROVER_FIELD = 'approverRule';

const ACTION_LABELS: Readonly<Record<string, string>> = {
  submit: 'submit',
  withdraw: 'withdraw',
  approve: 'approve',
  reject: 'reject',
};

export default function ApprovalFlowPage(): ReactElement {
  const { text } = useCrmText();
  const lifecycle = useCrmQuery<LifecycleDescription>('approvalLifecycle');
  const [configuring, setConfiguring] = useState(false);
  const state = (name: string) => toText(text(`options.${name}`));
  const action = (name: string) =>
    toText(text(ACTION_LABELS[name] ?? name, { defaultValue: name }));
  return (
    <PageContainer>
      <PageHeader
        title={text('approvalFlow.title')}
        description={text('approvalFlow.description')}
      />
      {lifecycle.isLoading ? (
        <Loading />
      ) : !lifecycle.data ? (
        <ErrorNotice error={lifecycle.error} />
      ) : (
        <>
          <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]'>
            <section className='rounded-xl border border-border bg-card p-4 shadow-xs'>
              <LifecycleDiagram
                description={lifecycle.data}
                ariaLabel={toText(text('approvalFlow.diagram'))}
                direction='DOWN'
                autoHeight
                endLabel={toText(text('approvalFlow.end'))}
                stateLabel={(item) => state(item.name)}
                transitionLabel={(item) => action(item.name)}
                configuration={{
                  label: () => toText(text('approvalFlow.approvers.configure')),
                  // Whoever reads this page may manage the settings, which
                  // the approver rule's route asks for too.
                  canConfigure: (group, field) =>
                    group.key === APPROVER_GROUP && field === APPROVER_FIELD,
                  onConfigure: () => setConfiguring(true),
                }}
                className='border-0 bg-transparent'
              />
            </section>
            <div className='grid content-start gap-6'>
              <ApproverRuleSummary onEdit={() => setConfiguring(true)} />
              {/* Who takes each step, and what it needs. */}
              <section className='grid content-start gap-3'>
                <h2 className='text-sm font-medium text-muted-foreground'>
                  {text('approvalFlow.steps')}
                </h2>
                {lifecycle.data.transitions.map((transition) => (
                  <div
                    className='grid gap-2 rounded-xl border border-border bg-card p-4 text-sm shadow-xs'
                    key={transition.name}
                  >
                    <p className='font-medium'>{action(transition.name)}</p>
                    <p className='flex flex-wrap items-center gap-1.5'>
                      {transition.from.map((from) => (
                        <Status key={from} value={from} />
                      ))}
                      <ArrowRight className='size-3.5 text-muted-foreground' />
                      {transition.to.map((to) => (
                        <Status key={to} value={to} />
                      ))}
                    </p>
                    <p className='text-muted-foreground'>
                      {text(`approvalFlow.who.${transition.name}`, {
                        defaultValue: '',
                      })}
                    </p>
                  </div>
                ))}
                <p className='text-xs text-muted-foreground'>
                  {text('approvalFlow.final', {
                    states: lifecycle.data.stateInfo
                      .filter((item) => item.final)
                      .map((item) => state(item.name))
                      .join(toText(text('approvalFlow.and'))),
                  })}
                </p>
              </section>
            </div>
          </div>
          {configuring && (
            <ApproverRuleDialog onClose={() => setConfiguring(false)} />
          )}
        </>
      )}
    </PageContainer>
  );
}
