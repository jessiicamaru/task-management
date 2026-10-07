# Contract: git hooks

| Hook | Runs | Blocks the commit when |
| --- | --- | --- |
| `pre-commit` | `lint-staged` in `server/` on staged `server/` files | ESLint reports an unfixable error |
| `commit-msg` | `commitlint --edit` | Message is not `type(scope?): subject`, type unknown, or scope not in the list |

Allowed types: `@commitlint/config-conventional` defaults (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test).

Allowed scopes: `api auth users projects tasks db config health web ui docker ci deploy docs test tooling repo obs e2e quality setup specs`.
