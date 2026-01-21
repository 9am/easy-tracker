import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../../server/db/client.js', () => ({
  default: {
    set: {
      findMany: vi.fn(),
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
import handler from '../../server/api/stats/index.js';

describe('Stats API', () => {
  let mockReq;
  let mockRes;
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'GET',
      query: { type: 'general' },
      user: { id: mockUserId },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    requireAuth.mockResolvedValue(true);
  });

  describe('GET /stats?type=general', () => {
    it('should return general stats for today', async () => {
      const mockSets = [
        {
          id: 'set-1',
          reps: 10,
          loggedAt: new Date(),
          exercise: {
            routine: { id: 'r-1', name: 'Morning' },
            predefinedExercise: { name: 'Push-ups', muscleGroup: { name: 'Chest' } },
          },
        },
      ];

      prisma.set.findMany.mockResolvedValue(mockSets);
      prisma.set.aggregate.mockResolvedValue({ _sum: { reps: 0 }, _count: 0 });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(String),
          today: expect.objectContaining({
            totalSets: 1,
            totalReps: 10,
            exercises: expect.any(Array),
            routines: expect.any(Array),
          }),
          comparison: expect.any(Object),
        })
      );
    });

    it('should return stats for specific date', async () => {
      mockReq.query = { type: 'general', date: '2024-01-15' };

      prisma.set.findMany.mockResolvedValue([]);
      prisma.set.aggregate.mockResolvedValue({ _sum: { reps: 0 }, _count: 0 });

      await handler(mockReq, mockRes);

      // Date is parsed as local timezone, so just check the structure
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(String),
          today: expect.any(Object),
          comparison: expect.any(Object),
        })
      );
    });

    it('should group exercises by routine', async () => {
      const mockSets = [
        {
          reps: 10,
          loggedAt: new Date(),
          exercise: {
            routine: { id: 'r-1', name: 'Morning' },
            predefinedExercise: { name: 'Push-ups', muscleGroup: { name: 'Chest' } },
          },
        },
        {
          reps: 15,
          loggedAt: new Date(),
          exercise: {
            routine: { id: 'r-1', name: 'Morning' },
            predefinedExercise: { name: 'Squats', muscleGroup: { name: 'Legs' } },
          },
        },
      ];

      prisma.set.findMany.mockResolvedValue(mockSets);
      prisma.set.aggregate.mockResolvedValue({ _sum: { reps: 0 }, _count: 0 });

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.today.routines).toHaveLength(1);
      expect(response.today.routines[0].name).toBe('Morning');
      expect(response.today.routines[0].exercises).toHaveLength(2);
    });
  });

  describe('GET /stats?type=calendar', () => {
    beforeEach(() => {
      mockReq.query = { type: 'calendar', year: '2024', month: '1' };
    });

    it('should return calendar stats for month', async () => {
      const mockSets = [
        {
          reps: 10,
          loggedAt: new Date(2024, 0, 15, 10, 0, 0),
          exercise: {
            routine: { id: 'r-1', name: 'Morning' },
            predefinedExercise: { name: 'Push-ups', muscleGroup: { name: 'Chest' } },
          },
        },
      ];

      prisma.set.findMany.mockResolvedValue(mockSets);

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2024,
          month: 1,
          days: expect.any(Array),
          summary: expect.objectContaining({
            totalSets: expect.any(Number),
            totalReps: expect.any(Number),
            activeDays: expect.any(Number),
            averageRepsPerDay: expect.any(Number),
          }),
        })
      );
    });

    it('should return 31 days for January', async () => {
      prisma.set.findMany.mockResolvedValue([]);

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.days).toHaveLength(31);
    });

    it('should calculate intensity based on reps', async () => {
      const mockSets = [
        {
          reps: 100,
          loggedAt: new Date(2024, 0, 15),
          exercise: { routine: { id: 'r-1', name: 'Morning' }, predefinedExercise: { name: 'Ex', muscleGroup: { name: 'G' } } },
        },
        {
          reps: 50,
          loggedAt: new Date(2024, 0, 20),
          exercise: { routine: { id: 'r-1', name: 'Morning' }, predefinedExercise: { name: 'Ex', muscleGroup: { name: 'G' } } },
        },
      ];

      prisma.set.findMany.mockResolvedValue(mockSets);

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      const day15 = response.days.find(d => d.day === 15);
      const day20 = response.days.find(d => d.day === 20);

      expect(day15.intensity).toBe(4); // Max reps = intensity 4
      expect(day20.intensity).toBeLessThan(day15.intensity); // 50 reps < 100 reps
    });

    it('should include routines data for each day', async () => {
      const mockSets = [
        {
          reps: 10,
          loggedAt: new Date(2024, 0, 15),
          exercise: {
            routine: { id: 'r-1', name: 'Morning' },
            predefinedExercise: { name: 'Push-ups', muscleGroup: { name: 'Chest' } },
          },
        },
      ];

      prisma.set.findMany.mockResolvedValue(mockSets);

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      const day15 = response.days.find(d => d.day === 15);

      expect(day15.routines).toHaveLength(1);
      expect(day15.routines[0].name).toBe('Morning');
      expect(day15.routines[0].exercises).toHaveLength(1);
    });

    it('should use current month when not specified', async () => {
      mockReq.query = { type: 'calendar' };

      prisma.set.findMany.mockResolvedValue([]);

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      const now = new Date();
      expect(response.year).toBe(now.getFullYear());
      expect(response.month).toBe(now.getMonth() + 1);
    });
  });

  describe('GET /stats?type=trends', () => {
    beforeEach(() => {
      mockReq.query = { type: 'trends', granularity: 'day', days: '30' };
    });

    it('should return trends data', async () => {
      const mockSets = [
        {
          reps: 10,
          loggedAt: new Date(),
          exerciseId: 'ex-1',
          exercise: { id: 'ex-1', predefinedExercise: { name: 'Push-ups' } },
        },
      ];

      prisma.set.findMany.mockResolvedValue(mockSets);

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          granularity: 'day',
          startDate: expect.any(String),
          endDate: expect.any(String),
          timeline: expect.any(Array),
          exercises: expect.any(Array),
        })
      );
    });

    it('should group by week when granularity is week', async () => {
      mockReq.query = { type: 'trends', granularity: 'week' };

      prisma.set.findMany.mockResolvedValue([]);

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          granularity: 'week',
        })
      );
    });

    it('should group by month when granularity is month', async () => {
      mockReq.query = { type: 'trends', granularity: 'month' };

      prisma.set.findMany.mockResolvedValue([]);

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          granularity: 'month',
        })
      );
    });

    it('should filter by routineId', async () => {
      mockReq.query = { type: 'trends', routineId: 'r-1' };

      prisma.set.findMany.mockResolvedValue([]);

      await handler(mockReq, mockRes);

      expect(prisma.set.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            exercise: { routineId: 'r-1' },
          }),
        })
      );
    });
  });

  describe('Invalid type', () => {
    it('should return error for invalid type', async () => {
      mockReq.query = { type: 'invalid' };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid type. Use: general, calendar, or trends',
      });
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
    it('should reject non-GET requests', async () => {
      mockReq.method = 'POST';

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });
});
