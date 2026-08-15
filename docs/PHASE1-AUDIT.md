# Phase 1 — Audit: Current State of Simpli

Date: 2026-08-14
Scope: Full codebase inspection of `/Users/ajibola/simpli`. Build verified passing (`npm run build`).

---

## 1. Platform & Stack

- **Frontend:** React 18.3 + Vite 6 + Tailwind 4 + shadcn/ui (Radix) + MUI, react-router 7 (not actually used — page state via `useState` in `App.tsx`), react-dnd (kanban), date-fns, recharts, sonner, motion.
- **Backend:** Firebase (Auth, Firestore, Storage). Vercel serverless API functions for admin operations + email.
- **Email:** `api/send-email.ts` via Nodemailer/Gmail app password; rules engine in `AppContext.createNotification`.
- **API functions:** `api/check-user.ts`, `api/firebase-admin.ts` (create/find/delete/update users), `api/send-email.ts`, `api/test-env.ts`.
- **No test framework installed.** `npm run build` is the only verification command. No lint config.
- **No GitHub/Octokit, no sprint board, no repository entity.** GitHub exists only as free-text form fields.

## 2. Navigation & Routing

Single-page app with `currentPage` string state in `App.tsx:29`; `Navigation.tsx` renders a sidebar. No router.

| Nav item | Page | Permission gate (nav-level) |
|---|---|---|
| Dashboard | `Dashboard` | all |
| My Work | `MyWork` | all (+ unread badge — **never populated**, see §8) |
| Kanban Board | `KanbanBoard` | all |
| Analytics | `AnalyticsPage` | `view_all_apps` |
| Timeline | `TimelinePage` | `view_all_apps` |
| Archive | `ArchivePage` | `view_all_apps` |
| Defects | `DefectDashboard` | all |
| Action Points | `ActionPointsPage` | all |
| Gate Review | `GateReview` | all |
| Activities | `ActivitiesPage` | all |
| Apps | `AppsModule` | `view_all_apps` |
| Goals | `GoalsModule` | `view_all_apps` |
| Tasks | `TasksModule` | `view_all_apps` |
| Admin Panel | `AdminPanel` | `manage_users` |

**Redundancy:** Tasks has a List/Kanban toggle *and* there is a separate "Kanban Board" nav item (`KanbanBoard.tsx`). The standalone Kanban also renders defects, Tasks does not. This duplicates board functionality (user requirement §38/§39).

## 3. Data Model (Firestore collections)

AppContext subscribes to 16 collections via `onSnapshot` (`AppContext.tsx:344-378`):
`apps, goals, tasks, subtasks, employees, roles, notificationRules, activities, comments, defects, phases, modules, moduleExpectations, tags, appDocuments, actionPoints`. Plus `notifications` (written only, **not subscribed**).

### Core entities (`types.ts`)

**App** — `id, name, description, createdAt, createdBy, status(active|completed|on_hold), currentStage(pre-development|development|post-development), color?, cardStyle?, planningNotes?, softwareEngineeringProfile?, operationsProfile?, productProfile?`
- Documents: separate `appDocuments` collection.
- Only 3 hard-coded stages — the lifecycle is NOT configurable (user req §7).

**Phase** — `appId, name, details, notes, status(planned|in_progress|completed|on_hold), stage(pre-dev|dev|post-dev), sprintCount?, techStack?, qaCriteria?, deploymentTarget?, startDate?, endDate?, createdAt, createdBy`. Belongs to App.

**Goal** — `appId, phaseId?, name, description, createdAt, startDate?, endDate?`. **No `status` field** (causes bugs, see §9). Tasks hang off goals via `goalId`.

**Module / ModuleExpectation** — Module belongs to App, `status(open|closed)`, `targetDate?`. Expectations belong to Module, `status(pending|achieved|missed)`, optional `taskId` link (Gate Review "evidence"). Gates == Modules with targetDate.

**Task** — `goalId?, name, description, assignedTo[], status(not_started|in_progress|blocked|completed|approved), priority, createdAt, startDate?, dueDate?, endDate?, completedAt?, approvedAt?, approvedBy?, lastEmailSentAt?, tags?, attachments?[]`. **No work type, no appId/phaseId directly (derived via goal), no sprintId, no dependencies, no followers, no comments (separate collection), no QA cycles, no git fields, no effort estimate, no recurrence, no expectation link.**

**Subtask** — `taskId, name, assignedTo[], status(pending|in_progress|completed), priority, createdAt, updatedAt, startDate?, endDate?`.

**ActionPoint** — `title, description?, goalId?, assignedTo[], priority, status(pending|completed|carried_over), weekStart, date, taskId?, completedAt?, completedBy?, createdBy, createdAt, notes?, lastEmailSentAt?, carriedFrom?, tags?`. **No appId/phaseId directly, no work type (always non-dev by behavior), no sprint.**

**Defect** — `defectCode, title, description, applicationId, module, environment, reportedBy, assignedTo (string), dateReported, dueDate?, issueType, severity, priority, reproducibility, frequency, status(open|in_progress|pending_qa|resolved|closed|reopened), resolutionStatus?, fixVerified, verificationDate?, reopenedCount, stepsToReproduce, expectedResult, actualResult, qaComments, developerNotes, testedBy?, testCycle?, rootCause?, attachments?[], activityLogs[] (embedded), createdAt, updatedAt, closedAt?, lastEmailSentAt?`. **No phaseId, no goalId, no work type, no sprint, single QA pass (no cycle history), `testedBy` never written.**

**Employee** — `id, name, email, password, roleId, avatar?, firebaseUid?`.

**Role** — `id, name, permissions[]`. Seed roles (SeedPage.tsx): Admin (13 perms), CEO (5), Manager (6), Employee (`view_assigned_only`, `report_defects`).

**Permissions (15):** `create_app, create_goal, assign_tasks, manage_users, configure_notifications, approve_tasks, view_all_apps, view_assigned_only, report_defects, manage_defects, handle_defects, verify_defects, manage_action_points, manage_modules, manage_documents`.

**NotificationRule** — event-driven email rules (9 task/subtask events), primary/cc recipients, subject/message with `{variables}`, enabled flag.

**Activity** — `type(task_created|task_completed|task_approved|app_created|goal_created), userId, userName, description, timestamp, relatedTo{type,id,name}`. **Very limited type union.**

**Comment** — `taskId?|subtaskId?, userId, userName, content, timestamp`. Comments are not attached to defects or action points (defects embed comments in `activityLogs`).

**Tag** — `appId, name, color, createdAt`. Tags on tasks/APs are tag-id references.

## 4. Workflows

### Task workflow
`not_started → in_progress → (blocked) → completed → approved`. Terminal at `approved`. "Rejection" = moving `completed → not_started`, which fires `task_rejected` notification but does **not** clear `completedAt`. No code-review, QA, merge states. Status transitions in `updateTask` (`AppContext.tsx:746-831`) fire activity + notifications for started/completed/approved/blocked/sent-back.

### Action Point workflow
`pending → completed` or `pending → carried_over` (bumps week +7d). Creating an AP with a `goalId` **auto-creates a backing Task** (same title/desc/goal/assignees/priority, `AppContext.tsx:1311-1321`). AP can also link to an existing task. **APs do not appear in My Work** (`MyWork.tsx` only queries `tasks`). No work type — an AP that is development still lives as a normal Task.

### Defect workflow
`open → in_progress → pending_qa → resolved → closed`, plus `reopened` (transient — AppContext rewrites it to `in_progress` + increments `reopenedCount`). Permission-gated transitions in `DefectDetailModal`:
- `manage_defects`: full set; `handle_defects`: `open/in_progress/pending_qa`; `verify_defects`: Verify Fix (only from `pending_qa`); Reopen requires `manage_defects` + `closed`.
- **Kanban drag-drop bypasses all defect permission checks** (`KanbanBoard.tsx:78-82`) and shares drag type `'TASK'` with tasks → a defect can be dropped into a task column and vice-versa (data corruption risk).
- Single-pass QA: `fixVerified` boolean + auto-close. No QA cycle history, `testedBy` never set.

### Approval
`approveTask` (`AppContext.tsx:833-857`) requires `approve_tasks` at the UI level. No "approval if required" flag for non-dev work.

## 5. Permissions — current state

- Role-based, checked via `hasPermission()` in `AuthContext.tsx:112-115`, live-synced via `onSnapshot` on the role doc.
- `view_assigned_only` is **defined but never enforced** anywhere (MyWork/Kanban scope by `assignedTo`, defects scope only in Kanban; DefectDashboard shows all for the app).
- `updateTask`/`updateActionPoint` are **not permission-guarded server/context-side**; only UI buttons gate. Kanban drag-drop does status changes with **no** permission check.
- AdminPanel itself has **no in-component permission check** — gated only by nav.
- Phase `stage` select, planning-notes save, and profile forms are ungated at the UI level.

## 6. Applications / Documentation / Lifecycle

- `AppDetailsPage` has 4 tabs: **Overview** (header, stage select, phases, planning notes (pre-dev only), modules/expectations), **Engineering** (document upload/list/preview only), **Operations** (`OperationsProfileForm`), **Product** (`ProductProfileForm`).
- `SoftwareEngineeringProfileForm` exists but is **dead code** — the Engineering tab does not use it; the full `SoftwareEngineeringProfile` type is never written.
- `EngineeringDocsSection`: uploads to Storage `appDocs/{appId}/{ts}_{name}`, records in `appDocuments`. Gated by `manage_documents`.
- Lifecycle is the 3-stage enum + user-created Phases. Phase creation auto-advances `app.currentStage` with no confirmation (`AppDetailsPage.tsx:95-97`). No ordering/sequence concept beyond the 3 stages.

## 7. My Work

Only tasks (`getTasksForEmployee` = `tasks.filter(assignedTo.includes(me))`, `AppContext.tsx:1056-1058`). Groups by app → goal → tasks. No action points, defects, QA assignments, approvals, or reviews. Status dropdown + detail modal.

## 8. Notifications

- Rule engine writes to `notifications` collection and sends email via matching `notificationRules`.
- `notifications` collection is **not subscribed** in AppContext (state stays empty) → the nav badge is always effectively 0; `markNotificationRead` is defined but **never called**. There is no notification inbox UI. Admin "Notifications" tab manages *rules*, not the inbox.
- `createNotification` resolves recipients only for `relatedTo.type === 'task'`/`'subtask'`; no defect/AP/app recipient resolution. Subtask events ignore `approver`/`creator` recipient types.

## 9. Known bugs / broken / gaps

1. **ArchivePage never shows goals** — `Goal` has no `status`; `g.status === 'approved'|'completed'` is always false (`ArchivePage.tsx:32,51-65`).
2. **GoalsMilestonesModule inverted phase filter** — `g.phaseId !== filterPhaseId` (`GoalsMilestonesModule.tsx:78`) excludes the selected phase.
3. **`DefectStatus` type not exported** — used but never declared in `types.ts`.
4. **Kanban defect↔task drag collision** — both drag as `'TASK'`; a defect can be dropped into a task column.
5. **Defect `reopened` status never persists** — rewritten to `in_progress` by `updateDefect`.
6. **Notifications never displayed** — badge broken, no inbox.
7. **My Work excludes APs/defects/QA/reviews** — the biggest gap vs user req §11.
8. **No work type** on tasks/APs/defects (user req §3).
9. **No GitHub/repository/branch/commit/PR/review/CI/merge** — everything free-text or missing (user req §13–§21).
10. **No QA cycles, no `testedBy` write** (user req §22–§23).
11. **No dependencies/sprints/followers/effort/recurrence/templates/forms/automation** (user req §25–§33).
12. **Phase filter in GoalsModule inverted**, **progress metrics inconsistent** (AppsModule counts only `approved`; others count `approved||completed`).
13. **`view_assigned_only` never enforced**; **`updateTask` unguarded**; AdminPanel ungated in-component.
14. **`softwareEngineeringProfile` dead code**; **`Module.status` never set to closed** from UI.
15. **Bulk defect creation hard-codes `assignedTo: ''`** and no attachments; single create supports both.
16. **Editing a defect cannot change application** (`DefectCreateModal` edit payload omits `applicationId`).
17. **Duplicated color maps / email actions / status config** across DefectDashboard, DefectDetailModal, KanbanBoard.
18. **No test infrastructure.**

## 10. What is fully/partially/missing

**Fully implemented:** Auth + roles + permissions UI; Apps CRUD; Goals CRUD; Tasks CRUD + list/kanban + subtasks + comments + attachments + tags; Action Points (weekly) CRUD + carry-over + task-linking; Defects (single/bulk) + status workflow + activity logs + email; Phases; Modules/Expectations + Gate Review + Timeline; Documentation (docs upload + Product/Operations profiles); Analytics; Activities feed; notification rule engine + email.

**Partially implemented:** Notifications (write-only); Kanban (permission bypass + type collision); QA (single-pass); goal→phase filtering; My Work (tasks only); permissions enforcement (UI-only, inconsistent); App lifecycle (hard-coded 3 stages).

**Missing:** Work type; GitHub integration (repo/branch/commit/PR/review/CI/merge); QA cycles; dependencies; sprints; workload view; followers; effort/recurrence/templates; structured forms; automations; portfolio view; integration framework; unified My Work.

**Duplicated:** Kanban nav item vs Tasks toggle; defect email/colors/status config; SoftwareEngineeringProfile form (dead); `mockData.ts` (legacy seed, unused at runtime).

## 11. Key file map

| File | Role |
|---|---|
| `src/app/App.tsx` | Page routing via state |
| `src/app/types.ts` | All entities |
| `src/app/context/AppContext.tsx` | Firestore CRUD + notifications + activity + automations (1474 lines) |
| `src/app/context/AuthContext.tsx` | Login, role sync, `hasPermission` |
| `src/app/components/Navigation.tsx` | Sidebar + permission gates |
| `src/app/components/SeedPage.tsx` | Seed roles (only via `?seed=true`) |
| `src/app/components/TasksModule.tsx` | Tasks list/kanban + create (single/multi) + subtasks + attachments |
| `src/app/components/KanbanBoard.tsx` | Standalone drag-drop board (tasks + defects) |
| `src/app/components/MyWork.tsx` | Personal tasks |
| `src/app/components/ActionPointsPage.tsx` | Weekly APs |
| `src/app/components/DefectDashboard.tsx` | Defect table + metrics |
| `src/app/components/DefectDetailModal.tsx` | Defect workflow + activity |
| `src/app/components/AppDetailsPage.tsx` | App tabs: overview/phases/modules, engineering docs, ops, product |
| `src/app/components/GateReview.tsx` | Modules/expectations cross-check |
| `src/app/components/TimelinePage.tsx` | Quarter Gantt + milestones |
| `src/app/components/AdminPanel.tsx` | Employees/roles/notification rules |
| `src/firebase/*` | Config, auth-utils, firestore helpers |
| `src/utils/sendEmail.ts`, `api/*` | Email + admin API |
