# Quickstart: verify config validation

```bash
cd server
cp .env.example .env
npm start                                   # boots on 3000

JWT_SECRET= npm start                       # with .env removed: exit 1, "JWT_SECRET: required"
NODE_ENV=production JWT_SECRET=short DATABASE_URL=postgres://u:p@h/db CORS_ORIGINS=https://a.example npm start
                                            # exit 1, "JWT_SECRET: must be at least 32 characters in production"
grep -rn "process.env" src/ --include=*.js | grep -v src/config/   # nothing
npm test
```

Data model: [data-model.md](data-model.md).
