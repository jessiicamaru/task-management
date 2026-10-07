// Scopes: the ones the gh-issue-create / gh-pr-create skills name, plus those the backlog titles
// and the /dev-new-session workflow already use. See docs/commits.md.
const scopes = [
  'api',
  'auth',
  'users',
  'projects',
  'tasks',
  'db',
  'config',
  'health',
  'web',
  'ui',
  'docker',
  'ci',
  'deploy',
  'docs',
  'test',
  'tooling',
  'repo',
  'obs',
  'e2e',
  'quality',
  'setup',
  'specs',
];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', scopes],
  },
};
