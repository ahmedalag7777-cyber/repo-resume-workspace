# Report-Advisor — Master UX & Product Architecture

## Directive
The final product must not be constrained to the original comprehensive report specification. External projects are sources of transferable UX, information architecture, interaction, accessibility, workflow and product-design ideas. Adopt the best patterns, redesigning or restructuring existing screens when the resulting experience is materially better. Never copy proprietary source code or assets.

## Product experience goal
Report-Advisor should feel like one coherent operating system for business intelligence, analysis and decisions rather than a collection of report pages.

Core experience loop:
**Observe → Explore → Explain → Investigate → Decide → Act → Verify**

## Global navigation model
Use a task-oriented information architecture with a persistent shell:
- Home / Executive Cockpit
- Reports
- Analytics
- Inventory Intelligence
- Sales & Customers
- Purchases & Suppliers
- Finance & Cash Flow
- Forecasting & Reorder
- Data & Imports
- Data Quality
- Research / Investigations
- AI Agents
- Alerts & Tasks
- Workspaces / Projects
- Administration / Security

Navigation must support:
- collapsible sidebar
- favorites/pinned items
- recent items
- contextual breadcrumbs
- global search / command palette
- keyboard shortcuts
- quick-create actions
- saved views
- role-aware navigation
- mobile bottom navigation or compact navigation where appropriate
- RTL-first Arabic layout with English support

## Dashboard / cockpit
Do not overload the home page. Use configurable widgets/cards with:
- KPI
- trend
- variance
- target
- status
- confidence/data sufficiency
- sparkline or compact chart
- last updated
- source/evidence affordance
- drill-down action
- recommendation/next-action affordance

Allow users to rearrange, resize, hide and save dashboard layouts per workspace/role.

## Page composition standard
Every major page should use a predictable hierarchy:
1. Page title + purpose
2. primary actions
3. filters/context bar
4. summary metrics
5. visualization/table/work area
6. insights/recommendations
7. evidence/source panel
8. secondary actions/details

Use progressive disclosure: show the decision-critical information first and deeper technical detail on demand.

## Tables
Tables are first-class analytical tools:
- column visibility and ordering
- resize
- sticky headers
- density modes
- sorting
- multi-filter
- grouping
- totals/subtotals
- conditional status indicators
- inline drill-down
- row selection and bulk actions
- export/print
- saved table views
- virtualized rendering for large datasets
- accessible keyboard navigation
- clear empty/loading/error states

## Buttons and actions
Establish an action hierarchy:
- one primary action per context
- secondary actions grouped logically
- destructive actions visually separated and confirmed
- icon + label for ambiguous actions
- tooltips only as support, not the sole label
- contextual actions near the object they affect
- bulk actions appear only when rows are selected
- long-running actions show progress, cancellation and result summary

## Smart interaction patterns
Adopt:
- command palette
- global search
- contextual action menus
- keyboard shortcuts
- quick filters
- saved filters/views
- undo where safe
- confirmation only for consequential actions
- optimistic UI only where rollback is guaranteed
- background jobs for expensive work
- notifications linked directly to affected object/job

## Reports UX
Reports must be documents, not static pages.
A report consists of reusable blocks:
- title/metadata
- executive summary
- KPI cards
- narrative insight
- chart
- table
- evidence/citation
- calculation explanation
- recommendation
- risk
- appendix

Users should be able to:
- reorder sections
- hide/show blocks
- save report templates
- change date/context
- drill from chart → table → source rows
- inspect calculation definition
- inspect evidence
- export PDF/Excel/CSV
- print
- share governed views
- schedule reports
- version reports

## Investigation workspace
Complex questions open a workspace rather than a chat-only screen:
- question/problem statement
- scope and filters
- evidence timeline
- metric cards
- analyst findings
- knowledge graph/mind map
- contradictions
- hypotheses
- recommendations
- decision log
- generated report

The user can intervene and redirect research without losing prior work.

## Inventory workspace
Provide dedicated views:
- liquidity/velocity overview
- moving inventory
- frozen inventory
- stockout risks
- reorder queue
- demand forecast
- excess stock
- dead stock
- item drill-down
- action plan

## Finance workspace
Provide:
- cash position
- inflows/outflows
- receivables
- payables
- aging
- due-date calendar/timeline
- liquidity forecast
- crisis scenarios
- partner rankings
- collection priorities
- payment priorities
- cash allocation plan

## Import workspace
Make imports a guided pipeline:
**Upload → File Intelligence → Preview → Mapping → Validation → Classification → Approval → Processing → Results → Reconciliation**

Show visibly:
- file fingerprint
- detected format/encoding
- parser chosen + confidence
- columns mapped/ignored
- New/Update/Unchanged/Duplicate/Invalid
- warnings
- affected records
- progress
- cancel/resume
- rollback/reconciliation result

## Data Quality workspace
Use a quality score cockpit with:
- completeness
- validity
- uniqueness
- consistency
- duplicates
- anomalies
- affected records
- remediation actions
- trend over time

## AI / Agents UX
AI must be integrated as a governed copilot, not an unrestricted chatbot.
Show:
- selected agent/role
- task scope
- tools available
- data scope
- evidence used
- confidence/data sufficiency
- generated recommendation
- approval requirement
- run status
- cancel/retry

Never expose private model chain-of-thought. Expose concise calculation/evidence explanations instead.

## Loading / errors / offline
Every workflow needs explicit:
- skeleton/loading state
- empty state with useful next action
- partial-data state
- validation state
- permission denied state
- network/offline state
- retry action
- background-job state
- success summary

## Accessibility
Target WCAG 2.2 AA principles:
- keyboard operation
- visible focus
- sufficient contrast
- semantic labels
- screen-reader-friendly tables/forms
- reduced-motion support
- accessible charts with textual summaries
- RTL/LTR correctness
- localization-ready date/number/currency formatting

## Responsive design
Design mobile-first but support desktop analytical density.
Mobile must preserve decisions and actions, not merely shrink desktop screens.
Use responsive cards, bottom sheets, compact filters and horizontal table scrolling where unavoidable.

## Visual system
Create one design system:
- spacing scale
- typography scale
- semantic colors
- status tokens
- borders/radii/shadows
- icon rules
- chart rules
- table rules
- form controls
- modal/drawer patterns
- notification/toast patterns

Do not allow each page to invent its own controls or visual language.

## Restructuring policy
Existing pages/components may be moved, merged or replaced when required for coherence. Before restructuring:
- map routes and dependencies
- preserve database contracts
- preserve working business logic
- migrate incrementally
- verify old functionality
- avoid duplicate parallel architectures

## Product intelligence principles
The interface should continuously answer:
- What happened?
- Why?
- What changed?
- Is it important?
- What will happen next?
- What should I do?
- What evidence supports this?
- What happens if I do nothing?

## Acceptance standard
A UX feature is complete only when it is responsive, accessible, permission-aware, connected to real data, has loading/error/empty states, supports the appropriate keyboard/touch interactions, and has a clear path from insight to action.
