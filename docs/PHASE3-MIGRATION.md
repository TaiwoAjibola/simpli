# Phase 3 — Migration Plan (non-destructive, additive)

Iron rule: **nothing is deleted, reset, or re-seeded.** All changes below are additive field writes or new collections; every existing document keeps its ID and continues to work before and after each step.

---

## 0. Safety procedure (applies to every step)

1. **Back up first** — export the Firestore project to a storage bucket (`gcloud firestore export` or Firebase Console → Firestore → Export) before running the migration. Verify backup exists.
2. **Run on a copy** — run the migration script against a dev/project copy first; verify counts and spot-check docs.
3. **Idempotent & resumable** — every script is idempotent (skip docs that already have the field or were already migrated). Safe to re-run.
4. **Dry-run mode** — script prints what it would change; `--apply` flag does the real writes.
5. **Verify existing functionality after** — run `npm run build`, then manually test login, apps, goals, tasks, APs, defects, QA, kanban, docs, analytics.
6. Migration scripts live in `scripts/migrate*.mjs` (server-side, using `firebase-admin` dev dependency already present). They never touch client data paths.

## 1. What will be ADDED

### New collections (created on first write)
- `repositories` (App → repos)
- `sprints`
- `workDependencies`
- `qaCycles`
- `workTemplates`
- `automations`
- `integrations` (registry metadata; GitHub first)

### New optional fields (written by migration, absent-safe on read)
- `tasks`: `appId?, phaseId?, workType?, code?, sprintId?, followers?, effortHours?, approvedRequired?, github?, origin?, recurrence?`
- `actionPoints`: `appId?, phaseId?, workType?, sprintId?, followers?, source?`
- `defects`: `workType?, phaseId?, goalId?, sprintId?, followers?, github?`
- `goals`: `status?` (fixes ArchivePage)
- `phases`: `order?, isDefault?`
- `apps`: `lifecycle?` (configurable phase template names)
- `comments`: `workKind?` — optional, only if we adopt shared comments (default: no-op, backward compat)

Unless a value is derivable, new fields are left UNSET (not written as empty strings/null) so `onSnapshot` readers and the UI fall back to computed defaults. For fields with a required display default, we write them explicitly (e.g., `workType: 'non-development'`) per the rule "new fields have sensible defaults."

## 2. What will be MODIFIED

Only existing docs get *additional keys* (never removal, never overwrite of existing values):

- **Backfill `appId`/`phaseId` onto tasks**: for each task with `goalId`, look up goal → `appId`, `phaseId`; write `{appId: goal.appId, phaseId: goal.phaseId || undefined}` **unless the key already exists** with a non-undefined value. Goals without appId / tasks without goalId are skipped.
- **Backfill `appId`/`phaseId` onto actionPoints**: same via `goalId` → goal; where the AP has `taskId`, prefer the task's derived `appId`.
- **Backfill onto defects**: `applicationId` already exists (preserved); additionally set `phaseId`/`goalId` = undefined (no-op) — no blind writes. `workType` = `'development'` default (safe default, matches domain).
- **`workType` defaults**: tasks → `'non-development'`; actionPoints → `'non-development'`; defects → `'development'`. Written only when the key is missing.
- **Goal `status`**: derive from linked tasks — all approved/completed → `completed`; some → `in_progress`; none → `pending`; goal with endDate in past & not completed → `on_hold`? (kept simple: `pending|in_progress|completed`). Deferred — can be left unset and computed on read. **Decision: compute on read, optional backfill.**
- **Phases `order`**: assign index by `createdAt` per app (idempotent; only when unset).
- Phase/App: no destructive change.

`notificationRules` events: the union is extended in code; existing rules untouched. No DB change needed for rule docs (they're matched by string).

## 3. What will REMAIN UNCHANGED

- All collection names, document IDs, user UIDs, app/goal/task/subtask/actionPoint/defect/phase/module/expectation/tag IDs, all `*Id` relationships, timestamps, attachments URLs, embedded `activityLogs`, `appDocuments`, notification rules, comments, activities, employees, roles, permissions already granted.
- All existing CRUD helpers and Firestore write paths (only additive new fields added to new writes).
- `mockData.ts`, profiles, docs, analytics, timeline, gate review — untouched.

## 4. How existing records receive new fields

| Record | New field | Source of value | Default if not derivable |
|---|---|---|---|
| task | `workType` | assigned in migration | `non-development` |
| task | `appId`/`phaseId` | from `goalId`→goal | unset (computed via goal on read) |
| task | `code` (DEV-xxxx) | generated during migration only for dev tasks | unset |
| task | `followers`/`sprintId`/`github`/`origin` | only when set by new UI | unset |
| actionPoint | `workType` | migration | `non-development` |
| actionPoint | `appId`/`phaseId` | via `goalId`/`taskId` | unset |
| defect | `workType` | migration | `development` |
| defect | `phaseId`/`goalId`/`sprintId`/`github` | only when set by new UI | unset |
| goal | `status` | computed from tasks | unset (computed on read) |
| phase | `order` | createdAt index per app | undefined |
| app | `lifecycle` | only when configured in UI | undefined → existing 3-stage default |

## 5. How existing relationships are preserved

- `Task.goalId → Goal.appId` still resolvable; new denormalized `appId` is a **cache**, read fallback first is not required. If a goal moves apps (not currently possible), the cache could stale — mitigate: on `updateGoal`, recompute child `appId`s (small, additive update). 
- `ActionPoint.taskId`, `ActionPoint.goalId` unchanged.
- `Defect.applicationId` unchanged; new `phaseId`/`goalId` are additive convenience caches.
- `ModuleExpectation.taskId` unchanged.
- Nothing re-points, renames, or drops an existing FKs.

## 6. Migration script outline

`scripts/migrate-work-fields.mjs` (firebase-admin, server-side):

```js
// pseudo
for each task in coll('tasks'):
  if (!task.workType)            update { workType: 'non-development' }
  if (task.goalId && !task.appId && goal.appId)  update { appId: goal.appId }
  if (task.goalId && !task.phaseId && goal.phaseId) update { phaseId: goal.phaseId }
for each ap in coll('actionPoints'):
  if (!ap.workType) update { workType: 'non-development' }
  if (!ap.appId) { derive from ap.goalId→goal, else derive from ap.taskId→task→goal }
for each d in coll('defects'):
  if (!d.workType) update { workType: 'development' }
for each p in coll('phases'):  // per-app ordering
  index ordered by createdAt; where p.order == null → { order: index }
// goal status: computed on read, not written (keeps writes minimal)
```

Dry-run prints counts; `--apply` writes. Re-runnable.

## 7. Rollback

Because migrations only add keys, rollback = remove the newly-added keys (or simply restore from the Firestore export). No destructive upgrade ever ran at any step. If a step is unsafe, we skip it and the app still functions (all new fields optional).

## 8. Order of operations

1. Backup Firestore.
2. Deploy code that is fully compatible with old AND new fields (read-side defaults) — no migration required before deploy.
3. Run migration scripts in dry-run → verify → apply.
4. Verify: build, login, each module, spot-check docs (`gcloud firestore documents list` or Admin SDK script that prints counts).
5. Introduce new UI/features (Phase 4 slices), testing after each slice.

## 9. Explicitly OUT-OF-SCOPE (no destructive action ever)

- No `deleteAll`, no `emptyField`, no collection drop, no reseed, no fake data generation, no user removal.
- No change to existing seeded roles' current permission arrays (only *new* permissions are offered to admins).