import { spawnSync } from 'node:child_process';

/**
 * Deja la base de E2E vacía y con el admin sembrado antes de cada corrida.
 * Los fixtures crean sus usuarios contra la API, así que este es el único punto
 * en el que la suite toca la base.
 */
export default function globalSetup() {
  const result = spawnSync('pnpm', ['--filter', 'api', 'db:e2e:reset'], {
    stdio: 'inherit',
    shell: true,
    cwd: new URL('../../../../', import.meta.url),
  });

  if (result.status !== 0) {
    throw new Error('No se pudo preparar la base de E2E.\nLevantá el contenedor con: docker compose up -d db-e2e');
  }
}
