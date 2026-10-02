import { ClientApplication, toasterToken } from '@nocobase/app-client';
import type { ClientServiceProviderConstructor } from '@nocobase/app-client/plugins';
import { ServiceProvider } from '@nocobase/service-provider';

import { queryClient } from './components/crm/query-client.js';
import { createToaster } from './lib/toaster.js';

// Navigation is declared on the routes (client/routes.ts); this provider only
// sets what the application shares with Refine: its title and query cache.
export class DefaultClientServiceProvider extends ServiceProvider<ClientApplication> {
  public readonly name: string = 'crm/client';
  private previousDocumentTitle: string | undefined;

  public override register(): void {
    // What plugins and pages report through useToaster() reaches the Toaster in client/react-providers.ts from here.
    this.app.container.instance(toasterToken, createToaster());
  }

  public override boot(): Promise<void> {
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
