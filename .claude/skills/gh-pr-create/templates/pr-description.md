# PR description templates

One shared skeleton with five variants. Fill from real evidence; **delete any section
that does not apply** rather than writing "N/A" — empty headings make a PR harder to
read, not more complete.

Placeholders look like `{{this}}`.

---

## Badge row (top of every PR, omit with `--no-badge`)

Mirrors the labels. Colours match the label taxonomy in `gh-setup`.

```markdown
![type](https://img.shields.io/badge/type-{{type}}-{{type_color}})
![area](https://img.shields.io/badge/area-{{area}}-{{area_color}})
![size](https://img.shields.io/badge/size-{{size}}-{{size_color}})
{{risk_badges}}
```

| Field | Values → colour |
| --- | --- |
| `type` | feat→0E8A16, fix→D73A4A, refactor→FBCA04, docs→0075CA, chore→CFD3D7, test→BFD4F2, ci→1D76DB |
| `area` | api→1D76DB, auth→5319E7, projects→006B75, tasks→0E8A16, db→8E44AD, obs→D4C5F9, web→61DAFB, ui→F9A8D4, docker→0DB7ED, ci→C2E0C6, deploy→F9D0C4, test→BFD4F2, e2e→FBCA04, docs→0075CA. Join several with `%20%7C%20`. |
| `size` | XS/S→C2E0C6, M→FEF2C0, L→F9D0C4, XL→E99695 |
| `risk_badges` | Only when true. e.g. `![risk](https://img.shields.io/badge/risk-migration-E99695)` |

Spaces in a badge label must be `%20`; a literal `|` must be `%7C`.

---

## Base skeleton

```markdown
{{badge_row}}

## Summary

{{One paragraph: what this changes and why. Written for someone who has not read the
issue. Lead with the user-visible effect, not the implementation.}}

{{Closes #N   |   Refs #N   |   omit the line entirely if no issue}}

## What changed

{{Group by area, not by file. Each bullet says what now behaves differently.}}

- **API** (`server/`) — {{routes, middleware, validation}}
- **Database** — {{schema, migrations, queries}}
- **Web** (`web/`) — {{screens, state, components}}
- **Infra** — {{Docker, workflows, Render config}}

{{Delete the headings this PR does not touch.}}

## Verification

| Check | Where | Result |
| --- | --- | --- |
| `npm run lint` | server / web | {{0 errors / n warnings}} |
| `npm test` | server / web | {{n passed / n failed, or "no suite touched"}} |
| `npm run typecheck` | web | {{clean, or "not touched"}} |
| `npm run build` | web | {{bundle built, size delta, or "not touched"}} |
| `npm run migrate:up` / `migrate:down` | server | {{applied and rolled back cleanly, or "no migration"}} |
| `docker compose up --build` | root | {{API healthy at /healthz, UI at :5173, or "not run"}} |
| Manual / curl / click-through | — | {{what you actually exercised, or "not run"}} |

Delete the rows for an application this PR does not touch — but do not delete a row simply because
you did not run it. Say "not run" instead; that is the information a reviewer needs.

{{Paste the real output for anything surprising. If a check was not run, say so here —
do not leave the row out.}}

## Environment changes

{{Every new or renamed variable, and where it has to be set: `.env.example`,
`docker-compose.yml`, the GitHub Actions secrets, the Render dashboard. Delete the
section only if the diff adds none — a variable that exists in code but nowhere in
Render is a deploy that boots and then dies.}}

| Variable | Required | Default | Set in |
| --- | --- | --- | --- |
| {{APP_VAR}} | {{yes/no}} | {{value or none}} | {{.env.example, Render, Actions secret}} |

## Review notes

{{Optional but valuable: where to start reading, a decision you are unsure about, an
alternative you rejected and why. Delete if you genuinely have nothing.}}

## Checklist

- [ ] Behaviour that cannot be checked by hand has an automated test
- [ ] `npm run lint` and `npm test` pass locally
- [ ] Every new environment variable is in `.env.example` **and** noted above for Render
- [ ] A `VITE_*` variable added here contains nothing secret (they are public in the bundle)
- [ ] If the API origin or the site origin changed, `CORS_ORIGINS` and `VITE_API_URL` were both updated
- [ ] No secret, token, connection string or `.env` file added to a tracked file
- [ ] New or changed endpoints validate their input and return the project's error shape
- [ ] Any query added to a hot path is covered by an index, or the absence is justified
- [ ] Docs under `docs/` or the README that this change contradicts were updated here
```

Only tick a box you have actually verified. An unticked box with a one-line reason is
useful; a ticked box that is not true is worse than no checklist.

---

## Variant: feature

Insert after **What changed**:

```markdown
## How to try it

{{Numbered steps a reviewer can follow from a clean checkout. Name the seed account or
fixture needed.}}

1. `cp .env.example .env`
2. `docker compose up --build`
3. `docker compose exec api npm run migrate:up && docker compose exec api npm run seed`
4. {{the curl that shows the new API behaviour, with its expected response}}
5. {{the click-through in the UI at http://localhost:5173, signed in as alice@example.com}}

## API surface

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| {{POST}} | {{/api/v1/tasks}} | {{bearer}} | {{what it does, and the status codes it can return}} |
```

A UI change ships with a screenshot — before and after, in both themes when the change is visual.
For a server-only change, keep a capture only when it genuinely helps: a pgAdmin row, an Actions run
summary, terminal output.

---

## Variant: bugfix

Replace **Summary** with:

```markdown
## The bug

{{What went wrong, from the user's point of view.}}

**Reproduce (before this PR):**
{{Exact request or input, and the wrong output. Paste it.}}

## Root cause

{{The actual mechanism, with a `src/path/to/file.js:line` citation. Not "fixed a typo" —
say what the code did and why that was wrong.}}

## The fix

{{What now happens instead, and why this addresses the cause rather than the symptom.}}

**After:**
{{Same steps, correct output. Paste it.}}
```

Add a regression-test line to the checklist:

```markdown
- [ ] A test now fails without this fix (negative control run)
```

A bugfix PR without that control is worth flagging — a test that passes both before and
after proves nothing.

---

## Variant: refactor

Insert after **Summary**:

```markdown
## Behaviour is unchanged because

{{How you know. Ideally: the same tests pass untouched. If a test had to change, say
which and why — that is the interesting part of a refactor.}}
```

---

## Variant: docs

Trim to **Summary**, **What changed**, and:

```markdown
## Accuracy

{{Docs drift. State what you verified against the code, and how — a command you ran, a
file you read, a deployment you actually walked. Say plainly if any part is aspirational
rather than descriptive.}}
```

Drop the build/test table; keep the secrets checklist line.

---

## Variant: chore

Trim to **Summary**, **What changed**, **Verification**. For dependency bumps, name the
version moved from → to and whether anything downstream changed. For a workflow change,
link the run that proves it works:

```markdown
**Proof the pipeline still works:** {{URL of the Actions run on this branch}}
```

A CI change merged without a green run on its own branch is a guess.

---

## Migration warning (add whenever the diff adds a migration)

Put this directly under the badge row so it cannot be missed:

```markdown
> [!WARNING]
> **Contains a database migration:** `{{migration_file}}`
> Applied on deploy by the container entrypoint (`npm run migrate:up`), so it runs
> against the Render database as soon as this merges.
> - Rollback: `{{npm run migrate:down, or "irreversible - explain why"}}`
> - {{If it backfills, rewrites or drops existing rows, say exactly what it does to them.}}
```

Expand-then-contract is the rule for anything destructive: add the new column, deploy,
backfill, and only drop the old one in a later PR. A single migration that drops a column
the currently running container still selects will break production during the rollout
window, not after it.

---

## Breaking change (add whenever a route, response shape or env var changes)

```markdown
> [!CAUTION]
> **Breaking:** {{what breaks, and for whom — an API client, an existing row, a stored
> token, a Render environment variable that no longer exists.}}
> **Migration path:** {{what a consumer, or whoever runs the deploy, has to do.}}
```
