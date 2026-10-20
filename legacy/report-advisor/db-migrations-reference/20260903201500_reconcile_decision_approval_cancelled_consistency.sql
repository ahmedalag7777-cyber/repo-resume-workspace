-- CANCELLED is part of the canonical approval status domain.
-- Treat it as a terminal approval state with the same actor/time provenance
-- required by APPROVED/REJECTED; keep PENDING as the only undecided state.
alter table public.decision_approvals
drop constraint if exists approval_status_consistency;

alter table public.decision_approvals
add constraint approval_status_consistency check (
  (
    status = 'PENDING'
    and decided_at is null
    and decided_by is null
  )
  or (
    status = any (array['APPROVED'::text, 'REJECTED'::text, 'CANCELLED'::text])
    and decided_at is not null
    and decided_by is not null
  )
);
