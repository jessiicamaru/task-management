---
name: gh-setup
description: One-time setup for GitHub access in this repo - install and authenticate the gh CLI, or connect the GitHub MCP server, and create the label taxonomy and milestones the issue/PR skills rely on. Use when gh is missing or unauthenticated, when a GitHub MCP tool is unavailable, when "gh: command not found" appears, or when the issue / pr-create / pr-review skills report they cannot reach GitHub.
---

# GitHub access setup

The `gh-issues`, `gh-issue-create`, `gh-pr-create` and `gh-pr-review` skills need a way to talk to
`github.com/jessiicamaru/task-management`. There are two, and **either one is enough**.

## Invocation

`/gh-setup [flags]` — with no flags, run the diagnosis in *Check what works* below and
then walk only the steps that are actually missing.

| Flag | Effect |
| --- | --- |
| `--check` | Diagnose only. Report what works and what is missing; change nothing. |
| `--cli` | Set up Option A (`gh` CLI) only. |
| `--mcp` | Set up Option B (GitHub MCP server) only. |
| `--labels` | Skip access setup; only create the label taxonomy. |
| `--milestones` | Skip access setup; only create the milestones. |
| `--labels --dry-run` | Print the `gh label create` commands without running them. |
| `--repo <owner/name>` | Target a different repo than `jessiicamaru/task-management`. |

Never run the label or milestone block without confirming first — it writes to the real repo.

Check what already works before changing anything:

```bash
gh auth status          # works -> Option A is done
```

If a `mcp__github__*` tool is listed in your available tools, Option B is already done.

---

## Option A - `gh` CLI (recommended, simplest)

The GitHub skills are written against `gh` because it needs no tokens in files and no extra
processes.

### Install

| OS | Command |
| --- | --- |
| Windows | `winget install --id GitHub.cli` |
| macOS | `brew install gh` |
| Debian/Ubuntu | `sudo apt install gh` |

This repo is developed on Windows with Git Bash. After `winget install`, **open a new
shell** — the existing one will not have `gh` on `PATH` yet. If `gh` still is not found,
it lives at `C:\Program Files\GitHub CLI\gh.exe`.

### Authenticate

```bash
gh auth login          # choose: GitHub.com -> HTTPS -> login with a web browser
gh auth status         # confirm
```

Ask for these scopes when prompted: `repo`, `read:org`, `workflow`. `workflow` is not
optional here — this project's CI/CD lives in `.github/workflows/`, and without that
scope any push touching a workflow file is rejected. `read:org` is only needed to request
review from a team rather than a person.

### Verify against this repo

```bash
gh repo view jessiicamaru/task-management --json name,defaultBranchRef
gh issue list --limit 3
gh pr list --limit 3
```

All three must succeed before the GitHub skills will work. On a repo with no commits yet,
`defaultBranchRef` comes back empty and `pr list` is empty — that is expected, not a
failure.

---

## Option B - GitHub MCP server

Use this if you would rather not install a CLI, or you want GitHub tools available as
native tool calls.

### 1. Create a token

Create a fine-grained personal access token at
<https://github.com/settings/personal-access-tokens/new>, scoped to the
`task-management` repository, with these **repository permissions**:

| Permission | Access | Needed for |
| --- | --- | --- |
| Contents | Read-only | reading the diff |
| Pull requests | Read and write | creating PRs, posting review comments |
| Issues | Read and write | filing issues, linking and closing them |
| Workflows | Read and write | pushing changes under `.github/workflows/` |
| Actions | Read-only | reading CI run status on a PR |
| Metadata | Read-only | always required |

Add `Members: Read-only` at the *organisation* level only if you need to request review
from a team.

### 2. Connect it

Project-scoped, so it is shared with anyone who clones the repo. Create `.mcp.json` in
the repo root:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      }
    }
  }
}
```

Then export the token in your shell (or your OS keychain / environment):

```bash
export GITHUB_TOKEN=github_pat_...
```

**Never write the token into `.mcp.json` itself.** `${GITHUB_TOKEN}` is expanded at
load time, which keeps the secret out of git. If you must inline it for a quick test,
add `.mcp.json` to `.gitignore` first. A token committed once stays in the history even
after it is deleted, so treat this as a hard rule. The same rule covers this project's
other secrets — `DATABASE_URL`, `JWT_SECRET` and the Render deploy hook belong in GitHub
Actions secrets and in the Render dashboard, never in a tracked file.

Restart Claude Code, then confirm `mcp__github__*` tools appear.

### 3. If it will not connect

- `claude mcp list` shows configured servers and their status.
- A connection timeout usually means the token is missing or unexported — the header
  resolves to the literal `Bearer ${GITHUB_TOKEN}` and GitHub rejects it.
- A self-hosted alternative is the Docker image `ghcr.io/github/github-mcp-server`;
  use it only if the hosted endpoint is blocked on your network.

---

## Label taxonomy (run once per repo)

The issue and PR skills apply labels from a fixed set. Create it once — the command is
idempotent, so re-running it is safe:

```bash
# type - exactly one per issue or PR, mirrors the Conventional Commit prefix
gh label create "type: feat"     --color 0E8A16 --description "New user-facing capability"        --force
gh label create "type: fix"      --color D73A4A --description "Bug fix"                            --force
gh label create "type: refactor" --color FBCA04 --description "Behaviour-preserving change"        --force
gh label create "type: docs"     --color 0075CA --description "Documentation only"                 --force
gh label create "type: chore"    --color CFD3D7 --description "Tooling, dependencies, scaffolding" --force
gh label create "type: test"     --color BFD4F2 --description "Tests only"                         --force
gh label create "type: ci"       --color 1D76DB --description "GitHub Actions workflows, pipeline" --force

# area - one or more, matches the directory layout of this repo
gh label create "area: api"      --color 1D76DB --description "Express app, routing, middleware, validation" --force
gh label create "area: auth"     --color 5319E7 --description "Authentication, authorization, tokens"        --force
gh label create "area: projects" --color 006B75 --description "Project and membership domain"                --force
gh label create "area: tasks"    --color 0E8A16 --description "Task domain"                                  --force
gh label create "area: db"       --color 8E44AD --description "PostgreSQL schema, migrations, queries, pool" --force
gh label create "area: obs"      --color D4C5F9 --description "Logging, health checks, metrics"              --force
gh label create "area: docker"   --color 0DB7ED --description "Dockerfile, compose, entrypoint"              --force
gh label create "area: ci"       --color C2E0C6 --description "GitHub Actions workflows"                     --force
gh label create "area: deploy"   --color F9D0C4 --description "Render, render.yaml, production config"       --force
gh label create "area: test"     --color BFD4F2 --description "Test harness and suites"                      --force
gh label create "area: docs"     --color 0075CA --description "README, docs/, API reference"                 --force

# risk - only when true; these are what a reviewer should look at first
gh label create "risk: migration" --color E99695 --description "Contains a database migration"   --force
gh label create "risk: breaking"  --color B60205 --description "Breaking API or contract change" --force
gh label create "risk: security"  --color B60205 --description "Touches auth, authz or secrets"  --force

# size - set from the diff stat, see gh-pr-create
gh label create "size: XS" --color C2E0C6 --description "< 50 lines changed"    --force
gh label create "size: S"  --color C2E0C6 --description "50-200 lines"          --force
gh label create "size: M"  --color FEF2C0 --description "200-600 lines"         --force
gh label create "size: L"  --color F9D0C4 --description "600-1500 lines"        --force
gh label create "size: XL" --color E99695 --description "> 1500 lines - split it if you can" --force
```

Verify: `gh label list --limit 50`

GitHub's stock labels (`bug`, `enhancement`, `documentation`, `good first issue`,
`help wanted`) stay in place; they are useful for outside contributors. The skills read
and write the `type:` / `area:` / `risk:` / `size:` set and treat a stock label as an
extra signal rather than a substitute.

---

## Milestones (run once per repo)

The issue skills sort work into delivery phases. Create them once:

```bash
for m in \
  "M1 Foundation|Project scaffold, config, logging, HTTP app shell" \
  "M2 Database|PostgreSQL pool, migrations, schema, seeds" \
  "M3 Auth|Registration, login, JWT, authorization" \
  "M4 Core API|Projects, tasks, validation, API reference" \
  "M5 Testing|Test harness, integration coverage, quality gates" \
  "M6 Containerization|Dockerfile, compose, entrypoint" \
  "M7 CI-CD|GitHub Actions pipelines and image publishing" \
  "M8 Deploy and Docs|Render deployment, runbook, README"
do
  title="${m%%|*}"; desc="${m#*|}"
  gh api repos/jessiicamaru/task-management/milestones \
    -f title="$title" -f description="$desc" >/dev/null 2>&1 \
    && echo "created: $title" || echo "exists or failed: $title"
done
```

Verify: `gh api repos/jessiicamaru/task-management/milestones --jq '.[].title'`

The API returns 422 for a milestone that already exists, which is why the loop swallows
the error rather than stopping.

---

## Repository settings worth doing once

Not required by the skills, but they are what makes the CI/CD in this project mean
anything:

```bash
# protect main once the first workflow is green
gh api -X PUT repos/jessiicamaru/task-management/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F required_status_checks.strict=true \
  -F 'required_status_checks.contexts[]=ci / test' \
  -F enforce_admins=false -F restrictions=null

# secrets the deploy workflow reads
gh secret set RENDER_DEPLOY_HOOK_URL --repo jessiicamaru/task-management
gh secret set RENDER_API_KEY         --repo jessiicamaru/task-management
gh secret set RENDER_SERVICE_ID      --repo jessiicamaru/task-management
```

`gh secret set` prompts for the value on stdin — never pass it as an argument, where it
lands in shell history. Branch protection cannot be applied to a branch that does not
exist yet, so run it after the first push to `main`.

---

## Which path a skill should take

The GitHub skills express every step as a `gh` command. If only the MCP server is
available, use the equivalent `mcp__github__*` tool instead — the mapping is one-to-one
for everything the skills do (list/create/get issues and PRs, add labels, request
reviewers, post review comments). If **neither** is available, stop and point the user at
this file rather than guessing.
