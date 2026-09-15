const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const alice = await prisma.student.findFirst({
    where: { fullName: "Alice Johnson", session: "2027-2028" },
    include: { marks: true }
  });
  
  if (alice) {
    console.log(`--- Alice Johnson Marks ---`);
    alice.marks.forEach(m => {
        console.log(`Exam: ${m.examType}, Marks: ${m.marksObtained}/${m.totalMarks}`);
    });
  } else {
    console.log('Alice Johnson not found in 2027-2028');
  }
}

main().finally(() => prisma.$disconnect());
