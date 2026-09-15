const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const collegeName = 'svpcet';
  const username = 'admin';
  const password = 'admin'; // In production, use a secure hashing algorithm like bcrypt
  const role = 'admin';

  console.log('--- Starting Seeding ---');

  // 1. Ensure College exists
  const college = await prisma.college.upsert({
    where: { name: collegeName },
    update: {},
    create: { name: collegeName },
  });
  console.log(`✓ College ensured: ${college.name}`);

  // 2. Ensure Admin User exists
  const user = await prisma.user.upsert({
    where: { username_college: { username, college: collegeName } },
    update: {
      password: password,
      role: role
    },
    create: {
      username,
      password,
      role,
      college: collegeName
    },
  });
  console.log(`✓ Admin user ensured: ${user.username} at ${user.college}`);

  console.log('--- Seeding Completed ---');
}

main()
  .catch((e) => {
    console.error('✗ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
