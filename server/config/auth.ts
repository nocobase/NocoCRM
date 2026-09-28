import type { AppConfigFactory } from '@nocobase/app-server/config';
import { apiKey } from '@nocobase/app-plugin-api-keys/server';
import {
  defineAuthConfig,
  type AuthConfig,
} from '@nocobase/app-plugin-authentication/server';
import { username } from 'better-auth/plugins';

const auth: AppConfigFactory<AuthConfig> = defineAuthConfig({
  defaults: {
    plugins: [username({ displayUsername: false }), apiKey()],
    // Application change: accounts are created by an administrator on the
    // Users page; nobody registers themselves, so the sign-up endpoint is off
    // (the /register page and the login page's link to it are removed too).
    emailAndPassword: { enabled: true, autoSignIn: false, disableSignUp: true },
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
  },
});

export default auth;
