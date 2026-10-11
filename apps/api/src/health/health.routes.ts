import { Router } from 'express';

import { checkDatabaseConnection } from '../common/db';

/** Render inyecta `RENDER_GIT_COMMIT`: el pipeline lo compara para saber que el deploy nuevo ya está vivo. */
function currentCommit(): string | null {
  return process.env.RENDER_GIT_COMMIT ?? null;
}

/**
 * Se monta antes del origin guard y del rate limit: el health check de Render pega directo, sin pasar por el proxy.
 * `/` es liveness y no toca la base, así un problema de Supabase no hace que Render reinicie la API.
 * `/ready` hace `SELECT 1`: lo usa el keep-alive y, de paso, evita que Supabase pause el proyecto por inactividad.
 */
const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', commit: currentCommit() });
});

router.get('/ready', async (_req, res) => {
  const commit = currentCommit();
  const dbOk = await checkDatabaseConnection();

  if (!dbOk) {
    res.status(503).json({ status: 'error', db: 'error', commit });
    return;
  }

  res.json({ status: 'ok', db: 'ok', commit });
});

export default router;
