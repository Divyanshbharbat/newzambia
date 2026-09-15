const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { rollNo: 101, standard: "1", session: "2027-2028" }
  });
  if (student) {
    console.log("ID:", student.id);
  } else {
    console.log("Not found");
  }
}

main().finally(() => prisma.$disconnect());
