const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendClaimConfirmedEmail, sendFoodClaimedEmail } = require('../services/email');
const otpStore = require('../services/otpStore');
const locationStore = require('../services/locationStore');

const router = express.Router();
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// POST /api/claim — receiver claims food
// ─────────────────────────────────────────────────────────
router.post('/', authenticate, requireRole('RECEIVER'), async (req, res) => {
  try {
    const { foodId, pickupType } = req.body;
    if (!foodId) return res.status(400).json({ error: 'foodId is required' });

    const food = await prisma.foodListing.findUnique({
      where: { id: foodId },
      include: { donor: { select: { id: true, name: true, email: true, location: true } } },
    });
    if (!food) return res.status(404).json({ error: 'Food listing not found' });
    if (food.status !== 'AVAILABLE') return res.status(409).json({ error: 'Food is no longer available' });

    const existingClaim = await prisma.claim.findFirst({ where: { foodId, receiverId: req.user.id } });
    if (existingClaim) return res.status(409).json({ error: 'You already claimed this listing' });

    const isDonorDelivery = food.pickupArrangement === 'DONOR_DELIVERY';
    const resolvedPickupType = isDonorDelivery ? 'VOLUNTEER' : (pickupType || 'SELF');
    const initialStatus = isDonorDelivery ? 'ASSIGNED' : 'CLAIMED';

    const [claim] = await prisma.$transaction([
      prisma.claim.create({
        data: { foodId, receiverId: req.user.id, pickupType: resolvedPickupType, status: initialStatus },
      }),
      prisma.foodListing.update({ where: { id: foodId }, data: { status: initialStatus } }),
    ]);

    const receiver = req.user;
    sendClaimConfirmedEmail({ receiverName: receiver.name, receiverEmail: receiver.email, foodTitle: food.title, donorName: food.donor.name, location: food.location, expiryTime: food.expiryTime })
      .catch(err => console.error('[Email] Claim confirmed email failed:', err.message));
    sendFoodClaimedEmail({ donorName: food.donor.name, donorEmail: food.donor.email, foodTitle: food.title, receiverName: receiver.name })
      .catch(err => console.error('[Email] Food claimed email failed:', err.message));

    res.status(201).json({ ...claim, isDonorDelivery });
  } catch (err) {
    console.error('[claim POST /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/claim/my — receiver's own claims
// ─────────────────────────────────────────────────────────
router.get('/my', authenticate, requireRole('RECEIVER'), async (req, res) => {
  try {
    const claims = await prisma.claim.findMany({
      where: { receiverId: req.user.id },
      include: {
        food: { include: { donor: { select: { id: true, name: true, location: true, phone: true } } } },
        volunteerTask: { include: { volunteer: { select: { id: true, name: true, phone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/claim/:id — single claim (any authenticated user)
// ─────────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: {
        food: { include: { donor: { select: { id: true, name: true, location: true, phone: true } } } },
        volunteerTask: { include: { volunteer: { select: { id: true, name: true, phone: true } } } },
        receiver: { select: { id: true, name: true, phone: true, location: true } },
      },
    });
    if (!claim) return res.status(404).json({ error: 'Not found' });
    res.json(claim);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/claim/:id/self-pickup
// Receiver marks a SELF pickup claim as DELIVERED directly.
// No OTP needed — the receiver IS the person collecting.
// ─────────────────────────────────────────────────────────
router.post('/:id/self-pickup', authenticate, requireRole('RECEIVER'), async (req, res) => {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: { food: true },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.receiverId !== req.user.id) return res.status(403).json({ error: 'Not your claim' });
    if (claim.pickupType !== 'SELF') return res.status(400).json({ error: 'Not a self-pickup claim' });
    if (!['CLAIMED'].includes(claim.status)) {
      return res.status(409).json({ error: `Cannot self-pickup from status ${claim.status}` });
    }

    const [updatedClaim] = await prisma.$transaction([
      prisma.claim.update({ where: { id: claim.id }, data: { status: 'DELIVERED' } }),
      prisma.foodListing.update({ where: { id: claim.foodId }, data: { status: 'DELIVERED' } }),
    ]);

    // Clean up any lingering location data
    locationStore.clearLocation(`receiver:${claim.id}`);

    res.json(updatedClaim);
  } catch (err) {
    console.error('[claim POST /:id/self-pickup]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/claim/:id/otp
// Receiver fetches the OTP to show/read to the deliverer.
// OTP is generated when the deliverer marks PICKED_UP.
// ─────────────────────────────────────────────────────────
router.get('/:id/otp', authenticate, requireRole('RECEIVER'), async (req, res) => {
  try {
    const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.receiverId !== req.user.id) return res.status(403).json({ error: 'Not your claim' });

    const otp = otpStore.getOtp(req.params.id);
    if (!otp) return res.status(404).json({ error: 'OTP not yet generated — wait for delivery to start' });
    res.json({ otp });
  } catch (err) {
    console.error('[claim GET /:id/otp]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/claim/:id/verify-otp
// Volunteer or Donor submits the OTP the receiver read out.
// On success → marks claim + food as DELIVERED.
// ─────────────────────────────────────────────────────────
router.post('/:id/verify-otp', authenticate, requireRole('VOLUNTEER', 'DONOR'), async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'otp is required' });

    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: { food: true, volunteerTask: true },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'PICKED_UP') {
      return res.status(409).json({ error: 'Food has not been picked up yet' });
    }

    // Authorise: volunteer must own the task; donor must own the food
    if (req.user.role === 'VOLUNTEER') {
      if (!claim.volunteerTask || claim.volunteerTask.volunteerId !== req.user.id) {
        return res.status(403).json({ error: 'Not your task' });
      }
    }
    if (req.user.role === 'DONOR') {
      if (claim.food.donorId !== req.user.id) {
        return res.status(403).json({ error: 'Not your listing' });
      }
    }

    const valid = otpStore.verifyOtp(req.params.id, otp);
    if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP. Ask the receiver to check their tracking page.' });

    // Mark delivered
    await prisma.$transaction([
      prisma.claim.update({ where: { id: claim.id }, data: { status: 'DELIVERED' } }),
      prisma.foodListing.update({ where: { id: claim.foodId }, data: { status: 'DELIVERED' } }),
      // Also update volunteerTask if present
      ...(claim.volunteerTask
        ? [prisma.volunteerTask.update({ where: { id: claim.volunteerTask.id }, data: { status: 'DELIVERED' } })]
        : []),
    ]);

    // Clean up live locations
    locationStore.clearLocation(`donor:${claim.id}`);
    locationStore.clearLocation(`receiver:${claim.id}`);
    if (claim.volunteerTask) locationStore.clearLocation(`volunteer:${claim.volunteerTask.id}`);

    res.json({ success: true, message: 'Delivery confirmed! 🎉' });
  } catch (err) {
    console.error('[claim POST /:id/verify-otp]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/claim/:id/location — any party shares their GPS
// Body: { lat, lng, role: 'donor'|'receiver' }
// For volunteer, they use /api/tasks/location instead
// ─────────────────────────────────────────────────────────
router.post('/:id/location', authenticate, async (req, res) => {
  try {
    const { lat, lng, role } = req.body;
    if (lat == null || lng == null || !role) {
      return res.status(400).json({ error: 'lat, lng, and role are required' });
    }
    if (!['donor', 'receiver'].includes(role)) {
      return res.status(400).json({ error: 'role must be donor or receiver' });
    }

    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: { food: true },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    // Authorise: donor must own the food, receiver must own the claim
    if (role === 'donor' && claim.food.donorId !== req.user.id) {
      return res.status(403).json({ error: 'Not your listing' });
    }
    if (role === 'receiver' && claim.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Not your claim' });
    }

    locationStore.setLocation(`${role}:${claim.id}`, lat, lng);
    res.json({ ok: true });
  } catch (err) {
    console.error('[claim POST /:id/location]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/claim/:id/locations — all live positions for a claim
// Returns { donor, receiver, volunteer } — any may be null
// ─────────────────────────────────────────────────────────
router.get('/:id/locations', authenticate, async (req, res) => {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: { volunteerTask: true },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    const donor = locationStore.getLocation(`donor:${claim.id}`);
    const receiver = locationStore.getLocation(`receiver:${claim.id}`);
    const volunteer = claim.volunteerTask
      ? locationStore.getLocation(`volunteer:${claim.volunteerTask.id}`)
      : null;

    res.json({ donor, receiver, volunteer });
  } catch (err) {
    console.error('[claim GET /:id/locations]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
