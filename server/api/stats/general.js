import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const { date } = req.query;
  const userId = req.user.id;

  // Use provided date or today
  // Parse date string as local date to avoid timezone issues
  let startOfDay;
  if (date) {
    const [year, month, day] = date.split('-').map(Number);
    startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  } else {
    startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
  }
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  // Yesterday for comparison
  const yesterday = new Date(startOfDay);
  yesterday.setDate(yesterday.getDate() - 1);
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  // 7 days ago for weekly average
  const weekAgo = new Date(startOfDay);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get today's sets with exercise and routine info
  const todaySets = await prisma.set.findMany({
    where: {
      userId,
      loggedAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      exercise: {
        include: {
          routine: true,
          predefinedExercise: {
            include: { muscleGroup: true }
          }
        }
      }
    },
    orderBy: { loggedAt: 'asc' }
  });

  // Get yesterday's totals
  const yesterdaySets = await prisma.set.aggregate({
    where: {
      userId,
      loggedAt: {
        gte: yesterday,
        lte: endOfYesterday
      }
    },
    _sum: { reps: true },
    _count: true
  });

  // Get weekly sets for average
  const weeklySets = await prisma.set.aggregate({
    where: {
      userId,
      loggedAt: {
        gte: weekAgo,
        lt: startOfDay
      }
    },
    _sum: { reps: true },
    _count: true
  });

  // Calculate today's totals
  const todayTotalSets = todaySets.length;
  const todayTotalReps = todaySets.reduce((sum, set) => sum + set.reps, 0);

  // Breakdown by routine and exercise
  const routineBreakdown = {};
  for (const set of todaySets) {
    const routineName = set.exercise.routine?.name || 'Unknown';
    const routineId = set.exercise.routine?.id || 'unknown';
    const exerciseName = set.exercise.predefinedExercise?.name || set.exercise.customName;

    if (!routineBreakdown[routineId]) {
      routineBreakdown[routineId] = {
        name: routineName,
        exercises: {},
        totalSets: 0,
        totalReps: 0
      };
    }

    if (!routineBreakdown[routineId].exercises[exerciseName]) {
      routineBreakdown[routineId].exercises[exerciseName] = {
        name: exerciseName,
        muscleGroup: set.exercise.predefinedExercise?.muscleGroup?.name || 'Custom',
        sets: 0,
        reps: 0
      };
    }

    routineBreakdown[routineId].exercises[exerciseName].sets++;
    routineBreakdown[routineId].exercises[exerciseName].reps += set.reps;
    routineBreakdown[routineId].totalSets++;
    routineBreakdown[routineId].totalReps += set.reps;
  }

  // Convert to array format
  const routines = Object.values(routineBreakdown).map(r => ({
    ...r,
    exercises: Object.values(r.exercises)
  }));

  // Flat exercise breakdown for backward compatibility
  const exerciseBreakdown = {};
  for (const set of todaySets) {
    const name = set.exercise.predefinedExercise?.name || set.exercise.customName;
    if (!exerciseBreakdown[name]) {
      exerciseBreakdown[name] = {
        name,
        muscleGroup: set.exercise.predefinedExercise?.muscleGroup?.name || 'Custom',
        sets: 0,
        reps: 0
      };
    }
    exerciseBreakdown[name].sets++;
    exerciseBreakdown[name].reps += set.reps;
  }

  // Calculate weekly daily average (excluding today)
  const daysInWeek = 7;
  const weeklyDailyAvgSets = weeklySets._count / daysInWeek;
  const weeklyDailyAvgReps = (weeklySets._sum.reps || 0) / daysInWeek;

  return res.json({
    date: startOfDay.toISOString().split('T')[0],
    today: {
      totalSets: todayTotalSets,
      totalReps: todayTotalReps,
      exercises: Object.values(exerciseBreakdown),
      routines
    },
    comparison: {
      yesterday: {
        totalSets: yesterdaySets._count,
        totalReps: yesterdaySets._sum.reps || 0
      },
      weeklyAverage: {
        totalSets: Math.round(weeklyDailyAvgSets * 10) / 10,
        totalReps: Math.round(weeklyDailyAvgReps * 10) / 10
      }
    }
  });
}
