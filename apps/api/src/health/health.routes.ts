import { Router } from 'express';

import { checkDatabaseConnection } from '../common/db';
import { createRateLimiter } from '../common/utils';

/** Render inyecta `RENDER_GIT_COMMIT`: el pipeline lo compara para saber que el deploy nuevo ya está vivo. El repo es público. */
function currentCommit(): string | null {
  return process.env.RENDER_GIT_COMMIT ?? null;
}

/**
 * `/ready` es público y cada request hace un `SELECT 1`: el límite evita que se use para presionar el pool de Supabase.
 * Es laxo porque el keep-alive pega cada 10 minutos; si en algún momento hace falta más, se sube acá.
 */
const readyLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde',
  },
});

/**
 * Se monta antes del origin guard y del rate limit global: el health check de Render pega directo, sin pasar por el proxy.
 * `/` es liveness, no toca la base y no tiene límite, así un problema de Supabase no hace que Render reinicie la API.
 * `/ready` hace `SELECT 1`: lo usa el keep-alive y, de paso, evita que Supabase pause el proyecto por inactividad.
 */
const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', commit: currentCommit() });
});

router.get('/ready', readyLimiter, async (_req, res) => {
  const commit = currentCommit();
  const dbOk = await checkDatabaseConnection();

  if (!dbOk) {
    res.status(503).json({ status: 'error', db: 'error', commit });
    return;
  }

  res.json({ status: 'ok', db: 'ok', commit });
});

export default router;
