import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

// General stats handler
async function handleGeneral(req, res, userId) {
  const { date } = req.query;

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

  const yesterday = new Date(startOfDay);
  yesterday.setDate(yesterday.getDate() - 1);
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  const weekAgo = new Date(startOfDay);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todaySets = await prisma.set.findMany({
    where: {
      userId,
      loggedAt: { gte: startOfDay, lte: endOfDay }
    },
    include: {
      exercise: {
        include: {
          routine: true,
          predefinedExercise: { include: { muscleGroup: true } }
        }
      }
    },
    orderBy: { loggedAt: 'asc' }
  });

  const yesterdaySets = await prisma.set.aggregate({
    where: {
      userId,
      loggedAt: { gte: yesterday, lte: endOfYesterday }
    },
    _sum: { reps: true },
    _count: true
  });

  const weeklySets = await prisma.set.aggregate({
    where: {
      userId,
      loggedAt: { gte: weekAgo, lt: startOfDay }
    },
    _sum: { reps: true },
    _count: true
  });

  const todayTotalSets = todaySets.length;
  const todayTotalReps = todaySets.reduce((sum, set) => sum + set.reps, 0);

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

  const routines = Object.values(routineBreakdown).map(r => ({
    ...r,
    exercises: Object.values(r.exercises)
  }));

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

// Calendar stats handler
async function handleCalendar(req, res, userId) {
  const now = new Date();
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || now.getMonth() + 1;

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const sets = await prisma.set.findMany({
    where: {
      userId,
      loggedAt: { gte: startOfMonth, lte: endOfMonth }
    },
    include: {
      exercise: {
        include: {
          routine: true,
          predefinedExercise: { include: { muscleGroup: true } }
        }
      }
    },
    orderBy: { loggedAt: 'asc' }
  });

  const dayStats = {};
  for (const set of sets) {
    const day = set.loggedAt.getDate();
    if (!dayStats[day]) {
      dayStats[day] = { sets: 0, reps: 0, routines: {} };
    }
    dayStats[day].sets++;
    dayStats[day].reps += set.reps;

    const routineName = set.exercise.routine?.name || 'Unknown';
    const routineId = set.exercise.routine?.id || 'unknown';
    const exerciseName = set.exercise.predefinedExercise?.name || set.exercise.customName;

    if (!dayStats[day].routines[routineId]) {
      dayStats[day].routines[routineId] = {
        name: routineName,
        exercises: {},
        totalSets: 0,
        totalReps: 0
      };
    }

    if (!dayStats[day].routines[routineId].exercises[exerciseName]) {
      dayStats[day].routines[routineId].exercises[exerciseName] = {
        name: exerciseName,
        muscleGroup: set.exercise.predefinedExercise?.muscleGroup?.name || 'Custom',
        sets: 0,
        reps: 0
      };
    }

    dayStats[day].routines[routineId].exercises[exerciseName].sets++;
    dayStats[day].routines[routineId].exercises[exerciseName].reps += set.reps;
    dayStats[day].routines[routineId].totalSets++;
    dayStats[day].routines[routineId].totalReps += set.reps;
  }

  const maxDayReps = Math.max(...Object.values(dayStats).map(d => d.reps), 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendarDays = [];

  const formatLocalDate = (y, m, d) => {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  for (let day = 1; day <= daysInMonth; day++) {
    const stats = dayStats[day];
    const date = new Date(year, month - 1, day);

    const routines = stats
      ? Object.values(stats.routines).map(r => ({
          ...r,
          exercises: Object.values(r.exercises)
        }))
      : [];

    calendarDays.push({
      date: formatLocalDate(year, month, day),
      day,
      dayOfWeek: date.getDay(),
      sets: stats?.sets || 0,
      reps: stats?.reps || 0,
      intensity: stats ? Math.ceil((stats.reps / maxDayReps) * 4) : 0,
      routines
    });
  }

  const totalSets = sets.length;
  const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
  const activeDays = Object.keys(dayStats).length;

  return res.json({
    year,
    month,
    days: calendarDays,
    summary: {
      totalSets,
      totalReps,
      activeDays,
      averageRepsPerDay: activeDays > 0 ? Math.round(totalReps / activeDays) : 0
    }
  });
}

// Trends stats handler
async function handleTrends(req, res, userId) {
  const { granularity = 'day', exerciseIds, routineId, days = 30 } = req.query;

  const now = new Date();
  const startDate = new Date(now);

  if (granularity === 'month') {
    startDate.setFullYear(startDate.getFullYear() - 1);
  } else if (granularity === 'week') {
    startDate.setDate(startDate.getDate() - 12 * 7);
  } else {
    startDate.setDate(startDate.getDate() - parseInt(days));
  }

  startDate.setHours(0, 0, 0, 0);

  const whereClause = {
    userId,
    loggedAt: { gte: startDate }
  };

  if (routineId) {
    whereClause.exercise = { routineId };
  }

  if (exerciseIds) {
    const ids = exerciseIds.split(',').filter(Boolean);
    if (ids.length > 0) {
      whereClause.exerciseId = { in: ids };
    }
  }

  const sets = await prisma.set.findMany({
    where: whereClause,
    select: {
      reps: true,
      loggedAt: true,
      exerciseId: true,
      exercise: {
        select: {
          id: true,
          customName: true,
          predefinedExercise: { select: { name: true } }
        }
      }
    },
    orderBy: { loggedAt: 'asc' }
  });

  const dataPoints = {};
  const exerciseNames = {};

  for (const set of sets) {
    let periodKey;
    const date = new Date(set.loggedAt);

    if (granularity === 'month') {
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else if (granularity === 'week') {
      const jan1 = new Date(date.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((date - jan1) / 86400000 + jan1.getDay() + 1) / 7);
      periodKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    } else {
      periodKey = date.toISOString().split('T')[0];
    }

    const exerciseName = set.exercise.predefinedExercise?.name || set.exercise.customName;
    exerciseNames[set.exerciseId] = exerciseName;

    if (!dataPoints[periodKey]) {
      dataPoints[periodKey] = { period: periodKey, total: 0, byExercise: {} };
    }

    dataPoints[periodKey].total += set.reps;

    if (!dataPoints[periodKey].byExercise[set.exerciseId]) {
      dataPoints[periodKey].byExercise[set.exerciseId] = 0;
    }
    dataPoints[periodKey].byExercise[set.exerciseId] += set.reps;
  }

  const timeline = Object.values(dataPoints).sort((a, b) => a.period.localeCompare(b.period));

  const exercises = Object.entries(exerciseNames).map(([id, name]) => ({
    id,
    name,
    data: timeline.map(point => ({
      period: point.period,
      reps: point.byExercise[id] || 0
    }))
  }));

  return res.json({
    granularity,
    startDate: startDate.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
    timeline: timeline.map(point => ({
      period: point.period,
      totalReps: point.total
    })),
    exercises
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const userId = req.user.id;
  const { type = 'general' } = req.query;

  switch (type) {
    case 'general':
      return handleGeneral(req, res, userId);
    case 'calendar':
      return handleCalendar(req, res, userId);
    case 'trends':
      return handleTrends(req, res, userId);
    default:
      return res.status(400).json({ error: 'Invalid type. Use: general, calendar, or trends' });
  }
}
