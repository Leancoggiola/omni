import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import type { MediaStatus, MediaType } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/common/utils/password';

interface SampleMedia {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string;
  status: MediaStatus;
}

const DEMO_USERS = [
  { username: 'demouser1', name: 'Juan Pérez', email: 'juan@example.com' },
  { username: 'demouser2', name: 'María García', email: 'maria@example.com' },
];

const SAMPLE_MEDIA: SampleMedia[] = [
  {
    tmdbId: 550,
    mediaType: 'movie',
    title: 'Fight Club',
    posterPath: '/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg',
    status: 'watched',
  },
  {
    tmdbId: 278,
    mediaType: 'movie',
    title: 'The Shawshank Redemption',
    posterPath: '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
    status: 'watched',
  },
  {
    tmdbId: 155,
    mediaType: 'movie',
    title: 'The Dark Knight',
    posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    status: 'watching',
  },
  {
    tmdbId: 27205,
    mediaType: 'movie',
    title: 'Inception',
    posterPath: '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',
    status: 'to_watch',
  },
  {
    tmdbId: 1399,
    mediaType: 'tv',
    title: 'Game of Thrones',
    posterPath: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
    status: 'watched',
  },
  {
    tmdbId: 1396,
    mediaType: 'tv',
    title: 'Breaking Bad',
    posterPath: '/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg',
    status: 'watched',
  },
];

/**
 * Siembra el admin y, solo con `SEED_DEMO=true`, usuarios y películas de demo (con la contraseña del admin).
 * Exige `NODE_ENV` para no sembrar a ciegas, y rechaza la demo en producción.
 */
async function main() {
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    throw new Error('NODE_ENV no está definido: el seed no corre sin saber el entorno.');
  }

  const seedDemo = process.env.SEED_DEMO === 'true';
  if (seedDemo && nodeEnv === 'production') {
    throw new Error('SEED_DEMO=true no se admite con NODE_ENV=production.');
  }

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.log('⚠️  ADMIN_USERNAME and ADMIN_PASSWORD env vars not set. Skipping admin seed.');
    return;
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await hashPassword(adminPassword);

    console.log(`\n🌍 Environment: ${nodeEnv}${seedDemo ? ' (demo)' : ''}`);

    let adminUser = await prisma.user.findUnique({
      where: { username: adminUsername.toLowerCase() },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          username: adminUsername.toLowerCase(),
          name: 'Admin',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      console.log('✅ Admin user created.');
    } else {
      console.log('ℹ️  Admin user already exists.');
    }

    const createdUsers = [adminUser];

    if (seedDemo) {
      for (const userData of DEMO_USERS) {
        const existing = await prisma.user.findUnique({
          where: { username: userData.username },
        });

        if (!existing) {
          const newUser = await prisma.user.create({
            data: { ...userData, password: hashedPassword, role: 'USER' },
          });
          createdUsers.push(newUser);
          console.log(`✅ Demo user '${userData.username}' created.`);
        } else {
          createdUsers.push(existing);
          console.log(`ℹ️  Demo user '${userData.username}' already exists.`);
        }
      }
    } else {
      console.log('ℹ️  Skipping demo users (SEED_DEMO is not "true").');
    }

    for (const user of createdUsers) {
      const existingPrefs = await prisma.userPreferences.findUnique({
        where: { userId: user.id },
      });

      if (!existingPrefs) {
        await prisma.userPreferences.create({
          data: {
            userId: user.id,
            notifications: user.role === 'ADMIN',
          },
        });
      }
    }
    console.log('✅ User preferences created/verified.');

    if (seedDemo) {
      for (const media of SAMPLE_MEDIA) {
        await prisma.mediaItem.upsert({
          where: {
            userId_tmdbId_mediaType: {
              userId: adminUser.id,
              tmdbId: media.tmdbId,
              mediaType: media.mediaType,
            },
          },
          create: {
            userId: adminUser.id,
            ...media,
          },
          update: {
            posterPath: media.posterPath,
            title: media.title,
          },
        });
      }
      console.log('✅ Sample media items created/verified.');
    } else {
      console.log('ℹ️  Skipping sample media items (SEED_DEMO is not "true").');
    }

    console.log('\n🎉 Seed completed successfully!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
