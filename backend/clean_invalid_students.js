const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanInvalidStudents() {
  try {
    console.log("Starting cleanup of students added without valid classes...");

    // Get all standards grouped by college
    const allStandards = await prisma.standards.findMany();
    const standardsMap = new Map(); // college -> Set of lowercased std strings

    for (const s of allStandards) {
      const col = s.college || 'svpcet';
      if (!standardsMap.has(col)) {
        standardsMap.set(col, new Set());
      }
      standardsMap.get(col).add(s.std.trim().toLowerCase());
    }

    // Get all students
    const allStudents = await prisma.student.findMany();
    console.log(`Found ${allStudents.length} total students in database.`);

    let removedCount = 0;

    for (const student of allStudents) {
      const col = student.college || 'svpcet';
      const validStds = standardsMap.get(col);

      const isValidClass = validStds && student.standard && validStds.has(student.standard.trim().toLowerCase());

      if (!isValidClass) {
        console.log(`Deleting invalid student (ID: ${student.id}, Name: "${student.fullName}", Roll: ${student.rollNo}, Standard: "${student.standard}", College: "${student.college}") - No matching class found in Standards.`);

        // Delete cascade relationships
        await prisma.parent.deleteMany({ where: { studentId: student.id } });
        await prisma.fee.deleteMany({ where: { studentId: student.id } });
        await prisma.attendance.deleteMany({ where: { studentId: student.id } });
        await prisma.marks.deleteMany({ where: { studentId: student.id } });
        await prisma.studentInventory.deleteMany({ where: { studentId: student.id } });
        await prisma.hostel.deleteMany({
          where: {
            rollNo: student.rollNo,
            standard: student.standard,
            college: student.college
          }
        });

        // Delete student record
        await prisma.student.delete({ where: { id: student.id } });
        removedCount++;
      }
    }

    console.log(`\nCleanup complete! Removed ${removedCount} invalid student(s) added without valid classes.`);
  } catch (error) {
    console.error("Error cleaning invalid students:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanInvalidStudents();
