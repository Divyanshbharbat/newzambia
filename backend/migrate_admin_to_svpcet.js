const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  const fromCollege = "admin";
  const toCollege = "svpcet";

  console.log(`Migrating from "${fromCollege}" to "${toCollege}"...`);

  // List of models that have a 'college' field
  // Based on the schema search earlier
  const models = [
    'User',
    'Student',
    'Fee',
    'Attendance',
    'Marks',
    'Hostel',
    'Subject',
    'Standards',
    'StandardCategory',
    'Session',
    'Installments',
    'Inventory',
    'BusStation'
  ];

  for (const modelName of models) {
    try {
      const modelLower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      const model = prisma[modelLower === 'standardcategory' ? 'standardCategory' : 
                         modelLower === 'busstation' ? 'busStation' :
                         modelLower];
      
      if (!model) {
        console.warn(`Model ${modelName} not found on prisma client.`);
        continue;
      }

      if (modelName === 'User') {
        // Find users with 'admin' college
        const usersToUpdate = await prisma.user.findMany({ where: { college: fromCollege } });
        for (const user of usersToUpdate) {
          // Check if same username already exists for 'svpcet'
          const existing = await prisma.user.findUnique({
            where: { username_college: { username: user.username, college: toCollege } }
          });
          if (existing) {
            console.log(`User "${user.username}" already exists for "${toCollege}". Deleting "${fromCollege}" record.`);
            await prisma.user.delete({ where: { id: user.id } });
          } else {
            await prisma.user.update({
              where: { id: user.id },
              data: { college: toCollege }
            });
            console.log(`Updated user "${user.username}" to "${toCollege}".`);
          }
        }
      } else {
        const result = await model.updateMany({
          where: { college: fromCollege },
          data: { college: toCollege }
        });
        console.log(`Updated ${result.count} records in ${modelName}.`);
      }
    } catch (error) {
      console.error(`Error migrating ${modelName}:`, error.message);
    }
  }

  // Handle unique constraint on User (if an admin/svpcet already exists)
  // We should check if there are duplicate users after migration
  // But updateMany handles this gracefully unless there's a conflict.
  // In our case, admin/svpcet already exists, so updateMany on User will fail if it causes a duplicate.
  
  console.log('Migration complete.');
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
