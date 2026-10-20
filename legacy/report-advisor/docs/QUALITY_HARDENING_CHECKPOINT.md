# Quality hardening checkpoint

This checkpoint intentionally records that the canonical tenant RLS contract is evaluated from the migration filename plus its contents. Historical migrations are not treated as production policy definitions.

The Quality workflow must run against the latest `main` commit before any release is considered verified.
