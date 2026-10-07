# Quickstart

```bash
cd server && cp .env.example .env && npm start
curl -i localhost:3000/healthz            # helmet headers, x-request-id, 404 JSON shape
node -e "process.stdout.write(JSON.stringify({d:\"x\".repeat(200000)}))" | curl -s -XPOST -H "content-type: application/json" --data-binary @- localhost:3000/api/v1/x   # 413 shape
curl -i -H "Origin: https://evil.example" localhost:3000/   # no access-control-allow-origin
CORS_ORIGINS="*" npm start                # exit 1
```
