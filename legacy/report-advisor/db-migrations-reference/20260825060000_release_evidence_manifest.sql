-- Phase G: reproducible release evidence and continuous verification.
CREATE TABLE IF NOT EXISTS release_evidence_manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  release_key text NOT NULL,
  source_sha text NOT NULL,
  migrations_fingerprint text NOT NULL,
  dependency_lock_fingerprint text NOT NULL,
  artifact_fingerprint text NOT NULL,
  trust_certificate_id uuid REFERENCES trust_certifications(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('candidate','canary','verified','blocked','rolled_back')),
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  rollback_at timestamptz,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id, release_key)
);
CREATE INDEX IF NOT EXISTS idx_release_evidence_latest ON release_evidence_manifests(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_release_evidence_status ON release_evidence_manifests(company_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS deployment_verification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_manifest_id uuid NOT NULL REFERENCES release_evidence_manifests(id) ON DELETE CASCADE,
  environment text NOT NULL CHECK (environment IN ('development','staging','production')),
  phase text NOT NULL CHECK (phase IN ('preflight','canary','stabilization','verified','rollback')),
  status text NOT NULL CHECK (status IN ('passed','failed','blocked','running')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  health_window_seconds integer,
  critical_failures integer NOT NULL DEFAULT 0,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_deployment_verification_release ON deployment_verification_runs(release_manifest_id, started_at DESC);

ALTER TABLE release_evidence_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_verification_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE release_evidence_manifests, deployment_verification_runs FROM anon;
DROP POLICY IF EXISTS authenticated_release_evidence_tenant ON release_evidence_manifests;
CREATE POLICY authenticated_release_evidence_tenant ON release_evidence_manifests FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
DROP POLICY IF EXISTS authenticated_deployment_verification_tenant ON deployment_verification_runs;
CREATE POLICY authenticated_deployment_verification_tenant ON deployment_verification_runs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM release_evidence_manifests r
    WHERE r.id = deployment_verification_runs.release_manifest_id
      AND r.company_id = public.current_company_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM release_evidence_manifests r
    WHERE r.id = deployment_verification_runs.release_manifest_id
      AND r.company_id = public.current_company_id()
  ));

CREATE OR REPLACE FUNCTION public.release_is_verified(p_release_key text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM release_evidence_manifests r
    LEFT JOIN trust_certifications t ON t.id = r.trust_certificate_id
    WHERE r.company_id = public.current_company_id()
      AND r.release_key = p_release_key
      AND r.status = 'verified'
      AND r.verified_at IS NOT NULL
      AND (t.id IS NULL OR (t.status = 'valid' AND t.blocker_count = 0 AND t.expires_at > now()))
      AND NOT EXISTS (
        SELECT 1 FROM deployment_verification_runs d
        WHERE d.release_manifest_id = r.id
          AND d.status = 'failed'
          AND d.phase IN ('preflight','canary','stabilization')
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.release_is_verified(text) TO authenticated;
