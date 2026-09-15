const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// Get all bus stations
router.get("/busStations", async (req, res) => {
  try {
    let whereClause = { college: req.college };
    const count = await prisma.busStation.count({ where: whereClause });
    if (count === 0) {
      whereClause = {};
    }

    const stations = await prisma.busStation.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    // Map to include studentCount field for clarity
    const result = stations.map((s) => ({
      id: s.id,
      stationName: s.stationName,
      price: s.price,
      description: s.description,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      studentCount: s._count?.students || 0,
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bus stations", details: error.message });
  }
});

// Get single bus station
router.get("/busStations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const station = await prisma.busStation.findUnique({
      where: { id: parseInt(id) },
    });
    if (!station) {
      return res.status(404).json({ message: "Bus station not found" });
    }
    res.status(200).json(station);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bus station", details: error.message });
  }
});

// Create bus station
router.post("/busStations", async (req, res) => {
  try {
    const { stationName, price, description } = req.body;

    if (!stationName || !price) {
      return res.status(400).json({ message: "Station name and price are required" });
    }

    const station = await prisma.busStation.create({
      data: {
        stationName,
        price: parseFloat(price),
        description,
        college: req.college
      },
    });

    res.status(201).json({ message: "Bus station created successfully", station });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Station name already exists" });
    }
    res.status(500).json({ error: "Failed to create bus station", details: error.message });
  }
});

// Update bus station
router.put("/busStations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { stationName, price, description } = req.body;

    const station = await prisma.busStation.update({
      where: { id: parseInt(id) },
      data: {
        stationName,
        price: price ? parseFloat(price) : undefined,
        description,
      },
    });

    res.status(200).json({ message: "Bus station updated successfully", station });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Bus station not found" });
    }
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Station name already exists" });
    }
    res.status(500).json({ error: "Failed to update bus station", details: error.message });
  }
});

// Delete bus station
router.delete("/busStations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.busStation.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Bus station deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Bus station not found" });
    }
    res.status(500).json({ error: "Failed to delete bus station", details: error.message });
  }
});

module.exports = router;
