require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Clearing existing inventory...");
    
    // Clear existing inventory items
    await prisma.studentInventory.deleteMany({});
    await prisma.inventory.deleteMany({});

    console.log("Seeding inventory items from admission form...");

    // Inventory items based on the image provided
    const items = [
      {
        itemName: "Uniform - Shirt",
        category: "Uniform",
        gender: "All",
        price: 300,
        quantity: 100,
        description: "White school uniform shirt",
      },
      {
        itemName: "Uniform - Pants",
        category: "Uniform",
        gender: "Male",
        price: 350,
        quantity: 100,
        description: "Blue/Black school uniform pants",
      },
      {
        itemName: "Uniform - Half Pants",
        category: "Uniform",
        gender: "Male",
        price: 250,
        quantity: 80,
        description: "School uniform half pants",
      },
      {
        itemName: "Uniform - Skirt",
        category: "Uniform",
        gender: "Female",
        price: 350,
        quantity: 80,
        description: "School uniform skirt",
      },
      {
        itemName: "Uniform - Shirt",
        category: "Uniform",
        gender: "All",
        price: 400,
        quantity: 100,
        description: "White school uniform shirt for higher classes",
      },
      {
        itemName: "Uniform - Pants",
        category: "Uniform",
        gender: "Male",
        price: 450,
        quantity: 100,
        description: "Blue/Black school uniform pants for higher classes",
      },
      {
        itemName: "Uniform - Skirt",
        category: "Uniform",
        gender: "Female",
        price: 400,
        quantity: 80,
        description: "School uniform skirt for higher classes",
      },
      {
        itemName: "School Shoes",
        category: "Shoes",
        gender: "All",
        price: 1200,
        quantity: 100,
        description: "Black formal school shoes",
      },
      {
        itemName: "School Socks",
        category: "Uniform",
        gender: "All",
        price: 80,
        quantity: 200,
        description: "White school socks (pair)",
      },
      {
        itemName: "School Sweater",
        category: "Uniform",
        gender: "All",
        price: 500,
        quantity: 70,
        description: "School sweater for winter",
      },
      {
        itemName: "School Sweater",
        category: "Uniform",
        gender: "All",
        price: 600,
        quantity: 70,
        description: "School sweater for winter - higher classes",
      },
      {
        itemName: "School Tie",
        category: "Uniform",
        gender: "Male",
        price: 150,
        quantity: 150,
        description: "Official school tie",
      },
      {
        itemName: "School Belt",
        category: "Uniform",
        gender: "All",
        price: 200,
        quantity: 100,
        description: "Black school belt",
      },
      {
        itemName: "School Bag",
        category: "Accessories",
        gender: "All",
        price: 800,
        quantity: 100,
        description: "Official school bag",
      },
      {
        itemName: "Hair Band",
        category: "Uniform",
        gender: "Female",
        price: 30,
        quantity: 200,
        description: "School hair band",
      },
    ];

    // Create items
    const createdItems = await Promise.all(
      items.map((item) =>
        prisma.inventory.create({
          data: item,
        })
      )
    );

    console.log(`✓ ${createdItems.length} inventory items created successfully!`);
    console.log("\nItems created:");
    createdItems.forEach((item) => {
      console.log(
        `  - ${item.itemName} (${item.gender}): ₹${item.price}, Qty: ${item.quantity}`
      );
    });
  } catch (error) {
    console.error("✗ Error seeding inventory:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
