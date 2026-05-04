const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Helper – optionally decode JWT from header (no hard auth required)
function tryGetUser(req) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    return jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// GET /api/stats - public platform stats
// Unauthenticated → aggregate counts only (no PII)
// Authenticated → also returns full listing history + user list
router.get('/', async (req, res) => {
  try {
    const caller = tryGetUser(req);

    const [totalDelivered, totalListings, totalVolunteers, totalUsers] = await Promise.all([
      prisma.claim.count({ where: { status: 'DELIVERED' } }),
      prisma.foodListing.count(),
      prisma.user.count({ where: { role: 'VOLUNTEER' } }),
      prisma.user.count(),
    ]);

    // Real meals rescued from delivered listings
    const deliveredListings = await prisma.foodListing.findMany({
      where: { status: 'DELIVERED' },
      select: { quantity: true },
    });
    const mealsRescued = deliveredListings.reduce((sum, l) => sum + l.quantity, 0);

    const baseStats = {
      mealsRescued,
      totalDonations: totalListings,
      volunteersActive: totalVolunteers,
      totalUsers,
    };

    if (!caller) {
      // Public: no PII, no user list, no all-listings
      return res.json(baseStats);
    }

    // Authenticated: full listing + user data
    const [allListings, allUsers] = await Promise.all([
      prisma.foodListing.findMany({
        include: { donor: { select: { name: true, location: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.user.findMany({
        select: { id: true, name: true, role: true, phone: true, location: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({ ...baseStats, allListings, allUsers });
  } catch (err) {
    console.error('[stats]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
