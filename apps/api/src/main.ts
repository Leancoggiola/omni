import { createApp } from './app';
import { config } from './config';
import { logger } from './common/utils';
import { checkDatabaseConnection, prisma } from './common/db';

async function bootstrap() {
  await prisma.$connect();

  if (config.isProduction) {
    logger.info('Connected to PostgreSQL');
  } else {
    const dbOk = await checkDatabaseConnection();
    if (dbOk) {
      logger.info('PostgreSQL: conexión verificada');
    } else {
      logger.warn('La API arrancó sin conexión a la base de datos');
    }
  }

  createApp().listen(config.port, '0.0.0.0', () => {
    logger.info(`API running on http://0.0.0.0:${config.port}`);
  });
}

bootstrap().catch(err => {
  logger.fatal(err, 'Failed to start');
  process.exit(1);
});
