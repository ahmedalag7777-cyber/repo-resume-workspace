-- Expose Evidence Passport rows to authenticated clients only.
-- RLS remains the tenant boundary; no authenticated mutation privilege is granted.
GRANT SELECT ON TABLE public.report_evidence_passports TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.report_evidence_passports FROM authenticated;
REVOKE ALL ON TABLE public.report_evidence_passports FROM anon;
