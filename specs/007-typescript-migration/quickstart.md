# Quickstart

```bash
cd server
npm ci
npm run typecheck && npm run lint && npm test
npm run build && cp .env.example .env && npm start
curl -i localhost:3000/          # 200, helmet headers, x-request-id
npm run dev                      # tsx watch; edit a .ts file -> restart
```
