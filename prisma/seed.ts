import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  const passwordAdmin = await bcrypt.hash('AdminPassword@123', 10);
  const passwordVendor = await bcrypt.hash('VendorPassword@123', 10);
  const passwordCustomer = await bcrypt.hash('CustomerPassword@123', 10);

  // 1. Super Admin Account
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      name: 'System Administrator',
      password: passwordAdmin,
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
    },
    create: {
      name: 'System Administrator',
      email: 'admin@gmail.com',
      password: passwordAdmin,
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
    },
  });
  console.log(`✅ Admin user seeded: ${admin.email} (Password: AdminPassword@123)`);

  // 2. Approved Active Vendor
  const approvedVendorUser = await prisma.user.upsert({
    where: { email: 'vendor@gmail.com' },
    update: {
      name: 'Jane Smith',
      password: passwordVendor,
      role: 'VENDOR',
      status: 'ACTIVE',
      isEmailVerified: true,
    },
    create: {
      name: 'Jane Smith',
      email: 'vendor@gmail.com',
      password: passwordVendor,
      role: 'VENDOR',
      status: 'ACTIVE',
      isEmailVerified: true,
    },
  });

  await prisma.vendorProfile.upsert({
    where: { userId: approvedVendorUser.id },
    update: {
      businessName: 'Green Agri Agro Foods',
      slug: 'green-agri-agro-foods',
      shortDescription:
        'Premium organic produce, farm-fresh vegetables, and agricultural supplies delivered daily.',
      businessEmail: 'vendor@gmail.com',
      businessPhone: '+880 1712 345678',
      category: 'Agro & Farming',
      isOtpVerified: true,
      country: 'Bangladesh',
      city: 'Dhaka',
      address: 'Plot 14, Block C, Uttara Commercial Area',
      openingHours: 'Sat–Thu 08:00–20:00',
      contactPerson: 'Jane Smith',
      contactRole: 'Managing Director',
      contactEmail: 'vendor@gmail.com',
      contactPhone: '+880 1712 345678',
      status: 'APPROVED',
      approvedAt: new Date(),
    },
    create: {
      userId: approvedVendorUser.id,
      businessName: 'Green Agri Agro Foods',
      slug: 'green-agri-agro-foods',
      shortDescription:
        'Premium organic produce, farm-fresh vegetables, and agricultural supplies delivered daily.',
      businessEmail: 'vendor@gmail.com',
      businessPhone: '+880 1712 345678',
      category: 'Agro & Farming',
      isOtpVerified: true,
      country: 'Bangladesh',
      city: 'Dhaka',
      address: 'Plot 14, Block C, Uttara Commercial Area',
      openingHours: 'Sat–Thu 08:00–20:00',
      contactPerson: 'Jane Smith',
      contactRole: 'Managing Director',
      contactEmail: 'vendor@gmail.com',
      contactPhone: '+880 1712 345678',
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });
  console.log(
    `✅ Approved Vendor seeded: ${approvedVendorUser.email} (Password: VendorPassword@123)`,
  );

  // 3. Pending Vendor (Awaiting Admin Approval)
  const pendingVendorUser = await prisma.user.upsert({
    where: { email: 'pending.vendor@gmail.com' },
    update: {
      name: 'Rafiqul Islam',
      password: passwordVendor,
      role: 'VENDOR',
      status: 'INACTIVE',
      isEmailVerified: true,
    },
    create: {
      name: 'Rafiqul Islam',
      email: 'pending.vendor@gmail.com',
      password: passwordVendor,
      role: 'VENDOR',
      status: 'INACTIVE',
      isEmailVerified: true,
    },
  });

  await prisma.vendorProfile.upsert({
    where: { userId: pendingVendorUser.id },
    update: {
      businessName: 'Bengal Fresh Harvest',
      slug: 'bengal-fresh-harvest',
      shortDescription:
        'Local organic dairy, poultry and seasonal fruits directly from farmers.',
      businessEmail: 'pending.vendor@gmail.com',
      businessPhone: '+880 1812 987654',
      category: 'Dairy & Poultry',
      isOtpVerified: true,
      country: 'Bangladesh',
      city: 'Chittagong',
      address: 'Agrabad C/A, Street 4',
      openingHours: 'Mon–Sat 09:00–19:00',
      contactPerson: 'Rafiqul Islam',
      contactRole: 'Owner',
      contactEmail: 'pending.vendor@gmail.com',
      contactPhone: '+880 1812 987654',
      status: 'PENDING',
    },
    create: {
      userId: pendingVendorUser.id,
      businessName: 'Bengal Fresh Harvest',
      slug: 'bengal-fresh-harvest',
      shortDescription:
        'Local organic dairy, poultry and seasonal fruits directly from farmers.',
      businessEmail: 'pending.vendor@gmail.com',
      businessPhone: '+880 1812 987654',
      category: 'Dairy & Poultry',
      isOtpVerified: true,
      country: 'Bangladesh',
      city: 'Chittagong',
      address: 'Agrabad C/A, Street 4',
      openingHours: 'Mon–Sat 09:00–19:00',
      contactPerson: 'Rafiqul Islam',
      contactRole: 'Owner',
      contactEmail: 'pending.vendor@gmail.com',
      contactPhone: '+880 1812 987654',
      status: 'PENDING',
    },
  });
  console.log(
    `✅ Pending Vendor seeded: ${pendingVendorUser.email} (Status: PENDING - will show approval notification on login)`,
  );

  // 4. Customer User
  const customer = await prisma.user.upsert({
    where: { email: 'customer@gmail.com' },
    update: {
      name: 'General Customer',
      password: passwordCustomer,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isEmailVerified: true,
    },
    create: {
      name: 'General Customer',
      email: 'customer@gmail.com',
      password: passwordCustomer,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isEmailVerified: true,
    },
  });
  console.log(
    `✅ Customer seeded: ${customer.email} (Password: CustomerPassword@123)`,
  );

  console.log('\n✨ Database seeding completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
