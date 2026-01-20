import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const { id } = req.query;
  const userId = req.user.id;

  // Verify ownership through routine
  const exercise = await prisma.exercise.findFirst({
    where: {
      id,
      routine: { userId }
    }
  });

  if (!exercise) {
    return res.status(404).json({ error: 'Exercise not found' });
  }

  if (req.method === 'GET') {
    const fullExercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        routine: true,
        predefinedExercise: {
          include: { muscleGroup: true }
        }
      }
    });

    return res.json(fullExercise);
  }

  if (req.method === 'PUT') {
    const { predefinedExerciseId, customName, displayOrder, routineId } = req.body;

    const updateData = {};
    const targetRoutineId = routineId || exercise.routineId;

    if (predefinedExerciseId !== undefined) {
      if (predefinedExerciseId) {
        const predefined = await prisma.predefinedExercise.findUnique({
          where: { id: predefinedExerciseId }
        });
        if (!predefined) {
          return res.status(400).json({ error: 'Invalid predefinedExerciseId' });
        }

        // Check for duplicate predefined exercise in target routine
        const existing = await prisma.exercise.findFirst({
          where: { routineId: targetRoutineId, predefinedExerciseId, id: { not: id } }
        });
        if (existing) {
          return res.status(400).json({ error: 'This exercise already exists in the routine' });
        }
      }
      updateData.predefinedExerciseId = predefinedExerciseId || null;
    }

    if (customName !== undefined) {
      if (customName) {
        // Check for duplicate custom name in target routine
        const existing = await prisma.exercise.findFirst({
          where: { routineId: targetRoutineId, customName: customName.trim(), id: { not: id } }
        });
        if (existing) {
          return res.status(400).json({ error: 'An exercise with this name already exists in the routine' });
        }
      }
      updateData.customName = customName?.trim() || null;
    }

    if (displayOrder !== undefined) {
      updateData.displayOrder = displayOrder;
    }

    if (routineId !== undefined) {
      // Verify new routine ownership
      const routine = await prisma.routine.findFirst({
        where: { id: routineId, userId }
      });
      if (!routine) {
        return res.status(404).json({ error: 'Target routine not found' });
      }
      updateData.routineId = routineId;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await prisma.exercise.update({
      where: { id },
      data: updateData,
      include: {
        routine: true,
        predefinedExercise: {
          include: { muscleGroup: true }
        }
      }
    });

    return res.json(updated);
  }

  if (req.method === 'DELETE') {
    await prisma.exercise.delete({
      where: { id }
    });

    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
