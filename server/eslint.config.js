import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import n from 'eslint-plugin-n';
import promise from 'eslint-plugin-promise';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/', 'coverage/'],
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
    // src/config owns the environment; tests build environments for the processes they spawn.
    files: ['src/config/**', 'tests/**'],
    rules: {
      'no-process-env': 'off',
    },
  },
  {
    // The process entrypoint is the one place allowed to exit the process.
    files: ['src/server.js'],
    rules: {
      'n/no-process-exit': 'off',
    },
  },
  {
    // Tests and tooling config import devDependencies by design.
    files: ['tests/**', 'eslint.config.js', 'vitest.config.js'],
    rules: {
      'n/no-unpublished-import': 'off',
    },
  },
  // Last, so formatting rules never fight Prettier.
  prettier,
];
