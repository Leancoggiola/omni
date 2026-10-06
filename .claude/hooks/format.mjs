import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { extname } from 'node:path';

const FORMATTABLE = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.css',
  '.scss',
  '.html',
  '.yaml',
  '.yml',
]);

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

const filePath = JSON.parse(raw).tool_input?.file_path;
if (!filePath || !FORMATTABLE.has(extname(filePath))) process.exit(0);

const require = createRequire(`${process.env.CLAUDE_PROJECT_DIR}/package.json`);
const prettierBin = require.resolve('prettier/bin/prettier.cjs');

try {
  execFileSync(process.execPath, [prettierBin, '--write', '--ignore-unknown', '--log-level', 'warn', filePath], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
} catch (err) {
  // Non-blocking: a syntax error mid-edit must not stop Claude.
  process.stderr.write(String(err.stderr ?? err.message));
}
