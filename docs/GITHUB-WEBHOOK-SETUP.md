# GitHub Webhook Setup

This repo ships a GitHub webhook receiver at `api/github/webhook.ts` that maps
push / pull_request / pull_request_review / check_run / issues events onto
Simpli work items (tasks + defects) linked by repository **and** branch name,
idempotently.

This document covers the manual GitHub-side setup — the payload URL, events,
and the shared secret — plus what the receiver does with each event.

## 1. Required environment variables (Vercel)

| Variable | Purpose | Needed |
| --- | --- | --- |
| `GITHUB_WEBHOOK_SECRET` | HMAC secret used to verify `X-Hub-Signature-256` on every request | Required |
| `FIREBASE_PROJECT_ID` | Project id for the app's Firestore database | Required |
| `FIREBASE_CLIENT_EMAIL` | Service-account email for firebase-admin | Required |
| `FIREBASE_PRIVATE_KEY` | Service-account private key (escaped, `\n` as literal `\n`) | Required |

> `GITHUB_WEBHOOK_SECRET` is **not** stored in the local `.env` — it must be
> added in the Vercel project settings (Settings → Environment Variables) for
> the production/hidden environment, exactly matching the value used when
> creating the webhook on GitHub.

## 2. Create the webhook on GitHub

1. Open the repo → **Settings → Webhooks → Add webhook**.
2. **Payload URL** — point it at the deployed route of this app
   (a Vercel function lambda):
   ```
   https://<your-app-domain>.vercel.app/api/github/webhook
   ```
   For local testing, use a tunnel (e.g. `ngrok http 3000`) and append
   `/api/github/webhook`.
3. **Content type** — select `application/json` (the handler parses JSON bodies).
4. **Secret** — paste the same value as `GITHUB_WEBHOOK_SECRET`.
5. **Which events** — select "Let me select individual events" and check the
   events the receiver consumes:
   - `Push`
   - `Pull requests`
   - `Pull request reviews`
   - `Check runs`
   - `Issues` (only if you use the Defect ↔ GitHub issue sync)
6. Click **Add webhook**. GitHub immediately sends a `ping` event; the handler
   acks it with `{ ack: true }` (no matches), so a green "recent deliveries "
   tick on the webhook confirms the URL + secret are correct.

## 3. What the receiver does per event

The handler looks up all tasks and defects whose
`github.repositoryId === "owner/repo"` (the payload's `repository.full_name`),
then filters to items whose `github.branchName` matches the event's branch:

| Event | Branch determined from | Effect on matching work items | Dedupe id |
| --- | --- | --- | --- |
| `push` | `ref` (`refs/heads/<branch>`) | Merge payload commits into `github.commits[]` (deduped by sha); sets `github.status = commits_pushed` | `push:<after-sha>` |
| `pull_request` | `pull_request.head.ref` | open+draft=false → `github.pullRequest{prNumber,url,state:'open',title}` + `status = pr_open`; merged → `state:'merged'` + `status = merged`; closed → `status = closed` | `pr:<pull_request.id>` |
| `pull_request_review` | `pull_request.head.ref` | Sets `github.pullRequest.reviewState` (`approved` / `changes_requested` / `pending` for comments) and appends `reviewer` login | `review:<review.id>` |
| `check_run` | `check_run.head_branch` | Sets `github.pullRequest.checkStatus` (`success` / `failure`) | `check_run:<check_run.id>` |
| `issues` | — (issue scope) | For a defect whose `github.issue.issueNumber` matches the issue: sets `github.issue` state to `closed`/`open` and `github.status` to `closed`/`pr_open` | `issue:<issue.id>` |
| anything else (`ping`, etc.) | — | Acked and ignored | `${eventType}:<ts>` |

> `issues` is not branch-scoped. It only updates defects already linked to that
> issue number (the link is created when the defect is created on GitHub), so
> unlinked work items are never touched.

Idempotency: every accepted event writes a doc to the `events` collection
keyed by the dedupe id above, so re-deliveries (GitHub retries on non-2xx) are
applied at most once.

## 4. GitHub App auth (optional, preferred)

All `/api/github/*` routes authenticate with a **PAT** by default
(`GITHUB_TOKEN` or `GITHUB_ACCESS_TOKEN`). To use a GitHub App instead —
so token expiry is handled automatically and permissions are scoped to an
installation — set these server-side env vars:

| Variable | Purpose | Needed |
| --- | --- | --- |
| `GITHUB_APP_ID` | GitHub App ID (number, as string) | Only for App auth |
| `GITHUB_APP_PRIVATE_KEY` | App's private key PEM (escaped, `\n` as literal `\n`) | Only for App auth |
| `GITHUB_APP_INSTALLATION_ID` | Optional; when unset the first installation is auto-selected | Only for App auth |

When `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY` are present, `github-helper.ts`
mints a short-lived installation token (RS256 JWT → `POST /app/installations/{id}/access_tokens`),
caches it until ~60s before expiry, and **falls back to the PAT** otherwise.
`api/github/status.ts` reports the active `authMode` (`app` | `token`).

## 5. Troubleshooting

- **401 Invalid signature** — `GITHUB_WEBHOOK_SECRET` on Vercel doesn't match
  the webhook secret, or `Content type` isn't `application/json`.
- **No work item updated** — the repo matches but `github.repositoryId` is not
  the exact `owner/repo` string, or no task/defect has that `branchName`.
- **One event updates nothing but another does** — the branch-scope filter
  (`github.branchName === event branch`) is case-sensitive; confirm the value
  stored on the task matches the branch name exactly.
- **Check GitHub → Settings → Webhooks → Recent deliveries** for the raw
  request/response; a `500` means a missing Firebase env var or firebase-admin
  auth failure.