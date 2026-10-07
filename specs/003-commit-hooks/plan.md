# Implementation Plan: Commit hooks and commit-message convention

**Branch**: `003-commit-hooks` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Add husky (installed by `prepare`), a pre-commit hook running lint-staged and a commit-msg hook
running commitlint with a strict scope list, plus `docs/commits.md`.

## Technical Context

**Language/Version**: POSIX sh hooks; Node >=22.12 tooling

**Primary Dependencies** (dev): husky 9, lint-staged 16, @commitlint/cli, @commitlint/config-conventional

**Storage**: N/A

**Testing**: Real commits in a throwaway branch covering the four acceptance checks

**Target Platform**: Git Bash on Windows, macOS, Linux; git worktrees

**Project Type**: repository tooling

**Constraints**: Hooks run from the git root; `server/` is a subdirectory

## Constitution Check

Constitution is the unfilled template — nothing to check. No README non-negotiable is affected. Pass.

## Project Structure

```text
docs/commits.md
server/
├── .husky/
│   ├── pre-commit        # cd server && npx lint-staged
│   └── commit-msg        # cd server && commitlint --edit <abs path>
├── commitlint.config.js
└── package.json          # prepare, lint-staged config, dev deps
```

Contracts: [hooks](contracts/hooks.md). Data model: none. Validation: [quickstart](quickstart.md).

## Complexity Tracking

None.
