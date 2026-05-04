const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// SAFETY GUARD: Never seed in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Seeding is disabled in production. Set NODE_ENV to development or staging.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database (development only)...');

  // ── Admin account ──────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@2025!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@foodrescue.app' },
    update: {},
    create: {
      name: 'FoodRescue Admin',
      email: 'admin@foodrescue.app',
      password: adminPassword,
      role: 'ADMIN',
    },
  });


  const donorPassword = await bcrypt.hash('password123', 10);
  const receiverPassword = await bcrypt.hash('password123', 10);
  const volunteerPassword = await bcrypt.hash('password123', 10);


  const donor = await prisma.user.upsert({
    where: { email: 'sarah@restaurant.com' },
    update: {},
    create: {
      name: 'Sarah (Gold Star Mess)',
      email: 'sarah@restaurant.com',
      password: donorPassword,
      role: 'DONOR',
      phone: '+91 98765 43210',
      location: 'Koramangala, Bangalore',
    },
  });

  const donor2 = await prisma.user.upsert({
    where: { email: 'namma@kitchen.com' },
    update: {},
    create: {
      name: 'Namma Kitchen',
      email: 'namma@kitchen.com',
      password: donorPassword,
      role: 'DONOR',
      phone: '+91 98765 11111',
      location: 'Indiranagar, Bangalore',
    },
  });

  const donor3 = await prisma.user.upsert({
    where: { email: 'rainbow@hotel.com' },
    update: {},
    create: {
      name: 'Rainbow Hotel',
      email: 'rainbow@hotel.com',
      password: donorPassword,
      role: 'DONOR',
      phone: '+91 98765 22222',
      location: 'BTM Layout, Bangalore',
    },
  });

  const receiver = await prisma.user.upsert({
    where: { email: 'ananya@ngo.com' },
    update: {},
    create: {
      name: 'Ananya Kumar',
      email: 'ananya@ngo.com',
      password: receiverPassword,
      role: 'RECEIVER',
      phone: '+91 87654 32109',
      location: 'Hope Foundation, Koramangala',
    },
  });

  await prisma.user.upsert({
    where: { email: 'contact@hopefoundation.org' },
    update: {},
    create: {
      name: 'Hope Foundation NGO',
      email: 'contact@hopefoundation.org',
      password: receiverPassword,
      role: 'RECEIVER',
      phone: '+91 87654 99999',
      location: 'Koramangala, Bangalore',
    },
  });

  const volunteer = await prisma.user.upsert({
    where: { email: 'harsh@volunteer.com' },
    update: {},
    create: {
      name: 'Harsh Patel',
      email: 'harsh@volunteer.com',
      password: volunteerPassword,
      role: 'VOLUNTEER',
      phone: '+91 76543 21098',
      location: 'Indiranagar, Bangalore',
    },
  });

  await prisma.user.upsert({
    where: { email: 'mike@volunteer.com' },
    update: {},
    create: {
      name: 'Mike Thomas',
      email: 'mike@volunteer.com',
      password: volunteerPassword,
      role: 'VOLUNTEER',
      phone: '+91 76543 55555',
      location: 'BTM Layout, Bangalore',
    },
  });

  const now = new Date();

  // Food listings with real approximate Bangalore coordinates
  const food1 = await prisma.foodListing.upsert({
    where: { id: 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa' },
    update: {},
    create: {
      id: 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
      donorId: donor.id,
      title: 'Dal rice + salad',
      description: 'Freshly cooked dal rice with mixed salad. Suitable for 15 people.',
      quantity: 15,
      foodType: 'VEG',
      expiryTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      location: 'Gold Star Mess, Koramangala, Bangalore',
      lat: 12.9352,
      lng: 77.6245,
      status: 'AVAILABLE',
    },
  });

  await prisma.foodListing.upsert({
    where: { id: 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa' },
    update: {},
    create: {
      id: 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
      donorId: donor2.id,
      title: 'Chicken biryani',
      description: 'Hyderabadi style chicken biryani, packed and ready.',
      quantity: 12,
      foodType: 'NON_VEG',
      expiryTime: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      location: 'Namma Kitchen, Indiranagar, Bangalore',
      lat: 12.9784,
      lng: 77.6408,
      status: 'AVAILABLE',
    },
  });

  await prisma.foodListing.upsert({
    where: { id: 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa' },
    update: {},
    create: {
      id: 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
      donorId: donor.id,
      title: 'Bread + jam packets',
      description: 'Sealed bread packets with jam. Great for breakfast.',
      quantity: 30,
      foodType: 'PACKAGED',
      expiryTime: new Date(now.getTime() + 1 * 60 * 60 * 1000),
      location: 'Koramangala 4th Block, Bangalore',
      lat: 12.9312,
      lng: 77.6187,
      status: 'AVAILABLE',
    },
  });

  await prisma.foodListing.upsert({
    where: { id: 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa' },
    update: {},
    create: {
      id: 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa',
      donorId: donor3.id,
      title: 'Khichdi + pickle',
      description: 'Moong dal khichdi with assorted pickles. Comforting and nutritious.',
      quantity: 20,
      foodType: 'VEG',
      expiryTime: new Date(now.getTime() + 5 * 60 * 60 * 1000),
      location: 'BTM Layout 2nd Stage, Bangalore',
      lat: 12.9165,
      lng: 77.6101,
      status: 'AVAILABLE',
    },
  });

  await prisma.foodListing.upsert({
    where: { id: 'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa' },
    update: {},
    create: {
      id: 'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa',
      donorId: donor3.id,
      title: 'Tandoori chicken',
      description: 'Succulent tandoori chicken pieces, 8 portions.',
      quantity: 8,
      foodType: 'NON_VEG',
      expiryTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      location: 'Rainbow Hotel, BTM 2nd Stage, Bangalore',
      lat: 12.9142,
      lng: 77.6138,
      status: 'AVAILABLE',
    },
  });

  const claimed = await prisma.foodListing.upsert({
    where: { id: 'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa' },
    update: {},
    create: {
      id: 'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa',
      donorId: donor2.id,
      title: 'Pav bhaji + rolls',
      description: 'Mumbai style pav bhaji with dinner rolls.',
      quantity: 10,
      foodType: 'VEG',
      expiryTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      location: 'Café Blue Star, Indiranagar, Bangalore',
      lat: 12.9716,
      lng: 77.6412,
      status: 'ASSIGNED',
      pickupArrangement: 'VOLUNTEER',
    },
  });

  const claim1 = await prisma.claim.upsert({
    where: { id: 'cccccccc-0001-0001-0001-cccccccccccc' },
    update: {},
    create: {
      id: 'cccccccc-0001-0001-0001-cccccccccccc',
      foodId: claimed.id,
      receiverId: receiver.id,
      pickupType: 'VOLUNTEER',
      status: 'ASSIGNED',
    },
  });

  await prisma.volunteerTask.upsert({
    where: { claimId: 'cccccccc-0001-0001-0001-cccccccccccc' },
    update: {},
    create: {
      claimId: claim1.id,
      volunteerId: volunteer.id,
      status: 'ASSIGNED',
    },
  });

  console.log('✅ Seed complete!');
  console.log('\n📧 Dev accounts (password: password123):');
  console.log('  Donor:     sarah@restaurant.com');
  console.log('  Receiver:  ananya@ngo.com');
  console.log('  Volunteer: harsh@volunteer.com');
  console.log('\n⚠️  These are DEV ONLY accounts. Delete before going live.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
