const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    select: { fullName: true, session: true, status: true, standard: true },
    take: 5
  });
  const sessions = await prisma.session.findMany();
  const currentSessionFromDb = await prisma.session.findFirst({
    orderBy: { year: 'desc' }
  });
  
  console.log('--- Database Check ---');
  console.log('Sessions in DB:', sessions.map(s => s.year));
  console.log('Latest Session in DB:', currentSessionFromDb?.year);
  console.log('Students samples:');
  students.forEach(s => {
    console.log(`- ${s.fullName}: Session=${s.session}, Status=${s.status}, Std=${s.standard}`);
  });
}

main().finally(() => prisma.$disconnect());
