import { logger } from '../utils/logger';

import { prisma } from './prisma';

const DEV_DB_WARNING =
  'No se pudo conectar a PostgreSQL. Verificá que la base de datos esté en ejecución y que DATABASE_URL sea correcta.';

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.error({ err }, DEV_DB_WARNING);
    return false;
  }
}
