# Report-Advisor — Product Experience Principles

**Status:** Authoritative UX/product experience directive

## Product Promise

Report-Advisor should feel simple to the user while hiding substantial technical depth behind the experience.

The desired feeling is:

**"The system understands my business, shows me why, and tells my team what to do next."**

## First-Use Standard

Within the first minute a user should understand:

- what is happening in the business
- what needs attention
- what changed
- what action is recommended
- where the evidence is

## Information Architecture

Prefer role-aware surfaces over a flat list of technical modules.

Core top-level experiences may include:

- Command Center
- Reports
- Evidence
- Decisions
- Actions
- Documents
- Business Areas
- Data Quality
- System Control

Users should reach detailed modules through contextual navigation rather than memorizing the whole product structure.

## Role-Aware Experience

The same underlying truth should be presented differently to:

- Owner/Executive
- Manager
- Accountant
- Sales
- Procurement
- Warehouse
- Finance
- Auditor
- Administrator

Permissions must govern what is visible and actionable.

## Contextual Actions

Whenever the system detects a meaningful insight, surface the next useful action directly:

`Insight → Evidence → Recommendation → Action`

Avoid forcing the user to navigate to a separate module to act.

## Progressive Disclosure

Show the executive answer first, then allow deeper inspection:

**Summary → Explanation → Evidence → Calculation → Raw Source**

This preserves simplicity without sacrificing auditability.

## Visual Signature

The visual language should be memorable but restrained:

- strong information hierarchy
- distinctive yet professional layout
- high-quality tables
- clear priority and status treatment
- disciplined spacing
- elegant typography
- meaningful micro-interactions
- consistent iconography
- excellent RTL/LTR behavior

Avoid decoration that does not communicate meaning.

## Trust Signature

Trust should be visible in the UX through:

- evidence links
- data-as-of
- freshness
- trust dimensions
- certification state
- explicit blocked decisions
- explainable recommendations

## Executive Home

The landing experience should prioritize:

- Critical Decisions
- Top Risks
- Top Opportunities
- Pending Approvals
- Overdue Actions
- Recent Changes
- Data Quality Warnings
- Business Health

## Personal Workbench

Each user should have a focused work queue:

- My Tasks
- Due Today
- Overdue
- Waiting for Me
- Waiting for Approval
- Blocked
- Completed

## Evidence Interaction

Evidence should open inline or in a contextual inspector without destroying the user's current report/decision context.

## Decision Interaction

A decision view should expose:

- recommendation
- alternatives
- evidence
- trust
- expected impact
- approval requirement
- action plan
- outcome history

## Notification Philosophy

Notifications should feel like helpful business assistants, not alarms.

Prefer:

`What happened + Why it matters + Recommended action`

Add evidence, owner, and deadline when useful.

## Report Philosophy

Reports are decision documents. The visual hierarchy should prioritize:

1. What matters.
2. Why it matters.
3. What should happen next.
4. Who owns it.
5. What proves it.

## Error Philosophy

Errors should preserve dignity and context.

Explain:

- what happened
- what was protected
- what the user can do next
- whether business truth was affected

## Performance Philosophy

Users should perceive the system as fast even when processing is heavy.

Use:

- progressive loading
- cached summaries
- stable skeletons
- clear processing states
- background work indicators
- resumable operations

## Surprise-and-Delight Standard

Use subtle, meaningful details:

- automatically generated executive summaries
- "What changed" explanations
- report-ready action plans
- evidence previews
- smart notification grouping
- one-click transition from recommendation to task
- polished printable reports

Do not rely on gimmicks.

## Acceptance

A new screen is not successful merely because it looks polished.

Accept it when:

**usable + clear + fast + permission-aware + evidence-aware + actionable + consistent + testable**.
