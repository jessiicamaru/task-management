# Architecture decision records

One file per decision that was not obvious, kept short. The point of an ADR is not to document what
the code does — the code does that — but to record **why** an option was chosen over the
alternatives, so that a future change to it is a decision rather than an accident.

Naming: `NNNN-short-slug.md`, numbered in the order they were decided. An ADR is never edited after
it is accepted; it is superseded by a later one that links back to it.

Use [0000-template.md](0000-template.md) as the starting point.

## Planned records

These are the decisions already made across the backlog, and the ones most likely to be quietly
undone by someone who does not know the reasoning. They are written up in
[#50](https://github.com/jessiicamaru/task-management/issues/50).

| ADR | Decision | Context |
| --- | --- | --- |
| 0001 | argon2id over bcrypt for password hashing | [#17](https://github.com/jessiicamaru/task-management/issues/17) — includes the musl/Alpine constraint |
| 0002 | Opaque hashed refresh tokens over self-contained JWTs | [#13](https://github.com/jessiicamaru/task-management/issues/13), [#21](https://github.com/jessiicamaru/task-management/issues/21) — a JWT cannot be revoked |
| 0003 | Keyset over offset pagination | [#29](https://github.com/jessiicamaru/task-management/issues/29) — `OFFSET` walks and discards rows, and pages shift under the caller |
| 0004 | Migrations run from the container entrypoint | [#40](https://github.com/jessiicamaru/task-management/issues/40) — Render's free tier has no pre-deploy job |
| 0005 | 404 rather than 403 for non-members | [#23](https://github.com/jessiicamaru/task-management/issues/23) — a 403 confirms the resource exists |
| 0006 | `rejectUnauthorized: false` against Render's PostgreSQL | [#10](https://github.com/jessiicamaru/task-management/issues/10), [#47](https://github.com/jessiicamaru/task-management/issues/47) — the internal certificate does not chain to a public root |
