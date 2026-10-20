# Production Separation Forensics — 2026-09-02

## Classification

- Evidence class: READ-ONLY FORENSICS
- Mutation performed: NO
- Production DB mutation: NO
- Vercel configuration mutation: NO
- Auth/RLS mutation: NO
- Certification effect: production separation gate remains NOT CERTIFIED; current live artifact proves an environment-binding defect.

## Exact repository/deployment evidence

- Repository `main` before this documentation record: `9e9e8239784727516d1cbdc184a0f18479cab488`.
- Code/Test SHA remains `ec6eb4cce7803af8e94697adfa6d9308f69a9ee2`.
- Production deployment: `dpl_2eucnVguBRL5c2dGTakd5zqEVHB1`.
- Current aliased production deployment: `dpl_7Szq3A9xisC9Epbn9TeuEjXoUSHC`.
- Current aliased deployment source SHA: `9e9e8239784727516d1cbdc184a0f18479cab488`.
- Both deployments belong to Vercel project `report-advisor`.

## Live artifact finding

The live production bundle `/assets/index-B49eOQQy.js` contains the executable Supabase client configuration:

`https://fnqbvfuwbdpwvhcgzksl.supabase.co`

This is the Supabase project `Report-Advisor-P0-2-Staging`.

The same live bundle contains the publishable client key and initializes the browser client against that staging URL. The application therefore does not merely reference staging in documentation: the production-served JavaScript executable points its authenticated application traffic at the staging Supabase project.

## Staging project state

- Supabase project: `fnqbvfuwbdpwvhcgzksl`
- Name: `Report-Advisor-P0-2-Staging`
- Status: `ACTIVE_HEALTHY`
- Database host: `db.fnqbvfuwbdpwvhcgzksl.supabase.co`
- Migration history: 110 recorded migrations; latest `20260901005857` (`report_execution_worker_lifecycle`).
- Public tables: 78.
- Public functions: 60.
- No backup verification rows found.
- No production rollback drill rows found.
- No autonomy rollback drill rows found.
- No tenant isolation canary rows found.

## Migration-failure forensic result

Supabase branch-action logs repeatedly report:

`Remote migration versions not found in local migrations directory.`

The affected branch metadata previously reported `MIGRATIONS_FAILED`, while the parent Staging project itself reports `ACTIVE_HEALTHY`.

Read-only SQL confirms the Staging database has a populated migration history (110 migrations) and a populated application schema. The branch-action error is therefore an environment synchronization/migration-history reconciliation failure signal, not proof by itself that the parent Staging database is unusable.

However, target writability and recovery suitability remain UNPROVEN because no safe write/restore test was authorized or executed.

## Recovery-environment finding

The other visible Supabase project `oirazrmpvwwmklqfrdur` is `INACTIVE`. A read-only connection attempt timed out. It is not a verified recovery target and must not be used as one without separate operational validation.

## Certification impact

`Production separation = FAILED / NOT CERTIFIED` for the currently served production artifact because the artifact's runtime Supabase endpoint is the Staging project.

This does not certify Backup, Restore, RPO, RTO, Rollback, Forward Recovery, DR, or Tenant A/B runtime. Those remain UNPROVEN/BLOCKED.

## Required boundary

Correcting the production environment binding requires a production-impacting configuration/code/deployment change and therefore crosses the Owner-Level Safety Boundary. No such mutation was performed during this forensic pass.
