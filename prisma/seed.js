import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const muscleGroups = [
  {
    name: 'Chest',
    exercises: ['Push-ups', 'Bench Press', 'Chest Fly', 'Incline Press']
  },
  {
    name: 'Back',
    exercises: ['Pull-ups', 'Rows', 'Lat Pulldown', 'Deadlift']
  },
  {
    name: 'Shoulders',
    exercises: ['Overhead Press', 'Lateral Raise', 'Front Raise', 'Shrugs']
  },
  {
    name: 'Arms',
    exercises: ['Bicep Curl', 'Tricep Dip', 'Hammer Curl', 'Skull Crusher']
  },
  {
    name: 'Core',
    exercises: ['Plank', 'Crunches', 'Leg Raise', 'Russian Twist']
  },
  {
    name: 'Legs',
    exercises: ['Squats', 'Lunges', 'Leg Press', 'Calf Raise']
  },
  {
    name: 'Cardio',
    exercises: ['Running', 'Jumping Jacks', 'Burpees', 'Mountain Climbers']
  }
];

async function seedPredefinedExercises() {
  console.log('Seeding predefined exercises...');

  for (const group of muscleGroups) {
    const muscleGroup = await prisma.muscleGroup.upsert({
      where: { name: group.name },
      update: {},
      create: { name: group.name }
    });

    for (const exerciseName of group.exercises) {
      await prisma.predefinedExercise.upsert({
        where: {
          muscleGroupId_name: {
            muscleGroupId: muscleGroup.id,
            name: exerciseName
          }
        },
        update: {},
        create: {
          muscleGroupId: muscleGroup.id,
          name: exerciseName
        }
      });
    }
  }

  console.log('Predefined exercises seeded.');
}

async function seedMockData() {
  console.log('Seeding mock data for development...');

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      provider: 'dev',
      providerId: 'dev-user-1',
      role: 'user'
    }
  });

  console.log('Test user created:', testUser.email);

  // Get some predefined exercises
  const pushups = await prisma.predefinedExercise.findFirst({
    where: { name: 'Push-ups' }
  });
  const squats = await prisma.predefinedExercise.findFirst({
    where: { name: 'Squats' }
  });
  const plank = await prisma.predefinedExercise.findFirst({
    where: { name: 'Plank' }
  });
  const pullups = await prisma.predefinedExercise.findFirst({
    where: { name: 'Pull-ups' }
  });
  const lunges = await prisma.predefinedExercise.findFirst({
    where: { name: 'Lunges' }
  });

  // Create routines
  const morningRoutine = await prisma.routine.upsert({
    where: { id: 'mock-routine-morning' },
    update: {},
    create: {
      id: 'mock-routine-morning',
      userId: testUser.id,
      name: 'Morning Workout',
      displayOrder: 0
    }
  });

  const eveningRoutine = await prisma.routine.upsert({
    where: { id: 'mock-routine-evening' },
    update: {},
    create: {
      id: 'mock-routine-evening',
      userId: testUser.id,
      name: 'Evening Stretch',
      displayOrder: 1
    }
  });

  console.log('Routines created:', morningRoutine.name, eveningRoutine.name);

  // Create exercises for morning routine
  const exercises = [
    { id: 'mock-ex-pushups', routineId: morningRoutine.id, predefinedExerciseId: pushups?.id, displayOrder: 0 },
    { id: 'mock-ex-squats', routineId: morningRoutine.id, predefinedExerciseId: squats?.id, displayOrder: 1 },
    { id: 'mock-ex-plank', routineId: morningRoutine.id, predefinedExerciseId: plank?.id, displayOrder: 2 },
    { id: 'mock-ex-pullups', routineId: eveningRoutine.id, predefinedExerciseId: pullups?.id, displayOrder: 0 },
    { id: 'mock-ex-lunges', routineId: eveningRoutine.id, predefinedExerciseId: lunges?.id, displayOrder: 1 },
    { id: 'mock-ex-custom', routineId: eveningRoutine.id, customName: 'Stretching', displayOrder: 2 }
  ];

  for (const ex of exercises) {
    await prisma.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: ex
    });
  }

  console.log('Exercises created.');

  // Create sets for the past 2 weeks
  const now = new Date();
  const setsToCreate = [];

  for (let daysAgo = 0; daysAgo < 14; daysAgo++) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(8, 0, 0, 0);

    // Skip some days randomly to make it realistic
    if (Math.random() < 0.3 && daysAgo > 0) continue;

    // Morning routine exercises
    const morningExercises = ['mock-ex-pushups', 'mock-ex-squats', 'mock-ex-plank'];
    for (const exId of morningExercises) {
      // 1-3 sets per exercise
      const numSets = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numSets; i++) {
        const setDate = new Date(date);
        setDate.setMinutes(setDate.getMinutes() + i * 2);

        setsToCreate.push({
          exerciseId: exId,
          userId: testUser.id,
          reps: Math.floor(Math.random() * 20) + 10,
          loggedAt: setDate,
          createdAt: setDate,
          updatedAt: setDate
        });
      }
    }

    // Evening routine (less frequent)
    if (Math.random() > 0.5) {
      const eveningDate = new Date(date);
      eveningDate.setHours(18, 0, 0, 0);

      const eveningExercises = ['mock-ex-pullups', 'mock-ex-lunges'];
      for (const exId of eveningExercises) {
        setsToCreate.push({
          exerciseId: exId,
          userId: testUser.id,
          reps: Math.floor(Math.random() * 15) + 5,
          loggedAt: eveningDate,
          createdAt: eveningDate,
          updatedAt: eveningDate
        });
      }
    }
  }

  // Clear existing mock sets and create new ones
  await prisma.set.deleteMany({
    where: {
      userId: testUser.id
    }
  });

  await prisma.set.createMany({
    data: setsToCreate
  });

  console.log(`Created ${setsToCreate.length} sets for testing.`);
}

async function main() {
  try {
    await seedPredefinedExercises();

    if (process.env.NODE_ENV !== 'production') {
      await seedMockData();
    }

    console.log('Seeding completed.');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
