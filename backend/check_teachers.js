const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, college: true }
  });
  fs.writeFileSync('users_output.txt', JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
