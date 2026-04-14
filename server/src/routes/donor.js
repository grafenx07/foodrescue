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

module.exports = router;
