import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../../server/db/client.js', () => ({
  default: {
    set: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    exercise: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock auth middleware
vi.mock('../../server/middleware/auth.js', () => ({
  requireAuth: vi.fn(),
}));

import prisma from '../../server/db/client.js';
import { requireAuth } from '../../server/middleware/auth.js';
import handler from '../../server/api/sets/index.js';

describe('Sets API', () => {
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

  describe('POST /sets (Create)', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
    });

    it('should create a set with valid data', async () => {
      const mockExercise = { id: 'ex-1', routineId: 'routine-1' };
      const mockSet = {
        id: 'set-1',
        exerciseId: 'ex-1',
        userId: mockUserId,
        reps: 10,
        note: null,
        loggedAt: new Date(),
        exercise: { routine: {}, predefinedExercise: { muscleGroup: {} } },
      };

      mockReq.body = { exerciseId: 'ex-1', reps: 10 };

      prisma.exercise.findFirst.mockResolvedValue(mockExercise);
      prisma.set.create.mockResolvedValue(mockSet);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockSet);
    });

    it('should reject missing exerciseId', async () => {
      mockReq.body = { reps: 10 };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'exerciseId is required' });
    });

    it('should reject invalid reps', async () => {
      mockReq.body = { exerciseId: 'ex-1', reps: -5 };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'reps must be a non-negative number' });
    });

    it('should reject non-existent exercise', async () => {
      mockReq.body = { exerciseId: 'ex-1', reps: 10 };

      prisma.exercise.findFirst.mockResolvedValue(null);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Exercise not found' });
    });

    it('should accept valid loggedAt in the past', async () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      const mockExercise = { id: 'ex-1', routineId: 'routine-1' };
      const mockSet = {
        id: 'set-1',
        exerciseId: 'ex-1',
        userId: mockUserId,
        reps: 10,
        loggedAt: pastDate,
        exercise: { routine: {}, predefinedExercise: { muscleGroup: {} } },
      };

      mockReq.body = { exerciseId: 'ex-1', reps: 10, loggedAt: pastDate.toISOString() };

      prisma.exercise.findFirst.mockResolvedValue(mockExercise);
      prisma.set.create.mockResolvedValue(mockSet);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should reject loggedAt in the future', async () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day in future
      const mockExercise = { id: 'ex-1', routineId: 'routine-1' };

      mockReq.body = { exerciseId: 'ex-1', reps: 10, loggedAt: futureDate.toISOString() };

      prisma.exercise.findFirst.mockResolvedValue(mockExercise);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'loggedAt cannot be in the future' });
    });
  });

  describe('GET /sets (List)', () => {
    it('should list sets for user', async () => {
      const mockSets = [
        { id: 'set-1', reps: 10, exercise: {} },
        { id: 'set-2', reps: 15, exercise: {} },
      ];

      prisma.set.findMany.mockResolvedValue(mockSets);

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockSets);
    });

    it('should filter by exerciseId', async () => {
      mockReq.query = { exerciseId: 'ex-1' };

      prisma.set.findMany.mockResolvedValue([]);

      await handler(mockReq, mockRes);

      expect(prisma.set.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ exerciseId: 'ex-1' }),
        })
      );
    });

    it('should filter by date', async () => {
      mockReq.query = { date: '2024-01-15' };

      prisma.set.findMany.mockResolvedValue([]);

      await handler(mockReq, mockRes);

      expect(prisma.set.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            loggedAt: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('PUT /sets?id=xxx (Update)', () => {
    beforeEach(() => {
      mockReq.method = 'PUT';
      mockReq.query = { id: 'set-1' };
    });

    it('should update set reps', async () => {
      const mockSet = { id: 'set-1', userId: mockUserId, reps: 10 };
      const updatedSet = { ...mockSet, reps: 15, exercise: {} };

      mockReq.body = { reps: 15 };

      prisma.set.findFirst.mockResolvedValue(mockSet);
      prisma.set.update.mockResolvedValue(updatedSet);

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(updatedSet);
    });

    it('should reject update with future loggedAt', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const mockSet = { id: 'set-1', userId: mockUserId, reps: 10 };

      mockReq.body = { loggedAt: futureDate.toISOString() };

      prisma.set.findFirst.mockResolvedValue(mockSet);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'loggedAt cannot be in the future' });
    });

    it('should return 404 for non-existent set', async () => {
      mockReq.body = { reps: 15 };

      prisma.set.findFirst.mockResolvedValue(null);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Set not found' });
    });

    it('should reject update with no fields', async () => {
      const mockSet = { id: 'set-1', userId: mockUserId, reps: 10 };

      mockReq.body = {};

      prisma.set.findFirst.mockResolvedValue(mockSet);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No fields to update' });
    });
  });

  describe('DELETE /sets?id=xxx', () => {
    beforeEach(() => {
      mockReq.method = 'DELETE';
      mockReq.query = { id: 'set-1' };
    });

    it('should delete a set', async () => {
      const mockSet = { id: 'set-1', userId: mockUserId };

      prisma.set.findFirst.mockResolvedValue(mockSet);
      prisma.set.delete.mockResolvedValue(mockSet);

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 404 for non-existent set', async () => {
      prisma.set.findFirst.mockResolvedValue(null);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Set not found' });
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      requireAuth.mockResolvedValue(false);

      await handler(mockReq, mockRes);

      expect(prisma.set.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Method validation', () => {
    it('should reject unsupported methods', async () => {
      mockReq.method = 'PATCH';

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });
});
