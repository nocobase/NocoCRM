import {
  defineAppConfig,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import type { AuthConfig } from '@nocobase/app-plugin-authentication/server';
import { username } from 'better-auth/plugins';

const auth: AppConfigFactory<AuthConfig> = defineAppConfig((_runtime) => ({
  plugins: [username({ displayUsername: false })],
  emailAndPassword: { enabled: true, autoSignIn: false },
  session: { storeSessionInDatabase: true },
  // Application change: the sign-in client sends the page's own origin as its
  // callback, and only the announced public origin is trusted by default. In
  // development that origin is 127.0.0.1 while people also open localhost,
  // so a request addressed to a loopback host trusts that host. Requests that
  // reach a deployment carry its real host and gain nothing here.
  trustedOrigins: (request) => {
    if (!request) return [];
    const { host, protocol } = new URL(request.url);
    return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
      ? [`${protocol}//${host}`]
      : [];
  },
}));

export default auth;
