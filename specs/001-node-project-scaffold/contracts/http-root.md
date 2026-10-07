# Contract: `GET /`

Temporary liveness signal for the scaffold. It is superseded by `/healthz` and `/readyz` (#8) and
may be removed or repurposed then.

| Request | Response |
| --- | --- |
| `GET /` | `200`, `Content-Type: application/json`, body `{ "status": "ok" }` |
| `GET /<anything else>` | `404` (Express default until #7 adds the shared error shape) |

The listener binds `PORT` from the environment, default `3000`. A listen failure (port in use)
logs the error and exits with a non-zero code.
