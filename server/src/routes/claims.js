const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/claim - receiver claims food
router.post('/', authenticate, requireRole('RECEIVER'), async (req, res) => {
  try {
    const { foodId, pickupType } = req.body;
    if (!foodId) return res.status(400).json({ error: 'foodId is required' });

    const food = await prisma.foodListing.findUnique({ where: { id: foodId } });
    if (!food) return res.status(404).json({ error: 'Food listing not found' });
    if (food.status !== 'AVAILABLE') return res.status(409).json({ error: 'Food is no longer available' });

    // Check if receiver already claimed this food
    const existingClaim = await prisma.claim.findFirst({
      where: { foodId, receiverId: req.user.id },
    });
    if (existingClaim) return res.status(409).json({ error: 'You already claimed this listing' });

    // For donor-delivery listings, skip volunteer queue entirely
    const isDonorDelivery = food.pickupArrangement === 'DONOR_DELIVERY';

    const [claim] = await prisma.$transaction([
      prisma.claim.create({
        data: {
          foodId,
          receiverId: req.user.id,
          pickupType: isDonorDelivery ? 'VOLUNTEER' : (pickupType || 'SELF'), // reuse VOLUNTEER slot; donor acts as deliverer
          status: isDonorDelivery ? 'ASSIGNED' : 'CLAIMED',
        },
      }),
      prisma.foodListing.update({
        where: { id: foodId },
        data: { status: isDonorDelivery ? 'ASSIGNED' : 'CLAIMED' },
      }),
    ]);

    res.status(201).json({ ...claim, isDonorDelivery });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/claim/my - receiver's own claims
router.get('/my', authenticate, requireRole('RECEIVER'), async (req, res) => {
  try {
    const claims = await prisma.claim.findMany({
      where: { receiverId: req.user.id },
      include: {
        food: {
          include: { donor: { select: { id: true, name: true, location: true, phone: true } } },
        },
        volunteerTask: {
          include: { volunteer: { select: { id: true, name: true, phone: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/claim/:id - single claim
router.get('/:id', authenticate, async (req, res) => {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: {
        food: {
          include: { donor: { select: { id: true, name: true, location: true, phone: true } } },
        },
        volunteerTask: {
          include: { volunteer: { select: { id: true, name: true, phone: true } } },
        },
        receiver: { select: { id: true, name: true, phone: true, location: true } },
      },
    });
    if (!claim) return res.status(404).json({ error: 'Not found' });
    res.json(claim);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
