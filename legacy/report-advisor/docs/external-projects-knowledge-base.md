# External Projects Knowledge Base — Report-Advisor

## Purpose
This is the persistent engineering knowledge base for external projects reviewed for Report-Advisor. New projects supplied by the product owner must be evaluated for transferable capabilities, architecture patterns, UX ideas, algorithms, security patterns, testing approaches and operational practices. Useful ideas are added to the master specification and implementation backlog; irrelevant or incompatible ideas are explicitly rejected. This document must be revisited before major architecture decisions.

## Governing rule
We do **not** blindly copy repositories. We extract useful *capabilities and patterns*, then implement them natively in Report-Advisor's architecture, data model, Arabic/RTL UX, PostgreSQL/Supabase stack and deterministic business-data engine. Source code, assets and dependencies are not imported unless licensing and technical compatibility have been reviewed.

## Project 001 — LobeHub / formerly LobeChat
Source: https://github.com/lobehub/lobehub

### Current observations
The current project positions agents as a unit of work and includes agent teams, scheduling, projects, workspaces, shared context, personal/white-box memory, multi-model/multi-modality access, skills/MCP plugins, and self-hosting. It also has an extensible plugin/function-calling model. These capabilities are described in the repository README. The repository is currently under the LobeHub Community License; its license is NOT the same as the standard Apache 2.0 license and derivative commercial distribution requires a commercial license. Therefore Report-Advisor should borrow ideas and independently implement them rather than copying source code. 

### Capabilities to adopt in Report-Advisor
1. **Agent-as-a-work-unit architecture**
   - Introduce bounded specialist agents/services such as: Data Analyst, Inventory Analyst, Demand Forecaster, Cash & Liquidity Analyst, Customer Analyst, Supplier Analyst, Report Writer, Data Quality Analyst, Risk Analyst and Executive Decision Agent.
   - Agents must consume deterministic data contracts and produce auditable outputs.

2. **Agent Groups / multi-agent collaboration**
   - For complex questions, orchestrate several specialists in parallel, then use an Executive Synthesizer to reconcile results.
   - Example: "Why is liquidity deteriorating?" can invoke Sales, Receivables, Payables, Inventory and Cash agents, followed by a deterministic conflict/consistency check and executive summary.
   - Parallel work must have budgets, timeouts and cancellation.

3. **Agent Builder / reusable analyst profiles**
   - Allow admins to define a specialist profile: role, scope, permitted data, tools, instructions, output schema, thresholds and escalation rules.
   - Store versioned configurations so historical reports remain reproducible.

4. **Unified intelligence / model routing**
   - Abstract AI providers behind a provider/model registry.
   - Support cloud and local models where available (including Ollama-compatible local inference).
   - Route simple tasks to small/cheap models and complex synthesis to stronger models, while keeping deterministic calculations outside the LLM.
   - Provider failures must fall back safely without changing factual results.

5. **Skills and tool/MCP architecture**
   - Implement a safe internal Tool Registry with typed input/output schemas.
   - Tools should include report queries, inventory velocity, reorder engine, cash forecast, customer lookup, supplier lookup, data-quality checks, file analysis and export.
   - MCP/plugin integrations should be isolated, permissioned, logged and revocable.
   - Never allow an LLM to directly execute arbitrary SQL or unrestricted mutation.

6. **White-box memory**
   - Add structured, editable memory for user preferences, report preferences, business definitions, approved assumptions and recurring decision rules.
   - Separate memory into user, organization, workspace, project and session scopes.
   - Every memory item needs provenance, creation/update time, confidence and ability to edit/delete.
   - Never silently turn a model inference into a business fact.

7. **Projects / workspaces / context boundaries**
   - Organize analysis by company, branch, project and reporting workspace.
   - Maintain explicit context boundaries so one company/branch cannot leak into another.
   - Reports should remember filters, period, entities and analytical context without duplicating source data.

8. **Scheduled agent work**
   - Add a scheduler for recurring analyses: daily inventory liquidity, weekly demand forecast, overdue receivables, supplier obligations, monthly executive report, anomaly checks.
   - Jobs must be idempotent, observable, retryable and auditable.
   - Failed jobs must surface actionable diagnostics rather than silently disappear.

9. **Human-in-the-loop**
   - High-impact actions such as approving a purchase recommendation, payment plan, bulk correction or external notification require explicit approval.
   - Present evidence, assumptions, expected impact and alternatives before approval.

10. **Shared pages / report drafting workspace**
   - Provide a workspace where generated report sections can be reviewed, edited, regenerated and assembled into a final executive report.
   - Preserve source metric references when prose is edited.

11. **Multi-modal intelligence**
   - Use text, tables, PDFs, spreadsheets, images/OCR and charts as inputs to the same analysis pipeline.
   - Parse files deterministically first; use AI only for semantic interpretation/classification where required.

12. **Conversation as a control surface**
   - Add a business copilot that can answer questions over the same governed metric/tool layer used by dashboards.
   - Every numeric answer must be traceable to a metric/query result.
   - The assistant should be able to move from answer -> source -> report -> recommended action.

13. **Operational UX**
   - Adopt clear loading/progress states, task history, job status, retries, cancellation and notifications for long-running analyses.
   - Do not make long AI/file tasks block the main interface.

## Architecture translation for Report-Advisor

### Deterministic core
Database/server functions -> canonical metrics -> statistical engine -> forecasting -> risk/reorder/liquidity engines -> evidence objects.

### Intelligence layer
Tool-calling agents -> retrieve evidence -> reason/explain -> produce structured recommendation -> validation gate.

### Validation gate
Check schema, source references, numerical consistency, permissions, confidence/data sufficiency and prohibited claims. Reject or mark uncertain outputs rather than hallucinating.

### Presentation layer
Dashboard cards, tables, charts, reports, notifications and conversational copilot all consume the same evidence/metric contracts.

## Features explicitly NOT copied
- LobeHub's UI/theme as a wholesale replacement for Report-Advisor.
- Its source code or proprietary assets.
- Unrestricted plugin execution.
- Any license-sensitive code reuse.
- Any architecture that makes the LLM the source of financial truth.

## License note
The current LobeHub repository uses the LobeHub Community License, with additional conditions around commercial derivative distribution. Treat the repository as a source of architectural ideas, not as a code dependency. Verify license terms again before any direct reuse.

## Implementation backlog generated from this review
- [ ] Agent registry + versioned specialist profiles
- [ ] Typed internal tool registry
- [ ] Evidence object / metric provenance contract
- [ ] Multi-agent orchestration with parallel execution and budgets
- [ ] White-box memory tables and UI
- [ ] AI provider/model registry and routing
- [ ] Scheduled analysis jobs
- [ ] Human approval workflow
- [ ] Shared report drafting workspace
- [ ] Business copilot over governed tools
- [ ] Agent/job observability and audit events
- [ ] MCP/plugin sandbox and permission model

## Cross-project accumulation rule
Every subsequent external repository supplied by the product owner must add to this knowledge base under a numbered project section. Before implementing a new capability, compare it against all prior sections to avoid duplicate architecture and to combine complementary ideas into one coherent Report-Advisor design.
