import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import n from 'eslint-plugin-n';
import promise from 'eslint-plugin-promise';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['node_modules/', 'coverage/', 'dist/'],
  },
  js.configs.recommended,
  n.configs['flat/recommended-module'],
  promise.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': { typescript: true, node: true },
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // Logging goes through pino (#5), never the console.
      'no-console': 'error',
      // Environment access is centralised in src/config (#4); see the override below.
      'no-process-env': 'error',
      'no-return-await': 'error',
      'require-await': 'off',
      'promise/catch-or-return': 'error',
    },
  },
  {
    // Type-aware rules for the TypeScript sources. no-floating-promises is the rule #2 could only
    // approximate: an un-awaited promise in a handler hangs the request and logs nothing.
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        // import.meta.dirname needs Node 22.16; the floor is 22.12.
        tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      // TypeScript resolves imports, including the `.js` specifiers NodeNext requires for `.ts`
      // files; eslint-plugin-n does not map them and would report every one as missing.
      'n/no-missing-import': 'off',
    },
  },
  {
    files: ['src/config/**', 'tests/**'],
    rules: {
      // src/config owns the environment; tests build environments for the processes they spawn.
      'no-process-env': 'off',
    },
  },
  {
    // The process entrypoint and its fatal handlers are the places allowed to exit the process.
    files: ['src/server.ts', 'src/process-handlers.ts'],
    rules: {
      'n/no-process-exit': 'off',
    },
  },
  {
    // Tests and tooling config import devDependencies by design.
    files: ['tests/**', '*.config.js'],
    rules: {
      'n/no-unpublished-import': 'off',
    },
  },
  {
    // Parsed JSON log lines and asymmetric matchers (expect.any) are untyped by nature.
    files: ['tests/**'],
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Last, so formatting rules never fight Prettier.
  prettier,
);
