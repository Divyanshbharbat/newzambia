const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarks() {
  try {
    const student = await prisma.student.findFirst({
      where: {
        rollNo: 40,
        standard: '1'
      },
      include: {
        marks: true
      }
    });

    if (!student) {
      console.log('Student not found');
      return;
    }

    console.log('Student ID:', student.id);
    console.log('Student Name:', student.fullName);
    console.log('Marks:', JSON.stringify(student.marks, null, 2));

    const totalObtained = student.marks.reduce((sum, m) => sum + m.obtainedMarks, 0);
    const totalPossible = student.marks.reduce((sum, m) => sum + m.totalMarks, 0);
    const percentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;

    console.log('Total Obtained:', totalObtained);
    console.log('Total Possible:', totalPossible);
    console.log('Percentage:', percentage);

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMarks();
