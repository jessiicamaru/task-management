# Feature Specification: API project scaffold

**Feature Branch**: `001-node-project-scaffold`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Implement GitHub issue #1 (https://github.com/jessiicamaru/task-management/issues/1): chore(repo): scaffold the Node.js project, npm scripts and directory layout in server/. package.json (ESM, engines node>=22, private), runtime deps express@^5 pg zod pino pino-http helmet cors compression jsonwebtoken express-rate-limit, dev deps node-pg-migrate vitest supertest; exact npm scripts start/dev/lint/format/test/test:watch/migrate:up/migrate:down/migrate:create/seed; directory tree src/{server.js,app.js,config,db,middlewares,modules/{auth,users,projects,tasks,health},utils}, migrations, tests/{integration,unit}, docs; .gitignore; server.js answers 200 on /; LICENSE (MIT) + README placeholder. Acceptance: npm ci clean with no peer warnings, npm start + curl localhost:3000/ returns 200, all directories exist, git status clean after npm start."

## User Scenarios & Testing *(mandatory)*

The "users" of this feature are the contributors and automation (CI, Docker build, deploy) that
will build every later backlog item on top of the API application in `server/`.

### User Story 1 - Boot a runnable API from a clean clone (Priority: P1)

A contributor clones the repository, installs the API's dependencies with the lockfile-exact
install command, starts the service, and gets a successful response from its root address.

**Why this priority**: Nothing else in the backlog can be demonstrated, tested or containerized
until the application installs reproducibly and starts. This is the minimum that proves the
scaffold works.

**Independent Test**: On a clean clone, run the lockfile install and the start command inside
`server/`, then request `/` on the default port and observe a success status.

**Acceptance Scenarios**:

1. **Given** a clean clone with a supported runtime, **When** the contributor runs the lockfile-exact
   install in `server/`, **Then** it completes with no errors and no peer-dependency warnings.
2. **Given** dependencies are installed, **When** the contributor runs the start command,
   **Then** the service listens on port 3000 by default and `GET /` returns HTTP 200.
3. **Given** the service has been started and stopped, **When** the contributor runs `git status`,
   **Then** the working tree is clean — nothing generated is left untracked.

---

### User Story 2 - Agreed command names for every workflow (Priority: P2)

CI, the Docker build, deployment and every later issue invoke the API through a fixed set of
command names (start, dev, lint, format, test, test:watch, migrate:up, migrate:down,
migrate:create, seed). A contributor can rely on each name existing and doing its documented job.

**Why this priority**: These names are a contract consumed by other milestones (#37 Dockerfile,
#41 CI, #46 render.yaml). Renaming one later breaks consumers silently.

**Independent Test**: Read the declared command list and confirm every name exists with exactly
the specified command; run `start`, `dev` and `test` and observe they execute.

**Acceptance Scenarios**:

1. **Given** the scaffold, **When** the command list is inspected, **Then** all ten names exist
   and each maps exactly to the command in the issue's table.
2. **Given** no tests exist yet, **When** the contributor runs the test command, **Then** it
   exits successfully (it is not an error for the suite to be empty at this stage).

---

### User Story 3 - A fixed project layout every later issue can target (Priority: P3)

A contributor picking up a later issue finds the directory it names (`src/modules/tasks/`,
`src/db/`, `migrations/`, `tests/integration/`) already present, with each feature module laid out
as routes / controller / service / repository / schema files.

**Why this priority**: Prevents every subsequent issue from inventing its own structure; the
shape is fixed once so the rest of the work is additive.

**Independent Test**: List the tree under `server/` and compare it with the required layout.

**Acceptance Scenarios**:

1. **Given** the scaffold, **When** the tree is listed, **Then** every required directory exists
   in version control (empty ones are kept by a placeholder file).
2. **Given** a feature module directory (auth, users, projects, tasks, health), **When** it is
   listed, **Then** it contains placeholder `*.routes.js`, `*.controller.js`, `*.service.js`,
   `*.repository.js` and `*.schema.js` files.

---

### Edge Cases

- Port 3000 is already in use: the service must fail fast with a clear error rather than hang.
- `PORT` is set in the environment: the service listens on that port instead of 3000.
- An unsupported runtime version is used: the declared engine range makes the mismatch visible.
- A request for an unknown path: returns 404, not 200 (only `/` is answered at this stage).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `server/` MUST contain a package manifest declaring the project private, using ES
  modules, and requiring runtime version 22 or newer; the same version MUST be pinned in a
  version file (`.nvmrc`) for tooling.
- **FR-002**: The manifest MUST declare the runtime dependencies listed in the issue (web framework
  v5, PostgreSQL driver, schema validation, structured logger and its HTTP adapter, security
  headers, CORS, compression, JWT, rate limiting) — installed but not yet wired.
- **FR-003**: The manifest MUST declare the development dependencies listed in the issue
  (migration tool, test runner, HTTP test client).
- **FR-004**: A lockfile MUST be committed so the lockfile-exact install is reproducible.
- **FR-005**: The ten command names MUST exist exactly as specified in issue #1.
- **FR-006**: The process entrypoint MUST start an HTTP listener (default port 3000, overridable by
  `PORT`) that answers `GET /` with 200.
- **FR-007**: The application builder MUST be separate from the process entrypoint and exported so
  tests can exercise it without opening a port.
- **FR-008**: The directory tree from issue #1 MUST exist under `server/`, with each feature module
  holding the five placeholder layer files and empty directories kept by `.gitkeep`.
- **FR-009**: Ignore rules MUST cover dependencies, environment files, coverage output, logs and OS
  metadata so starting the service leaves the tree clean.
- **FR-010**: At least one automated test MUST verify that `GET /` returns 200, so the scaffold's
  one behaviour is protected from regression.

### Key Entities

None — this feature introduces no domain data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A contributor goes from clean clone to a 200 response at `/` with two commands
  (install, start) and no manual edits.
- **SC-002**: The install reports zero peer-dependency warnings and zero errors.
- **SC-003**: 100% of the ten required command names exist with the specified commands.
- **SC-004**: 100% of the required directories exist in version control.
- **SC-005**: After starting and stopping the service, `git status` shows zero changed or untracked
  files.

## Assumptions

- **ESM** is the module system and **Node 22** the runtime, as the issue recommends and the root
  README / `server/README.md` already state ("Node.js 22 + Express 5").
- `src/modules/users/` is its own thin module for profile reads; credentials stay in `auth/`.
- The `docs/` entry in the issue's tree is the **repository-root** `docs/` (the issue's monorepo
  note makes `docs/` paths repository-root), which already exists — no `server/docs/` is created.
- `LICENSE` (MIT) already exists at the repository root and `server/README.md` already exists and
  is fuller than a placeholder; neither is duplicated or replaced. Only the parts of the README
  that become inaccurate (e.g. "Not built yet") are touched.
- The root `.gitignore` already covers `node_modules/`, `.env`, `coverage/`, `*.log` and
  `.DS_Store` for the whole repo; a `server/.gitignore` is not required unless the scaffold
  generates something the root rules miss.
- ESLint and Prettier belong to issue #2 (tools, configuration and EditorConfig). The `lint` and
  `format` script *names* are fixed here so consumers can rely on them; they become runnable when
  #2 lands. Installing ESLint here without a config would make `npm run lint` fail anyway (ESLint 9+
  refuses to run with no config file).
- The runtime floor is **Node 22.12**, not bare 22: the current test runner (Vitest 5) requires
  `^22.12.0 || ^24 || >=26`. Declaring `>=22` would let an older 22.x install and then fail at test
  time.
- `node --watch` is used for `dev`; `nodemon` is not added.
- `src/db/seed.js` is a placeholder that exits successfully; real seed data comes later.
