import foundation, {
  foundationServiceToken,
} from '@nocobase/app-plugin-foundation/server';
import { databaseManagerToken } from '@nocobase/db';

// Foundation >=0.1.0-beta.13 scans the application's TypeScript sources on the
// main thread whenever an application starts without a snapshot for the
// current kernel, which is every test application (a new database each time).
// In a source checkout that blocks the event loop for minutes and times out
// hooks. Tests do not use the automatic scan, so it is switched off here;
// deployments read the build-time manifest and are unaffected. Set
// CRM_TEST_FOUNDATION_SCAN=1 to keep it for a test that needs it. Remove this
// file once Foundation no longer blocks on start.
if (process.env.CRM_TEST_FOUNDATION_SCAN !== '1') {
  for (const Provider of foundation.serviceProviders ?? []) {
    const start = Provider.prototype.start;
    if (
      typeof start !== 'function' ||
      (start as { crmTestScanOff?: boolean }).crmTestScanOff
    )
      continue;
    const withoutScan = async function (this: {
      app: {
        container: {
          has(token: unknown): boolean;
          resolve(token: unknown): { start?: unknown };
        };
      };
    }) {
      if (this.app.container.has(databaseManagerToken)) {
        this.app.container.resolve(foundationServiceToken).start =
          async () => {};
      }
      return start.call(this);
    };
    Object.assign(withoutScan, { crmTestScanOff: true });
    Provider.prototype.start = withoutScan;
  }
}
