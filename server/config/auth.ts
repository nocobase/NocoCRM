import {
  defineAppConfig,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import { apiKey } from '@nocobase/app-plugin-api-keys/server';
import type { AuthConfig } from '@nocobase/app-plugin-authentication/server';
import { username } from 'better-auth/plugins';

const auth: AppConfigFactory<AuthConfig> = defineAppConfig((_runtime) => ({
  plugins: [username({ displayUsername: false }), apiKey()],
  emailAndPassword: { enabled: true, autoSignIn: false },
  session: { storeSessionInDatabase: true },
  // Application change: the plugin's account table requires an issuer, but
  // the plugin never declares that column to better-auth, whose adapter only
  // writes declared fields. Every account insert (Users page, demo import,
  // registration) then failed on NOT NULL. Declaring the column with the
  // plugin's own value for password accounts makes the inserts complete.
  // Remove once @nocobase/app-plugin-authentication declares it itself.
  account: {
    additionalFields: {
      issuer: {
        type: 'string',
        required: false,
        input: false,
        defaultValue: 'local:credential',
      },
    },
  },
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
