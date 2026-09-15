const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.session.findMany();
  console.log('--- Students per Session and Status ---');
  for (const s of sessions) {
    const total = await prisma.student.count({ where: { session: s.year } });
    const passed = await prisma.student.count({ where: { session: s.year, status: "Passed" } });
    const failed = await prisma.student.count({ where: { session: s.year, status: "Failed" } });
    const none = await prisma.student.count({ where: { session: s.year, status: "None" } });
    console.log(`Session ${s.year}: Total=${total}, Passed=${passed}, Failed=${failed}, None=${none}`);
  }
}

main().finally(() => prisma.$disconnect());
