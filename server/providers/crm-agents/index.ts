import { SEARCH_SOURCE } from './search-answers.js';
import { isDemoMode } from '../crm/demo-mode.js';
import type { Application } from '@nocobase/app-server/application';
import { loggingToken } from '@nocobase/app-server/logging';
import {
  agentsAccessToken,
  agentsToken,
} from '@nocobase/app-plugin-agents/server/tokens';
import { ServiceProvider } from '@nocobase/service-provider';
import { crmToken } from '../crm/index.js';
import { crmPlansToken } from '../crm/plans/engine.js';
import { deliverPlanOutcome } from './plan-news.js';
import { deliverAiWork } from './ai-work-news.js';
import { crmPlansSkill } from './skill.js';
import { provisionSkills } from './library.js';
import { SKILLS_DIR } from '../crm/ai-model.js';
import { adoptLegacyWorkAgents } from './work-agents.js';
import { adoptLegacyConversations } from './legacy-conversations.js';
import { registerContextKinds } from './context.js';
import { assistantWake, configureAssistant } from './assistant.js';
import { crmConversationRules } from './rules.js';
import { databaseManagerToken } from '@nocobase/db';
import type { CrmSettings } from '../crm/schema.js';
import { provisionModelServices } from './model-services.js';
import { namePlaceholderModel } from './placeholder-model.js';
import { AGENT_ACTIONS, agentActionOptions } from './actions.js';
import { crmActionGate, crmAgentsAccess } from './gate.js';
import { assistantInstructions } from './preset.js';

// The CRM on the Agents plugin: the assistant people talk to, a native chat
// with the CRM's tools (assistant.ts); the business actions an agent may be
// given and who holds them; the instructions, rules and actions every agent
// discovered from runners gets, which reaches the CRM through its CLI; what
// a page context may name; and where conversations start. The CRM's
// commands are its own API routes (`runCommand` on server/routes); writes
// an agent asks for become plans a person confirms
// (server/providers/crm/plans). The CRM's background AI (follow-ups,
// reviews, captures) asks the plugin's model gateway
// (server/providers/crm/ai-model.ts) with its work agents' settings
// (work-agents.ts).
export default class CrmAgentsProvider extends ServiceProvider<Application> {
  readonly name = 'crm-agents';
  // The settings the conversation rules read, which run where nothing may
  // be read; kept current as they are saved.
  private settings: CrmSettings | null = null;

  public override register(): void {
    // Resolved on each request, after every provider has registered.
    this.app.container.singleton(agentsAccessToken, () =>
      crmAgentsAccess(this.app.container.resolve(crmToken)),
    );
  }

  public override async boot(): Promise<void> {
    if (!this.app.container.has(agentsToken)) return;
    const agents = this.app.container.resolve(agentsToken);
    const service = this.app.container.resolve(crmToken);
    agents.actions.provide(agentActionOptions);
    agents.gate.set(crmActionGate(service));
    configureAssistant(this.app, agents, service, () => this.settings);
    // An agent a runner reports works on the CRM as the assistant does,
    // through the CLI in its shell.
    agents.agents.setDefaults(() => ({
      instructions: `${assistantInstructions('shell')}\n\n${crmPlansSkill(
        'shell',
      )
        .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '')
        .trim()}`,
      actions: [...AGENT_ACTIONS],
    }));
    agents.conversations.rules.provide(
      crmConversationRules(() => this.settings),
    );
    registerContextKinds(
      agents,
      service,
      this.app.publicBasePath.replace(/\/+$/, ''),
    );
    // What became of a plan, or of the AI work a conversation asked for,
    // goes back to that conversation, and its assistant is told.
    const wake = assistantWake(this.app, service, agents);
    this.app.container.resolve(crmPlansToken).onDecided = deliverPlanOutcome(
      agents,
      service,
      wake,
    );
    service.aiFinished = deliverAiWork(agents, service, wake);
    agents.conversations.sources.register({
      key: 'crm',
      title: { key: 'crm.agentConversationSource', ns: 'crm' },
    });
    // A question asked from the global search (search-answers.ts).
    agents.conversations.sources.register({
      key: SEARCH_SOURCE,
      title: { key: 'crm.agentSearchSource', ns: 'crm' },
    });
  }

  public override async start(): Promise<void> {
    if (!this.app.container.has(agentsToken)) return;
    const agents = this.app.container.resolve(agentsToken);
    const service = this.app.container.resolve(crmToken);
    const database = this.app.container.resolve(databaseManagerToken);
    this.settings = await service.settings();
    const saved = service.settingsSaved;
    service.settingsSaved = (settings) => {
      this.settings = settings;
      saved?.(settings);
    };
    // A read-only demo must not provision real model credentials.
    if (!isDemoMode(this.app)) await provisionModelServices(this.app, agents);
    await provisionSkills(
      agents,
      database,
      // Beside the compiled server, as the background runs read them: a
      // host may start the application from another root (NocoBase Studio).
      SKILLS_DIR,
    );
    // The work agents' settings from the plugin's agents of an earlier
    // release, once.
    await adoptLegacyWorkAgents(database).catch((error: unknown) => {
      this.app.container
        .resolve(loggingToken)
        .getLogger('crm-agents')
        .warn({ error }, 'work agent settings not adopted');
    });
    // The conversations with the earlier assistant, carried over once.
    await adoptLegacyConversations(
      agents,
      service,
      this.app.container.resolve(loggingToken).getLogger('crm-agents'),
    ).catch((error: unknown) => {
      this.app.container
        .resolve(loggingToken)
        .getLogger('crm-agents')
        .warn({ error }, 'conversations not carried over');
    });
    // The demo's conversations imported where no model was set up, which
    // the plugin will not read while they name none (placeholder-model.ts).
    await namePlaceholderModel(this.app, service.database.query()).catch(
      (error: unknown) => {
        this.app.container
          .resolve(loggingToken)
          .getLogger('crm-agents')
          .warn({ error }, 'conversations without a model not named one');
      },
    );
    // The discovered agents made before these defaults get them too.
    await agents.agents.applyDefaults().catch(() => 0);
  }
}
