# Quickstart: verify the scaffold

Prerequisites: Node `>=22.12` (`nvm use` in `server/` picks 22), npm 10+.

```bash
cd server
npm ci                  # expect: no errors, no "peer" warnings
npm test                # expect: integration test passes (GET / → 200, unknown → 404)
npm start &             # expect: log line with the port
curl -i localhost:3000/ # expect: HTTP/1.1 200, {"status":"ok"}
kill %1
git status --porcelain  # expect: empty
```

Port override: `PORT=4000 npm start` → listens on 4000.
Port clash: start twice → second process exits non-zero with `EADDRINUSE`.

Contracts: [http-root](contracts/http-root.md), [npm-scripts](contracts/npm-scripts.md).
