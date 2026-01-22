// Reset database to clean seed state after e2e tests
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reset() {
  console.log('🧹 Resetting database...');

  const testUser = await prisma.user.findFirst({
    where: { email: 'test@example.com' }
  });

  if (!testUser) {
    console.log('No test user found');
    await prisma.$disconnect();
    return;
  }

  // Delete all sets
  const deletedSets = await prisma.set.deleteMany({
    where: { userId: testUser.id }
  });

  // Delete non-mock exercises
  const deletedExercises = await prisma.exercise.deleteMany({
    where: {
      routine: { userId: testUser.id },
      NOT: { id: { startsWith: 'mock-' } }
    }
  });

  // Delete non-mock routines
  const deletedRoutines = await prisma.routine.deleteMany({
    where: {
      userId: testUser.id,
      NOT: { id: { startsWith: 'mock-' } }
    }
  });

  // Reset mock routine names
  await prisma.routine.updateMany({
    where: { id: 'mock-routine-morning' },
    data: { name: 'Morning Workout' }
  });

  await prisma.routine.updateMany({
    where: { id: 'mock-routine-evening' },
    data: { name: 'Evening Stretch' }
  });

  console.log(`Deleted: ${deletedRoutines.count} routines, ${deletedExercises.count} exercises, ${deletedSets.count} sets`);

  await prisma.$disconnect();

  // Re-seed
  console.log('🌱 Re-seeding database...');
  const { execSync } = await import('child_process');
  execSync('node prisma/seed.js', { stdio: 'inherit' });

  console.log('✅ Database reset complete!');
}

reset().catch(console.error);
