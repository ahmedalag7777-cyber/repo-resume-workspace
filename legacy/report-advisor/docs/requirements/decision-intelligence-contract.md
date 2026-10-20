# Decision Intelligence Requirements Contract

## Scope
The decision layer must combine product, product-family, customer demand, inventory, supplier, lead time, seasonality, liquidity, and unfulfilled demand before producing an operational recommendation.

## Non-negotiable principles
- Every recommendation must expose evidence and calculation inputs.
- AI may explain and rank; deterministic engines own financial quantities and arithmetic.
- Product Family may combine substitute products only when explicitly configured or confidently mapped and must allow manual exclusion.
- Re-imports must be idempotent and incremental.
- A failed file must not block unrelated files.
- Historical values must remain auditable; updates must not silently rewrite prior facts.
- Low-confidence mappings must require review rather than silently merging products.

## Recommendation classes
- buy_now
- buy_soon
- monitor
- do_not_buy
- liquidate
- rebalance

## Evidence required
- demand history and trend
- current/family stock and coverage
- unfulfilled demand
- supplier reliability and lead time
- estimated capital requirement
- seasonality signal
- confidence and warnings

## Folder ingestion contract
The ingestion layer must support continuous detection of newly added files, fingerprint files and rows, process only new/changed content, preserve manual upload, isolate unsupported/corrupt files, and resume from checkpoints after interruption.

## Acceptance gate
A feature is not considered complete until it is implemented, integrated into the application path, covered by automated tests where practical, and validated by CI without regressions.
