# Simpli Master Prompt — Development Workspace (Revision)

> This is the **master build prompt** for Simpli's next development phase. It supersedes the
> earlier "build everything" framing. The AI agent should treat this as the primary directive and
> **prioritize the core experience below** instead of blindly implementing every feature previously
> listed.

---

## 1. The one-sentence mission

**A Development Task in Simpli is the single place where the developer, CTO, and QA can follow the
development lifecycle, inspect the associated GitHub branch/code/diff/PR, perform authorized GitHub
actions, and then move the work into QA and eventual production readiness — without leaving Simpli.**

## 2. What Simpli is NOT

Explicit non-goals for this phase (do not build, do not wire in, do not plan around):

- ❌ **Complex automation engine.** No "when X happens, trigger Y" rules. The existing automation
  module stays as-is; nothing new is added.
- ❌ **Time tracking.** Not needed for the current workflow.
- ❌ **Enterprise portfolio system.** Keep Application Management, but do not grow it toward
  Jira/Asana-level portfolio management.
- ❌ **Replacing GitHub.** GitHub remains the source of truth for code, branches, PRs, reviews, history.
- ❌ **Replacing Vercel.** Vercel remains the deployment platform. It is at most an *optional status
  layer*, not central to this phase.
- ❌ **Editing code in Simpli.** Phase 1 is **read + review + merge only**. No editing arbitrary
  source files, no commit-from-Simpli. That is a later, separate, much larger security problem.

## 3. The core concept: the Development Task is the bridge between work and code

A development task carries its GitHub context **inside the task**, as first-class fields:

```
TASK — SIM-142 "Update Procurement Approval"

Type:          Development
Application:   BuyOps
Repository:    buyops-web
Branch:        feature/SIM-142-procurement
Status:        Code Review
```

Integration status is **part of the task's status/context**, not a separate module:

```
DEVELOPMENT TASK — Code Integration
  🟢 GitHub Connected
  Repository:     buyops-web
  Branch:         feature/SIM-142-procurement
  Pull Request:   #142
  Commits:        8
  CI:             🟢 Passing
  PR Review:      🟡 Pending CTO Review
```

"Integration" here means: **the state of the connection between Simpli and GitHub, shown on the
task.** Simple to understand, simple to build.

## 4. The killer feature: the Simpli Development Workspace

When a developer/CTO opens a Development Task, Simpli gives them the **relevant GitHub context
inside the task**, with a code workspace that lets them *inspect* (not just link out):

```
┌───────────────────────────────────────────────────────────────┐
│ SIM-142 — UPDATE PROCUREMENT APPROVAL                         │
│                                                               │
│  Development Task · Status: CODE REVIEW                       │
│  App: BuyOps · Phase: Development · Assignee: Taiwo           │
│                                                               │
│  GITHUB                                                       │
│  Repository: buyops-web                                       │
│  Branch: feature/SIM-142-procurement                          │
│  PR: #142 · CI: 🟢 Passing · Review: 🟡 Pending CTO          │
│                                                               │
│  [ CODE ] [ CHANGES ] [ COMMITS ] [ PULL REQUEST ] [ QA ]     │
│                                                               │
│  FILES                  CODE                                 │
│  ▾ src/                  1  import React ...                 │
│    ▾ components/         2                                   │
│      Procurement.tsx     3  export function ...              │
│    ▾ services/           4                                   │
│      procurement.ts      5  function approvePurchaseOrder()  │
│                                                               │
│                    [ Approve Review ] [ Request Changes ]    │
└───────────────────────────────────────────────────────────────┘
```

### Tabs inside the workspace

| Tab | Shows |
|---|---|
| **Code** | Repository file tree + file viewer with **syntax highlighting** (read-only). Browse any branch. |
| **Changes** | **Diff view** of the task's branch vs its base: changed files, added/removed lines, per-file diff. |
| **Commits** | Commit history for the branch (message, author, date, sha, links). |
| **Pull Request** | PR title, description, state, reviewers, CI check status, review state, link out. |
| **QA** | QA cycles for the task (existing `qa.ts` flow), pass/fail recording. |

### The "Not GitHub link-out" rule

Code/Changes/Commits/PR tabs must **render the actual content inside Simpli** (file tree, source,
diff, commits, PR metadata). A "View on GitHub" external link may exist as a secondary affordance,
but the primary experience is inspection in place. The CTO's core requirement:

> "I want to inspect and approve this code without having to leave Simpli."

### Phase 1 scope — read + review + merge

**Build now:**
- Read repository (file tree + file contents from any branch).
- Browse code with syntax highlighting and search.
- View diff (branch vs base) with added/removed lines.
- View commits and commit history for the branch.
- View PR (metadata, review state, CI status).
- Approve review / request changes.
- Merge PR where authorized (uses existing `api/github/merge.ts`).

**Do NOT build now:**
- Editing/creating files, committing, or pushing from Simpli.
- Inline code comments posted back to GitHub (can render review comments read-only, but posting is out).

## 5. Data model / hierarchy (revised)

```
APPLICATION
│
├── Documentation
├── Phases
├── Goals
├── Work
│
└── REPOSITORIES
       ├── Repository A
       │      ├── Development Task 1 ── Branch ── Commits
       │      │                              └── Pull Request
       │      └── Development Task 2 ── Branch
       └── Repository B
```

- **Repository belongs to the Application** (an app may have one or more repos: `buyops-web`,
  `buyops-api`, `infrastructure`). This is already modeled (`repositories.appId`). ✓
- **Branch belongs to the Development Task** (a piece of work happens on a particular branch).
  Already modeled via the task/defect `github` sub-doc. ✓
- **Do not** give every task its own repository. The relationship is
  `Application → Repository → Development Task → Branch → (Commits, Pull Request)`.

## 6. Development Task status lifecycle (simplified)

```
Not Started
   ↓
In Development
   ↓
Code Review ──────────────┐
   ↓                      │ failure loop:
Approved                  │   Code Review → Changes Requested → In Development
   ↓                      │
Merged                    │
   ↓                      │
Pending QA                │
   ↓                      │ failure loop:
QA ───────────────────────┤   QA → Failed → In Development
   ↓                      │
QA Passed                 │
   ↓                      │
Ready for Production      │
   ↓                      │
Completed                 │
```

### Mapping onto the real engine (already implemented)

The conceptual lifecycle above maps onto the **existing** `TaskStatus` union
(`not_started | in_progress | blocked | pending_qa | completed | approved`) plus the task's
`github.status` ladder (`not_started → branch_created → commits_pushed → pr_open → review →
qa → approved → merged → closed`). Do **not** add new task statuses in Phase 1 — the GitHub
integration status sits **alongside** task status (see below), and the workspace renders the GitHub
ladder as its own stepper. Concretely:

| Simpli task status (engine) | GitHub status (workspace) | Meaning |
|---|---|---|
| `not_started` | `not_started` | no branch yet |
| `in_progress` | `branch_created` / `commits_pushed` | branch created, commits landing |
| `in_progress` | `pr_open` | PR open, code review pending |
| `in_progress` | `review` (changes_requested) | review loop → back to dev |
| `in_progress` | `review` (approved) | CTO/lead approved |
| `in_progress` → `pending_qa` | `qa` / `approved` | handed to QA |
| `pending_qa` → `completed` | `merged` | QA passed, merged to default branch |
| `completed` → `approved` | `merged`/`closed` | gate-approved, production-ready |

The workspace (`DevelopmentWorkspace.tsx`) already enforces this: GitHub actions
(branch/PR/review/merge) are permission-gated, QA pass/fail flows through the existing `qa.ts`
engine, and `github.status` advances via the API/webhook bridge.

GitHub integration status sits **alongside** task status — it is not a separate workflow:

```
TASK STATUS:  Code Review

GITHUB
  🟢 Connected
  Branch: feature/SIM-142
  PR: #142
  Review: 🟡 CTO Review
  CI: 🟢 Passing
```

### Status ↔ GitHub mapping

| Simpli status | GitHub reality | Enforced by |
|---|---|---|
| Not Started | no branch | — |
| In Development | branch created, commits pushing | webhook `push` / commit sync |
| Code Review | PR open, awaiting review | webhook `pull_request_review` |
| Changes Requested | review requested changes | webhook / PR sync |
| Approved | review approved | webhook / PR sync + `review_code` permission |
| Merged | PR merged | webhook / PR sync / merge action |
| Pending QA → QA → QA Passed | (deploy/preview URL from Vercel, optional) | Simpli `qa.ts` (native) |
| Ready for Production → Completed | merged to default branch, deployed | Vercel observer (optional) + gate |

## 7. What to build, in priority order

> ✅ = implemented. Remaining items are the next increments.

1. ✅ **Development Task workspace UI** — `DevelopmentWorkspace.tsx` (Code / Changes / Commits /
   Pull Request / QA tabs) wired into `TaskDetailModal` and `DefectDetailModal` (GitHub tab → "Dev Workspace").
2. ✅ **Read-only code browser** — `api/github/contents.ts` (tree + file contents) + `DevelopmentWorkspace`
   Code tab with file tree, search, and syntax highlighting (registered Prism languages).
3. ✅ **Diff view** — `api/github/compare.ts` + Changes tab (changed files, added/removed lines, per-file patch).
4. ✅ **Commits tab** — reuses `api/github/commits.ts` per branch.
5. ✅ **Pull Request tab** — reuses `api/github/pull-requests.ts` (`action: get` + new `action: review`).
6. ✅ **Review actions** — Approve Review / Request Changes (permission-gated) and Merge
   (uses `api/github/merge.ts`).
7. ✅ **Fix the two known integration bugs** — repositoryId now stored as `owner/repo` everywhere;
   `integrations.ts` connect/sync verifies the token via new `api/github/status.ts`.
8. ✅ **QA tab** — existing `QaWorkPanel` embedded in the workspace.
9. ✅ **Vercel status layer** — read-only deploy observer (`api/vercel/deployments.ts` + workspace **Deploys** tab). Requires `VERCEL_TOKEN`.
10. ✅ **Webhook coverage** — `api/github/webhook.ts` now handles `push` (auto `commits_pushed` +
    commit list) and `pull_request_review` (auto reviewState/reviewers), plus existing
    `pull_request` and `check_run`. Setup guide at `docs/GITHUB-WEBHOOK-SETUP.md`.
11. ✅ **Auto-sync** — periodic/event-driven reconciliation so the workspace refreshes without the
    manual Refresh button (30s interval + shared refresh command).
12. ✅ **UI polish** — PR detail drawer (reviews + checks), PR badges on task/defect lists + kanban
    cards, and a "GitHub Lifecycle" kanban lens grouped by `github.status`.
13. ✅ **GitHub App auth** — `github-helper.ts` now prefers a GitHub App installation token
    (minted via `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY`, optional `GITHUB_APP_INSTALLATION_ID`)
    and falls back to the existing PAT (`GITHUB_TOKEN`/`GITHUB_ACCESS_TOKEN`). JWT signing logic in
    `src/utils/githubAuthLogic.ts` (unit tested).
14. ✅ **Defect ↔ GitHub issue sync** — `api/github/issues.ts` (create/update/close/get) wired into
    the defect create modal (opens an issue when a repository is linked), the defect detail modal
    (linked issue card + close/reopen on status change), the Dev Workspace Issue tab, and the webhook
    (`issues` event → defect `github.issue`). Pure mapping in `src/utils/githubIssueLogic.ts` (tested).
15. ✅ **Groq AI progress reports** — a new **AI Report** tab in `InsightsPage.tsx` compiles a compact,
    grounded snapshot of live app data (`src/utils/reportLogic.ts`, tested) and posts it to
    `api/report.ts`, which calls Groq server-side using `GROQ_API_KEY` (never exposed to the client).
    The model returns a Markdown progress report: health overview, what's working, risks, current
    position, and prioritized recommendations.

## 8. Tech guidance

- **API surface:** all GitHub calls go through the existing `api/github/*` serverless bridge
  (`github-helper.ts`, token server-side only). Add new routes for file tree, file contents, diff
  (e.g. `api/github/contents.ts`, `api/github/compare.ts`) following the same pattern (proxy + CORS + token).
- **No new DB collections required** for the workspace — task `github` sub-doc already holds
  repositoryId/branch/PR. Extended GitHub context (file trees, diffs) is fetched live from the API,
  **not persisted**.
- **Permissions (already in the union):** `develop_work` (create branch/PR, update dev status),
  `review_code` (approve/request changes), `run_qa`, `manage_repositories`, `manage_workflow`.
  Gate every action through the existing `hasPermission` model.
- **Existing workflow engine must not be bypassed:** transitions stay centralized in
  `workflow.ts` + AppContext (the guarded path), so kanban and modals can't drift.
- **Follow the design system:** dark slate palette (`#020617`/`#0F172A`/`#1E293B`, accent `#22C55E`,
  text `#F8FAFC`/`#94A3B8`), Space Grotesk. Micro-interactions from `globals.css`.

## 9. Known bugs to fix first (gate the whole experience)

1. ✅ **Webhook/repo matching mismatch** — **fixed.** `github.repositoryId` is now stored and
   compared as `"${owner}/${repo}"` everywhere (`GitHubPanel.tsx`, `DevelopmentWorkspace.tsx`,
   `RepositoriesPage.tsx`, `api/github/webhook.ts`), so live webhook events attach to work items.
2. ✅ **Integrations connect/sync hardcoded** — **fixed.** `src/utils/integrations.ts` now verifies
   the configured token via the new `api/github/status.ts` (`/user`) instead of a hardcoded repo.

## 10. Definition of done (Phase 1)

- ✅ Opening a Development Task shows: status, GitHub integration context, and a working workspace
  with Code (file tree + highlighted source), Changes (diff), Commits, Pull Request, and QA tabs.
- ✅ Code/changes/commits render **inside Simpli** (not just external links).
- ✅ Approve / Request Changes / Merge work with permission checks and reflect back from GitHub.
- ✅ Task status lifecycle enforced by the central workflow engine; GitHub ladder shown alongside.
- ✅ Both known bugs (§9) fixed; webhooks attach to panel-created work items.
- ✅ Webhooks: `push` (commits_pushed + commits), `pull_request_review` (reviewState/reviewers),
  `pull_request` (pr_open/merged/closed), `check_run` (checkStatus) — branch-scoped and idempotent.
  Pure mapping logic extracted to `src/utils/githubWebhookLogic.ts` with unit tests.
- ✅ Vercel deploy observer (`api/vercel/deployments.ts` + Deploys tab) — read-only, needs `VERCEL_TOKEN`.
- ✅ PR detail drawer (reviews + checks), PR badges on lists/kanban, GitHub-lifecycle kanban lens,
  webhook setup guide (`docs/GITHUB-WEBHOOK-SETUP.md`).
- ✅ `npm run build` passes; 122 tests pass; no DB migration run; no Vercel config change.

## 11. Phase 2 additions

13. ✅ **Groq AI progress reports** — live-data snapshot + Markdown report in Insights
    (`src/utils/reportLogic.ts` + `api/report.ts`, key `GROQ_API_KEY` server env, `GROQ_MODEL`
    default `llama-3.3-70b-versatile`); "Never invent metrics" grounding rule; 7 unit tests.
14. ✅ **Design-system overhaul** — aurora ambient background, glass surfaces (`glass`, `glass-card`,
    `glass-strong`), shimmer-border CTAs, glow primary buttons, active-nav accent bar + tinted icon
    tiles, animated orbiting brand mark (`brand-orb*`), staggered nav entrance. Dark palette
    `#020617`/`#0F172A`/`#1E293B` + `#22C55E`/`#8b5cf6` accents preserved. Applied shell-wide
    (App shell, Navigation, Login, Dashboard, Insights, Kanban toolbar). `prefers-reduced-motion`
    respected.
15. ✅ **Recurring-task auto-recreation** — completing (or directly approving) a recurring task now
    clones the next occurrence automatically: `nextOccurrencePayload` in `src/utils/recurrence.ts`
    advances the due date (respecting `endDate`), resets lifecycle fields (`status: not_started`,
    no `completedAt`/`approvedAt`/`github`), and chains lineage via
    `origin: { source: 'recurrence', parentTaskId }`. Wired into `AppContext` (`spawnRecurringNext`
    invoked from `updateTask` on `completed` and from `approveTask` on direct approval). Assignees
    get a "Recurring Task Recreated" notification; Task Detail modal notes the auto-recreate
    behavior. `TaskOrigin` extended with `parentTaskId`. 4 new unit tests.
