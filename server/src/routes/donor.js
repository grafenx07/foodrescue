const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const otpStore      = require('../services/otpStore');
const locationStore = require('../services/locationStore');

const router = express.Router();
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// GET /api/donor/listings — donor's own listings + stats
// ─────────────────────────────────────────────────────────
router.get('/listings', authenticate, requireRole('DONOR'), async (req, res) => {
  try {
    // Auto-expire
    await prisma.foodListing.updateMany({
      where: { donorId: req.user.id, expiryTime: { lt: new Date() }, status: 'AVAILABLE' },
      data: { status: 'EXPIRED' },
    });

    const listings = await prisma.foodListing.findMany({
      where: { donorId: req.user.id },
      include: {
        claims: {
          include: {
            volunteerTask: { include: { volunteer: { select: { name: true } } } },
            receiver: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const active    = listings.filter(l => ['AVAILABLE', 'CLAIMED', 'ASSIGNED', 'PICKED_UP'].includes(l.status)).length;
    const completed = listings.filter(l => l.status === 'DELIVERED').length;
    const totalServings = listings.filter(l => l.status === 'DELIVERED').reduce((s, l) => s + l.quantity, 0);

    res.json({ listings, stats: { active, completed, totalServings, total: listings.length } });
  } catch (err) {
    console.error('[donor GET /listings]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/donor/deliveries — donor-delivery claims needing action
// ─────────────────────────────────────────────────────────
router.get('/deliveries', authenticate, requireRole('DONOR'), async (req, res) => {
  try {
    const claims = await prisma.claim.findMany({
      where: {
        food: { donorId: req.user.id, pickupArrangement: 'DONOR_DELIVERY' },
        status: { in: ['ASSIGNED', 'PICKED_UP'] },
      },
      include: {
        food: { select: { id: true, title: true, quantity: true, location: true } },
        receiver: { select: { id: true, name: true, phone: true, location: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(claims);
  } catch (err) {
    console.error('[donor GET /deliveries]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/donor/deliver/:claimId — donor updates delivery status
// PICKED_UP → auto-generates OTP
// DELIVERED → requires receiver OTP
// ─────────────────────────────────────────────────────────
router.patch('/deliver/:claimId', authenticate, requireRole('DONOR'), async (req, res) => {
  try {
    const { claimId } = req.params;
    const { status, otp } = req.body;

    if (!['PICKED_UP', 'DELIVERED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be PICKED_UP or DELIVERED' });
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { food: true },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.food.donorId !== req.user.id) return res.status(403).json({ error: 'Not your listing' });
    if (claim.food.pickupArrangement !== 'DONOR_DELIVERY') {
      return res.status(400).json({ error: 'This claim is not a donor-delivery claim' });
    }

    // ── OTP gate for DELIVERED ──
    if (status === 'DELIVERED') {
      if (!otp) return res.status(400).json({ error: 'otp is required. Ask the receiver for their delivery code.' });
      const valid = otpStore.verifyOtp(claimId, otp);
      if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP. Ask the receiver to check their tracking page.' });
    }

    const [updatedClaim] = await prisma.$transaction([
      prisma.claim.update({ where: { id: claimId }, data: { status } }),
      prisma.foodListing.update({ where: { id: claim.foodId }, data: { status } }),
    ]);

    // ── Generate OTP on PICKED_UP ──
    if (status === 'PICKED_UP') {
      otpStore.generateOtp(claimId);
    }

    // ── Cleanup on DELIVERED ──
    if (status === 'DELIVERED') {
      locationStore.clearLocation(`donor:${claimId}`);
      locationStore.clearLocation(`receiver:${claimId}`);
    }

    res.json(updatedClaim);
  } catch (err) {
    console.error('[donor PATCH /deliver/:claimId]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/donor/location — donor broadcasts live GPS
// Body: { claimId, lat, lng }
// ─────────────────────────────────────────────────────────
router.post('/location', authenticate, requireRole('DONOR'), async (req, res) => {
  try {
    const { claimId, lat, lng } = req.body;
    if (!claimId || lat == null || lng == null) {
      return res.status(400).json({ error: 'claimId, lat and lng are required' });
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { food: true },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.food.donorId !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

    locationStore.setLocation(`donor:${claimId}`, lat, lng);
    res.json({ ok: true });
  } catch (err) {
    console.error('[donor POST /location]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/donor/location/:claimId — receiver polls donor GPS
// ─────────────────────────────────────────────────────────
router.get('/location/:claimId', authenticate, async (req, res) => {
  const loc = locationStore.getLocation(`donor:${req.params.claimId}`);
  if (!loc) return res.json({ lat: null, lng: null });
  res.json({ ...loc, stale: false });
});

module.exports = router;
