# docker

Container assets that are not a single app's `Dockerfile`.

Each application owns its own image definition — `server/Dockerfile` and, if the frontend ever
needs one, `web/Dockerfile`. What lives here is everything shared or orchestration-level.

| File | Purpose | Delivered by |
| --- | --- | --- |
| `entrypoint.sh` | Waits for PostgreSQL, applies migrations, then `exec`s the server. Runs against the production database on every Render deploy. | [#40](https://github.com/jessiicamaru/task-management/issues/40) |
| `postgres/init/*.sql` | Extensions and roles created when the compose volume is first initialised | [#39](https://github.com/jessiicamaru/task-management/issues/39) |

The compose file itself lives at the repository root, because it orchestrates `server/`, `web/` and
the database together.

## Two things that will bite

- **Line endings.** `entrypoint.sh` must be committed with LF. A CRLF shebang fails inside the
  container with `exec format error`, which does not name the file or the reason.
- **The executable bit.** `git update-index --chmod=+x docker/entrypoint.sh` — easy to lose on
  Windows, and the failure only appears in the built image.
