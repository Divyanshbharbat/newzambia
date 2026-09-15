const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Setup script for Zambia Project ERP
 * 1. Syncs the database schema using Prisma DB Push
 * 2. Seeds initial administrative data (College, Admin User, Categories)
 */
async function setup() {
  console.log('=========================================');
  console.log('   Zambia Project - Database Setup   ');
  console.log('=========================================\n');

  try {
    // 1. Database Schema Sync
    console.log('[1/3] Syncing database schema...');
    try {
      execSync('npx prisma db push', { stdio: 'inherit' });
      console.log('✓ Database schema is in sync.\n');
    } catch (err) {
      console.error('✗ Failed to sync schema. Make sure your DATABASE_URL in .env is correct.');
      throw err;
    }

    // 2. Seeding Administrative Data
    console.log('[2/3] Seeding administrative data...');
    
    const collegeName = 'svpcet';
    const adminUsername = 'admin';
    const adminPassword = 'adminpassword'; // User should change this after first login
    const adminRole = 'admin';

    // Ensure College exists
    const college = await prisma.college.upsert({
      where: { name: collegeName },
      update: {},
      create: { name: collegeName },
    });
    console.log(`  ✓ College ensured: ${college.name}`);

    // Ensure Admin User exists
    const user = await prisma.user.upsert({
      where: { 
        username_college: { 
          username: adminUsername, 
          college: collegeName 
        } 
      },
      update: {
        password: adminPassword,
        role: adminRole
      },
      create: {
        username: adminUsername,
        password: adminPassword,
        role: adminRole,
        college: collegeName
      },
    });
    console.log(`  ✓ Admin user ensured: ${user.username}`);

    // 3. Seeding Categories
    console.log('\n[3/3] Seeding default categories...');
    const categories = ['Kindergarten', 'Primary', 'Junior Secondary', 'Senior Secondary'];
    
    for (const cat of categories) {
      await prisma.standardCategory.upsert({
        where: { 
          name_college: { 
            name: cat, 
            college: collegeName 
          } 
        },
        update: {},
        create: { 
          name: cat, 
          college: collegeName 
        }
      });
    }
    console.log('  ✓ Default standard categories ensured.');

    console.log('\n=========================================');
    console.log('   Setup Completed Successfully!   ');
    console.log('   You can now start the server with:    ');
    console.log('   npm start                             ');
    console.log('=========================================');

  } catch (error) {
    console.error('\n=========================================');
    console.error('   Setup Failed!                         ');
    console.error(`   Error: ${error.message}`);
    console.error('=========================================');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setup();
