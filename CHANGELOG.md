# Changelog

## Unreleased

- Upgrade Demo Mode to 0.2.0-beta.9 with the packages it requires, among them
  App Server 5.0.0-beta.1, Agents 2.0.0-beta.5, Users 2.0.0-beta.15 and
  Caching 1.0.0-beta.4: on a demo site, a visitor opening a link to any
  signed-in page is now signed in and lands on that page, not only one opening
  the home page. App Server 5 drops the deprecated `@nocobase/app-server/mailer`
  entry, which the CRM did not use; its mail settings are unchanged.
- Upgrade the application template to 1.0.0-beta.86 (NocoBase app-server 4):
  every list says when it is loading, finds nothing, is refused or fails to
  load, with Retry or Clear filters in its header, so a failed read no
  longer looks like an empty list; the password reset mail has its own
  sender (`auth.email`, the `AUTH_EMAIL_*` variables).
- Upgrade the application template to 1.0.0-beta.84: user and role settings
  send an operation key, so a repeated save writes once, and show submission
  errors beside their fields.
- Wait for demo mailboxes to disappear before reusing their addresses, handle
  in-flight removal and disabled providers, and report cleanup failures or
  pending account IDs on timeout.
- Process demo conversation/file cleanup and generated-record tracking in
  batches while preserving the complete dataset and user sessions.
- Upgrade Demo Mode to 0.2.0-beta.6 with the packages it requires, among them
  Agents 2.0.0-beta.0, Jobs 1.0.0-beta.5 and Queue 1.0.0-beta.10: a failed daily
  demo reset is retried and an interrupted one recovered. The sample-data banner
  and the demo overview's counts now come from the plugin's own state.
- Redis Jobs and Queue need the commercial `@nocobase/app-plugin-jobs-redis` and
  `@nocobase/app-plugin-queue-redis` plugins, and each Redis configuration must
  declare `adapter: redis`; the application no longer supplies Redis defaults. An
  active `agents.vectors` setting now stops the application from starting.
