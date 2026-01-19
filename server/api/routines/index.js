import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const userId = req.user.id;

  if (req.method === 'GET') {
    const routines = await prisma.routine.findMany({
      where: { userId },
      orderBy: { displayOrder: 'asc' },
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

    return res.json(routines);
  }

  if (req.method === 'POST') {
    const { name, displayOrder } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Get max display order if not provided
    let order = displayOrder;
    if (order === undefined) {
      const maxOrder = await prisma.routine.aggregate({
        where: { userId },
        _max: { displayOrder: true }
      });
      order = (maxOrder._max.displayOrder ?? -1) + 1;
    }

    const routine = await prisma.routine.create({
      data: {
        userId,
        name: name.trim(),
        displayOrder: order
      },
      include: {
        exercises: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    return res.status(201).json(routine);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
