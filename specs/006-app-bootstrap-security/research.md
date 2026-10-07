# Research: Express bootstrap and security middleware

## R1 — trust proxy

- **Decision**: `app.set('trust proxy', 1)`.
- **Rationale**: Render has one proxy hop. `true` trusts every `X-Forwarded-For` entry, so a caller could forge `req.ip` and defeat the rate limiter (#24).

## R2 — CORS and credentials

- **Decision**: `cors({ origin: allowList, credentials: true })`; refuse `*` in config validation for every environment, and assert again in `createApp` (a config built by hand in a test cannot bypass it). Dev default `http://localhost:5173`.
- **Rationale**: `Access-Control-Allow-Origin: *` with credentials is invalid per the Fetch spec; browsers reject it, so it would fail silently in the browser.
- **Alternative rejected**: 403 for disallowed origins server-side — breaks the same-origin Swagger UI (#32), which sends `Origin`.

## R3 — helmet CSP

- **Decision**: helmet defaults plus explicit `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: https:`; `crossOriginEmbedderPolicy: false`.
- **Rationale**: swagger-ui ships its init script as a file (no inline script) but injects inline styles and loads data-URI images. #32 verifies against the real UI.

## R4 — Body limit

- **Decision**: `express.json({ limit: '100kb' })`, `express.urlencoded({ extended: false, limit: '100kb' })`.
- **Rationale**: 100 KB holds a task with a long description many times over; an unbounded parser on a 512 MB instance is a one-request outage.

## R5 — Errors before #7

- **Decision**: Minimal `errorHandler`: errors carrying a 4xx `status`/`statusCode` (body-parser sets `status` and `type`, e.g. `entity.too.large`) keep it with a code derived from the type; anything else → 500 `internal_error`. `notFound` → 404 `not_found`. Shape per #7.

## R6 — `x-powered-by`

- **Decision**: `app.disable('x-powered-by')` — helmet 8 also removes it; explicit is clearer.
