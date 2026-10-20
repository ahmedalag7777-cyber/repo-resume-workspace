# Report-Advisor — Parallel Execution Coordination Protocol
## Effective: 2026-09-18

### Objective
Allow the owner, AI UI lane, and programmer/runtime lane to work in parallel without overwriting each other, moving stale changes onto newer HEADs, or claiming evidence from an older SHA.

### 1. Single source of truth
The active PR head is the only execution reference.
Before every mutation:
1. Read the current PR HEAD SHA.
2. Read the target file at that exact SHA.
3. Apply the change against the current blob SHA.
4. Re-read the PR HEAD after the mutation.
5. If HEAD changed during the operation, stop mutation on overlapping files and rebase/merge logically from the new content.

Never write using a stale blob SHA.

### 2. Work ownership
Two lanes may operate concurrently:

**UI / Product lane**
Owns:
- src/components/Sidebar.tsx
- src/pages/* UI files
- src/components/* presentation components
- src/index.css
- product/UX documentation

**Runtime / Engineering lane**
Owns:
- durable runners
- RPC/database migrations
- import production runtime
- certification/evidence contracts
- CI/runtime scripts
- worker/infrastructure files

Shared files require explicit handoff before mutation.

### 3. Shared-file rule
Never mutate a shared file while another lane has an active uncommitted or in-flight change on that file.

When a shared-file change is necessary:
- announce the exact path and intended change in PR comment;
- wait for the other lane to finish its current mutation;
- re-read the file;
- merge the intent into the latest content;
- test afterward.

### 4. Commit discipline
Each logical change gets its own small commit.
Do not batch unrelated UI/runtime changes.
Do not rewrite another lane's commit.
Do not force-push or reset another lane's work.

### 5. Exact-HEAD evidence
Evidence is valid only for the exact tested SHA.
When HEAD advances after a test:
- the old PASS remains historical;
- no claim may be transferred to the new SHA;
- re-run only the checks affected by the new files/environment/contracts.

### 6. Local device safety
The user's existing local worktree is never used as a disposable verification worktree.
Verification must use a separate temporary worktree or clean checkout.
Do not alter, reset, clean, or stash the user's local branch without explicit instruction.

### 7. Deployment coordination
A deploy/pipeline failure caused by provider limits is not a code failure.
Use the independent Netlify preview or local isolated build when available.
Do not trigger redundant full deployments merely to re-test an unchanged artifact.

### 8. Conflict response
When GitHub returns a 409/stale SHA:
- do not retry the same write;
- fetch latest file;
- inspect overlapping changes;
- merge intent into latest file;
- write once with the new blob SHA;
- run targeted validation.

### 9. Handoff markers
For high-risk/shared work, use a PR comment in this format:

OWNER: UI | RUNTIME
PATHS: exact/path/list
HEAD: exact SHA
CHANGE: one-line intent
STATE: IN_PROGRESS | READY_FOR_HANDOFF | VERIFIED
TEST: exact command/check and SHA
NEXT: next independent action

### 10. Definition of coordinated execution
No lane may say “done” merely because its code exists.
Done means:
- change is on current PR HEAD;
- exact-head validation is recorded;
- overlapping work is reconciled;
- no stale local mutation remains;
- deployment/evidence state is truthful.

### Permanent rule
**Parallel means independent files/worktrees, not simultaneous writes to the same file.**
