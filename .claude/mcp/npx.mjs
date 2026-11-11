import { spawn } from 'node:child_process';

/**
 * Lanza `npx <args>` con stdio heredado para los MCP stdio de `.mcp.json`. En Windows `npx` es un
 * `.cmd` y necesita shell; en macOS/Linux se ejecuta directo. Así `.mcp.json` no depende de `cmd`.
 * Reenvía SIGINT/SIGTERM al hijo (en Windows con `taskkill /T` para matar el árbol) y propaga su
 * código de salida.
 */
function launchNpx(args) {
  const isWindows = process.platform === 'win32';
  const child = spawn('npx', args, { stdio: 'inherit', shell: isWindows });

  child.on('exit', (code, signal) => process.exit(code ?? (signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1)));
  child.on('error', err => {
    console.error(`npx-mcp: ${err.message}`);
    process.exit(1);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      if (isWindows && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        child.kill(signal);
      }
    });
  }
}

launchNpx(process.argv.slice(2));
