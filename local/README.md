# local

Scratch space that stays on your machine. Everything in this directory is gitignored except this
file (`local/*` with a `!local/README.md` exception in `.gitignore`).

Use it for anything you want near the project but not in its history:

- throwaway SQL, `EXPLAIN ANALYZE` output, query plans
- API responses captured while debugging
- database dumps, `.http` request files, Postman collections
- personal notes and deploy logs

Two rules:

- **Nothing here is a source of truth.** If something in this directory turns out to matter, move it
  into `docs/` and commit it. A colleague cannot read your `local/`.
- **A real secret is safer in your password manager.** Gitignored is not encrypted, and a stray
  `git add -f` is one keystroke away.
