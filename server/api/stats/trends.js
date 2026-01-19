import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const userId = req.user.id;
  const { granularity = 'day', exerciseIds, days = 30 } = req.query;

  const now = new Date();
  const startDate = new Date(now);

  // Set date range based on granularity
  if (granularity === 'month') {
    startDate.setFullYear(startDate.getFullYear() - 1);
  } else if (granularity === 'week') {
    startDate.setDate(startDate.getDate() - 12 * 7); // 12 weeks
  } else {
    startDate.setDate(startDate.getDate() - parseInt(days));
  }

  startDate.setHours(0, 0, 0, 0);

  // Build where clause
  const whereClause = {
    userId,
    loggedAt: { gte: startDate }
  };

  // Filter by specific exercises if provided
  if (exerciseIds) {
    const ids = exerciseIds.split(',').filter(Boolean);
    if (ids.length > 0) {
      whereClause.exerciseId = { in: ids };
    }
  }

  // Get all sets in range
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
          predefinedExercise: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { loggedAt: 'asc' }
  });

  // Group data based on granularity
  const dataPoints = {};
  const exerciseNames = {};

  for (const set of sets) {
    let periodKey;
    const date = new Date(set.loggedAt);

    if (granularity === 'month') {
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else if (granularity === 'week') {
      // Get ISO week
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

  // Convert to array and sort
  const timeline = Object.values(dataPoints).sort((a, b) => a.period.localeCompare(b.period));

  // Format exercise data
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
