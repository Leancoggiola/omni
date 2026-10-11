/** @jest-environment node */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ALERT = 'no-restricted-syntax';
const IMPORTS = 'no-restricted-imports';

const CASES = [
  {
    name: 'Alert.alert',
    file: 'src/features/x/A.tsx',
    code: "import { Alert } from 'react-native';\nAlert.alert('a');\n",
    rule: ALERT,
  },
  {
    name: 'RN.Alert.alert',
    file: 'src/features/x/B.tsx',
    code: "import * as RN from 'react-native';\nRN.Alert.alert('a');\n",
    rule: ALERT,
  },
  {
    name: "Alert['alert']",
    file: 'src/features/x/C.tsx',
    code: "import { Alert } from 'react-native';\nAlert['alert']('a');\n",
    rule: ALERT,
  },
  {
    name: 'const { alert } = Alert',
    file: 'src/features/x/D.tsx',
    code: "import { Alert } from 'react-native';\nconst { alert } = Alert;\nalert('a');\n",
    rule: ALERT,
  },
  {
    name: 'Alert.alert fuera de features',
    file: 'src/shared/x/E.tsx',
    code: "import { Alert } from 'react-native';\nAlert.alert('a');\n",
    rule: ALERT,
  },
  {
    name: 'Button de tamagui en features',
    file: 'src/features/x/F.tsx',
    code: "import { Button } from 'tamagui';\nexport const x = Button;\n",
    rule: IMPORTS,
  },
  {
    name: 'Input de tamagui en app',
    file: 'app/G.tsx',
    code: "import { Input } from 'tamagui';\nexport const x = Input;\n",
    rule: IMPORTS,
  },
  {
    name: 'Switch de tamagui en features',
    file: 'src/features/x/H.tsx',
    code: "import { Switch } from 'tamagui';\nexport const x = Switch;\n",
    rule: IMPORTS,
  },
  {
    name: '@tamagui/button en features',
    file: 'src/features/x/I.tsx',
    code: "import { Button } from '@tamagui/button';\nexport const x = Button;\n",
    rule: IMPORTS,
  },
  {
    name: 'import * as de tamagui en features',
    file: 'src/features/x/J.tsx',
    code: "import * as T from 'tamagui';\nexport const x = T;\n",
    rule: ALERT,
  },
  {
    name: 'Spinner de tamagui en cualquier lado',
    file: 'src/shared/x/K.tsx',
    code: "import { Spinner } from 'tamagui';\nexport const x = Spinner;\n",
    rule: IMPORTS,
  },
];

const ALLOWED = [
  {
    name: 'Button de tamagui en shared/ui (primitivas)',
    file: 'src/shared/ui/L.tsx',
    code: "import { Button } from 'tamagui';\nexport const x = Button;\n",
  },
  {
    name: 'Stack y Paragraph de tamagui en features',
    file: 'src/features/x/M.tsx',
    code: "import { YStack, Paragraph } from 'tamagui';\nexport const x = [YStack, Paragraph];\n",
  },
];

/** ESLint carga la config con `import()`: en un proceso aparte, fuera de la VM de jest. */
const RUNNER = `
const { ESLint } = require('eslint');
const items = JSON.parse(process.argv[1]);
(async () => {
  const eslint = new ESLint({ cwd: process.cwd() });
  const out = [];
  for (const item of items) {
    const [result] = await eslint.lintText(item.code, { filePath: item.file });
    out.push(result.messages.map(m => m.ruleId));
  }
  console.log(JSON.stringify(out));
})();
`;

let results;

beforeAll(() => {
  const items = [...CASES, ...ALLOWED].map(({ code, file }) => ({ code, file }));
  const stdout = execFileSync(process.execPath, ['-e', RUNNER, JSON.stringify(items)], {
    cwd: path.join(__dirname),
    encoding: 'utf8',
  });
  results = JSON.parse(stdout.trim().split('\n').pop());
}, 120000);

describe('eslint.config.js', () => {
  CASES.forEach((testCase, index) => {
    it(`prohíbe ${testCase.name}`, () => {
      expect(results[index]).toContain(testCase.rule);
    });
  });

  ALLOWED.forEach((testCase, index) => {
    it(`permite ${testCase.name}`, () => {
      expect(results[CASES.length + index]).toEqual([]);
    });
  });
});
