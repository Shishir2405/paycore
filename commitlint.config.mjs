/**
 * Conventional Commits enforced on commit-msg via Husky.
 * e.g. `feat(payroll): add monthly run lock`, `fix(auth): refresh token rotation`
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [0],
  },
};
