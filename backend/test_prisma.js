const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.student.findMany({ take: 1 });
    console.log('Successfully queried student:', res);
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
