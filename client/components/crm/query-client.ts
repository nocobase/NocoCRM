import { QueryClient } from '@tanstack/react-query';

// One cache for the whole client. Refine builds its own QueryClient for the
// pages it renders unless handed one, and the providers that wrap Refine (the
// assistant panel among them) would then read and invalidate a different
// cache from the page beside them — a card confirmed in the panel left the
// action centre unchanged. The same instance goes to Refine through
// `refine.setOptions({ reactQuery: { clientConfig } })` in service-provider.ts
// and to everything else through CrmQueryProvider.
export const queryClient = new QueryClient();
