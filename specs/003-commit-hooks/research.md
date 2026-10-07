# Research: Commit hooks

## R1 — Husky in a monorepo subdirectory

- **Decision**: `"prepare": "cd .. && husky server/.husky"`; hooks in `server/.husky/`, each starting with `cd server`.
- **Rationale**: Husky's documented subdirectory setup. Husky sets `core.hooksPath` at the git root.
- **Alternatives considered**: Root `package.json` — the repo deliberately has none; each app is self-contained.

## R2 — Installs without git

- **Decision**: Keep plain `husky` in `prepare`. Husky 9 exits 0 and prints a notice when `.git` is absent; the Dockerfile (#37) should still use `npm ci --omit=dev --ignore-scripts` or `HUSKY=0`.
- **Note for #37**: set `HUSKY=0` or `--ignore-scripts` in the image build.

## R3 — commit-msg path

- **Decision**: In the hook, resolve `$1` to an absolute path before `cd server`, then `npx --no -- commitlint --edit "$abs"`.
- **Rationale**: git passes a path relative to the repo root (or absolute in some worktree setups); after `cd server` a relative path breaks.

## R4 — lint-staged version

- **Decision**: `lint-staged@^16`.
- **Rationale**: v17 declares `engines.node >=22.22.1`; the project floor is `>=22.12.0`.

## R5 — Scope list

- **Decision**: `scope-enum` error with the union in spec Assumptions (22 scopes).
- **Rationale**: Issue's list omits scopes the backlog itself uses (`web` ×13, `tooling` ×2, `repo`, `obs`, `e2e`, `quality`, `setup`) and the `docs(specs)` commits of `/dev-new-session`.

## R6 — Markdown in lint-staged

- **Decision**: `*.{json,md,yml,yaml}` → `prettier --write --ignore-unknown`. `.prettierignore` (from #2) excludes `*.md`, so Markdown is a no-op until/unless that changes; the glob is kept as the issue specifies.
