# Quickstart: verify lint and format

```bash
cd server
npm ci
npm run lint            # exit 0
npm run format:check    # exit 0
echo "console.log('x');" >> src/modules/tasks/tasks.service.js
npm run lint            # exit 1, no-console
git checkout src/modules/tasks/tasks.service.js
```

Root `.editorconfig` has `end_of_line = lf` under `[*]`.

Data model: none (no domain data).
