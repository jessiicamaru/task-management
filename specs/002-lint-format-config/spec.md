# Feature Specification: Lint and format configuration

**Feature Branch**: `002-lint-format-config`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Implement GitHub issue #2 (https://github.com/jessiicamaru/task-management/issues/2): chore(tooling): ESLint 9 flat config, Prettier and EditorConfig for server/ — @eslint/js recommended, import/order, eslint-plugin-n, eslint-config-prettier last; no-console, no-process-env outside src/config, no-return-await, promise/catch-or-return; .prettierrc (100 cols, single quotes, trailing commas all, semicolons); .prettierignore; .editorconfig (LF, UTF-8, 2 spaces, final newline); lint and lint:fix scripts. Acceptance: lint exits 0 on the scaffold, non-zero when console.log is added to a module, prettier --check passes, editorconfig end_of_line=lf."

## User Scenarios & Testing *(mandatory)*

Users are contributors and the CI merge gate (#41).

### User Story 1 - Lint gate that means something (Priority: P1)

A contributor runs the lint command and gets a pass on clean code and a failure on code that breaks
the project's rules (console output instead of the logger, environment access outside config,
unhandled promises, misordered imports).

**Why this priority**: CI gates merges on lint; without a config the gate either always fails or
checks nothing.

**Independent Test**: Run lint on the scaffold (exit 0); add `console.log` to a module (exit ≠ 0);
add `process.env.X` in a module (exit ≠ 0) but not under `src/config/`.

**Acceptance Scenarios**:

1. **Given** the scaffold from #1, **When** lint runs, **Then** it exits 0.
2. **Given** a module containing `console.log`, **When** lint runs, **Then** it exits non-zero naming `no-console`.
3. **Given** `process.env` read in `src/modules/**`, **When** lint runs, **Then** it fails; the same read in `src/config/**` passes.
4. **Given** fixable problems (import order), **When** the fix command runs, **Then** they are corrected in place.

---

### User Story 2 - One formatting style (Priority: P2)

Every contributor's output is formatted identically, so diffs show only real changes.

**Independent Test**: The format-check command passes on the `server/` tree.

**Acceptance Scenarios**:

1. **Given** the codebase, **When** the format check runs, **Then** it passes.
2. **Given** formatting rules and lint rules, **When** both run, **Then** they never contradict each other.

---

### User Story 3 - Editor defaults that match (Priority: P3)

Any editor honouring EditorConfig writes LF, UTF-8, 2-space indent and a final newline, so a
Windows-authored script never reaches the Linux container with CRLF.

**Independent Test**: `.editorconfig` contains `end_of_line = lf` for all files.

### Edge Cases

- Entry points that legitimately need console output or env access before the logger (#5) and the
  config loader (#4) exist: exempted narrowly and visibly, not by turning the rule off.
- Generated files (lockfile, coverage) are neither linted nor formatted.
- Test and config files import dev dependencies without tripping Node-correctness rules meant for runtime code.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Lint configuration MUST use the flat-config format with the recommended base, import ordering (builtin → external → internal → relative, blank line between groups), Node correctness rules, and the Prettier-compat config applied last.
- **FR-002**: `no-console` and `no-process-env` MUST be errors; `src/config/**` MUST be exempt from `no-process-env`.
- **FR-003**: Promise hygiene MUST be enforced: `no-return-await` on, and `promise/catch-or-return` via the promise plugin.
- **FR-004**: Formatting MUST be 100 columns, single quotes, trailing commas everywhere, semicolons.
- **FR-005**: Format and lint MUST ignore dependencies, coverage and the lockfile.
- **FR-006**: EditorConfig MUST set LF, UTF-8, 2-space indent, final newline for all files.
- **FR-007**: `lint` and `lint:fix` scripts MUST exist; `format` (from #1) MUST work; a `format:check` script is added for CI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Lint exits 0 on the current codebase.
- **SC-002**: Each of the two guard rules (`no-console`, `no-process-env`) fails lint when violated in a module — 2/2.
- **SC-003**: Format check passes with zero files reported.
- **SC-004**: Install remains free of peer-dependency warnings.

## Assumptions

- ESLint stays on **major 9** as the issue says: `eslint-plugin-import` does not support ESLint 10.
- `.editorconfig` goes at the **repository root**, not `server/`: editors read the nearest file
  upward, so a root file covers `server/`, `web/` and `docker/` (where the CRLF risk actually is).
  Prettier config stays in `server/` — `web/` gets its own in #51.
- `eslint-plugin-security` is not added now (noisy; can be added at `warn` later).
- `src/server.js` and `src/db/seed.js` keep their console output and `PORT` read with a
  single-line, reasoned `eslint-disable` until #4/#5 replace them.
