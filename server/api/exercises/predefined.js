import prisma from '../../db/client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const muscleGroups = await prisma.muscleGroup.findMany({
    orderBy: { name: 'asc' },
    include: {
      predefinedExercises: {
        orderBy: { name: 'asc' }
      }
    }
  });

  return res.json(muscleGroups);
}
