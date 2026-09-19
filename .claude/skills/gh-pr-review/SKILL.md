---
name: gh-pr-review
description: Fetch and review a GitHub pull request in this repo - pull the diff, review it through chosen lenses (security, bugs, quality, tests, contracts, docs), rank findings by confidence and impact, and optionally post inline comments or a verdict. Use when the user asks to review, look at, check or comment on a PR, gives a PR number or URL, or asks what changed in a PR.
---

# Review a pull request

Repo: `jessiicamaru/task-management` — a Node.js + Express + PostgreSQL task management API,
containerized with Docker, built by GitHub Actions and deployed to Render. Needs `gh` or the GitHub
MCP server — if neither answers, run `gh-setup`.

## Invocation

`/gh-pr-review [target] [flags]` — `target` is a PR number, a PR URL, or nothing (use
the PR for the current branch). **Default behaviour is read-only**: report findings in
the terminal and post nothing.

| Flag | Effect |
| --- | --- |
| `--pr <n>` | Explicit PR number (same as passing it positionally). |
| `--lens <name>` | Restrict to one lens (repeatable). Default: all. See below. |
| `--severity <level>` | Only report at/above `low\|medium\|high`. Default `low`. |
| `--files <glob>` | Restrict to matching paths, e.g. `--files 'src/modules/**'`. |
| `--since <ref>` | Review only commits after `<ref>` — for re-reviewing a pushed fix. |
| `--incremental` | Shorthand for `--since` the last commit you reviewed on this PR. |
| `--checklist <path>` | Also check the diff against a checklist file. |
| `--comment` | Post findings as inline review comments. **Writes to GitHub.** |
| `--summary` | Post one summary comment instead of inline ones. |
| `--approve` | Submit the review as APPROVE. |
| `--request-changes` | Submit the review as REQUEST_CHANGES. |
| `--dry-run` | With `--comment`, print exactly what would be posted, post nothing. |
| `--format <markdown\|table\|json>` | Output shape. Default markdown. |

Anything that writes to GitHub (`--comment`, `--summary`, `--approve`,
`--request-changes`) must be **confirmed with the user first**, every time. A review
posted under their name is public and hard to walk back. Never approve a PR the user
has not asked you to approve.

## Steps

### 1. Resolve the PR

```bash
gh pr view <n> --json number,title,body,author,baseRefName,headRefName,state,isDraft,labels,files,additions,deletions
gh pr view --json number   # no argument: the PR for the current branch
```

If there is no PR for the current branch, say so and offer `gh-pr-create`.

State up front: number, title, author, base ← head, size, draft status. If it is a
draft, say so — review expectations differ.

Check CI before reading a line of the diff. A review that misses a red pipeline wastes
everyone's time:

```bash
gh pr checks <n>
gh run view <run-id> --log-failed | tail -60      # when something is red
```

### 2. Get the diff

```bash
gh pr diff <n>                       # full patch
gh pr diff <n> --name-only           # file list first, to plan
gh pr view <n> --json commits        # commit-by-commit intent
```

For `--since` / `--incremental`, diff only the new commits — a re-review should look at
the fix as new code, not re-read everything:

```bash
git fetch origin && git diff <since>..<head> -- <paths>
```

Read by logical area (routes and middleware, domain modules, SQL and migrations, tests,
Docker, workflows), not top-to-bottom by filename. Read the PR description and linked
issue first so you review against the stated intent — including the issue's
**Acceptance** section, which is the real specification for the change.

### 3. Lenses

Run all unless `--lens` narrows it.

| Lens | Looks for |
| --- | --- |
| `security` | A route registered without the auth middleware; a caller-supplied `userId` trusted instead of the one on the verified token; an ownership check missing on a task or project the caller does not own; SQL built by string concatenation instead of parameters; a secret, connection string or token in a tracked file; a password hashed weakly or logged; CORS opened to `*` on a credentialed route. |
| `bugs` | Logic that is wrong on a real input. Off-by-one, null and `undefined` paths, timezone and date-boundary handling on `due_date`, unawaited promises, `async` errors escaping an Express handler, a pool client acquired and never released, silently swallowed exceptions. |
| `contracts` | Route path, request body and response shape changes; status codes; pagination envelope; migrations and what they do to existing rows; a new or renamed environment variable that has to reach Render. |
| `tests` | Whether new behaviour is actually covered, and whether a new test would fail without the fix. A test that passes before and after proves nothing. |
| `quality` | Duplication, magic numbers and strings, oversized handlers, business logic leaking into a route file, inconsistent error shapes. |
| `docs` | Code/doc drift: does this change make the README, `docs/deployment-render.md`, the API reference or `.env.example` wrong? |

**Repo-specific things worth checking every time.** These are the failure modes this
stack actually produces, not hypotheticals:

- **A `pg` query built with string interpolation.** Every query takes `$1, $2` parameters.
  A single interpolated filter value is SQL injection even when the caller "obviously"
  sends an integer.
- **An async Express handler without error propagation.** A rejected promise inside a
  bare `async (req, res) => {}` never reaches the error middleware — the request hangs
  until it times out and nothing is logged. Every handler is wrapped, or Express 5's
  built-in forwarding is relied on deliberately and stated.
- **A pool client checked out and not released on the error path.** `pool.connect()`
  inside a transaction needs `finally { client.release() }`; without it the pool is
  exhausted after N failures and the service stops answering — with no error in the log.
- **An authorization check that trusts the request.** The owner of a task comes from the
  verified JWT, never from `req.body.userId` or a query parameter. A route that reads an
  id from the path must still confirm the caller may see that row.
- **A migration that is not backward compatible with the running container.** Render
  rolls a new instance in while the old one still serves traffic; a migration that drops
  or renames a column the old code selects breaks production during the rollout, not
  after it. Expand, deploy, backfill, contract.
- **A new environment variable added to `src/config/` but not to `.env.example`, the
  compose file and the PR's *Environment changes* table.** The deploy boots, fails to
  read it, and restarts in a loop — the most common way this project breaks in
  production, and it is invisible in the diff.
- **A `JWT_SECRET`, `DATABASE_URL` or deploy-hook URL appearing in a tracked file**, a
  test fixture, a workflow `env:` block, or a log line. Flag it as high severity
  regardless of how long it has been there.
- **A workflow using a mutable action tag or an unpinned base image.** `actions/checkout@v4`
  is fine; `some-action@master` is not. `FROM node:22-alpine` is fine for local dev;
  the production image should be pinned to a digest or a patch version.
- **A Dockerfile that runs as root, copies the build context wholesale, or installs
  devDependencies into the runtime image.** `.dockerignore` must exclude `node_modules`,
  `.git` and `.env`; the runtime stage uses `npm ci --omit=dev` and a non-root user.
- **A health endpoint that reports healthy without checking the database.** Render routes
  traffic the moment `/healthz` answers 200; a liveness probe that ignores the pool sends
  users to an instance that cannot serve a single query.
- **A doc under `docs/` left contradicting the change.** Documentation is updated in the
  same change as the code it describes.

### 4. Score before reporting

For each candidate, ask two questions and keep only what survives:

- **Confidence** — have I actually traced this, or am I pattern-matching? If you have
  not read the call chain, either trace it or label the finding UNVERIFIED.
- **Impact** — what breaks, for whom, when? A finding with no concrete failure case is
  a style opinion; mark it as such or drop it.

Rank most severe first. Prefer five real findings over twenty speculative ones. It is a
good outcome to report that a PR is clean.

### 5. Report

Per finding: **severity**, one-sentence defect, `path:line`, the code, the mechanism,
concrete impact, a specific fix. Include a short "checked and sound" list so the author
knows what you covered — a review that is only complaints reads as hostile and hides
what was verified.

### 6. Posting (only when asked)

```bash
# inline, on a specific line of the diff
gh api repos/jessiicamaru/task-management/pulls/<n>/comments \
  -f body='<text>' -f commit_id='<sha>' -f path='<file>' -F line=<n> -f side=RIGHT

# one summary comment
gh pr comment <n> --body-file <tmp>.md

# a verdict
gh pr review <n> --approve
gh pr review <n> --request-changes --body-file <tmp>.md
```

Inline comments must land on a line the diff actually touches, or the API rejects them.
Show the user the exact text before posting. With `--dry-run`, print and stop.

## Reading a PR without reviewing it

If the user only wants to know what a PR does, answer from steps 1–2 and stop. Do not
volunteer a full audit they did not ask for.
