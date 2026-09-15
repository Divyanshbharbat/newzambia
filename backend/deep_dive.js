const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { standard: "1", session: "2027-2028" },
    include: { marks: true }
  });
  console.log(`--- ALL Students in Std 1, 2027-2028 ---`);
  students.forEach(s => {
    console.log(`Student: ${s.fullName}`);
    console.log(`  Status: ${s.status}`);
    console.log(`  Marks Count: ${s.marks.length}`);
    s.marks.forEach(m => {
        console.log(`    ${m.examType}: ${m.marksObtained}/${m.totalMarks}`);
    });
  });
}

main().finally(() => prisma.$disconnect());
