import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const { id } = req.params;
  const userId = req.user.id;

  // Verify ownership
  const routine = await prisma.routine.findFirst({
    where: { id, userId }
  });

  if (!routine) {
    return res.status(404).json({ error: 'Routine not found' });
  }

  if (req.method === 'GET') {
    const fullRoutine = await prisma.routine.findUnique({
      where: { id },
      include: {
        exercises: {
          orderBy: { displayOrder: 'asc' },
          include: {
            predefinedExercise: {
              include: { muscleGroup: true }
            }
          }
        }
      }
    });

    return res.json(fullRoutine);
  }

  if (req.method === 'PUT') {
    const { name, displayOrder } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await prisma.routine.update({
      where: { id },
      data: updateData,
      include: {
        exercises: {
          orderBy: { displayOrder: 'asc' },
          include: {
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
    await prisma.routine.delete({
      where: { id }
    });

    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
