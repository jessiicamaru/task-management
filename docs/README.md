# Documentation

Long-form documentation lives here. The README stays short and points into this directory; anything
that needs more than a paragraph belongs in a file here.

Documentation is updated **in the same change as the code it describes** — a doc that contradicts
the code is worse than no doc, because it is trusted.

## Planned contents

| File | What it covers | Delivered by |
| --- | --- | --- |
| `deployment-render.md` | Step-by-step Render deployment: database, web service, environment variables, first deploy, verification, CI/CD wiring, troubleshooting, rollback | [#48](https://github.com/jessiicamaru/task-management/issues/48) |
| `database.md` | Migration workflow, the expand/contract rule, how to write and test a migration locally | [#11](https://github.com/jessiicamaru/task-management/issues/11) |
| `docker.md` | Local stack commands, image hygiene, why a layer is never removed by a later `RUN rm` | [#38](https://github.com/jessiicamaru/task-management/issues/38), [#39](https://github.com/jessiicamaru/task-management/issues/39) |
| `security.md` | The auth model, deliberate tradeoffs (registration enumeration, refresh-token grace window, logout not revoking the access token), and known gaps | [#18](https://github.com/jessiicamaru/task-management/issues/18), [#21](https://github.com/jessiicamaru/task-management/issues/21), [#22](https://github.com/jessiicamaru/task-management/issues/22) |
| `commits.md` | Conventional Commits examples and the scope allowlist | [#3](https://github.com/jessiicamaru/task-management/issues/3) |
| `adr/` | Architecture decision records — see [adr/README.md](adr/README.md) | [#50](https://github.com/jessiicamaru/task-management/issues/50) |

The API reference is **not** here: it is generated from the zod schemas and served by the running
service at `/api/v1/docs` ([#32](https://github.com/jessiicamaru/task-management/issues/32)). A
hand-maintained copy would drift within a month.
