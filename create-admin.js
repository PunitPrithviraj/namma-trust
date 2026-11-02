const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // 👈 CHANGE THESE TO YOUR NEW ADMIN DETAILS
  const newEmail = 'nammatrust10@gmail.com';
  const newPassword = 'Punit@123';
  const adminName = 'Super Admin';

  console.log(`Hashing password...`);
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  console.log(`Creating user...`);
  
  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) {
    console.log(`❌ Error: A user with ${newEmail} already exists.`);
    return;
  }

  // Create the new admin
  await prisma.user.create({
    data: {
      name: adminName,
      email: newEmail,
      passwordHash: hashedPassword,
      role: 'admin',
      status: 'active',
      mustChangePassword: false,
    }
  });

  console.log(`✅ Success! Admin created with email: ${newEmail} and password: ${newPassword}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
