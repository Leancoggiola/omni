import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = !isProduction;

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.log('⚠️  ADMIN_USERNAME and ADMIN_PASSWORD env vars not set. Skipping admin seed.');
    await prisma.$disconnect();
    return;
  }

  const hashedAdminPassword = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
  const defaultPassword = isDevelopment ? await bcrypt.hash('password123', BCRYPT_ROUNDS) : null;

  console.log(`\n🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);

  let adminUser = await prisma.user.findUnique({
    where: { username: adminUsername.toLowerCase() },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        username: adminUsername.toLowerCase(),
        name: 'Admin',
        email: 'admin@example.com',
        password: hashedAdminPassword,
        role: 'ADMIN',
      },
    });
    console.log('✅ Admin user created.');
  } else {
    console.log('ℹ️  Admin user already exists.');
  }

  const createdUsers = [adminUser];

  if (isDevelopment) {
    const testUsers = [
      { username: 'user1', name: 'Juan Pérez', email: 'juan@example.com' },
      { username: 'user2', name: 'María García', email: 'maria@example.com' },
    ];

    for (const userData of testUsers) {
      const existing = await prisma.user.findUnique({
        where: { username: userData.username },
      });

      if (!existing) {
        const newUser = await prisma.user.create({
          data: {
            ...userData,
            password: defaultPassword!,
            role: 'USER',
          },
        });
        createdUsers.push(newUser);
        console.log(`✅ Test user '${userData.username}' created.`);
      } else {
        createdUsers.push(existing);
        console.log(`ℹ️  Test user '${userData.username}' already exists.`);
      }
    }
  } else {
    console.log('ℹ️  Skipping test users (production environment).');
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

  if (isDevelopment) {
    const sampleMedia = [
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

    for (const media of sampleMedia) {
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
    console.log('ℹ️  Skipping sample media items (production environment).');
  }

  for (const user of createdUsers) {
    const existingStats = await prisma.userStats.findUnique({
      where: { userId: user.id },
    });

    if (!existingStats) {
      await prisma.userStats.create({
        data: {
          userId: user.id,
          totalMovies: 0,
          totalTvShows: 0,
          totalWatched: 0,
          totalWatching: 0,
          totalToWatch: 0,
        },
      });
    }
  }
  console.log('✅ User stats created/verified.');

  console.log('\n🎉 Seed completed successfully!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
