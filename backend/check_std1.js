const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { standard: "1" },
    select: { fullName: true, session: true, status: true }
  });
  console.log('--- Students in Standard 1 ---');
  students.forEach(s => {
    console.log(`${s.fullName}: Session=${s.session}, Status=${s.status}`);
  });
}

main().finally(() => prisma.$disconnect());
