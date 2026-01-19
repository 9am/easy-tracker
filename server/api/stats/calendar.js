import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const userId = req.user.id;
  const now = new Date();

  // Get year and month from query, default to current
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || now.getMonth() + 1;

  // Calculate date range for the month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Get all sets for the month
  const sets = await prisma.set.findMany({
    where: {
      userId,
      loggedAt: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
    select: {
      reps: true,
      loggedAt: true
    }
  });

  // Group by day
  const dayStats = {};
  for (const set of sets) {
    const day = set.loggedAt.getDate();
    if (!dayStats[day]) {
      dayStats[day] = { sets: 0, reps: 0 };
    }
    dayStats[day].sets++;
    dayStats[day].reps += set.reps;
  }

  // Calculate max reps for intensity scaling
  const maxDayReps = Math.max(...Object.values(dayStats).map(d => d.reps), 1);

  // Build calendar data
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendarDays = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const stats = dayStats[day];
    const date = new Date(year, month - 1, day);

    calendarDays.push({
      date: date.toISOString().split('T')[0],
      day,
      dayOfWeek: date.getDay(),
      sets: stats?.sets || 0,
      reps: stats?.reps || 0,
      intensity: stats ? Math.ceil((stats.reps / maxDayReps) * 4) : 0 // 0-4 scale
    });
  }

  // Month totals
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
