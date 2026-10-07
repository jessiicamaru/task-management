# Commit messages

Every commit follows [Conventional Commits](https://www.conventionalcommits.org/). It is enforced
by a `commit-msg` hook (commitlint), installed automatically by `npm ci` in `server/`. The PR and
issue skills read the prefix to pick the PR title, the `type:` label and the badges, so a message
off the convention turns all of those into guesses.

```
<type>(<scope>): <subject>

<optional body: why, not what>

<optional footer: Closes #12, BREAKING CHANGE: …>
```

- **Subject**: imperative or declarative, lower case, no trailing period, ≤ 72 characters.
- **Scope**: optional, but if present it must be from the list below — unknown scopes are an
  error, not a warning. A change spanning several areas takes the **domain** scope
  (`feat(tasks):`), not two scopes.

## Types

`feat` · `fix` · `refactor` · `perf` · `test` · `docs` · `build` · `ci` · `chore` · `style` · `revert`

## Scopes

| Scope | Use for |
| --- | --- |
| `api` | Express app, routing, middleware shared across modules |
| `auth` `users` `projects` `tasks` `health` | That API module |
| `db` | Pool, transactions, migrations, seed |
| `config` | Environment loading and validation |
| `obs` | Logging, correlation ids, metrics |
| `web` | The React client in `web/` |
| `ui` | The design system inside `web/` |
| `docker` | Dockerfiles, compose, entrypoints |
| `ci` | GitHub Actions |
| `deploy` | Render, `render.yaml`, production config |
| `docs` | Documentation under `docs/` or READMEs |
| `test` `e2e` `quality` | Test suites, end-to-end tests, quality gates |
| `tooling` `repo` `setup` | Linting, hooks, repository layout, one-time setup |
| `specs` | Spec Kit artifacts under `specs/` |

The list lives in [`server/commitlint.config.js`](../server/commitlint.config.js); add a scope
there and here in the same change.

## Examples from this repository

```
chore(repo): scaffold the Node.js API project, npm scripts and directory layout
chore(tooling): ESLint 9 flat config, Prettier and EditorConfig
docs(specs): add spec, plan and tasks for commit hooks (#3)
```

## Pre-commit

The `pre-commit` hook runs `lint-staged` on staged files under `server/`: `*.js` gets
`eslint --fix` then `prettier --write`; JSON and YAML get `prettier --write`. Fixes are added to
the commit; an error ESLint cannot fix blocks it. Tests do **not** run here — a hook slow enough to
be bypassed trains everyone to bypass it. CI runs them.

## Bypassing — `--no-verify`

`git commit --no-verify` skips both hooks. Acceptable only when the hook itself is what is broken
(for example a tooling upgrade mid-flight), or for a throwaway local commit you will rewrite before
pushing. It is never a way to land a message off the convention or a lint error: CI runs the same
lint, and the PR title is derived from the commits.
