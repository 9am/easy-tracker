import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const userId = req.user.id;

  if (req.method === 'GET') {
    const { routineId } = req.query;

    const whereClause = {
      routine: { userId }
    };

    if (routineId) {
      whereClause.routineId = routineId;
    }

    const exercises = await prisma.exercise.findMany({
      where: whereClause,
      orderBy: [
        { routineId: 'asc' },
        { displayOrder: 'asc' }
      ],
      include: {
        routine: true,
        predefinedExercise: {
          include: { muscleGroup: true }
        }
      }
    });

    return res.json(exercises);
  }

  if (req.method === 'POST') {
    const { routineId, predefinedExerciseId, customName, displayOrder } = req.body;

    if (!routineId) {
      return res.status(400).json({ error: 'routineId is required' });
    }

    // Verify routine ownership
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId }
    });

    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    if (!predefinedExerciseId && !customName) {
      return res.status(400).json({ error: 'Either predefinedExerciseId or customName is required' });
    }

    // Verify predefined exercise exists
    if (predefinedExerciseId) {
      const predefined = await prisma.predefinedExercise.findUnique({
        where: { id: predefinedExerciseId }
      });
      if (!predefined) {
        return res.status(400).json({ error: 'Invalid predefinedExerciseId' });
      }
    }

    // Get max display order if not provided
    let order = displayOrder;
    if (order === undefined) {
      const maxOrder = await prisma.exercise.aggregate({
        where: { routineId },
        _max: { displayOrder: true }
      });
      order = (maxOrder._max.displayOrder ?? -1) + 1;
    }

    const exercise = await prisma.exercise.create({
      data: {
        routineId,
        predefinedExerciseId: predefinedExerciseId || null,
        customName: customName?.trim() || null,
        displayOrder: order
      },
      include: {
        routine: true,
        predefinedExercise: {
          include: { muscleGroup: true }
        }
      }
    });

    return res.status(201).json(exercise);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
