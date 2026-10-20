-- Phase G: evolve the release-evidence primitive created by 20260825060000.
-- Do not recreate release_evidence_manifests or deployment_verification_runs:
-- the earlier migration already owns those tables. This migration only
-- reconciles the alternate column names used by the earlier draft.

ALTER TABLE release_evidence_manifests
  ADD COLUMN IF NOT EXISTS migration_fingerprint text,
  ADD COLUMN IF NOT EXISTS dependency_fingerprint text,
  ADD COLUMN IF NOT EXISTS certification_id uuid REFERENCES trust_certifications(id) ON DELETE SET NULL;

UPDATE release_evidence_manifests
SET migration_fingerprint = COALESCE(migration_fingerprint, migrations_fingerprint),
    dependency_fingerprint = COALESCE(dependency_fingerprint, dependency_lock_fingerprint),
    certification_id = COALESCE(certification_id, trust_certificate_id)
WHERE migration_fingerprint IS NULL
   OR dependency_fingerprint IS NULL
   OR certification_id IS NULL;

-- The later hardening migration owns deployment_verification_runs and the
-- final release_is_verified implementation. Keeping this migration additive
-- avoids duplicate table definitions and preserves already-applied data.
