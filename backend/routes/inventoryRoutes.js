const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

function mapItemWithGender(item) {
	// Normalize gender and add formatted price
	const normalizedGender = item.gender ? String(item.gender).toLowerCase() : "all";
	const formatMoney = (val) => (typeof val === "number" ? val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val);
	return {
		...item,
		gender: normalizedGender,
		priceFormatted: formatMoney(item.price),
	};
}

// Get all inventory items
router.get("/inventory", async (req, res) => {
	try {
		const items = await prisma.inventory.findMany({ 
			where: { college: req.college },
			orderBy: { createdAt: "desc" } 
		});
		res.status(200).json(items.map(mapItemWithGender));
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch inventory", details: error.message });
	}
});

// Create inventory item
router.post("/inventory", async (req, res) => {
	try {
		const { itemName, category, gender, size, price, quantity, description } = req.body;

		const item = await prisma.inventory.create({
			data: {
				itemName: itemName?.trim() || "Item",
				category: category?.trim() || "General",
				gender: gender || null,
				size: size || null,
				price: price !== undefined && price !== "" ? parseFloat(price) : 0,
				quantity: quantity !== undefined && quantity !== "" ? parseInt(quantity) : 0,
				description: description || null,
				college: req.college
			},
		});

		res.status(201).json({ message: "Item created successfully", item: mapItemWithGender(item) });
	} catch (error) {
		res.status(500).json({ error: "Failed to create item", details: error.message });
	}
});

// Update inventory item
router.put("/inventory/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { itemName, category, gender, size, price, quantity, description } = req.body;
		const inventoryId = parseInt(id);

		const item = await prisma.inventory.update({
			where: { id: inventoryId },
			data: {
				itemName: itemName !== undefined ? (itemName?.trim() || "Item") : undefined,
				category: category !== undefined ? (category?.trim() || "General") : undefined,
				gender: gender || null,
				size: size || null,
				price: price !== undefined ? (price !== "" ? parseFloat(price) : 0) : undefined,
				quantity: quantity !== undefined ? (quantity !== "" ? parseInt(quantity) : 0) : undefined,
				description: description || null,
			},
		});

		res.status(200).json({ message: "Item updated successfully", item: mapItemWithGender(item) });
	} catch (error) {
		if (error.code === "P2025") {
			return res.status(404).json({ message: "Item not found" });
		}
		res.status(500).json({ error: "Failed to update item", details: error.message });
	}
});

// Delete inventory item
router.delete("/inventory/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const inventoryId = parseInt(id);

		// First delete all related StudentInventory records (optionally check college here too if studentInventory had it)
		await prisma.studentInventory.deleteMany({ where: { inventoryId } });

		// Then delete the inventory item
		await prisma.inventory.delete({ where: { id: inventoryId } });
		res.status(200).json({ message: "Item deleted successfully" });
	} catch (error) {
		if (error.code === "P2025") {
			return res.status(404).json({ message: "Item not found" });
		}
		res.status(500).json({ error: "Failed to delete item", details: error.message });
	}
});

// Get inventory items by category
router.get("/inventory/category/:category", async (req, res) => {
	try {
		const { category } = req.params;
		const items = await prisma.inventory.findMany({ where: { category, college: req.college } });
		res.status(200).json(items.map(mapItemWithGender));
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch items", details: error.message });
	}
});

// Get inventory distribution by gender (counts and total quantities)
router.get("/inventory/distribution", async (req, res) => {
	try {
		const boysCount = await prisma.inventory.count({ where: { gender: { equals: 'boys' }, college: req.college } });
		const girlsCount = await prisma.inventory.count({ where: { gender: { equals: 'girls' }, college: req.college } });
		const allCount = await prisma.inventory.count({ where: { OR: [ { gender: null }, { gender: { equals: 'all' } } ], college: req.college } });

		const boysQuantity = await prisma.inventory.aggregate({ where: { gender: { equals: 'boys' }, college: req.college }, _sum: { quantity: true } });
		const girlsQuantity = await prisma.inventory.aggregate({ where: { gender: { equals: 'girls' }, college: req.college }, _sum: { quantity: true } });
		const allQuantity = await prisma.inventory.aggregate({ where: { OR: [ { gender: null }, { gender: { equals: 'all' } } ], college: req.college }, _sum: { quantity: true } });

		res.status(200).json({
			items: {
				boys: boysCount,
				girls: girlsCount,
				all: allCount,
			},
			quantities: {
				boys: boysQuantity._sum.quantity || 0,
				girls: girlsQuantity._sum.quantity || 0,
				all: allQuantity._sum.quantity || 0,
			},
		});
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch distribution', details: error.message });
	}
});

// Assign inventory to student (for admission/receipt) - with automatic quantity reduction
router.post("/student-inventory", async (req, res) => {
	try {
		const { studentId, inventoryId, quantityPurchased, unitPrice, customTotalPrice } = req.body;

		if (!studentId || !inventoryId || quantityPurchased === undefined || quantityPurchased === null) {
			return res.status(400).json({ message: "Student ID, Inventory ID, and quantity are required" });
		}

		const inventory = await prisma.inventory.findFirst({ where: { id: parseInt(inventoryId), college: req.college } });

		if (inventory.quantity !== null && inventory.quantity !== undefined && inventory.quantity <= 0) {
			return res.status(400).json({ message: `Item "${inventory.itemName}" is out of stock!` });
		}

		if (inventory.quantity !== null && inventory.quantity !== undefined && inventory.quantity < quantityPurchased) {
			return res.status(400).json({ message: `Insufficient stock for "${inventory.itemName}". Available stock: ${inventory.quantity}, Requested: ${quantityPurchased}` });
		}

		let totalPrice;
		if (customTotalPrice !== undefined && customTotalPrice !== null && customTotalPrice !== "") {
			totalPrice = parseFloat(customTotalPrice);
		} else if (unitPrice !== undefined && unitPrice !== null && unitPrice !== "") {
			totalPrice = parseFloat(unitPrice) * parseInt(quantityPurchased);
		} else {
			totalPrice = (inventory.price || 0) * parseInt(quantityPurchased);
		}

		const studentInventory = await prisma.studentInventory.upsert({
			where: {
				studentId_inventoryId: {
					studentId: parseInt(studentId),
					inventoryId: parseInt(inventoryId),
				},
			},
			update: {
				quantityPurchased: parseInt(quantityPurchased),
				totalPrice,
			},
			create: {
				studentId: parseInt(studentId),
				inventoryId: parseInt(inventoryId),
				quantityPurchased: parseInt(quantityPurchased),
				totalPrice,
			},
		});

		await prisma.inventory.update({ where: { id: parseInt(inventoryId) }, data: { quantity: inventory.quantity ? inventory.quantity - quantityPurchased : null } });

		res.status(201).json({ message: "Student inventory updated and quantity reduced", studentInventory, remainingQuantity: inventory.quantity ? inventory.quantity - quantityPurchased : null });
	} catch (error) {
		res.status(500).json({ error: "Failed to assign inventory", details: error.message });
	}
});

// Get student inventory items
router.get("/student-inventory/:studentId", async (req, res) => {
	try {
		const { studentId } = req.params;
		const studentInventory = await prisma.studentInventory.findMany({ 
			where: { 
				studentId: parseInt(studentId),
				inventory: { college: req.college }
			}, 
			include: { inventory: true } 
		});
		res.status(200).json(studentInventory.map((si) => ({ ...si, inventory: mapItemWithGender(si.inventory) })));
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch student inventory", details: error.message });
	}
});

// Delete student inventory item
router.delete("/student-inventory/:id", async (req, res) => {
	try {
		const { id } = req.params;
		await prisma.studentInventory.delete({ where: { id: parseInt(id) } });
		res.status(200).json({ message: "Student inventory item removed" });
	} catch (error) {
		res.status(500).json({ error: "Failed to delete student inventory", details: error.message });
	}
});

module.exports = router;


