import type { AppConfigFactory } from '@nocobase/app-server/config';
import { apiKey } from '@nocobase/app-plugin-api-keys/server';
import {
  defineAuthConfig,
  type AuthConfig,
} from '@nocobase/app-plugin-authentication/server';
import { bearer, deviceAuthorization, username } from 'better-auth/plugins';

/**
 * The command-line clients that may sign in through the browser (`deviceAuthorization()`): `nocobase-cli`, the id
 * `@nocobase/app-cli-client` sends unless a branded CLI names its own. Add the id of any other CLI that should sign in.
 */
const CLI_CLIENT_IDS: readonly string[] = ['nocobase-cli'];

const auth: AppConfigFactory<AuthConfig> = defineAuthConfig({
  defaults: {
    plugins: [
      username({ displayUsername: false }),
      apiKey(),
      // A CLI signs in through the browser (RFC 8628): it shows a code the person approves on `/device`, below the
      // application's base path, and receives a session token it sends as `Authorization: Bearer` (`bearer()`).
      deviceAuthorization({
        verificationUri: '/device',
        expiresIn: '10m',
        interval: '5s',
        validateClient: (clientId) => CLI_CLIENT_IDS.includes(clientId),
      }),
      bearer(),
    ],
    // Application change: accounts are created by an administrator on the
    // Users page; nobody registers themselves, so the sign-up endpoint is off
    // (the /register page and the login page's link to it are removed too).
    emailAndPassword: { enabled: true, autoSignIn: false, disableSignUp: true },
    // Application change: a forgotten password is reset by mail, which the
    // plugin sends itself using the `system-email` channel's settings
    // (notification.channels in config.yml, its password from SMTP_PASSWORD).
    // The plugin supports this but logs it as deprecated in favour of
    // auth.email. Until that channel is configured the plugin reports reset
    // unavailable, and the login page offers no "Forgot password" link.
    passwordReset: { enabled: true },
    session: { storeSessionInDatabase: true },
    account: { encryptOAuthTokens: true },
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
