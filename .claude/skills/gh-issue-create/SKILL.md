---
name: gh-issue-create
description: File a GitHub issue in this repo - turn a finding or a planned piece of work into a title, a body carrying the evidence, and the right type/area/risk labels, checking for duplicates first. Use when the user asks to create, open, file or raise an issue, says "make a ticket for this", or wants something they just found written down instead of fixed now.
argument-hint: "Optional: what the issue is about, plus flags"
---

# File an issue

Repo: `jessiicamaru/task-management` — a monorepo holding `server/` (Node.js + Express + PostgreSQL
API) and `web/` (React + Vite client), containerized with Docker, built by GitHub Actions and
deployed to Render. Needs `gh` or the GitHub MCP server — if neither answers, run `gh-setup` instead
of guessing.

## Invocation

`/gh-issue-create [what it is about] [flags]` — with no flags: infer everything, show the assembled
issue, and **ask once** before creating.

| Flag | Effect |
| --- | --- |
| `--title "<text>"` | Use this title verbatim instead of deriving one. |
| `--label <label>` | Add this label (repeatable), on top of the inferred ones. |
| `--no-label` | Apply no labels at all. |
| `--assign <user>` | Assign it (repeatable). `--assign @me` for yourself. |
| `--milestone <name>` | Attach to a milestone (`M1 Foundation` … `M8 Deploy and Docs`). |
| `--relates <n>` | Reference another issue or PR (repeatable) without closing it. |
| `--blocked-by <n>` | Record a dependency in the body (repeatable). |
| `--dry-run` | Print title, body, labels and the exact `gh` command. Create nothing. |
| `--yes` | Skip the confirmation prompt (for non-interactive runs). |
| `--web` | Open the issue in a browser once created. |

`--dry-run` is the safe way to preview.

## Steps

### 1. Preconditions

```bash
gh auth status
```

No git state matters — an issue is not tied to a branch, and filing one never touches the working
tree. Do **not** refuse on a dirty tree the way `gh-pr-create` does.

### 2. Understand what is being filed

If the user gave the subject, use it. If they said only "file that" or "make an issue", the subject
is whatever was just being discussed — say which finding you took it to mean before writing
anything, so a wrong reading is caught in one line rather than in a finished issue.

Decide what kind of thing it is, because it drives the title prefix and the shape of the body:

| Kind | Looks like | Prefix |
| --- | --- | --- |
| **Defect** | Something behaves wrongly, or data says something untrue | `fix(<scope>):` |
| **Missing capability** | Something was never built, and its absence shows | `feat(<scope>):` |
| **Debt** | Works, but is duplicated, dead, or contradicts a decision | `refactor(<scope>):` or `chore:` |
| **Pipeline** | CI/CD workflow, image build, deploy automation | `ci:` |
| **Documentation** | Docs disagree with the code | `docs:` |

### 3. Gather the evidence *before* writing

This is the step that separates a useful issue from a complaint: **a claim the reader cannot check
is an assertion, not a finding.**

Run the thing that shows the problem, and keep the output:

```bash
# the query, grep, request or log line that demonstrates it
grep -rn "requireAuth" src/modules/tasks/
docker compose exec db psql -U postgres -d taskdb -c "\d+ tasks"
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/v1/tasks
docker compose logs api --since 5m | tail -40
gh run view <run-id> --log-failed | tail -40      # for a CI failure
```

If you cannot produce evidence, say so in the issue rather than dressing up a suspicion as a fact.
"I believe X, but have not reproduced it" is a perfectly good issue; "X is broken" without proof is
not.

For a **planned** piece of work rather than a defect, there is nothing to reproduce. Replace the
evidence with the constraint that makes the work necessary — the endpoint it unblocks, the
deployment step that cannot run without it, the issue it is blocked by.

### 4. Title

Conventional Commits with a scope, matching this repo's history — so the commit and PR that
eventually close it fall straight out of the title:

- Scope is the module or concern touched: `api`, `auth`, `users`, `projects`, `tasks`, `db`,
  `config`, `health`, `web`, `ui`, `docker`, `ci`, `deploy`, `docs`, `test`. Frontend work takes
  `web` (or `ui` for the design system) even when it is about tasks or auth — the scope says where
  the change lives, and `area:` labels carry the domain.
- Say the **symptom or the outcome**, not the fix. `fix(tasks): status filter ignores in_progress`
  beats `fix(tasks): add status to WHERE clause` — the second decides the solution before anyone
  has looked.
- Imperative or declarative, no trailing period, ≤ 72 chars.

### 5. Body

```markdown
## What happens

{{The symptom, or for planned work, what does not exist yet. From the reader's point of view. Lead
with what is untrue or missing, not with the code.}}

## Why

{{The cause, with the evidence from step 3 pasted in — the command and its real output. For planned
work: why now, and what it unblocks.}}

## What needs building

{{Numbered. Each item small enough to review. Name the files or paths it will touch, so whoever
picks it up does not have to re-derive the layout.}}

## Worth deciding while building it

{{Questions the implementer will hit that this issue does not settle. Delete the section if there
genuinely are none — but there usually are, and burying them costs more than asking.}}

## Acceptance

{{Checkable outcomes, not implementation steps. Each one something someone could verify without
reading the diff — a request and its status code, a migration that applies and rolls back, a
workflow run that goes green.}}

## Depends on

{{`#N` for each issue that must land first. Delete if independent.}}

## Context

{{Where this was found, and anything already known to be wrong about earlier claims. If a doc or a
spec says something this contradicts, say so here.}}
```

Delete a section rather than writing "N/A". Paste real output, not a paraphrase of it.

### 6. Labels

Same taxonomy as `gh-pr-create`, minus size:

- **type** — exactly one, from the prefix chosen in step 2.
- **area** — one or more, from the paths involved:

  | Path | Label |
  | --- | --- |
  | `server/src/app.js`, `server/src/middlewares/`, `server/src/routes/` | `area: api` |
  | `server/src/modules/auth/`, `server/src/modules/users/` | `area: auth` |
  | `server/src/modules/projects/` | `area: projects` |
  | `server/src/modules/tasks/` | `area: tasks` |
  | `server/src/db/`, `server/migrations/` | `area: db` |
  | `server/src/config/logger.js`, `server/src/modules/health/` | `area: obs` |
  | `web/src/` generally | `area: web` |
  | `web/src/components/ui/`, `web/src/styles/`, tokens and a11y | `area: ui` |
  | `web/src/features/auth/` | `area: web` **and** `area: auth` |
  | `web/src/features/tasks/` | `area: web` **and** `area: tasks` |
  | `server/Dockerfile`, `web/Dockerfile`, `docker-compose*.yml`, `.dockerignore`, `docker/` | `area: docker` |
  | `.github/workflows/`, `.github/dependabot.yml` | `area: ci` |
  | `render.yaml`, production env, deploy scripts | `area: deploy` |
  | `server/tests/`, `web/src/**/*.test.*`, `vitest.config.*` | `area: test` |
  | `e2e/`, `playwright.config.*` | `area: e2e` |
  | `README.md`, `docs/`, any `*/README.md` | `area: docs` |

  A frontend issue carries `area: web` **plus** the domain it touches, so filtering by
  `area: tasks` finds both halves of a feature.

- **risk** — only when true. `risk: security` for anything touching authentication, authorization,
  password hashing, tokens, CORS or secrets; `risk: breaking` when it changes the shape of a
  response, a route path or an environment variable other code already depends on;
  `risk: migration` when it will need a schema change.

**No `size:` label.** Size is computed from a diff, and an issue has none. Guessing one before the
work exists is a number nobody should trust.

If a label does not exist, run `gh-setup --labels` rather than creating ad-hoc labels that fragment
the taxonomy.

### 7. Milestone

Work in this repo is phased, and an unassigned issue disappears. Pick the earliest milestone whose
description covers it:

Milestones are **vertical slices**: a capability's endpoints and its screens belong to the same one.
Do not file the API half into one milestone and the UI half into a later one — that is the habit
this structure exists to prevent.

| Milestone | Covers |
| --- | --- |
| `M1 Foundations` | scaffold for both apps, config, logging, error contract, HTTP shell, health, validation, design tokens |
| `M2 Data layer and API client` | pool, migration tooling, schema, indexes, seed, password hashing, the web API client |
| `M3 Auth end-to-end` | registration, login, JWT, refresh, authorization, rate limiting, web session and auth screens |
| `M4 Projects end-to-end` | projects, membership, the role matrix, and the UI that renders it |
| `M5 Tasks end-to-end` | tasks, listing, transitions, comments, OpenAPI, board and task detail |
| `M6 Containerization and local stack` | Dockerfile, image hygiene, entrypoint, compose running both apps |
| `M7 Testing and quality gates` | test harnesses, integration and component suites, Playwright, coverage gates |
| `M8 CI pipeline` | workflows, path filters, image publishing, scanning |
| `M9 Deploy and docs` | Render blueprint and static site, deploy on green, hardening, guides, ADRs |

A defect found in shipped code belongs in the milestone that is currently open, not the one that
originally built the code.

### 8. Duplicate check

```bash
gh issue list --state open --limit 50 --json number,title,labels,milestone
gh issue list --state closed --limit 20 --json number,title   # it may have been filed and rejected
```

Warn on a plausible match and let the user decide. A closed duplicate matters as much as an open
one: somebody may already have decided this is not worth doing, and that decision deserves reading
before it is reopened by accident.

### 9. Create

```bash
gh issue create \
  --title "<title>" \
  --body-file <tmp>.md \
  [--label "type: feat" --label "area: tasks" ...] \
  [--milestone "M4 Core API"] \
  [--assign <user>]
```

Write the body to a temp file in the scratchpad, not the repo. Passing it inline mangles newlines
and backticks on Windows.

When filing several issues in one pass, create them in dependency order and **capture each number
as you go** — a "Depends on #N" line pointing at an issue that does not exist yet is worse than no
line at all. If an ordering forces a forward reference, file the issue first and add the reference
with `gh issue edit <n> --body-file <tmp>.md` afterwards.

### 10. Report

Give the URL, the labels and milestone applied, and anything you deliberately left out —
particularly a claim you could not produce evidence for. That is the part the reader most needs
flagged.

## Guardrails

- **Do not file what you can fix in the time it takes to file it.** A one-line correction with an
  obvious fix belongs in a commit, not a ticket. Filing is for work somebody has to schedule.
- **Do not invent acceptance criteria you cannot check.** An unverifiable criterion makes the issue
  impossible to close honestly.
- **Do not decide the solution in the title.** Describe what is wrong or what is wanted; let whoever
  picks it up choose how.
- **One issue per finding.** Two unrelated problems in one ticket means one of them gets forgotten
  when the other is fixed.
- **Never paste a real secret into an issue.** A `DATABASE_URL`, a `JWT_SECRET`, a Render deploy
  hook or an Actions token in an issue body is public the moment it is posted. Redact to
  `postgres://user:***@host/db` and say what you redacted.
- **Say when a claim is unverified.** An issue built on a guess that reads like a fact wastes the
  next person's afternoon.

## Related

- `gh-issues` — browse, read and pick up issues, including branching from one
- `gh-pr-create` — the PR that closes it; put `Closes #N` in its description
- `speckit-taskstoissues` — converts an existing feature's `tasks.md` into issues. Use that for a
  planned feature that already has a spec; use this skill for a finding or a task that has none
- `dev-new-session` — for work large enough to deserve a spec rather than a ticket

## Branch naming, when the issue is picked up

Including the number lets `gh-pr-create` link it automatically: `fix/12-task-status-filter`. A
feature opened through `dev-new-session` uses `NNN-short-name` instead and links its issue by hand —
the two conventions coexist on purpose, one for tickets and one for specs.
