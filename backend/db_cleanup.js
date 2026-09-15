const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanUpGhostStandards() {
  try {
    console.log("Starting database cleanup...");
    
    // 1. Get all unique categories currently in the Categories table for all colleges
    const validCategories = await prisma.standardCategory.findMany({
      select: { name: true, college: true }
    });
    
    // 2. Find all standards
    const allStandards = await prisma.standards.findMany();
    
    let deletedCount = 0;
    for (const std of allStandards) {
      // "N/A" or null category is usually acceptable if it's the default
      if (!std.category || std.category === "N/A") continue;
      
      // Check if this standard's category exists in the Categories table for the same college
      const exists = validCategories.some(c => c.name === std.category && c.college === std.college);
      
      if (!exists) {
        console.log(`Deleting ghost standard: Std ${std.std}, Category "${std.category}", College "${std.college}"`);
        await prisma.standards.delete({ where: { id: std.id } });
        deletedCount++;
      }
    }
    
    console.log(`Cleanup finished. Deleted ${deletedCount} ghost records.`);
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanUpGhostStandards();
