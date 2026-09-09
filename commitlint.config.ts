const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['api', 'web', 'mobile', 'e2e', 'shared', 'eslint-config', 'ts-config', 'deps', 'release', 'ci'],
    ],
    'scope-empty': [0],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
  },
};

export default config;
