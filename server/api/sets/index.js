import prisma from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

// Get single set by ID
async function handleGetById(req, res, userId, id) {
  const set = await prisma.set.findFirst({
    where: { id, userId }
  });

  if (!set) {
    return res.status(404).json({ error: 'Set not found' });
  }

  const fullSet = await prisma.set.findUnique({
    where: { id },
    include: {
      exercise: {
        include: {
          routine: true,
          predefinedExercise: { include: { muscleGroup: true } }
        }
      }
    }
  });

  return res.json(fullSet);
}

// Update set by ID
async function handleUpdateById(req, res, userId, id) {
  const set = await prisma.set.findFirst({
    where: { id, userId }
  });

  if (!set) {
    return res.status(404).json({ error: 'Set not found' });
  }

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
          predefinedExercise: { include: { muscleGroup: true } }
        }
      }
    }
  });

  return res.json(updated);
}

// Delete set by ID
async function handleDeleteById(req, res, userId, id) {
  const set = await prisma.set.findFirst({
    where: { id, userId }
  });

  if (!set) {
    return res.status(404).json({ error: 'Set not found' });
  }

  await prisma.set.delete({ where: { id } });
  return res.json({ success: true });
}

// List sets
async function handleList(req, res, userId) {
  const { exerciseId, date, from, to } = req.query;
  const whereClause = { userId };

  if (exerciseId) {
    whereClause.exerciseId = exerciseId;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    whereClause.loggedAt = { gte: startOfDay, lte: endOfDay };
  } else if (from || to) {
    whereClause.loggedAt = {};
    if (from) whereClause.loggedAt.gte = new Date(from);
    if (to) whereClause.loggedAt.lte = new Date(to);
  }

  const sets = await prisma.set.findMany({
    where: whereClause,
    orderBy: { loggedAt: 'desc' },
    include: {
      exercise: {
        include: {
          routine: true,
          predefinedExercise: { include: { muscleGroup: true } }
        }
      }
    }
  });

  return res.json(sets);
}

// Create set
async function handleCreate(req, res, userId) {
  const { exerciseId, reps, note, loggedAt } = req.body;

  if (!exerciseId) {
    return res.status(400).json({ error: 'exerciseId is required' });
  }

  if (reps === undefined || typeof reps !== 'number' || reps < 0) {
    return res.status(400).json({ error: 'reps must be a non-negative number' });
  }

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
          predefinedExercise: { include: { muscleGroup: true } }
        }
      }
    }
  });

  return res.status(201).json(set);
}

export default async function handler(req, res) {
  const isAuthenticated = await requireAuth(req, res);
  if (!isAuthenticated) return;

  const userId = req.user.id;
  const { id } = req.query;

  // Handle /sets?id=xxx operations
  if (id) {
    switch (req.method) {
      case 'GET':
        return handleGetById(req, res, userId, id);
      case 'PUT':
        return handleUpdateById(req, res, userId, id);
      case 'DELETE':
        return handleDeleteById(req, res, userId, id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  }

  // Handle /sets list and create
  switch (req.method) {
    case 'GET':
      return handleList(req, res, userId);
    case 'POST':
      return handleCreate(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
