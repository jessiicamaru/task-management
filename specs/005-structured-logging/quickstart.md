# Quickstart: verify logging

```bash
cd server
npm test                                      # logging.test.js covers every acceptance item
cp .env.example .env && npm start             # pretty "API listening" with port, env, level, db host
curl -i localhost:3000/ -H "x-request-id: abc"   # response header x-request-id: abc
NODE_ENV=production ... npm start             # one JSON object per line, no credentials
```
