# Report-Advisor — Free-First / No-Paid-Fallback Policy

This policy is mandatory for all future development and release decisions.

## 1. Product requirement

Report-Advisor must not require the owner to pay a third party to use its core capabilities. Core analytics, deterministic calculations, imports, document processing, evidence, reports, governance and security must remain usable with free/open-source/local components wherever technically possible.

## 2. AI policy

- Local AI is preferred; Ollama remains optional and must not be replaced by a paid gateway.
- No silent paid fallback.
- No hidden API subscription requirement.
- Paid providers may only exist as explicit optional adapters if the owner later authorizes them.
- A provider outage must fail closed or fall back only to an explicitly free/local provider.
- LLMs never become the financial/numeric source of truth.

## 3. Dependency policy

Do not add a framework, SaaS service, hosted AI API, commercial database service, observability subscription or other paid dependency merely for convenience or feature similarity.

Before adding an external dependency, document:

1. Why existing code cannot provide it.
2. Why an open-source/local alternative is insufficient.
3. Whether the dependency is optional or mandatory.
4. Whether a free self-hosted/local mode remains complete.
5. What happens when the external service is unavailable.
6. Security, tenant isolation and data-egress implications.

## 4. No feature removal

Improving this policy must never remove existing project capabilities. Existing features are to be repaired, consolidated or upgraded, not deleted merely to simplify implementation.

## 5. Certification

A release cannot be called production-ready if the owner must purchase an unannounced service to exercise a core feature.

The project must explicitly distinguish:

- FREE/LOCAL READY
- OPTIONAL EXTERNAL
- LIVE REQUIRED
- BLOCKED

No paid dependency may be hidden behind a generic `fallback` path.
