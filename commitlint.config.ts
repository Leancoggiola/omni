const SCOPES = ['api', 'web', 'mobile', 'e2e', 'shared', 'eslint-config', 'ts-config', 'deps', 'release', 'ci'];
const ISSUE_SCOPE = /^#\d+$/;

const config = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        /** Acepta los scopes de paquete o `#N`, algo que `scope-enum` no puede expresar. */
        'scope-valid': ({ scope }: { scope?: string | null }) => {
          if (!scope) return [true];
          const valid = scope.split(/[,\/\\]/).every(s => SCOPES.includes(s) || ISSUE_SCOPE.test(s));
          return [valid, `el scope debe ser uno de [${SCOPES.join(', ')}] o #N`];
        },
      },
    },
  ],
  rules: {
    'scope-enum': [0],
    'scope-valid': [2, 'always'],
    'scope-empty': [0],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
  },
};

export default config;
