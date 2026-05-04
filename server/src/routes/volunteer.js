const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// In-memory store for volunteer live locations { taskId -> { lat, lng, updatedAt } }
// Note: This is single-node in-memory storage. For multi-server deployments, use Redis.
const liveLocations = {};

// GET /api/tasks/leaderboard — top volunteers by delivered task count (public)
router.get('/leaderboard', async (req, res) => {
  try {
    const topVolunteers = await prisma.volunteerTask.groupBy({
      by: ['volunteerId'],
      where: { status: 'DELIVERED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const volunteerIds = topVolunteers.map(v => v.volunteerId);
    const users = await prisma.user.findMany({
      where: { id: { in: volunteerIds } },
      select: { id: true, name: true },
    });

    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
    const leaderboard = topVolunteers.map((v, idx) => ({
      rank: idx + 1,
      volunteerId: v.volunteerId,
      name: userMap[v.volunteerId] || 'Unknown',
      deliveries: v._count.id,
    }));

    res.json(leaderboard);
  } catch (err) {
    console.error('[leaderboard]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks - list open tasks + my tasks (VOLUNTEER only)
router.get('/', authenticate, requireRole('VOLUNTEER'), async (req, res) => {
  try {
    const openClaims = await prisma.claim.findMany({
      where: {
        pickupType: 'VOLUNTEER',
        status: 'CLAIMED',
        volunteerTask: null,
      },
      include: {
        food: { include: { donor: { select: { id: true, name: true, location: true } } } },
        receiver: { select: { id: true, name: true, location: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const myTasks = await prisma.volunteerTask.findMany({
      where: {
        volunteerId: req.user.id,
        status: { notIn: ['DELIVERED'] },
      },
      include: {
        claim: {
          include: {
            food: { include: { donor: { select: { id: true, name: true, location: true } } } },
            receiver: { select: { id: true, name: true, location: true, phone: true } },
          },
        },
      },
    });

    const completedTasks = await prisma.volunteerTask.findMany({
      where: { volunteerId: req.user.id, status: 'DELIVERED' },
      include: {
        claim: {
          include: {
            food: { include: { donor: { select: { name: true, location: true } } } },
            receiver: { select: { name: true, location: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({ openClaims, myTasks, completedTasks });
  } catch (err) {
    console.error('[tasks GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/accept - volunteer accepts a task
router.post('/accept', authenticate, requireRole('VOLUNTEER'), async (req, res) => {
  try {
    const { claimId } = req.body;
    if (!claimId) return res.status(400).json({ error: 'claimId is required' });

    const claim = await prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'CLAIMED') return res.status(409).json({ error: 'Claim is not available for pickup' });

    const existing = await prisma.volunteerTask.findUnique({ where: { claimId } });
    if (existing) return res.status(409).json({ error: 'Task already accepted by another volunteer' });

    const [task] = await prisma.$transaction([
      prisma.volunteerTask.create({
        data: { claimId, volunteerId: req.user.id, status: 'ASSIGNED' },
      }),
      prisma.claim.update({ where: { id: claimId }, data: { status: 'ASSIGNED' } }),
      prisma.foodListing.update({ where: { id: claim.foodId }, data: { status: 'ASSIGNED' } }),
    ]);

    res.status(201).json(task);
  } catch (err) {
    console.error('[tasks POST /accept]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/update-status
router.post('/update-status', authenticate, requireRole('VOLUNTEER'), async (req, res) => {
  try {
    const { taskId, status } = req.body;
    if (!taskId || !status) return res.status(400).json({ error: 'taskId and status are required' });
    if (!['PICKED_UP', 'DELIVERED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be PICKED_UP or DELIVERED' });
    }

    const task = await prisma.volunteerTask.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.volunteerId !== req.user.id) return res.status(403).json({ error: 'Not your task' });

    const foodStatus = status === 'PICKED_UP' ? 'PICKED_UP' : 'DELIVERED';
    const claimStatus = status === 'PICKED_UP' ? 'PICKED_UP' : 'DELIVERED';

    const [updatedTask] = await prisma.$transaction([
      prisma.volunteerTask.update({ where: { id: taskId }, data: { status } }),
      prisma.claim.update({ where: { id: task.claimId }, data: { status: claimStatus } }),
      prisma.foodListing.updateMany({
        where: { claims: { some: { id: task.claimId } } },
        data: { status: foodStatus },
      }),
    ]);

    // Clear live location when delivered
    if (status === 'DELIVERED') {
      delete liveLocations[taskId];
    }

    res.json(updatedTask);
  } catch (err) {
    console.error('[tasks POST /update-status]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/location — volunteer broadcasts their current location
router.post('/location', authenticate, requireRole('VOLUNTEER'), async (req, res) => {
  try {
    const { taskId, lat, lng } = req.body;
    if (!taskId || lat == null || lng == null) {
      return res.status(400).json({ error: 'taskId, lat and lng are required' });
    }
    const task = await prisma.volunteerTask.findUnique({ where: { id: taskId } });
    if (!task || task.volunteerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your task' });
    }
    liveLocations[taskId] = { lat: parseFloat(lat), lng: parseFloat(lng), updatedAt: new Date() };
    res.json({ ok: true });
  } catch (err) {
    console.error('[tasks POST /location]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/location/:taskId — receiver polls volunteer location
router.get('/location/:taskId', authenticate, async (req, res) => {
  const loc = liveLocations[req.params.taskId];
  if (!loc) return res.json({ lat: null, lng: null });
  // Expire after 120 s of no update
  const age = (Date.now() - new Date(loc.updatedAt).getTime()) / 1000;
  if (age > 120) {
    delete liveLocations[req.params.taskId];
    return res.json({ lat: null, lng: null, stale: true });
  }
  res.json({ ...loc, stale: false });
});

module.exports = router;
