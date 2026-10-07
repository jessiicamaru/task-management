# Quickstart

```bash
cd server && npm test
cp .env.example .env && npm run dev
curl -s localhost:3000/healthz   # 200 even with no database
curl -si localhost:3000/readyz   # 503 with no database; 200 once PostgreSQL is up
```
