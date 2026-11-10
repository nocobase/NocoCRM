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
    // The template signs new accounts in since 1.0.0-beta.92 (`autoSignIn:
    // true`); with sign-up off that has nothing to act on, so it stays false.
    emailAndPassword: { enabled: true, autoSignIn: false, disableSignUp: true },
    // Application change: a forgotten password is reset by mail, which the
    // plugin sends from its own sender, `auth.email` (config.yml, or the
    // AUTH_EMAIL_* variables, its password AUTH_EMAIL_PASSWORD). Until a
    // sender is configured the plugin reports reset unavailable, and the login
    // page offers no "Forgot password" link. With no auth.email the plugin
    // still falls back to the `system-email` notification channel, logging it
    // as deprecated; that channel stays configured anyway, since the Users
    // plugin sends invitations through it (SMTP_PASSWORD). A named sender
    // from `mailers` (server/config/mailers.ts, template 1.0.0-beta.92) can
    // be selected instead with `passwordReset.mailer` in config.yml.
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
