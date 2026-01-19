import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const userId = req.user.id;

  if (req.method === 'GET') {
    const { exerciseId, date, from, to } = req.query;

    const whereClause = { userId };

    if (exerciseId) {
      whereClause.exerciseId = exerciseId;
    }

    // Filter by date
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.loggedAt = {
        gte: startOfDay,
        lte: endOfDay
      };
    } else if (from || to) {
      whereClause.loggedAt = {};
      if (from) {
        whereClause.loggedAt.gte = new Date(from);
      }
      if (to) {
        whereClause.loggedAt.lte = new Date(to);
      }
    }

    const sets = await prisma.set.findMany({
      where: whereClause,
      orderBy: { loggedAt: 'desc' },
      include: {
        exercise: {
          include: {
            routine: true,
            predefinedExercise: {
              include: { muscleGroup: true }
            }
          }
        }
      }
    });

    return res.json(sets);
  }

  if (req.method === 'POST') {
    const { exerciseId, reps, note, loggedAt } = req.body;

    if (!exerciseId) {
      return res.status(400).json({ error: 'exerciseId is required' });
    }

    if (reps === undefined || typeof reps !== 'number' || reps < 0) {
      return res.status(400).json({ error: 'reps must be a non-negative number' });
    }

    // Verify exercise ownership through routine
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        routine: { userId }
      }
    });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const set = await prisma.set.create({
      data: {
        exerciseId,
        userId,
        reps,
        note: note?.trim() || null,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date()
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
      }
    });

    return res.status(201).json(set);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
