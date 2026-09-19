# scripts

Repository-level maintenance scripts — things that operate on the repo or on a deployed
environment, not on one application. An application's own tasks belong in its `package.json`.

Anything here is expected to run on Windows (Git Bash), macOS and the CI runner. That means POSIX
`sh`, no bashisms, and no assumptions about which tools are installed beyond `node`, `git`, `gh`
and `docker`.

Nothing lives here yet. Likely candidates as the project grows:

| Script | Purpose |
| --- | --- |
| `smoke-test.sh` | Post-deploy checks against a deployed URL, shared by CI and by a human ([#45](https://github.com/jessiicamaru/task-management/issues/45)) |
| `db-cleanup.sh` | Prune expired refresh tokens ([#13](https://github.com/jessiicamaru/task-management/issues/13)) |
| `check-env.sh` | Diff `.env.example` against what Render actually has set |

A script that touches a real environment takes the target as an explicit argument. No script
defaults to production.
