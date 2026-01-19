import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const { exerciseId } = req.query;
  const userId = req.user.id;

  if (!exerciseId) {
    return res.status(400).json({ error: 'exerciseId is required' });
  }

  // Verify exercise ownership
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      routine: { userId }
    }
  });

  if (!exercise) {
    return res.status(404).json({ error: 'Exercise not found' });
  }

  // Get the last set for this exercise
  const lastSet = await prisma.set.findFirst({
    where: {
      exerciseId,
      userId
    },
    orderBy: { loggedAt: 'desc' }
  });

  if (!lastSet) {
    return res.json({ reps: null, note: null });
  }

  return res.json({
    reps: lastSet.reps,
    note: lastSet.note,
    loggedAt: lastSet.loggedAt
  });
}
