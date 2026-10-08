import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import checker from 'vite-plugin-checker';

import { formatEnvErrors, parseEnv } from './src/lib/env.ts';

export default defineConfig(({ mode }) => {
  // Fail `npm run dev` / `npm run build` in the terminal, naming the variable, rather than shipping
  // a bundle that breaks in the browser. src/lib/env.ts checks again at runtime.
  if (mode !== 'test') {
    const result = parseEnv(loadEnv(mode, process.cwd(), 'VITE_'));
    if (!result.ok) throw new Error(formatEnvErrors(result.errors));
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Type errors in the dev overlay, not only in `npm run build`.
      mode === 'development' && checker({ typescript: { buildMode: true } }),
    ],
    resolve: {
      // Mirrors `paths` in tsconfig.app.json.
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5173, strictPort: true },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      env: { VITE_API_URL: 'http://localhost:3000' },
    },
  };
});
