const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { rollNo: 101, standard: "1", session: "2027-2028" },
    include: { marks: true }
  });
  
  if (student) {
    console.log(`--- Student: ${student.fullName} (Roll: 101) Marks ---`);
    if (student.marks.length === 0) {
        console.log("No marks found.");
    }
    student.marks.forEach(m => {
        console.log(`Exam: ${m.examinationType}, Subject: ${m.subjectName}, Marks: ${m.obtainedMarks}/${m.totalMarks}`);
    });
  } else {
    console.log('Student not found for Roll: 101, Std: 1, Session: 2027-2028');
  }
}

main().finally(() => prisma.$disconnect());
