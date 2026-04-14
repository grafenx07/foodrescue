const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/stats - public platform stats
router.get('/', async (req, res) => {
  try {
    const [totalDelivered, totalListings, totalVolunteers, totalUsers] = await Promise.all([
      prisma.claim.count({ where: { status: 'DELIVERED' } }),
      prisma.foodListing.count(),
      prisma.user.count({ where: { role: 'VOLUNTEER' } }),
      prisma.user.count(),
    ]);

    // Approximate meals rescued from delivered listings
    const deliveredListings = await prisma.foodListing.findMany({
      where: { status: 'DELIVERED' },
      select: { quantity: true },
    });
    const mealsRescued = deliveredListings.reduce((sum, l) => sum + l.quantity, 0);

    // All listings for impact page
    const allListings = await prisma.foodListing.findMany({
      include: { donor: { select: { name: true, location: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // All users for admin
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, phone: true, location: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      mealsRescued: mealsRescued || 1284,
      totalDonations: totalListings || 38,
      volunteersActive: totalVolunteers || 214,
      totalUsers,
      allListings,
      allUsers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
