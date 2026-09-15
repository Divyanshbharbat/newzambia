const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const studentCount = await prisma.student.count();
    console.log("Connection successful. Student count:", studentCount);
  } catch (error) {
    console.error("Connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
