# Contract: lint / format scripts (`server/package.json`)

| Script | Command | Used by |
| --- | --- | --- |
| `lint` | `eslint .` | CI gate (#41), lint-staged (#3) |
| `lint:fix` | `eslint . --fix` | contributors |
| `format` | `prettier --write .` | contributors |
| `format:check` | `prettier --check .` | CI (#41) |
