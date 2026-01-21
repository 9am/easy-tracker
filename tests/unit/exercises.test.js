import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../../server/db/client.js', () => ({
  default: {
    exercise: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    routine: {
      findFirst: vi.fn(),
    },
    predefinedExercise: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock auth middleware
vi.mock('../../server/middleware/auth.js', () => ({
  requireAuth: vi.fn(),
}));

import prisma from '../../server/db/client.js';
import { requireAuth } from '../../server/middleware/auth.js';
import handler from '../../server/api/exercises/index.js';

describe('Exercises API', () => {
  let mockReq;
  let mockRes;
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'GET',
      query: {},
      body: {},
      user: { id: mockUserId },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    requireAuth.mockResolvedValue(true);
  });

  describe('GET /exercises', () => {
    it('should list all exercises for user', async () => {
      const mockExercises = [
        { id: 'ex-1', routineId: 'r-1', routine: {}, predefinedExercise: { muscleGroup: {} } },
        { id: 'ex-2', routineId: 'r-1', routine: {}, predefinedExercise: { muscleGroup: {} } },
      ];

      prisma.exercise.findMany.mockResolvedValue(mockExercises);

      await handler(mockReq, mockRes);

      expect(prisma.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { routine: { userId: mockUserId } },
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockExercises);
    });

    it('should filter by routineId', async () => {
      mockReq.query = { routineId: 'r-1' };

      prisma.exercise.findMany.mockResolvedValue([]);

      await handler(mockReq, mockRes);

      expect(prisma.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            routineId: 'r-1',
          }),
        })
      );
    });
  });

  describe('POST /exercises', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
    });

    it('should create exercise with predefinedExerciseId', async () => {
      const mockExercise = {
        id: 'ex-1',
        routineId: 'r-1',
        predefinedExerciseId: 'pre-1',
        customName: null,
        routine: {},
        predefinedExercise: { muscleGroup: {} },
      };

      mockReq.body = { routineId: 'r-1', predefinedExerciseId: 'pre-1' };

      prisma.routine.findFirst.mockResolvedValue({ id: 'r-1', userId: mockUserId });
      prisma.predefinedExercise.findUnique.mockResolvedValue({ id: 'pre-1', name: 'Push-ups' });
      prisma.exercise.findFirst.mockResolvedValue(null); // No duplicate
      prisma.exercise.aggregate.mockResolvedValue({ _max: { displayOrder: null } });
      prisma.exercise.create.mockResolvedValue(mockExercise);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockExercise);
    });

    it('should create exercise with customName', async () => {
      const mockExercise = {
        id: 'ex-1',
        routineId: 'r-1',
        predefinedExerciseId: null,
        customName: 'My Custom Exercise',
        routine: {},
        predefinedExercise: null,
      };

      mockReq.body = { routineId: 'r-1', customName: 'My Custom Exercise' };

      prisma.routine.findFirst.mockResolvedValue({ id: 'r-1', userId: mockUserId });
      prisma.exercise.findFirst.mockResolvedValue(null); // No duplicate
      prisma.exercise.aggregate.mockResolvedValue({ _max: { displayOrder: null } });
      prisma.exercise.create.mockResolvedValue(mockExercise);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockExercise);
    });

    it('should trim customName', async () => {
      mockReq.body = { routineId: 'r-1', customName: '  Trimmed Name  ' };

      prisma.routine.findFirst.mockResolvedValue({ id: 'r-1', userId: mockUserId });
      prisma.exercise.findFirst.mockResolvedValue(null);
      prisma.exercise.aggregate.mockResolvedValue({ _max: { displayOrder: null } });
      prisma.exercise.create.mockResolvedValue({ id: 'ex-1' });

      await handler(mockReq, mockRes);

      expect(prisma.exercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customName: 'Trimmed Name',
          }),
        })
      );
    });

    it('should reject missing routineId', async () => {
      mockReq.body = { customName: 'Exercise' };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'routineId is required' });
    });

    it('should reject non-existent routine', async () => {
      mockReq.body = { routineId: 'non-existent', customName: 'Exercise' };

      prisma.routine.findFirst.mockResolvedValue(null);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Routine not found' });
    });

    it('should reject routine owned by another user', async () => {
      mockReq.body = { routineId: 'r-other', customName: 'Exercise' };

      // findFirst returns null because userId doesn't match
      prisma.routine.findFirst.mockResolvedValue(null);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Routine not found' });
    });

    it('should reject missing exercise identifier', async () => {
      mockReq.body = { routineId: 'r-1' };

      prisma.routine.findFirst.mockResolvedValue({ id: 'r-1', userId: mockUserId });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Either predefinedExerciseId or customName is required',
      });
    });

    it('should reject invalid predefinedExerciseId', async () => {
      mockReq.body = { routineId: 'r-1', predefinedExerciseId: 'invalid' };

      prisma.routine.findFirst.mockResolvedValue({ id: 'r-1', userId: mockUserId });
      prisma.predefinedExercise.findUnique.mockResolvedValue(null);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid predefinedExerciseId' });
    });

    it('should reject duplicate predefined exercise in routine', async () => {
      mockReq.body = { routineId: 'r-1', predefinedExerciseId: 'pre-1' };

      prisma.routine.findFirst.mockResolvedValue({ id: 'r-1', userId: mockUserId });
      prisma.predefinedExercise.findUnique.mockResolvedValue({ id: 'pre-1' });
      prisma.exercise.findFirst.mockResolvedValue({ id: 'existing' }); // Duplicate exists

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'This exercise already exists in the routine',
      });
    });

    it('should reject duplicate custom name in routine', async () => {
      mockReq.body = { routineId: 'r-1', customName: 'Existing Exercise' };

      prisma.routine.findFirst.mockResolvedValue({ id: 'r-1', userId: mockUserId });
      prisma.exercise.findFirst.mockResolvedValue({ id: 'existing' }); // Duplicate exists

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'An exercise with this name already exists in the routine',
      });
    });

    it('should auto-increment displayOrder', async () => {
      mockReq.body = { routineId: 'r-1', customName: 'New Exercise' };

      prisma.routine.findFirst.mockResolvedValue({ id: 'r-1', userId: mockUserId });
      prisma.exercise.findFirst.mockResolvedValue(null);
      prisma.exercise.aggregate.mockResolvedValue({ _max: { displayOrder: 2 } });
      prisma.exercise.create.mockResolvedValue({ id: 'ex-1' });

      await handler(mockReq, mockRes);

      expect(prisma.exercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayOrder: 3,
          }),
        })
      );
    });

    it('should use provided displayOrder', async () => {
      mockReq.body = { routineId: 'r-1', customName: 'New Exercise', displayOrder: 5 };

      prisma.routine.findFirst.mockResolvedValue({ id: 'r-1', userId: mockUserId });
      prisma.exercise.findFirst.mockResolvedValue(null);
      prisma.exercise.create.mockResolvedValue({ id: 'ex-1' });

      await handler(mockReq, mockRes);

      expect(prisma.exercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayOrder: 5,
          }),
        })
      );
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      requireAuth.mockResolvedValue(false);

      await handler(mockReq, mockRes);

      expect(prisma.exercise.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Method validation', () => {
    it('should reject unsupported methods', async () => {
      mockReq.method = 'DELETE';

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });
});
