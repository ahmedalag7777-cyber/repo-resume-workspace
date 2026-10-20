# Phase-F / Auth / Supabase Lifecycle Checkpoint
DATE = 2026-10-03
CURRENT_MAIN_HEAD = 7e9cec1b8ee318520702c8b29ae1ec14aa2d5ff6
CURRENT_PR = #762
CURRENT_PR_HEAD = bc63be68f04e11ead63f0a865695e29529a5e085
BRANCH = captain/phase-f-dynamic-pr-preview-20261003
SESSION_HANDOFF = NOT READY
## Actual execution
- Diagnosed Netlify 403 as Free-plan credit exhaustion, not role/SSO/site ownership.
- Proved exact-head Netlify Preview for the Phase-F PR chain.
- Merged tenant-context recovery product delta through PR #761.
- Rebound Phase-F from stale deploy-preview-754 to the current PR Preview.
- Added exact-head runtime provenance gate.
- Added bounded Auth retries and 15s network timeout.
- Removed logical restore statement-timeout truncation.
- Switched source snapshot/count reads to Supabase Transaction Pooler :6543.
## Phase-F evidence
- #4006 first failure: logical backup/restore statement timeout.
- #4007 after timeout fix: source snapshot ECHECKOUTTIMEOUT on Session Pooler.
- #4008 at bc63be68: auth canary failed before probes because Supabase /token returned repeated 500/504 context deadline exceeded.
- Supabase logs independently confirm /token request_timeout/context canceled.
- Direct Supabase execute_sql independently returns connection timeout.
## Current blocker
Supabase project fnqbvfuwbdpwvhcgzksl is currently PAUSING after the reversible project-level recovery action was initiated.
restore_project is rejected while the state is PAUSING.
The Edge session on PC01 is not authenticated to Supabase, so dashboard resume cannot be automated without user credentials.
No new project was created and no data/schema/RLS change was made.
## Product/runtime proof
- typecheck/build/intelligence/evidence/operational-resilience checks PASS on recorded commits.
- Preview health exact-head provenance PASS before lifecycle interruption.
- Browser unauthenticated login surface PASS.
- Authenticated business proof NOT_PROVEN.
- Production Netlify remains blocked by credit exhaustion.
- Real fixture corpus remains unproven.
## Required next exact action
RESTORE the existing Supabase staging project through Owner Supabase Dashboard or official support until status becomes ACTIVE_HEALTHY.
Then verify direct PostgreSQL connectivity and fresh /auth/v1/token success.
Then rerun Phase-F on exact bc63be68f04e11ead63f0a865695e29529a5e085.
Fix only the first terminal failure and repeat.
