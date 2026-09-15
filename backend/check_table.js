const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const categories = await prisma.standardCategory.findMany();
    console.log("Categories found:", categories);
  } catch (error) {
    console.error("Error accessing StandardCategory:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
