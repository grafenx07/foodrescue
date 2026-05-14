const express = require('express');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ── Supabase Storage client ────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const BUCKET = 'food-images';

// ── Multer — memory storage (file held in RAM, then streamed to Supabase) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

/** Upload a file buffer to Supabase Storage and return the public URL */
async function uploadToSupabase(file) {
  const ext = path.extname(file.originalname) || '.jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

// GET /api/food - list food listings
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
    console.error('[food GET /]', err);
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
    console.error('[food GET /:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/food - create (DONOR only)
router.post('/', authenticate, requireRole('DONOR'), upload.single('image'), async (req, res) => {
  try {
    const { title, description, quantity, foodType, expiryTime, location, pickupArrangement, lat, lng } = req.body;
    if (!title || !quantity || !expiryTime) {
      return res.status(400).json({ error: 'title, quantity, and expiryTime are required' });
    }

    // Upload image to Supabase Storage (if provided), otherwise null
    let imageUrl = null;
    if (req.file) {
      try {
        imageUrl = await uploadToSupabase(req.file);
      } catch (uploadErr) {
        console.error('[food POST] Image upload failed:', uploadErr.message);
        // Non-fatal: continue without image rather than failing the whole request
      }
    }

    const listing = await prisma.foodListing.create({
      data: {
        donorId: req.user.id,
        title: title.trim(),
        description: description?.trim() || null,
        quantity: parseInt(quantity),
        foodType: foodType || 'VEG',
        expiryTime: new Date(expiryTime),
        location: location?.trim() || 'Unknown location',
        imageUrl,
        pickupArrangement: pickupArrangement || 'FLEXIBLE',
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      },
    });
    res.status(201).json(listing);
  } catch (err) {
    console.error('[food POST /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/food/:id - update (DONOR only) — whitelist fields to prevent mass assignment
const PATCHABLE_FIELDS = ['title', 'description', 'quantity', 'expiryTime', 'location', 'status', 'pickupArrangement'];

router.patch('/:id', authenticate, requireRole('DONOR'), async (req, res) => {
  try {
    const listing = await prisma.foodListing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: 'Not found' });
    if (listing.donorId !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

    // Only allow safe fields
    const safeData = {};
    for (const field of PATCHABLE_FIELDS) {
      if (req.body[field] !== undefined) safeData[field] = req.body[field];
    }
    if (safeData.quantity) safeData.quantity = parseInt(safeData.quantity);
    if (safeData.expiryTime) safeData.expiryTime = new Date(safeData.expiryTime);

    const updated = await prisma.foodListing.update({
      where: { id: req.params.id },
      data: safeData,
    });
    res.json(updated);
  } catch (err) {
    console.error('[food PATCH /:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
