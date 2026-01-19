import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const { id } = req.params;
  const userId = req.user.id;

  // Verify ownership
  const set = await prisma.set.findFirst({
    where: { id, userId }
  });

  if (!set) {
    return res.status(404).json({ error: 'Set not found' });
  }

  if (req.method === 'GET') {
    const fullSet = await prisma.set.findUnique({
      where: { id },
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

    return res.json(fullSet);
  }

  if (req.method === 'PUT') {
    const { reps, note, loggedAt } = req.body;

    const updateData = {};
    if (reps !== undefined) {
      if (typeof reps !== 'number' || reps < 0) {
        return res.status(400).json({ error: 'reps must be a non-negative number' });
      }
      updateData.reps = reps;
    }

    if (note !== undefined) {
      updateData.note = note?.trim() || null;
    }

    if (loggedAt !== undefined) {
      updateData.loggedAt = new Date(loggedAt);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await prisma.set.update({
      where: { id },
      data: updateData,
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

    return res.json(updated);
  }

  if (req.method === 'DELETE') {
    await prisma.set.delete({
      where: { id }
    });

    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
