const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/donor/listings - donor's own listings + stats
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

    const active = listings.filter(l => ['AVAILABLE', 'CLAIMED', 'ASSIGNED', 'PICKED_UP'].includes(l.status)).length;
    const completed = listings.filter(l => l.status === 'DELIVERED').length;
    const totalServings = listings.filter(l => l.status === 'DELIVERED').reduce((sum, l) => sum + l.quantity, 0);

    res.json({ listings, stats: { active, completed, totalServings, total: listings.length } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/donor/deliveries - donor-delivery claims that the donor must handle
router.get('/deliveries', authenticate, requireRole('DONOR'), async (req, res) => {
  try {
    const claims = await prisma.claim.findMany({
      where: {
        food: {
          donorId: req.user.id,
          pickupArrangement: 'DONOR_DELIVERY',
        },
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
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/donor/deliver/:claimId - donor updates delivery status
router.patch('/deliver/:claimId', authenticate, requireRole('DONOR'), async (req, res) => {
  try {
    const { claimId } = req.params;
    const { status } = req.body; // 'PICKED_UP' or 'DELIVERED'

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

    const [updatedClaim] = await prisma.$transaction([
      prisma.claim.update({ where: { id: claimId }, data: { status } }),
      prisma.foodListing.update({ where: { id: claim.foodId }, data: { status } }),
    ]);

    res.json(updatedClaim);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
