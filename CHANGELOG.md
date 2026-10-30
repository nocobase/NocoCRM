# Changelog

## Unreleased

- Upgrade the application template to 1.0.0-beta.84: user and role settings
  send an operation key, so a repeated save writes once, and show submission
  errors beside their fields.
- Wait for demo mailboxes to disappear before reusing their addresses, handle
  in-flight removal and disabled providers, and report cleanup failures or
  pending account IDs on timeout.
- Process demo conversation/file cleanup and generated-record tracking in
  batches while preserving the complete dataset and user sessions.
