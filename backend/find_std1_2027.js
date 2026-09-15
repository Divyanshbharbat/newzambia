const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { standard: "1", session: "2027-2028" },
    include: { marks: true }
  });
  console.log(`--- Students in Std 1, 2027-2028 ---`);
  students.forEach(s => {
    const hasFinalMarks = s.marks.some(m => m.examType === "Final Semester");
    console.log(`${s.fullName}: Status=${s.status}, HasFinalMarks=${hasFinalMarks}`);
  });
}

main().finally(() => prisma.$disconnect());
