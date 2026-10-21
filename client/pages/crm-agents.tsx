import { useState, type ReactElement } from 'react';
import { useCan } from '@nocobase/app-plugin-authorization/client';
import { useApiClient } from '@nocobase/app-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AgentAvatar } from '@nocobase/app-plugin-agents/client/chat';
import { Link, Navigate, useLocation } from 'react-router';
import {
  Ban,
  CircleCheck,
  CircleX,
  Activity,
  ClipboardList,
  Clock3,
  Hourglass,
  Percent,
  Play,
  ScanSearch,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import { Switch } from '../components/ui/switch.js';
import { AutoLoadMore } from '../components/crm/auto-load.js';
import {
  CrmFrame,
  ErrorNotice,
  Loading,
  Metric,
  RecordLink,
} from '../components/crm/common.js';
import { VerdictBadge } from '../components/crm/lead-evaluation.js';
import { useRunningAgents } from '../components/crm/waiting-count.js';
import { LinkTabs } from '../components/crm/link-tabs.js';
import {
  relativeTime,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
  type Data,
} from '../components/crm/api.js';
import { AgentSentence } from '../components/crm/work-agent.js';
import { useAgentText } from '@nocobase/app-plugin-agents/client/chat';
import { useWorkAgentNames } from '../components/crm/work-agent-name.js';
import { WorkAgentSetup } from '../components/crm/work-agent-setup.js';
import { DEFAULT_TIME_ZONE } from '../../server/providers/crm/zone-time.js';
import {
  useSchedulesKey,
  type Schedule,
} from './settings/scheduled-tasks/types.js';

// The CRM's work agents (server/providers/crm/agents.ts, each its own agent
// of the Agents plugin, crm-agents/work-agents.ts) on one page, Agent work
// in the menu (once Auto follow-up), a tab each, named and drawn as the
// agent (its avatar and its name, the work's title while it has none): the
// agent,
// what it does and the model it asks, when it runs (each
// trigger switched on or off by an administrator), how its runs fared over
// the last week or month, and its runs, newest first, each opening its
// record, automatic or asked for. The tab is the path's last segment
// (/agent-work/<agent>; /crm/agents/<agent> before, which leads here),
// the first when there is none.

// The company signals' check (company-signals.ts) last: its runs are checks
// of companies, its outcomes signals seen or dismissed.
type AgentName = 'leads' | 'opportunities' | 'approvals' | 'tasks' | 'signals';

// The scheduler task that starts each agent's daily trigger
// (server/providers/crm/index.ts). Its switch on the scheduled tasks page
// and the daily trigger's here are one: shown on only while both are, the
// trigger off by default, its task reading as disabled meanwhile. Switched
// on here, a task paused on the scheduled tasks page is enabled too,
// through the scheduler's API, for whoever may open that page; switched
// off, the trigger alone goes off.
const DAILY_SCHEDULES: Partial<Record<AgentName, string>> = {
  leads: 'crm.lead-signals',
  opportunities: 'crm.deal-signals',
  tasks: 'crm.task-preparation',
  signals: 'crm.company-signals',
};
// The method skill each agent works by (ai/skills).
const SKILLS: Record<AgentName, string> = {
  leads: 'lead-follow-up',
  opportunities: 'opportunity-follow-up',
  approvals: 'approval-review',
  tasks: 'task-preparation',
  signals: 'company-signals',
};
const AGENTS: readonly AgentName[] = [
  'leads',
  'opportunities',
  'approvals',
  'tasks',
  'signals',
];
// Each tab's address: the kind of record its agent works on, the company
// work's `companies` (its address was `signals` until 2026-10-16, when the
// agent became Company research; that address leads here).
const SLUGS: Record<AgentName, string> = {
  leads: 'leads',
  opportunities: 'opportunities',
  approvals: 'approvals',
  tasks: 'tasks',
  signals: 'companies',
};
const ICONS: Record<AgentName, LucideIcon> = {
  leads: ScanSearch,
  opportunities: TrendingUp,
  approvals: ShieldCheck,
  tasks: ClipboardList,
  signals: Activity,
};
const FRAME = 'border border-border shadow-xs ring-0';
const STATUSES = ['pending', 'accepted', 'dismissed', 'running', 'failed'];
// A company signals' check found news, found nothing new, or failed.
const CHECK_STATUSES = ['found', 'nothing', 'failed'];

interface Overview {
  agent: AgentName;
  switches: { enabled: boolean; triggers: Record<string, boolean> };
  triggers: string[];
  week: Data;
  month: Data;
  total: number;
  runs: Data[];
}

export default function AgentsPage(): ReactElement {
  const { pathname } = useLocation();
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const running = useRunningAgents();
  const nameOf = useWorkAgentNames();
  const agent =
    AGENTS.find((name) => pathname.endsWith(`/agent-work/${SLUGS[name]}`)) ??
    'leads';
  if (pathname.endsWith('/agent-work/signals'))
    return <Navigate replace to='/agent-work/companies' />;
  return (
    <CrmFrame title={text('navigation.agentWork')}>
      {/* An agent with runs under way shows the AI's pulsing dot and their
          count, one switched off says so. */}
      <LinkTabs
        // Close under the heading, past the frame's spacing.
        className='-mt-4'
        label={text('navigation.agentWork')}
        tabs={AGENTS.map((name) => {
          const count = running[name] ?? 0;
          const off = meta?.agents?.[name]?.enabled === false;
          const agentName = nameOf(name);
          return {
            to: `/agent-work/${SLUGS[name]}`,
            label: agentName ?? text(`agents.${name}.title`),
            icon: ICONS[name],
            ...(agentName
              ? { lead: <AgentAvatar name={agentName} size='xs' /> }
              : {}),
            selected: name === agent,
            extra:
              count > 0 ? (
                <span
                  className='inline-flex items-center gap-1 text-xs text-primary tabular-nums'
                  title={text('agents.runningHint', { count })}
                >
                  <span className='size-1.5 animate-pulse rounded-full bg-primary' />
                  {count}
                </span>
              ) : off ? (
                <span className='text-xs font-normal text-muted-foreground'>
                  {text('agents.off')}
                </span>
              ) : null,
          };
        })}
      />
      {/* A new agent starts from the top, its own filters. */}
      <AgentView key={agent} agent={agent} />
    </CrmFrame>
  );
}

function AgentView({ agent }: { agent: AgentName }): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [status, setStatus] = useState('');
  const [size, setSize] = useState(20);
  const [error, setError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const [now] = useState(() => Date.now());
  const path = `aiAgents/${agent}?pageSize=${String(size)}${status ? `&status=${status}` : ''}`;
  const query = useCrmQuery<Overview>(path);
  const data = query.data;
  const admin = meta?.settingsAccess === true;
  // The skill it works by, opened on the Agents plugin's Skills page, for
  // whoever may open that page.
  const skillId = meta?.methodSkills?.[SKILLS[agent]];
  const { can: canSkills } = useCan({
    resource: { type: 'page', id: 'skills' },
    action: 'access',
  });
  // Its agent's model and instructions, which the work follows, set up by
  // whoever manages the settings (work-agent-setup.tsx).
  const [settingUp, setSettingUp] = useState(false);
  const agentName = useWorkAgentNames()(agent);
  const agentText = useAgentText();
  const own = meta?.workAgentNames?.[agent];
  const model = own?.model;
  // What it does: its agent's description, as the Agents page shows it (an
  // administrator's own words once they edit it), else the work's.
  const description =
    (own &&
      agentText.description({
        description: own.description ?? null,
        descriptionText: own.descriptionText ?? null,
      })) ||
    text(`agentWork.${agent}`);
  const zone = meta?.settings.timeZone ?? DEFAULT_TIME_ZONE;
  const { can: canSchedules } = useCan({
    resource: { type: 'page', id: 'scheduler.schedules' },
    action: 'access',
  });
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const schedulesKey = useSchedulesKey();
  const scheduleKey = DAILY_SCHEDULES[agent];
  // The same query as the scheduled tasks page's, so either page's change
  // shows on the other.
  const schedules = useQuery({
    queryKey: schedulesKey,
    queryFn: () =>
      apiClient.request<{
        data: Schedule[];
        meta: { total: number };
      }>({ path: 'scheduler/schedules', query: { pageSize: 100 } }),
    retry: false,
    enabled: Boolean(scheduleKey && canSchedules),
  });
  const schedule = canSchedules
    ? schedules.data?.data.find((row) => row.key === scheduleKey)
    : undefined;
  const save = async (input: Data): Promise<void> => {
    setSaving(true);
    setError(undefined);
    try {
      await api(`aiAgents/${agent}/switches`, 'PUT', input);
      await refresh();
      // The daily tasks' target state follows the agent's switch.
      if (scheduleKey && canSchedules)
        await queryClient.invalidateQueries({ queryKey: schedulesKey });
    } catch (cause) {
      setError(cause);
    } finally {
      setSaving(false);
    }
  };
  // The daily trigger's switch, and on, its scheduler task enabled too
  // should it be paused.
  const switchDaily = async (on: boolean): Promise<void> => {
    setSaving(true);
    setError(undefined);
    try {
      await api(`aiAgents/${agent}/switches`, 'PUT', {
        triggers: { daily: on },
      });
      if (on && schedule && !schedule.enabled)
        await apiClient.request({
          path: `scheduler/schedules/${encodeURIComponent(schedule.id)}/enable`,
          method: 'POST',
        });
      await refresh();
      if (canSchedules)
        await queryClient.invalidateQueries({ queryKey: schedulesKey });
    } catch (cause) {
      setError(cause);
    } finally {
      setSaving(false);
    }
  };
  if (!data)
    return query.error ? <ErrorNotice error={query.error} /> : <Loading />;
  const stats = data[period];
  const enabled = data.switches.enabled;
  const percent = (value: unknown): string =>
    value == null ? '—' : `${toText(Math.round(Number(value) * 100))}%`;
  const signals = agent === 'signals';
  // A metric's name: the signals' own (checks, seen, dismissed, new), else
  // the runs' and cards'.
  const statLabel = (key: string, fallback: string): string =>
    signals ? text(`agents.signals.stats.${key}`) : text(fallback);
  const triggerLabel = (trigger: string): string =>
    trigger === 'asked' || trigger === 'revised'
      ? text(`agents.started.${trigger}`)
      : text(`agents.triggers.${trigger}.label`, { defaultValue: trigger });
  return (
    <>
      <ErrorNotice error={error} />
      <div className='grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
        <Card className={FRAME}>
          <CardHeader>
            {/* Whether it runs on its own: on or off. "Running" is a run
                under way, which the tab counts. */}
            <CardTitle className='flex items-center gap-2 text-base'>
              {/* The agent doing it, as the Agents page draws it; the work's
                  duty while it has no agent of its own. */}
              {agentName ? (
                <>
                  <AgentAvatar name={agentName} size='sm' />
                  {agentName}
                </>
              ) : (
                text('agents.duty')
              )}
              <Badge variant={enabled ? 'success' : 'muted'}>
                {text(enabled ? 'agents.enabledTag' : 'agents.off')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <p className='leading-relaxed'>{description}</p>
            <p className='text-muted-foreground'>
              {agentName ? (
                <AgentSentence
                  textKey={
                    agent === 'tasks'
                      ? 'agents.byAgentTasks'
                      : signals
                        ? 'agents.byAgentSignals'
                        : 'agents.byAgent'
                  }
                  name={agentName}
                  avatar={false}
                />
              ) : (
                text(
                  agent === 'tasks'
                    ? 'agents.byAiTasks'
                    : signals
                      ? 'agents.byAiSignals'
                      : 'agents.byAi',
                )
              )}
            </p>
            {/* The model it asks first, as its Agents page lists it, and
                its method skill, close together. */}
            <div className='space-y-1 text-xs text-muted-foreground'>
              {agentName ? (
                <p>
                  {model
                    ? text('agents.model', {
                        model: `${model.modelService} · ${model.model}`,
                      })
                    : text('agents.defaultModel')}
                </p>
              ) : null}
              <p>
                {skillId && canSkills ? (
                  <Link
                    to={`/skills/${encodeURIComponent(skillId)}`}
                    className='underline-offset-4 hover:text-foreground hover:underline'
                  >
                    {text(`agents.${agent}.skill`)}
                  </Link>
                ) : (
                  text(`agents.${agent}.skill`)
                )}
              </p>
            </div>
            {agentName && admin ? (
              <Button
                variant='outline'
                size='sm'
                onClick={() => setSettingUp(true)}
              >
                {text('agents.setUpAgent')}
              </Button>
            ) : null}
            {settingUp && agentName ? (
              <WorkAgentSetup
                agent={agent}
                name={agentName}
                onClose={() => setSettingUp(false)}
              />
            ) : null}
          </CardContent>
        </Card>
        <Card className={FRAME}>
          <CardHeader className='flex flex-row items-center justify-between gap-3'>
            <CardTitle className='text-base'>
              {text('agents.triggersTitle')}
            </CardTitle>
            {/* The agent as a whole: off, none of its triggers starts it. */}
            <label className='flex items-center gap-2 text-sm'>
              {text('agents.runsOnItsOwn')}
              <Switch
                checked={enabled}
                disabled={!admin || saving}
                onCheckedChange={(on) => void save({ enabled: on })}
                aria-label={text('agents.runsOnItsOwn')}
              />
            </label>
          </CardHeader>
          <CardContent className='space-y-3'>
            <ul className='divide-y divide-border'>
              {data.triggers.map((trigger) => (
                <li
                  key={trigger}
                  className={`flex items-start justify-between gap-4 py-2.5 first:pt-0 ${
                    enabled ? '' : 'opacity-60'
                  }`}
                >
                  <div className='min-w-0 space-y-0.5'>
                    <p className='text-sm font-medium'>
                      {triggerLabel(trigger)}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {signals
                        ? text('agents.triggers.dailySignals.hint', { zone })
                        : text(`agents.triggers.${trigger}.hint`, { zone })}
                      {trigger === 'daily' && !signals
                        ? ` ${text(
                            agent === 'leads'
                              ? 'agents.triggers.dailyLeads.hint'
                              : agent === 'opportunities'
                                ? 'agents.triggers.dailyOpportunities.hint'
                                : 'agents.triggers.dailyTasks.hint',
                          )}`
                        : ''}
                      {trigger === 'daily' && schedule
                        ? ` ${text('agents.triggers.dailySchedule', {
                            title: schedule.title,
                          })}`
                        : ''}
                    </p>
                  </div>
                  <Switch
                    checked={
                      data.switches.triggers[trigger] !== false &&
                      (trigger !== 'daily' || !schedule || schedule.enabled)
                    }
                    disabled={!admin || saving || !enabled}
                    onCheckedChange={(on) =>
                      void (trigger === 'daily'
                        ? switchDaily(on)
                        : save({ triggers: { [trigger]: on } }))
                    }
                    aria-label={triggerLabel(trigger)}
                  />
                </li>
              ))}
            </ul>
            <p className='text-xs text-muted-foreground'>
              {agentName && !signals
                ? text(
                    agent === 'tasks'
                      ? 'agents.manualNoteTasksAgent'
                      : 'agents.manualNoteAgent',
                    { agent: agentName },
                  )
                : text(
                    agent === 'tasks'
                      ? 'agents.manualNoteTasks'
                      : signals
                        ? 'agents.manualNoteSignals'
                        : 'agents.manualNote',
                  )}
              {admin ? '' : ` ${text('agents.adminOnly')}`}
            </p>
          </CardContent>
        </Card>
      </div>
      <section className='space-y-3'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-sm font-medium text-muted-foreground'>
            {text('agents.statsTitle')}
          </h2>
          <div className='flex rounded-lg border p-0.5'>
            {(['week', 'month'] as const).map((value) => (
              <Button
                key={value}
                size='xs'
                variant={period === value ? 'secondary' : 'ghost'}
                onClick={() => setPeriod(value)}
              >
                {text(
                  value === 'week' ? 'agents.lastWeek' : 'agents.lastMonth',
                )}
              </Button>
            ))}
          </div>
        </div>
        {/* Six across once the page has the room, by its own width. */}
        <div className='@container'>
          <div className='grid grid-cols-2 gap-4 @xl:grid-cols-3 @3xl:grid-cols-6'>
            <Metric
              title={statLabel('runs', 'agents.runs')}
              icon={Play}
              value={Number(stats.runs ?? 0)}
            />
            <Metric
              title={statLabel('accepted', 'agents.statuses.accepted')}
              icon={CircleCheck}
              value={Number(stats.accepted ?? 0)}
            />
            <Metric
              title={statLabel('dismissed', 'agents.statuses.dismissed')}
              icon={CircleX}
              value={Number(stats.dismissed ?? 0)}
            />
            <Metric
              title={statLabel('pending', 'agents.statuses.pending')}
              icon={Hourglass}
              value={Number(stats.pending ?? 0)}
              tone={Number(stats.pending ?? 0) > 0 ? 'attention' : 'neutral'}
            />
            <Metric
              title={statLabel('failed', 'agents.statuses.failed')}
              icon={Ban}
              value={Number(stats.failed ?? 0)}
            />
            <Metric
              title={statLabel('acceptance', 'agents.acceptance')}
              icon={Percent}
              value={percent(stats.acceptance)}
            />
          </div>
        </div>
      </section>
      <section className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-sm font-medium text-muted-foreground'>
              {text('agents.runsTitle')}
              <span className='ml-2 tabular-nums'>{data.total}</span>
            </h2>
            <p className='text-xs text-muted-foreground'>
              {text(
                agent === 'approvals'
                  ? 'agents.runsScopeApprovals'
                  : agent === 'tasks'
                    ? 'agents.runsScopeTasks'
                    : signals
                      ? 'agents.runsScopeSignals'
                      : 'agents.runsScope',
              )}
            </p>
          </div>
          <div className='flex flex-wrap rounded-lg border p-0.5'>
            {['', ...(signals ? CHECK_STATUSES : STATUSES)].map((value) => (
              <Button
                key={value || 'all'}
                size='xs'
                variant={status === value ? 'secondary' : 'ghost'}
                onClick={() => {
                  setStatus(value);
                  setSize(20);
                }}
              >
                {text(value ? `agents.statuses.${value}` : 'agents.all')}
              </Button>
            ))}
          </div>
        </div>
        {data.runs.length ? (
          <ul className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs'>
            {data.runs.map((run) => (
              <li
                key={toText(run.id)}
                className='grid gap-1 px-4 py-3 text-sm @container md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4'
              >
                <div className='min-w-0 space-y-1'>
                  <div className='flex min-w-0 items-center gap-2'>
                    <span className='min-w-0 truncate font-medium'>
                      <RecordLink
                        entity={signals ? 'companies' : agent}
                        record={
                          {
                            id: run.recordId,
                            name: run.name,
                          } as unknown as CrmRecord
                        }
                      />
                    </span>
                  </div>
                  <p className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
                    {run.recommendation ? (
                      agent === 'approvals' ? (
                        <Badge
                          variant={run.status === 'pending' ? 'ai' : 'muted'}
                        >
                          {text(
                            `approvalReview.recommendations.${toText(run.recommendation)}`,
                          )}
                        </Badge>
                      ) : (
                        <VerdictBadge
                          verdict={run as never}
                          pending={run.status === 'pending'}
                        />
                      )
                    ) : null}
                    {run.summary ? (
                      <span className='min-w-0 truncate'>
                        {toText(run.summary)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:justify-end'>
                  <span>{triggerLabel(toText(run.trigger))}</span>
                  <Badge
                    variant={
                      run.status === 'accepted'
                        ? 'success'
                        : run.status === 'failed'
                          ? 'warning'
                          : run.status === 'pending' ||
                              run.status === 'running' ||
                              run.status === 'found'
                            ? 'ai'
                            : 'muted'
                    }
                  >
                    {text(`agents.statuses.${toText(run.status)}`)}
                  </Badge>
                  <span
                    className='inline-flex items-center gap-1 tabular-nums'
                    title={new Date(toText(run.createdAt)).toLocaleString(
                      language,
                    )}
                  >
                    <Clock3 className='size-3' />
                    {relativeTime(
                      run.createdAt,
                      language,
                      now,
                      text('justNow'),
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className='rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground'>
            {text('agents.noRuns')}
          </p>
        )}
        <AutoLoadMore
          hasMore={data.runs.length < data.total && size < 100}
          loading={query.isFetching}
          onLoad={() => setSize((current) => Math.min(100, current + 20))}
        />
      </section>
    </>
  );
}
