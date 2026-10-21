import { QueryClient } from '@tanstack/react-query';

// One cache for the whole client. @nocobase/app-client builds its own
// QueryClient around the routes, innermost, and the React providers outside
// them (the assistant panel among them) would then read and invalidate a
// different cache from the page beside them — a card confirmed in the panel
// left the action centre unchanged. CrmQueryProvider hands this one instance
// both to the providers (client/react-providers.ts) and, inside the
// application's own query provider, to the routes (client/app.ts).
export const queryClient = new QueryClient();
