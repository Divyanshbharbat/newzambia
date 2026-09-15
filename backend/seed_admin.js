const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Support specifying college via argument or seed both common colleges (svpcet and St Vincent)
  const targetCollege = process.argv[2] || "svpcet";
  const collegesToSeed = process.argv[2] ? [process.argv[2]] : ["svpcet", "St Vincent"];
  const username = "admin";
  const password = "adminpassword";

  try {
    for (const college of collegesToSeed) {
      // 1. Ensure college exists in College table
      await prisma.college.upsert({
        where: { name: college },
        update: {},
        create: { name: college },
      });

      // 2. Upsert admin user using compound unique key [username, college]
      const admin = await prisma.user.upsert({
        where: {
          username_college: {
            username: username,
            college: college,
          },
        },
        update: {
          password: password,
          role: "admin",
        },
        create: {
          username: username,
          password: password,
          role: "admin",
          college: college,
        },
      });
      console.log("✓ Admin user created/updated:", admin.username, "at", admin.college);
    }
  } catch (error) {
    console.error("✗ Error creating admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
