# Phase 2 — Architecture: Unified Work Model

Design principle: **extend, don't rebuild.** Every new capability is implemented as additive fields/collections with sane defaults, so all existing records keep working untouched. The unification is presented through a *virtual* Work layer (UI + helper functions over existing collections), not by destroying the existing `tasks`/`actionPoints`/`defects` collections.

---

## 1. Design decision: virtual Work layer vs merged collection

### Recommended: Keep separate collections + shared federation layer

- `tasks`, `actionPoints`, `defects` remain **separate collections**. Their existing IDs, records, and relationships are preserved verbatim (rule: preserve IDs/relationships).
- Add a **Work federation layer** in the app:
  - A `workType` discriminator field on each item: `task` → `development | non-development`; `actionPoint` → `development | non-development`; `defect` → `development | non-development` (defects are dev by nature but may be triaged; default `non-development` risks nothing).
  - A `commonWorkFields` type + helper functions that map each entity to a uniform shape:

```
Work item (virtual) = {
  id, workKind: 'task' | 'action_point' | 'defect',
  title, description, applicationId, phaseId, goalId,
  assigneeIds[], priority, status, startDate, dueDate,
  tags, comments, attachments, activity, dependencies,
  followers[], sprintId?, source? ('meeting'|'review'|...),
  workType: 'development' | 'non-development',
  backend: reference to the real doc
}
```

- **Why not a single `work` collection?** Merging Firestore collections requires backfilling/copying existing docs, risks ID changes, breaks existing `onSnapshot` code that reads `tasks`, `actionPoints`, `defects` by collection, and violates "do not wipe/rebuild." The federation layer gives the unified UX now, and can later be collapsed if desired.

### Application linkage (new, additive)

Tasks/APs today carry `goalId` (→ app via goal) only. Add optional **denormalized** `appId` and `phaseId` fields to `tasks`, `actionPoints`, `defects`, written at creation/update time, so the Work layer and filters don't need to always join through goals. For existing records, a one-time migration backfills `appId`/`phaseId` from `goalId` where derivable; items without a goal keep `appId` unset (UI falls back to goal-derivation). Backward compatible: everything that reads `goalId` keeps working.

## 2. New entities (additive collections)

| Collection | Purpose | Key fields |
|---|---|---|
| `repositories` | First-class Repository per App | `appId, provider('github'), owner, name, url, defaultBranch, connectionStatus('connected'\|'not_connected'), lastSyncedAt, integrationStatus` |
| `sprints` | Sprint containers | `appId, name, goal?, startDate, endDate, status(planned\|active\|completed)` |
| `workDependencies` | Dynamic dependency graph | `fromId, fromKind, toId, toKind, type(blocks\|blocked_by\|related_to)` |
| `qaRuns` / `qaCycles` | QA cycle history (append-only) | `workKind, workId, cycleNumber, testerId, date, environment, result(pass\|fail), notes, defectsDiscovered[]` |
| `workTemplates` | Repeatable work templates | `name, appId?, workKind(task\|action_point\|defect), fields (title, description, priority, workType, subtasks[], expectations[])` |
| `automations` | Rules/automation engine | `name, enabled, trigger {type, filter}, action[], runHistory[]` (see §10) |
| `integrations` (meta) | Extensible integration registry | `type('github'\|'calendar'\|'slack'\|...), status, configRef` — GitHub is the first; others reserved |
| `workComments` (optional) | If we want defect/AP/cycle comments in one place | `workKind, workId, ...` — **default: no new collection**, reuse existing `comments` (add `defectId?`/`apId?` columns additively) and defect `activityLogs` |

No existing collection is deleted, renamed, or re-seeded.

## 3. Entity relationship map (target state)

```
App (apps)
 ├── Phases (phases) — lifecycle, ordered, configurable
 ├── Goals (goals) — optionally under a Phase
 │    └── Tasks (tasks), ActionPoints (actionPoints) via goalId (preserved)
 ├── Modules (modules) → Expectations (moduleExpectations) → link taskId (evidence)
 ├── Defects (defects) — applicationId (preserved)
 ├── Repositories (repositories) — NEW
 ├── Sprints (sprints) — NEW
 ├── Documents (appDocuments)
 ├── Profiles (embedded: productProfile, operationsProfile, softwareEngineeringProfile)
 └── Tags (tags)

Work federation (virtual layer over tasks / actionPoints / defects):
  - common: appId, phaseId, goalId, workType, assigneeIds, followers[], priority,
            status, dates, tags, comments, attachments, activity, dependencies, sprintId, source
  - Repository → Branch → Commits → Pull Request → Reviews → Checks(CI) → Merge  (githubIntegration sub-doc on tasks/defects, NEW)
  - QA: tasks/defects → qaRuns/qaCycles (NEW)
```

Key links for backwards compatibility:
- `Task.appId`/`phaseId` NEW optional; fallback `goalId → goal.appId / goal.phaseId`.
- `ActionPoint.appId`/`phaseId` NEW optional; `taskId` link preserved.
- `Defect.phaseId`/`goalId` NEW optional; `applicationId` preserved.
- `ModuleExpectation.taskId` preserved; add `workKind` default `task` so an expectation can later point to a defect.

## 4. New / extended fields (additive with defaults)

### Task (extended)
```
workType?: 'development' | 'non-development'            // default 'non-development' (rule: safe default)
appId?, phaseId?, sprintId?                              // defaults undefined; derived fallback
code?: string (e.g. SIM-142)                             // generated on create if dev
followers?: string[]                                     // default []
effort?: number (hours)                                  // default undefined
recurrence?: { frequency: 'daily'|'weekly'|'monthly', interval, endDate? }  // optional
approvedRequired?: boolean                               // default false (non-dev); true for dev
github?: { repositoryId?, branchName?, branchUrl?, commits[], pullRequest?:
          {prNumber, url, state, title, reviewers[], reviewState, checkStatus},
          status: 'not_started'|'branch_created'|'commits_pushed'|'pr_open'|'review'|'qa'|'approved'|'merged'|'closed' }
qa?: { result, testerId, lastCycle, ... }                // umbrella; history stored in qaCycles
origin?: { source: 'meeting'|'review'|'manual'|'action_point'|'template'|'recurrence'|'import',
          actionPointId? }                               // Action Point → Work origin preservation
```

New task statuses (dev workflow) — see §5. Non-dev statuses unchanged.

### ActionPoint (extended)
```
workType?: 'development' | 'non-development'   // default 'non-development'
appId?, phaseId?, sprintId?                     // additive
followers?: string[]
source?: 'meeting'|'review'|'discussion'|'activity'|'manual'  // default 'manual'
```
Note: today an AP *always* creates a backing task when a goal is set. New behavior: leave the auto-task creation as-is for non-dev, but when `workType === 'development'` prefer creating/linking a **development task** (with `origin.actionPointId`).

### Defect (extended)
```
workType?: 'development' | 'non-development'   // default 'development' (defects are code-related by nature)
phaseId?, goalId?, sprintId?
followers?: string[]
github?: same shape as Task.github
qaCycles preserved via qaRuns collection
```

### Goal (extended)
```
status?: 'pending' | 'in_progress' | 'completed' | 'on_hold'   // NEW — fixes ArchivePage
progressSt:[ optional manual %, or computed ]                  // computed, no field needed
milestone?: boolean                                            // additive flag
```

### Phase (extended)
```
order?: number            // lifecycle sequencing/ordering
isDefault?: boolean       // seeded default lifecycle phases
```

### App (extended)
```
lifecycle?: string[]      // NEW optional configurable phase names/template
currentPhaseId?           // optional pointer
portfolioHealth?: computed at other layers
```

## 5. Workflows (task type-aware state machines)

### Development workflow (Task or Defect when workType === 'development')
```
not_started → in_progress → code_review → pending_qa → qa_testing → approved → merged
                  ↑______________|              |
                  |  changes_requested          |→ qa_failed → in_progress
```
- Add new statuses to `TaskStatus` union: `code_review | changes_requested | pending_qa | qa_testing | merged` (additive — TypeScript union widened, existing records default to current statuses).
- Map for kanban columns; old columns (not_started/in_progress/blocked/completed/approved) remain valid.
- `completed` semantics: for dev tasks, "completed" becomes the merge point; QA gates sit between.

### Non-development workflow (unchanged + optional approval)
```
not_started → in_progress → blocked → completed → approved(if approvedRequired)
```

### Workflow engine
- The transition logic stays centralized in AppContext (`updateTask`, `updateDefect`, plus a new `transitionWork` helper) so Kanban drag-drop and detail modals call **the same guarded path** (fixes the current permission/sanctity bypass).
- Allowed transitions per role checked in the engine, enforced in the engine, not just the button.

## 6. Permissions model (extended, backwards-compatible)

Add new permissions to the union (additive — existing roles unaffected until admin grants):
```
develop_work       // create branch/PR, update development status
review_code        // code review approve/request changes
run_qa             // test, record QA, pass/fail
manage_repositories// configure repositories/integrations
manage_sprints
manage_templates
manage_automations
manage_workflow    // configure workflows
view_portfolio     // portfolio/all-apps view (can reuse view_all_apps)
```

### Suggested seed role grants (only additive, no removal)
- **Admin:** everything (all new perms).
- **Manager:** all new perms except `manage_automations` (optional) — keeps control of assign/approve.
- **Developer** (NEW role): `report_defects, handle_defects(open/in_progress/pending_qa only), develop_work, review_code?`.
- **Reviewer** (NEW role): `review_code`.
- **QA** (NEW role): `run_qa, verify_defects, handle_defects(limited)`.
- **Employee:** unchanged; opt-in new perms.

Rules to implement (from user req §40):
- Status transitions permission-checked in engine (develop_work/review_code/run_qa/manage_*).
- `view_assigned_only` finally enforced in My Work / Kanban / Dashboard / Defects / Work list for non-admin.
- Kanban drag-drop must respect the same transition permission logic.
- AdminPanel gets in-component `manage_users` guard.

## 7. Navigation changes (remove redundancy, unify Work)

Target sidebar (Overview / Management):
```
Dashboard        (all)
My Work          (all)        — now a Work inbox: tasks + APs + defects + QA + reviews + approvals + blocked
Applications     (view_all_apps)
Repositories     (manage_repositories)   NEW
Sprints          (view_all_apps)          NEW
Tasks            (view_all_apps)          — central Work area: [List] [Board] [Board unifies task+defect columns]
Defects          (all)
Action Points    (all)
Gate Review      (all)
Portfolio        (view_all_apps)          NEW (kept light — user req §36)
...
Admin Panel      (manage_users)
```

- **Remove the standalone "Kanban Board" nav item**; its capability moves into Tasks (`TasksModule` already has List/Kanban toggle). The board becomes unified Work columns (tasks + defects in one board, per user req §38–39) OR keep a separate defect board under Defects — decision: put defects as a column-group within the Tasks board with the existing App/type filters.
- "My Work" keeps the unread badge but the badge must actually work (subscribe `notifications`, §8).

## 8. Notifications (revive + extend)

- **Subscribe `notifications` collection** in AppContext (additive subscription; it's already written).
- Show a real notification inbox/dropdown in the header or My Work; call `markNotificationRead` on click.
- `createNotification` generalized to resolve recipients for `defect`, `action_point`, `app`, and `work` related types; support followers/watchers as recipients.
- New event types are additive to `NotificationRule.event` union:
  `work_assigned, work_started, work_ready_for_qa, work_qa_failed, work_qa_passed, work_approved, work_merged, work_blocked, branch_created, pr_open, review_approved, review_changes_requested, ci_failed, ci_passed, due_soon, dependency_blocked, expectation_linked`.

## 9. QA subsystem (additive)

- New collection `qaCycles` (append-only history), linked by `{workKind, workId}`.
- New "QA" tab/panel on Work detail: tester, date, environment, result, notes, defects discovered; cycle counter auto-increments.
- Wire `testedBy` write path (currently never written).
- QA statuses integrated into dev workflow: `pending_qa → qa_testing → qa_failed → in_progress` or `qa_passed → approved`.
- Preserve existing `fixVerified`/`activityLogs` on defects — new cycle history sits alongside, not instead.

## 10. Automations (additive, safe engine)

New `automations` collection; engine in AppContext with:
- **Rule example:** `trigger: {event:'pr_opened', filter:{workKind:'task'}}` → `action: [{setStatus:'code_review', notify:{role:'reviewer'}}]` — implemented in a pure function `evaluateAutomation(work, event)`.
- **Safety:** max N executions/second; `runId` + `lastRunAt` dedupe; idempotent checks (event + workId + ruleId) so webhooks/duplicate triggers can't duplicate effects; audit log appended to rule `runHistory`.
- Integrates with GitHub sync events (Part 5) and in-app status changes.

## 11. GitHub integration architecture (Part 5, after Work layer)

- `repositories` collection (above) + backend sync routes under `api/`:
  - `api/github/branches.ts` — create branch
  - `api/github/commits.ts` — list commits for PR/branch
  - `api/github/pull-requests.ts` — open PR, get status, reviews, checks
  - `api/github/merge.ts` — merge PR (authorized)
  - `api/github/webhook.ts` — receive webhook events → update work items idempotently (tracks `githubEventId` to dedupe)
- GitHub token never stored in client; optional `App.githubAccessToken` env on server (or a `SecretManager`-style ref).
- Sync worker (Vercel cron or manual "Sync now" button): pulls commit/PR/CI/review/merge state into `Task.github` / `Defect.github`.
- Automation hooks: PR open → move to Code Review; review approved → Pending QA; CI failed → mark failed & notify; PR merged → `merged` status (GitHub stays source of truth; Simpli never manually forces merged unless webhook missed — then manual re-sync available).

## 12. Portfolio (lightweight, §36)

`PortfolioPage`: table of Apps with derived metrics — current phase/stage, progress %, open defects, pending QA, blocked work, dev activity (recent commits/PRs), upcoming work, overall health (computed from blocked/open-aging/qa-aging). No heavy enterprise machinery; pure derived client-side numbers from existing subscriptions.

## 13. Integration framework (§37)

- `integrations` meta collection + a thin `integrations.ts` registry: each integration implements `{ name, type, status, connect(), sync(), disconnect() }`. GitHub is the first concrete implementation; Calendar/Slack/Drive/Email declared as stubs in config, not implemented.
- All cloud calls go through `api/*`, keeping secrets server-side.

## 14. What remains unchanged (explicit)

- Existing collections, document IDs, user IDs, app IDs, task/AP/defect IDs, goal/phase/module/expectation/tag IDs.
- All CRUD helpers and their Firestore paths.
- All existing UI pages, tabs, profiles, docs, kanban, gates — they keep working with new optional fields absent (defaults on read).
- The permission list grows, existing grants untouched.
- Mock/legacy `mockData.ts` remains unused (no action).

## 15. Implementation order (Phase 4 in slices)

1. **Types + federation layer** (`work.ts` helpers, type unions, defaults).
2. **Safe field backfills** (migration $1–$3).
3. **Work-type on Task/AP/Defect** + My Work unification (federation list + filters).
4. **Notifications revival** (subscribe + inbox + mark read).
5. **Status workflow split** (dev vs non-dev) + engine-guarded transitions + kanban integration.
6. **Dependencies, Sprint, Followers, Effort, Recurrence, Templates, Forms, Automations**.
7. **QA cycles**.
8. **Repositories + GitHub integration** (Part 5) — only after 1–7.
9. **Portfolio + navigation cleanup**.
10. **Verification pass** (§43/§44).