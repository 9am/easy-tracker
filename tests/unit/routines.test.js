import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../../server/db/client.js', () => ({
  default: {
    routine: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

// Mock auth middleware
vi.mock('../../server/middleware/auth.js', () => ({
  requireAuth: vi.fn(),
}));

import prisma from '../../server/db/client.js';
import { requireAuth } from '../../server/middleware/auth.js';
import handler from '../../server/api/routines/index.js';

describe('Routines API', () => {
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

  describe('GET /routines', () => {
    it('should list all routines for user', async () => {
      const mockRoutines = [
        { id: 'r-1', name: 'Morning Workout', exercises: [] },
        { id: 'r-2', name: 'Evening Stretch', exercises: [] },
      ];

      prisma.routine.findMany.mockResolvedValue(mockRoutines);

      await handler(mockReq, mockRes);

      expect(prisma.routine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
          orderBy: { displayOrder: 'asc' },
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockRoutines);
    });

    it('should return empty array when no routines exist', async () => {
      prisma.routine.findMany.mockResolvedValue([]);

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith([]);
    });
  });

  describe('POST /routines', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
    });

    it('should create a routine with valid name', async () => {
      const mockRoutine = {
        id: 'r-1',
        name: 'New Routine',
        userId: mockUserId,
        displayOrder: 0,
        exercises: [],
      };

      mockReq.body = { name: 'New Routine' };

      prisma.routine.findFirst.mockResolvedValue(null); // No duplicate
      prisma.routine.aggregate.mockResolvedValue({ _max: { displayOrder: null } });
      prisma.routine.create.mockResolvedValue(mockRoutine);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockRoutine);
    });

    it('should trim whitespace from name', async () => {
      const mockRoutine = {
        id: 'r-1',
        name: 'Trimmed Name',
        exercises: [],
      };

      mockReq.body = { name: '  Trimmed Name  ' };

      prisma.routine.findFirst.mockResolvedValue(null);
      prisma.routine.aggregate.mockResolvedValue({ _max: { displayOrder: null } });
      prisma.routine.create.mockResolvedValue(mockRoutine);

      await handler(mockReq, mockRes);

      expect(prisma.routine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Trimmed Name',
          }),
        })
      );
    });

    it('should reject missing name', async () => {
      mockReq.body = {};

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Name is required' });
    });

    it('should reject non-string name', async () => {
      mockReq.body = { name: 123 };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Name is required' });
    });

    it('should reject duplicate name', async () => {
      mockReq.body = { name: 'Existing Routine' };

      prisma.routine.findFirst.mockResolvedValue({ id: 'r-existing', name: 'Existing Routine' });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'A routine with this name already exists' });
    });

    it('should auto-increment displayOrder', async () => {
      mockReq.body = { name: 'New Routine' };

      prisma.routine.findFirst.mockResolvedValue(null);
      prisma.routine.aggregate.mockResolvedValue({ _max: { displayOrder: 2 } });
      prisma.routine.create.mockResolvedValue({ id: 'r-1', exercises: [] });

      await handler(mockReq, mockRes);

      expect(prisma.routine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayOrder: 3,
          }),
        })
      );
    });

    it('should use provided displayOrder', async () => {
      mockReq.body = { name: 'New Routine', displayOrder: 5 };

      prisma.routine.findFirst.mockResolvedValue(null);
      prisma.routine.create.mockResolvedValue({ id: 'r-1', exercises: [] });

      await handler(mockReq, mockRes);

      expect(prisma.routine.create).toHaveBeenCalledWith(
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

      expect(prisma.routine.findMany).not.toHaveBeenCalled();
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
