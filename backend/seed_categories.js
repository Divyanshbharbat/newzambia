const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const categories = ['Kindergarten', 'Primary', 'Junior Secondary', 'Senior Secondary'];
  const colleges = ['svpcet', 'St Vincent'];

  try {
    for (const college of colleges) {
      // Ensure college exists
      await prisma.college.upsert({
        where: { name: college },
        update: {},
        create: { name: college },
      });

      for (const cat of categories) {
        await prisma.standardCategory.upsert({
          where: {
            name_college: {
              name: cat,
              college: college,
            },
          },
          update: {},
          create: {
            name: cat,
            college: college,
          },
        });
      }
    }
    console.log("✓ Categories seeded successfully for colleges:", colleges.join(", "));
  } catch (error) {
    console.error("✗ Error seeding categories:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
