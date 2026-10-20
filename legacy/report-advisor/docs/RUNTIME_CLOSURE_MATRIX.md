# Runtime Closure Matrix

| Layer | Producer | Persistence / Gate | Consumer | Safety condition |
|---|---|---|---|---|
| Report execution | worker | checkpoint + lease | lineage | tenant + live lease |
| Source truth | source version | canonical text + row lineage | consolidation | deterministic source key |
| Consolidation | multi-report runtime | consolidation runs/items | scenarios | precedence + chronology |
| Decision | bounded scenario | portfolio item | executive evidence | risk budget |
| Evidence | runtime | evidence graph | cockpit | provenance |
| Health | control plane | health snapshot | autonomy gate | blocker count |
| Trust | continuous trust | trust certificate | release/autonomy | valid + unexpired |
| Release | CI/CD | release evidence | production | fingerprints + canary |
| Certification | production gate | certification bundle | production enablement | isolation + backup + rollback + security |

## Autonomous execution chain

`source → canonical text → lineage → consolidation → scenario → decision → evidence → health → trust → rollback → certification → autonomy`

Any failed safety condition must keep the downstream gate closed.
