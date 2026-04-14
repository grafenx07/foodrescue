const express = require('express');
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/food - list all available food listings
router.get('/', async (req, res) => {
  try {
    const { foodType, status, donorId } = req.query;
    const where = {};
    if (!status && !donorId) where.status = 'AVAILABLE';
    if (status) where.status = status;
    if (foodType) where.foodType = foodType;
    if (donorId) where.donorId = donorId;

    // Auto-expire listings
    await prisma.foodListing.updateMany({
      where: { expiryTime: { lt: new Date() }, status: 'AVAILABLE' },
      data: { status: 'EXPIRED' },
    });

    const listings = await prisma.foodListing.findMany({
      where,
      include: { donor: { select: { id: true, name: true, location: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(listings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/food/:id
router.get('/:id', async (req, res) => {
  try {
    const listing = await prisma.foodListing.findUnique({
      where: { id: req.params.id },
      include: { donor: { select: { id: true, name: true, location: true, phone: true } } },
    });
    if (!listing) return res.status(404).json({ error: 'Not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/food - create (DONOR only)
router.post('/', authenticate, requireRole('DONOR'), upload.single('image'), async (req, res) => {
  try {
    const { title, description, quantity, foodType, expiryTime, location, pickupArrangement } = req.body;
    if (!title || !quantity || !expiryTime) {
      return res.status(400).json({ error: 'title, quantity, and expiryTime are required' });
    }
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const listing = await prisma.foodListing.create({
      data: {
        donorId: req.user.id,
        title,
        description,
        quantity: parseInt(quantity),
        foodType: foodType || 'VEG',
        expiryTime: new Date(expiryTime),
        location: location || 'Unknown location',
        imageUrl,
        pickupArrangement: pickupArrangement || 'FLEXIBLE',
      },
    });
    res.status(201).json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/food/:id - update (DONOR only)
router.patch('/:id', authenticate, requireRole('DONOR'), async (req, res) => {
  try {
    const listing = await prisma.foodListing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: 'Not found' });
    if (listing.donorId !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

    const updated = await prisma.foodListing.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
