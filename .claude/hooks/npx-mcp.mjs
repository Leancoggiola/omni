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
child.on('error', () => process.exit(1));
