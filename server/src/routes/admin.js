const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// ─────────────────────────────────────────────
// GET /api/admin/stats — full platform overview
// ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalListings, totalClaims, totalDelivered, recentUsers, recentListings] = await Promise.all([
      prisma.user.count(),
      prisma.foodListing.count(),
      prisma.claim.count(),
      prisma.claim.count({ where: { status: 'DELIVERED' } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.foodListing.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { donor: { select: { name: true } } },
      }),
    ]);

    const roleBreakdown = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    const statusBreakdown = await prisma.foodListing.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const deliveredListings = await prisma.foodListing.findMany({
      where: { status: 'DELIVERED' },
      select: { quantity: true },
    });
    const mealsRescued = deliveredListings.reduce((sum, l) => sum + l.quantity, 0);

    res.json({
      totalUsers, totalListings, totalClaims, totalDelivered, mealsRescued,
      roleBreakdown, statusBreakdown, recentUsers, recentListings,
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { search, role } = req.query;
    const where = {};
    if (role && role !== 'ALL') where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, location: true, createdAt: true,
        _count: { select: { foodListings: true, claims: true, volunteerTasks: true } },
      },
    });
    res.json(users);
  } catch (err) {
    console.error('[admin/users GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:id — update name, role, phone, location
router.patch('/users/:id', async (req, res) => {
  try {
    const { name, role, phone, location } = req.body;
    // Prevent demoting the last admin
    if (role && role !== 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      const target = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (target?.role === 'ADMIN' && adminCount <= 1) {
        return res.status(409).json({ error: 'Cannot demote the only admin account' });
      }
    }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(phone !== undefined && { phone }),
        ...(location !== undefined && { location }),
      },
      select: { id: true, name: true, email: true, role: true, phone: true, location: true },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    console.error('[admin/users PATCH]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(409).json({ error: 'Cannot delete your own admin account' });
    }
    // Cascade: delete volunteer tasks → claims → listings, then user
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: req.params.id } });
      if (!user) throw { code: 'P2025' };

      // Delete volunteer tasks for this user
      await tx.volunteerTask.deleteMany({ where: { volunteerId: req.params.id } });
      // Delete volunteer tasks for claims of this user's food
      const userListings = await tx.foodListing.findMany({ where: { donorId: req.params.id }, select: { id: true } });
      const listingIds = userListings.map(l => l.id);
      const userClaims = await tx.claim.findMany({
        where: { OR: [{ receiverId: req.params.id }, { foodId: { in: listingIds } }] },
        select: { id: true },
      });
      const claimIds = userClaims.map(c => c.id);
      await tx.volunteerTask.deleteMany({ where: { claimId: { in: claimIds } } });
      await tx.claim.deleteMany({ where: { id: { in: claimIds } } });
      await tx.foodListing.deleteMany({ where: { donorId: req.params.id } });
      await tx.claim.deleteMany({ where: { receiverId: req.params.id } });
      await tx.user.delete({ where: { id: req.params.id } });
    });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    console.error('[admin/users DELETE]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// FOOD LISTINGS
// ─────────────────────────────────────────────

// GET /api/admin/listings
router.get('/listings', async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    const listings = await prisma.foodListing.findMany({
      where,
      include: {
        donor: { select: { id: true, name: true, email: true } },
        claims: {
          include: {
            receiver: { select: { name: true } },
            volunteerTask: { include: { volunteer: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(listings);
  } catch (err) {
    console.error('[admin/listings GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/listings/:id — update status
router.patch('/listings/:id', async (req, res) => {
  try {
    const { status, title, quantity } = req.body;
    const data = {};
    if (status) data.status = status;
    if (title) data.title = title;
    if (quantity) data.quantity = parseInt(quantity);
    const updated = await prisma.foodListing.update({
      where: { id: req.params.id },
      data,
      include: { donor: { select: { name: true } } },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Listing not found' });
    console.error('[admin/listings PATCH]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/listings/:id
router.delete('/listings/:id', async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const claims = await tx.claim.findMany({ where: { foodId: req.params.id }, select: { id: true } });
      const claimIds = claims.map(c => c.id);
      await tx.volunteerTask.deleteMany({ where: { claimId: { in: claimIds } } });
      await tx.claim.deleteMany({ where: { foodId: req.params.id } });
      await tx.foodListing.delete({ where: { id: req.params.id } });
    });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Listing not found' });
    console.error('[admin/listings DELETE]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// CLAIMS
// ─────────────────────────────────────────────

// GET /api/admin/claims
router.get('/claims', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'ALL') where.status = status;
    const claims = await prisma.claim.findMany({
      where,
      include: {
        food: { select: { id: true, title: true, quantity: true, location: true } },
        receiver: { select: { id: true, name: true, email: true } },
        volunteerTask: {
          include: { volunteer: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(claims);
  } catch (err) {
    console.error('[admin/claims GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
