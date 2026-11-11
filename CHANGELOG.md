# Changelog

## Unreleased

- Upgrade Demo Mode to 0.2.0-beta.11 with the packages it requires, among them
  App Server 5.0.0-beta.4, Agents 2.0.0-beta.11, Users 2.0.0-beta.19,
  Notification 2.0.0-beta.8 and File 1.0.0-beta.31: on a demo site, a
  visitor's language choice stays in their own browser session instead of
  changing the shared demo account's, and Demo Mode's own notices and
  settings page read in Russian and Korean too. The assistant's ask boxes take
  a file up to the size the default file disk allows
  (`drive.disks.<name>.maxFileSizeMb`, 20 MiB unless configured), the limit
  the server applies. Notification templates registered
  with translatable text show it in the reader's language. A named password
  reset sender is selected with `auth.passwordReset.mailer`;
  `auth.email.mailer` is refused at startup, while the inline `auth.email` and
  `AUTH_EMAIL_*` the CRM documents keep working.
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
