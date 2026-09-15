import { ClientApplication } from '@nocobase/app-client';
import type { ClientServiceProviderConstructor } from '@nocobase/app-client/plugins';
import { ServiceProvider } from '@nocobase/service-provider';
import { createElement } from 'react';
import { queryClient } from './components/crm/query-client.js';
import {
  Building2,
  ContactRound,
  Handshake,
  CalendarDays,
  ListChecks,
  Radar,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export class DefaultClientServiceProvider extends ServiceProvider<ClientApplication> {
  public readonly name: string = 'crm/client';
  private previousDocumentTitle: string | undefined;

  public override boot(): Promise<void> {
    // The sidebar follows registration order: the action center sits right
    // under the workspace, before the two object sections.
    this.app.refine.addResources([
      {
        name: 'crm-actions',
        list: '/crm/actions',
        meta: {
          label: 'crm.actions',
          i18nNs: 'crm',
          icon: createElement(Sparkles, { className: 'size-4' }),
        },
      },
    ]);
    // Two headed sections: what the team acts on, and who it acts with.
    // A section is a resource without a list path; the sidebar renders it
    // as a heading over its children.
    this.app.refine.addResources([
      {
        name: 'crm-action',
        meta: { label: 'crm.navigation.action', i18nNs: 'crm' },
      },
      {
        name: 'crm-relations',
        meta: { label: 'crm.navigation.relations', i18nNs: 'crm' },
      },
    ]);
    const objects: [string, LucideIcon, string][] = [
      ['leads', Radar, 'crm-action'],
      ['opportunities', Handshake, 'crm-action'],
      ['activities', CalendarDays, 'crm-action'],
      ['approvals', ListChecks, 'crm-action'],
      ['accounts', Building2, 'crm-relations'],
      ['contacts', ContactRound, 'crm-relations'],
    ];
    this.app.refine.addResources(
      objects.map(([entity, icon, parent]) => ({
        name: `crm-${entity}`,
        list: `/crm/${entity}`,
        // Registered so the sidebar keeps the object highlighted on its
        // detail pages: Refine resolves the selected item from the route.
        show: `/crm/${entity}/:id`,
        meta: {
          label: `crm.entities.${entity}`,
          i18nNs: 'crm',
          parent,
          icon: createElement(icon, { className: 'size-4' }),
        },
      })),
    );
    const configuredTitle = this.app.config.get<unknown>('app.title');
    const title =
      typeof configuredTitle === 'string' && configuredTitle.trim()
        ? configuredTitle.trim()
        : 'NocoCRM';
    this.app.refine.setOptions({
      title: { text: title },
      // Refine's pages and the CRM's own providers share one query cache; see
      // components/crm/query-client.ts.
      reactQuery: { clientConfig: queryClient },
    });
    this.previousDocumentTitle = document.title;
    document.title = title;
    return Promise.resolve();
  }

  public override shutdown(): Promise<void> {
    if (this.previousDocumentTitle !== undefined) {
      document.title = this.previousDocumentTitle;
    }
    return Promise.resolve();
  }
}

const serviceProviders: readonly ClientServiceProviderConstructor[] = [
  DefaultClientServiceProvider,
];

export default serviceProviders;
