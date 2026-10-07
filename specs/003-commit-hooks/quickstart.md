# Quickstart: verify the commit hooks

```bash
cd server
git config --unset core.hooksPath   # simulate a fresh clone
npm ci                              # prepare installs hooks
git config core.hooksPath           # → server/.husky/_

git commit --allow-empty -m "bad message"                     # rejected
git commit --allow-empty -m "feat(tasks): add status filter"  # accepted
git commit --allow-empty -m "feat(nope): x"                   # rejected, scope-enum
```

Stage a file with misordered imports → committed fixed. Stage a module with `console.log` → blocked.

Data model: none.
