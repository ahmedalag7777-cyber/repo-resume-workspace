# Vercel Deployment Retention — Report Advisor

## Objective

Keep the Vercel Hobby project lean by expiring disposable Preview/Canceled/Errored deployments while preserving Production, release candidates, and rollback evidence.

## Current observed state

- Team: `injaz2` / `Injaz`
- Plan: `Hobby`
- Project: `report-advisor`
- Project ID: `prj_jcqgz6UKGd6tPgHZlttgFXaXvyvo`
- The project currently has a high churn of Preview deployments from hardening branches and PR #294.
- The Vercel API connection available to automation can list deployments, but it does not expose a deployment-delete mutation in this workspace.

## Safe retention policy

Recommended operational targets for disposable deployments:

- Preview: **14 days**
- Canceled: **7 days**
- Errored: **7 days**
- Production: **30 days**, subject to the plan's supported minimums
- Keep rollback/release-critical deployments explicitly when they are needed as evidence.

These are operational targets, not a claim that the current Vercel project has already been configured with them.

## Apply in Vercel

Open:

`Vercel Dashboard → Team Settings → Projects → report-advisor → Settings → Build and Deployment → Deployment Retention Policy`

If the UI exposes the policy controls on the current plan, configure the disposable classes conservatively and keep Production retention separate.

## Immediate cleanup

Before deleting any deployment, verify that it is:

1. not Production;
2. not attached to a production/custom-domain alias;
3. not the protected release candidate;
4. not required for rollback or certification evidence;
5. not the latest deployment needed for active verification.

The repository must never treat deletion of an old Preview deployment as proof that a release is certified.

## CLI inspection

Vercel documents policy-aware listing and explicit removal. Use inspection first:

```bash
vercel list report-advisor --policy preview=14d -p canceled=7d -p errored=7d
```

Then remove only individually verified disposable deployments:

```bash
vercel remove <deployment-url> --yes
```

Do not run a project-wide removal command for `report-advisor`.

## Evidence requirement

After cleanup, record:

- exact project;
- exact deployment IDs/URLs removed;
- timestamp;
- policy values configured;
- confirmation that Production/RC/alias-critical deployments were preserved.

No production alias mutation is part of this cleanup procedure.
