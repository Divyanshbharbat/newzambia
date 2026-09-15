const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { session: "2027-2028" },
    select: { fullName: true, standard: true, status: true }
  });
  console.log('--- Students in 2027-2028 ---');
  students.forEach(s => {
    console.log(`${s.fullName}: Std=${s.standard}, Status=${s.status}`);
  });
}

main().finally(() => prisma.$disconnect());
