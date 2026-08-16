# Simpli ↔ GitHub + Vercel Development Workflow Integration — Investigation Report

Date: 2026-08-15 · Status: Investigation only — no code, database, or Vercel changes were made.

Scope: Determine how (and whether) Simpli can act as the **visual control layer** for the company's
real development workflow — from local commit → branch → PR → review → merge to `develop` → Vercel
deploy → QA → defects → production — without becoming a competing source of truth.

Guiding principles (kept through every section):

1. **GitHub remains the source of truth** for code, branches, PRs, reviews, and history.
2. **Vercel remains the deployment platform** — Simpli observes deploys, does not own them.
3. **Simpli orchestrates** only where GitHub/Vercel APIs safely allow: branch creation, PR open,
   status sync, merge, QA recording, defect linking.
4. **Sync, don't duplicate** — Simpli mirrors GitHub state (via API + webhooks) rather than
   maintaining a competing manual status that can drift.
5. No database reset, no destructive migration, no Vercel config change, no secret exposure.

---

## 1. What Simpli already does with GitHub (verified in code)

Existing, working, server-side GitHub bridge under `api/github/`, all proxied through
`api/github/github-helper.ts`:

| Endpoint | Method | Capability | Notes |
|---|---|---|---|
| `api/github/branches.ts` | POST | Create branch from `baseBranch` (default `main`); 409 if exists | Used by DevelopmentWorkspace |
| `api/github/commits.ts` | GET | List commits for a branch (default `main`, per_page 50) | Used by RepositoriesPage sync |
| `api/github/pull-requests.ts` | POST | `action: open` (create PR), `action: get` (fetch PR + reviews + check-runs; computes `approved/changes_requested`/`success/failure`), `action: review` (approve/request changes) | Used by DevelopmentWorkspace |
| `api/github/merge.ts` | POST | `PUT /pulls/{pr}/{method}` default `merge` | **Built but no UI calls it** |
| `api/github/webhook.ts` | POST | Verifies `x-hub-signature-256` HMAC; maps `pull_request`/`check_run` events onto tasks/defects; dedupes via `events` collection + `githubEventId` | Receiver only — see §6 |

Auth: token from `GITHUB_TOKEN` (fallback `GITHUB_ACCESS_TOKEN`), **server-side only**, sent as
`Authorization: Bearer` with `Accept: application/vnd.github+json` and `X-GitHub-Api-Version: 2022-11-28`.
Never exposed to the client.

Client wiring:
- `DevelopmentWorkspace.tsx` (embedded in `TaskDetailModal.tsx` and `DefectDetailModal.tsx`) — create branch, open PR, sync PR status, review/merge actions, and Code/Changes/Commits/PR/QA tabs.
- `RepositoriesPage.tsx` — add repo (appId, owner, name, defaultBranch), manual "Sync" that fetches commits and marks `connected`, lists linked work.
- `src/utils/integrations.ts` — registry; GitHub is the only `implementation: 'real'` integration; Calendar/Slack/Drive are stubs.

**Work-item GitHub sub-document** (`GithubSubDoc`, `src/app/types.ts`):

```ts
{
  repositoryId?: string;
  branchName?: string;
  branchUrl?: string;
  commits?: GithubCommit[];
  pullRequest?: GithubPullRequest; // prNumber, url, state, title, reviewers, reviewState, checkStatus
  status: 'not_started' | 'branch_created' | 'commits_pushed' | 'pr_open' | 'review'
        | 'qa' | 'approved' | 'merged' | 'closed';
}
```

Status ladder already implemented and rendered as a stepper in DevelopmentWorkspace.

## 2. What Simpli already does with Vercel

**Nothing beyond deployment itself.** `vercel.json` is purely build config:

```json
{ "buildCommand": "npm run build", "outputDirectory": "dist", "framework": "vite",
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/$1" },
               { "source": "/(.*)", "destination": "/index.html" }] }
```

- No Vercel REST API usage, no deployment-status endpoints, no preview URL tracking.
- Serverless functions (`api/*.ts`) run on Vercel; env vars are injected there (`GITHUB_TOKEN`, `FIREBASE_*`, `GMAIL_*`).
- **Deploy visibility exists via the Deploys tab in the Development Workspace** — a read-only observer (`api/vercel/deployments.ts`) lists recent deployments (target/state/url/creator/commit) when `VERCEL_TOKEN` (+ optional `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID`) is configured.

## 3. Workflow terminology — company process mapped to Simpli + GitHub

| Company step | GitHub object | Simpli representation | Current state in Simpli |
|---|---|---|---|
| Local work / commit | commit pushed to feature branch | `github.commits[]` on task/defect | Displayed (5 latest) in the workspace; `commits_pushed` auto-set by `push` webhook |
| Branch for a task | branch `feature/xxx` | `github.branchName` on work item | Created from DevelopmentWorkspace |
| Code review | PR + reviews | `github.pullRequest.reviewState` (`approved/changes_requested/pending`) | Synced via `action: get` + `pull_request_review` webhook |
| CI checks | check-runs | `github.pullRequest.checkStatus` (`success/failure`) | Synced; also `check_run` webhook |
| Merge to `develop` | merged PR | `github.status = merged` | Synced via PR get; webhook sets it |
| Commits pushed | push event | `github.commits[]` + `status = commits_pushed` | `push` webhook (auto) |
| Vercel deploy | deployment (not a GitHub object) | `api/vercel/deployments.ts` + workspace **Deploys** tab | Read-only observer; requires `VERCEL_TOKEN` env |
| QA pass/fail | (no GitHub object) | `qa.ts` transitions (`pass`→approved/closed, `fail`→in_progress/reopen) | Fully implemented, multi-cycle |
| Defect found | issue or PR comment | `defects` collection + optional `github` sub-doc | Implemented; no GitHub issue sync |
| Production | merge to default branch / release | `approved` → gate review | Partially covered by goals gate review |

## 4. Recommended branch strategy (small team)

Two realistic options for a small team; the current code already keys everything off a per-repo
`defaultBranch` (default `main`).

- **Option A — Trunk-based (recommended for 1–3 devs):** feature branches off `main` → PR → review → merge to `main` → Vercel auto-deploys. Simpli QA happens between "merged" and "approved/closed". Simplest; matches the existing `defaultBranch = main` default.
- **Option B — `develop` staging branch:** features off `develop`, merge to `develop` (auto staging deploy), then a release PR `develop → main` for production. Adds one hop; cleaner separation of staging vs production deploys.

**Recommendation: Option A** — smallest team, single default branch already configured, fewer moving
parts. If a staging/production split is ever needed, it's additive (per-repo `defaultBranch` value,
and a `releaseBranch` field — no model change required today).

Branch naming: Simpli already suggests `feature/simpl-<id>`; keep `<work-id>` in the branch name so
the webhook can match work items without a PR body convention (see §6).

## 5. Capability matrix — what Simpli can do safely today vs. after

| # | Capability | GitHub source | Simpli today | Simpli target |
|---|---|---|---|---|
| A | Create branch | `POST /repos/.../git/refs` | ✅ `api/github/branches.ts` | ✅ keep |
| B | List commits / sync repo | `GET /repos/.../commits` | ✅ `api/github/commits.ts` | ✅ keep |
| C | Open PR | `POST /repos/.../pulls` | ✅ `api/github/pull-requests.ts (open)` | ✅ keep |
| D | Read PR + reviews + checks | `GET /repos/.../pulls/{n}` + `/reviews` + check runs | ✅ `action: get` | ✅ keep |
| E | Merge PR | `PUT /repos/.../pulls/{n}/merge` | ✅ `api/github/merge.ts` + workspace Merge button | ✅ wired, permission-gated |
| F | Live PR events (open/merge/close) | webhook `pull_request` | ✅ receiver exists | ✅ matching fixed (§6) |
| G | Live check-run status | webhook `check_run` | ✅ receiver exists (sets checkStatus) | ✅ keep |
| H | Track Vercel deploys | Vercel API / webhook | ✅ `api/vercel/deployments.ts` (read-only GET) | ✅ workspace Deploys tab (needs `VERCEL_TOKEN`) |

Nothing in A–G requires Vercel to change. H needs a Vercel token (`vercel_*`) stored server-side and
either a new serverless function or a webhook route — Simpli only observes, Vercel keeps deploying.

## 6. Webhook → work-item matching (current logic + one real bug)

`api/github/webhook.ts` logic:
1. Verify HMAC-SHA256 with `GITHUB_WEBHOOK_SECRET`.
2. Resolve branch per event: `push` → `ref` (strips `refs/heads/`); `pull_request`/`pull_request_review` → `pr.head.ref`; `check_run` → `check_run.head_branch`.
3. Query `tasks` and `defects` where `github.repositoryId == "${owner}/${repoName}"`, then filter by branch in memory.
4. Apply event-specific updates; dedupe by writing `events/{githubEventId}` (push keyed on head sha, review on review id).

**Bug fixed (2026-08-15):** the webhook previously matched `github.repositoryId` as `"owner/repo"` while
`GitHubPanel` stored the Firestore repo doc id — events never attached. `repositoryId` is now stored
and compared as `"${owner}/${repo}"` everywhere (`GitHubPanel`, `DevelopmentWorkspace`,
`RepositoriesPage`, webhook), so live events attach to work items. **Resolved.**

The pure mapping logic (branch resolution, event-id dedupe, per-event updates) has been extracted to
`src/utils/githubWebhookLogic.ts` and is covered by unit tests. Manual GitHub-side setup (payload URL,
events, secret) is documented in `docs/GITHUB-WEBHOOK-SETUP.md`.

Also fixed: `integrations.ts` connect/sync no longer hardcode `owner=simpli&repo=simpli`; they now
verify the configured token via `api/github/status.ts` (`/user`).

## 7. The DEVELOPMENT TASK UX — proposed Simpli workflow (mirrors GitHub, in order)

1. **not_started** — task/defect created, no branch yet. "Create branch" → GitHub API.
2. **branch_created** — branch exists; dev works locally and pushes. Simpli shows branch URL.
3. **commits_pushed** — auto-set by `push` webhook (or commit polling) when new commits land on the linked branch. *(Implemented: `push` webhook sets `github.commits[]` + status.)*
4. **pr_open** — dev (or Simpli, via "Open PR") opens PR against `defaultBranch`. Simpli stores `prNumber/url`.
5. **review** — Simpli syncs review state; shows `changes_requested` in red, `approved` in green.
6. **qa** — reviewer approved → move to QA state (Simpli-status, gated by `run_qa` permission). Developer/QA pull the Vercel preview/deploy URL and run `qa.ts` cycles (pass/fail → approved/reopened).
7. **approved** — QA pass recorded; status `approved` (requires `approve_tasks`/`manage_workflow`).
8. **merged** — PR merged (via Simpli merge button or on GitHub). Simpli sets `merged` on sync/webhook.
9. **closed** — PR closed unmerged; work returns/archives.

Each step is a **reflection of GitHub reality plus a Simpli-only approval gate**, never a competing
"GitHub says X, Simpli says Y" situation — Simpli always reconciles from GitHub when synced.

## 8. Work-item ↔ GitHub relationships

Recommended additive mapping (all on the existing `github` sub-doc — nothing deleted):

| Work item | Branch | PR | Relationship |
|---|---|---|---|
| Task (development) | 1 branch | 1 PR | `github.{repositoryId, branchName, pullRequest}` — the core flow |
| Task (non-development) | none | none | `workType: 'non-development'` → workspace hidden |
| Defect (development) | 1 branch (fix) | 1 PR (fix) | Same sub-doc as tasks; defect can also link to the PR that *caused* it |
| Defect → task | — | — | existing defect↔task links preserved |

Multi-repo apps: a work item targets **one** repo (via `github.repositoryId`). A task spanning two repos
should be split into two tasks (one per repo) — keep it 1:1 to preserve the webhook matching model.

## 9. Repository system — level of configuration

Repos are already first-class, per-App entities: `repositories` collection with
`appId, provider, owner, name, url, defaultBranch, connectionStatus, integrationStatus, lastSyncedAt`.

- **Branch config lives at the repo level** (`defaultBranch`) — correct, because GitHub branches are per-repo.
- Apps can own multiple repos (no constraint preventing it); each work item selects its repo via the workspace repo selector.
- **Recommendation:** keep branch strategy per-repo (add optional `releaseBranch?` later for Option B). Do **not** add a per-app branch setting — it's the wrong granularity and would duplicate the repo value.

## 10. Code review sync (existing + gaps)

- **API:** `pull-requests.ts (action: get)` already fetches the PR plus its reviews and check-runs and collapses them to `reviewState` and `checkStatus`.
- **UI:** DevelopmentWorkspace renders the status stepper, review badges, CI, and diff/commits.
- **Gaps:** no per-reviewer list detail surfaced (list is stored but not shown), no review *comments* count, no auto-refresh (only manual "Sync PR Status" button). Live updates should come from the `pull_request_review` webhook event (currently unhandled — webhook only handles `pull_request` and `check_run`).

## 11. Multi-cycle QA

Already implemented and decoupled from GitHub:
- `qa.ts` — `getQaTransition(pass/fail)` moves defects `pending_qa/resolved → closed` (pass) or `→ in_progress` (fail, reopens if closed), and tasks `pending_qa → approved` (pass) or `→ in_progress` (fail).
- `qaRuns`/`qaCycles` append-only collections (Phase 2) with `cycleNumber` auto-increment (`nextQaCycleNumber`).
- Defect `reopened` status exists in `DefectStatus`.

GitHub's role in QA: provide the **deployment/preview URL** to test against (from Vercel, see §12/§13),
not store the QA result. QA stays a Simpli-native concept.

## 12. Defect association (development defects)

- Defects have the same `github` sub-doc, so a defect fix can have its own branch/PR.
- The webhook already queries `defects` by `github.repositoryId` — so a merged fix PR can flip the defect's `github.status`.
- ✅ **Issue sync implemented:** creating a defect with a linked repository opens a GitHub issue
  (`api/github/issues.ts` + `DefectCreateModal`), the defect detail modal shows the linked issue and
  closes/reopens it when the defect status changes, the Dev Workspace has an **Issue** tab, and the
  `issues` webhook event syncs state back onto `github.issue`/`github.status`.

## 13. Production promotion via PR (Option A + release flow)

- Default branch (`main`) merges auto-deploy on Vercel.
- Simpli "approved + merged" = done for that work item; the deploy is Vercel's job.
- For a staging/release lane (Option B): a release PR `develop → main` can itself be a Simpli task (or a goal gate review item). Simpli merges it (using the existing `merge.ts`) after gate review; Vercel deploys production.
- **Missing piece either way:** Simpli doesn't know the deploy happened or whether it succeeded. Add a Vercel observer (§5.H): store `deployments[]` on the repo (or app) with `{ id, state, environment, url, createdAt }`, refreshed from the Vercel API or deploy webhook.

## 14. Webhooks vs polling — recommendation

| Trigger | Recommended | Status |
|---|---|---|
| PR open / close / merge | webhook `pull_request` | ✅ implemented |
| PR review submitted | webhook `pull_request_review` | ✅ implemented (reviewState + reviewers) |
| Checks complete | webhook `check_run` | ✅ implemented |
| Commits pushed | webhook `push` | ✅ implemented (`commits_pushed` + commit list) |
| Issue opened / closed | webhook `issues` | ✅ implemented (defect `github.issue` sync) |
| Vercel deploy | webhook or 30–60s poll | ⬜ not yet |
| Manual "Sync" buttons | keep | ✅ implemented |

Rule: **webhook = live updates; polling = reconciliation/backfill.** Both write into the same
`github.*` fields via the same helper, so no drift between the two paths.

## 15. Security — token handling, storage, audit, protected merges

- **Token type:** a classic **PAT** (currently `GITHUB_TOKEN`, server-only) with **repo scope** is enough for A–G. Best practice long-term: a **GitHub App** with limited permissions per-repo (contents: write, pull_requests: write, checks: read, issues: write) and an installation-level token — finer-grained, revocable, no personal-account token. This is now **implemented**: when `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY` are set, `github-helper.ts` mints scoped installation tokens and falls back to the PAT otherwise.
- **Vercel token (for H):** `VERCEL_TOKEN` (server-only), with optional `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID`. The observer is read-only and returns `configured:false` (UI shows a hint) when the token is absent. None of these are in the local `.env` — set them in Vercel env.
- **Storage:** token lives only in Vercel env vars (server-side). Never ship in `.env`, never log it, never send it to the client. `github-helper.ts` already keeps it server-only. ✓
- **Webhook security:** `GITHUB_WEBHOOK_SECRET` HMAC-SHA256 verification with `timingSafeEqual` is implemented. ✓ **Note:** `GITHUB_WEBHOOK_SECRET` is referenced by code but is **not present in the local `.env`** (only `GITHUB_TOKEN` is) — confirm it's set in Vercel env, otherwise the receiver accepts unauthenticated events.
- **Audit:** all state changes already flow through `updateWorkGithub` (client) and webhook (server) — add an `activities` record on merge/status changes so there's a traceable history.
- **Protected merges:** Simpli's merge button must be gated by `manage_repositories`/`develop_work` permissions (the panel already checks `canDev`), and GitHub-side branch protection should stay the enforcement point (required reviews / status checks). Simpli is a convenience layer, not the security boundary.

## 16. UI lifecycle — where each status shows up

- **DevelopmentWorkspace** (`TaskDetailModal`, `DefectDetailModal`): full workspace — integration status header, Code / Changes / Commits / PR / QA / Deploys tabs, review + merge actions, PR detail drawer (reviews + checks), and the GitHub status ladder. Auto-syncs every 30s. Primary home.
- **KanbanBoard**: development columns already include `pending_qa` (`DEV_TASK_COLUMNS`); dev and ops pipelines split by `workType`. A "GitHub Lifecycle" view toggle groups dev tasks by `github.status` ladder (No Branch / Branch Created / In Review / In QA / Merged / Closed) as read-only lenses; cards carry PR badges.
- **RepositoriesPage**: repo-level sync status + linked work list with `github.status` badges.
- **Integrations page** (`integrations.ts` registry): GitHub connect/sync verifies the token via `api/github/status.ts`.
- **Tasks/Defects lists**: PR badge (`#<n>`), colored by merged / approved+green / changes-requested+failing / in-flight (amber).

## 17. Development timeline (progress)

1. ✅ **Fix webhook matching convention** (§6) — repositoryId unified to `owner/repo`; live status now attaches.
2. ✅ **Add `push` + `pull_request_review` webhook handling** — drives `commits_pushed`/commit list and review-state autos.
3. ✅ **Wire merge + review actions** in the workspace using existing `merge.ts` + new `action: review`, permission-gated.
4. ✅ **Fix `integrations.ts` connect/sync** — token verified via `/user` instead of hardcoded `simpli/simpli`.
5. ✅ **Build the Development Workspace** (Code/Changes/Commits/PR/QA tabs) + `api/github/contents.ts` + `compare.ts`.
6. ✅ **Vercel deploy observer** (§5.H, §13) — read-only serverless function + workspace **Deploys** tab; requires `VERCEL_TOKEN`.
7. ✅ **Auto-sync** of the workspace — 30s interval + manual Refresh, fetches commits/diff/PR/deploys together.
8. ✅ **UI polish** — PR detail drawer (reviews + checks), PR badges on task/defect lists + kanban, GitHub-lifecycle kanban columns, webhook setup doc.
9. ✅ **GitHub App auth** — `github-helper.ts` mints a scoped installation token (RS256 JWT → `/app/installations/{id}/access_tokens`), cached, with PAT fallback; `status.ts` reports `authMode`.
10. ✅ **Defect ↔ GitHub issue sync** — `api/github/issues.ts` (create/update/close/get) wired into defect create modal, detail modal (linked issue + close/reopen), Dev Workspace Issue tab, and `issues` webhook sync.

Steps 1–10 are done. Webhook expands to `push`/`pull_request`/`pull_request_review`/`check_run`/`issues`;
auth supports PAT **or** GitHub App; the defect flow now round-trips through GitHub issues.

## 18. What stays out of scope (deliberately)

- Simpli does **not** store code, commit objects, or PR content.
- Simpli does **not** replace GitHub branch protection or CI.
- Simpli does **not** create/destroy Vercel deployments or change Vercel config.
- No changes to the existing `tasks`/`actionPoints`/`defects` collections except additive `github.*`
  fields (aligned with Phase 2/3 "extend, don't rebuild" rule). No DB reset/migration performed.

## 19. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Status drift (GitHub vs Simpli) | Single reconciliation helper; webhook-first, poll-backfill; always re-derive from GitHub on sync |
| Token leak / rotation | Server-only env; document rotation; consider GitHub App later (§15) |
| Webhook spoofing | HMAC verification already implemented; ensure `GITHUB_WEBHOOK_SECRET` set in Vercel (§15) |
| RepositoryId mismatch bug (§6) | Fix matching convention before relying on webhooks |
| Vercel deploy tracking scope creep | Keep it a read-only observer; never touch deploy config |
| Merge button misuse | Permission gate + GitHub branch protection as the real enforcement |

## 20. End-to-end flow (target state, Option A)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  DEV machine (local)                    Simpli (control layer)   Vercel       │
│                                                                              │
│  [work on feature/simpl-142]                                                 │
│        │ push                                                               │
│        ▼                                                                     │
│  GitHub ─push webhook──▶ Simpli sets commits_pushed                        │
│        │                                                                     │
│        └── branch pre-created from DevelopmentWorkspace (api/github/branches)    │
│                                                                              │
│  GitHub ◀── api/github/pull-requests(open) ── Simpli "Open PR"               │
│        │                                                                     │
│        │ pull_request / pull_request_review / check_run webhooks             │
│        │    ──▶ Simpli: pr_open → review (changes_requested/approved)        │
│        │         + checkStatus (success/failure)                             │
│        ▼                                                                     │
│  Reviewer approves ──▶ Simpli: review ✅ → QA gate (run_qa)                  │
│  QA runs against preview/preview URL (Vercel observer) ──▶ qa.ts pass/fail   │
│  pass ──▶ approved  │  fail ──▶ back to in_progress + reopen                  │
│        ▼                                                                     │
│  Simpli merge button (api/github/merge) ──▶ GitHub merges PR ──▶             │
│        │                                                                     │
│        ▼                                                                     │
│  GitHub: main updated ──▶ Vercel auto-deploy ──▶ deploy webhook/poll ──▶     │
│        │                                                     Simpli:         │
│        ▼                                                      "deployed"     │
│  Simpli: merged → closed/approved (gate review)   ◀──────────────────────┘   │
│                                                                              │
│  Defect found ──▶ defect linked (github sub-doc) ──▶ own branch/PR/QA cycle  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Verdict — "Can Simpli really be the visual control layer for our dev workflow?"

**Yes — the core experience is now built; one additive observer remains.**

- The **Development Workspace is implemented and functional**: create branch, open PR, view code
  (file tree + highlighted source), diff, commits, PR metadata, review/merge actions, and a QA tab —
  all rendered inside Simpli — plus a signed webhook receiver covering `push`, `pull_request`,
  `pull_request_review`, `check_run`, and `issues`, wired into the task/defect detail modals with a real
  workflow/QA engine (`pending_qa`, multi-cycle pass/fail, approve gates).
- **GitHub App auth is implemented**: scoped installation tokens (with PAT fallback) replace the
  single shared PAT once `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY` are configured.
- **Defect ↔ GitHub issue sync is implemented**: defects open linked issues, sync state both ways,
  round-tripping through `api/github/issues.ts` and the `issues` webhook.
- The **two real bugs are fixed**: (1) `github.repositoryId` is unified to `"owner/repo"` across
  GitHubPanel/DevelopmentWorkspace/RepositoriesPage/webhook, so live webhook updates attach to work
  items; and (2) Integrations "connect/sync" now verifies the token via `/user` instead of a
  hardcoded `simpli/simpli` repo.
- One **capability remains open** to close the loop end-to-end: Vercel deploy observation (read-only),
  so Simpli knows a merge actually reached production. Requires only `VERCEL_TOKEN`.

Everything else is already there or is a small, additive extension. GitHub stays the source of truth,
Vercel stays the deployment platform, and Simpli becomes exactly what it should be: **the orchestration
and QA cockpit** — not another competing system of record. No database changes are required beyond the
already-designed additive `github.*` fields, and none were made in this investigation.
