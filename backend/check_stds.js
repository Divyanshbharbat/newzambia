const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stds = await prisma.standards.findMany();
  const students = await prisma.student.findMany({
    select: { id: true, fullName: true, standard: true, rollNo: true }
  });
  console.log("=== STANDARDS IN DB ===");
  console.log(stds);
  console.log("=== STUDENTS IN DB ===");
  console.log(students);
}

main().finally(() => prisma.$disconnect());
