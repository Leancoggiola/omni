import { spawn } from 'node:child_process';

/**
 * Lanza `npx <args>` con stdio heredado para los MCP stdio de `.mcp.json`. En Windows `npx` es un
 * `.cmd` y necesita shell; en macOS/Linux se ejecuta directo. Así `.mcp.json` no depende de `cmd`.
 */
const child = spawn('npx', process.argv.slice(2), {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', code => process.exit(code ?? 1));
child.on('error', err => {
  console.error(`npx-mcp: ${err.message}`);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
