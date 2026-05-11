const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  sendVolunteerAssignedEmail,
  sendPickedUpEmail,
  sendDeliveredEmail,
} = require('../services/email');
const otpStore   = require('../services/otpStore');
const locationStore = require('../services/locationStore');

const router = express.Router();
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// GET /api/tasks/leaderboard — public, no auth required
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// GET /api/tasks — open claims + my tasks (VOLUNTEER only)
// ─────────────────────────────────────────────────────────
router.get('/', authenticate, requireRole('VOLUNTEER'), async (req, res) => {
  try {
    const openClaims = await prisma.claim.findMany({
      where: { pickupType: 'VOLUNTEER', status: 'CLAIMED', volunteerTask: null },
      include: {
        food: { include: { donor: { select: { id: true, name: true, location: true } } } },
        receiver: { select: { id: true, name: true, location: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const myTasks = await prisma.volunteerTask.findMany({
      where: { volunteerId: req.user.id, status: { notIn: ['DELIVERED'] } },
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
      take: 20,
    });

    res.json({ openClaims, myTasks, completedTasks });
  } catch (err) {
    console.error('[tasks GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/tasks/accept — volunteer accepts a delivery task
// ─────────────────────────────────────────────────────────
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
      prisma.volunteerTask.create({ data: { claimId, volunteerId: req.user.id, status: 'ASSIGNED' } }),
      prisma.claim.update({ where: { id: claimId }, data: { status: 'ASSIGNED' } }),
      prisma.foodListing.update({ where: { id: claim.foodId }, data: { status: 'ASSIGNED' } }),
    ]);

    // Send assignment email (non-blocking)
    const fullClaim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        food: { select: { title: true, location: true } },
        receiver: { select: { name: true } },
      },
    });
    sendVolunteerAssignedEmail({
      volunteerName: req.user.name,
      volunteerEmail: req.user.email,
      foodTitle: fullClaim.food.title,
      pickupLocation: fullClaim.food.location,
      receiverName: fullClaim.receiver.name,
    }).catch(err => console.error('[Email] Volunteer assigned email failed:', err.message));

    res.status(201).json(task);
  } catch (err) {
    console.error('[tasks POST /accept]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/tasks/update-status
// - PICKED_UP: generates OTP for receiver
// - DELIVERED: requires receiver OTP to complete
// ─────────────────────────────────────────────────────────
router.post('/update-status', authenticate, requireRole('VOLUNTEER'), async (req, res) => {
  try {
    const { taskId, status, otp } = req.body;
    if (!taskId || !status) return res.status(400).json({ error: 'taskId and status are required' });
    if (!['PICKED_UP', 'DELIVERED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be PICKED_UP or DELIVERED' });
    }

    const task = await prisma.volunteerTask.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.volunteerId !== req.user.id) return res.status(403).json({ error: 'Not your task' });

    // ── OTP gate for DELIVERED ──
    if (status === 'DELIVERED') {
      if (!otp) return res.status(400).json({ error: 'otp is required to confirm delivery. Ask the receiver for their code.' });
      const valid = otpStore.verifyOtp(task.claimId, otp);
      if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP. Ask the receiver to check their tracking page.' });
    }

    const [updatedTask] = await prisma.$transaction([
      prisma.volunteerTask.update({ where: { id: taskId }, data: { status } }),
      prisma.claim.update({ where: { id: task.claimId }, data: { status } }),
      prisma.foodListing.updateMany({
        where: { claims: { some: { id: task.claimId } } },
        data: { status },
      }),
    ]);

    // ── Generate OTP on PICKED_UP ──
    if (status === 'PICKED_UP') {
      otpStore.generateOtp(task.claimId);
    }

    // ── Cleanup on DELIVERED ──
    if (status === 'DELIVERED') {
      locationStore.clearLocation(`volunteer:${taskId}`);
      locationStore.clearLocation(`donor:${task.claimId}`);
      locationStore.clearLocation(`receiver:${task.claimId}`);
    }

    // ── Notification emails (non-blocking) ──
    const fullTask = await prisma.volunteerTask.findUnique({
      where: { id: taskId },
      include: {
        volunteer: { select: { name: true } },
        claim: {
          include: {
            food: { include: { donor: { select: { name: true, email: true } } } },
            receiver: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (status === 'PICKED_UP' && fullTask) {
      sendPickedUpEmail({
        receiverName: fullTask.claim.receiver.name,
        receiverEmail: fullTask.claim.receiver.email,
        foodTitle: fullTask.claim.food.title,
        volunteerName: fullTask.volunteer.name,
      }).catch(err => console.error('[Email] Picked up email failed:', err.message));
    }

    if (status === 'DELIVERED' && fullTask) {
      const foodTitle = fullTask.claim.food.title;
      sendDeliveredEmail({ name: fullTask.claim.receiver.name, email: fullTask.claim.receiver.email, foodTitle, role: 'RECEIVER' })
        .catch(err => console.error('[Email] Delivered (receiver) email failed:', err.message));
      sendDeliveredEmail({ name: fullTask.claim.food.donor.name, email: fullTask.claim.food.donor.email, foodTitle, role: 'DONOR' })
        .catch(err => console.error('[Email] Delivered (donor) email failed:', err.message));
    }

    res.json(updatedTask);
  } catch (err) {
    console.error('[tasks POST /update-status]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/tasks/location — volunteer broadcasts live GPS
// ─────────────────────────────────────────────────────────
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
    locationStore.setLocation(`volunteer:${taskId}`, lat, lng);
    res.json({ ok: true });
  } catch (err) {
    console.error('[tasks POST /location]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/tasks/location/:taskId — receiver polls volunteer GPS
// ─────────────────────────────────────────────────────────
router.get('/location/:taskId', authenticate, async (req, res) => {
  const loc = locationStore.getLocation(`volunteer:${req.params.taskId}`);
  if (!loc) return res.json({ lat: null, lng: null });
  res.json({ ...loc, stale: false });
});

module.exports = router;
