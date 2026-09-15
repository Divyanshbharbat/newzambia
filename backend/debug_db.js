const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  let output = '';
  const log = (msg, data) => {
    output += msg + '\n' + JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n\n';
  };

  const colleges = await prisma.college.findMany();
  log('--- COLLEGE TABLE ---', colleges);

  const users = await prisma.user.findMany({
    select: { username: true, role: true, college: true }
  });
  log('--- USERS ---', users);

  const studentCountByCollege = await prisma.student.groupBy({
    by: ['college'],
    _count: { _all: true }
  });
  log('--- STUDENT COUNT BY COLLEGE ---', studentCountByCollege);

  const studentCountBySession = await prisma.student.groupBy({
    by: ['session'],
    _count: { _all: true }
  });
  log('--- STUDENT COUNT BY SESSION ---', studentCountBySession);

  const recentStudents = await prisma.student.findMany({
    take: 10,
    orderBy: { id: 'desc' },
    select: { fullName: true, rollNo: true, standard: true, session: true, college: true }
  });
  log('--- RECENT STUDENTS ---', recentStudents);

  fs.writeFileSync('debug_output.txt', output);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
