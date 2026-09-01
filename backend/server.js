require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// Import routes
const sessionManager = require("./middleware/sessionManager")
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const student = require("./routes/studentRoutes");
const attendance = require("./routes/attendanceRoutes");
const fees = require("./routes/feesRoutes");
const marks = require("./routes/marksRoutes");
const hostel = require("./routes/hostelRoutes");
const control = require("./routes/controlRoutes");
const other = require("./routes/otherRoutes");
const inventory = require("./routes/inventoryRoutes");
const bus = require("./routes/busRoutes");
const dashboard = require("./routes/dashboardRoutes");

const rag = require("./routes/ragRoutes");

const app = express();

app.use(cors(
    {
        origin: "*", // Allow all origins for local network access
        credentials: true
    }
));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. Multi-tenancy & Session Middleware (CRITICAL: Define before any routes)
app.use(async (req, res, next) => {
    try {
        // Capture college from header or query param
        const college = req.headers['x-college-name'] || req.query.college || 'st vincent';
        req.college = college;

        // Check query parameter or header for session year
        let session = req.query.session || req.headers['x-session'];

        // If not in query/header, check persisted session
        if (!session) {
            session = sessionManager.getSession();
        }

        // Fallback to latest session from database for THIS college if still not found
        if (!session) {
            const latestSession = await prisma.session.findFirst({
                where: { college: req.college },
                orderBy: { year: 'desc' }
            });
            session = latestSession ? latestSession.year : '2025-2026';
        }

        req.session = session;
        next();
    } catch (error) {
        console.error("Session middleware error:", error);
        req.session = '2025-2026';
        req.college = 'st vincent';
        next();
    }
});

app.post('/session', async (req, res) => {
    const { year, college } = req.body;
    const targetCollege = college || req.college || 'st vincent';

    if (!year) {
        return res.status(400).json({ error: 'Year is required' });
    }

    try {
        // Use req.college set by middleware
        const session = await prisma.session.create({
            data: { year, college: req.college },
        });
        return res.status(200).json({ message: 'Year stored', session });
    } catch (error) {
        console.error("Error storing session:", error);

        // Check if the error is a unique constraint violation
        if (error.code === 'P2002') { // Prisma unique constraint violation error code
            return res.status(409).json({ error: 'Session already exists for this college' });
        }

        return res.status(500).json({ error: 'An error occurred while storing the session' });
    }
});

app.get('/getSessions', async (req, res) => {
    try {
        // Simplify: middleware already sets req.college correctly
        const fetchSession = await prisma.session.findMany({
            where: { college: req.college },
            orderBy: {
                year: 'desc'
            }
        });
        return res.status(200).json(fetchSession)
    } catch (error) {
        console.error("Error fetching session: ", error.message);
        return res.status(500).json({ error: 'An error occurred while fetching sessions', details: error.message });
    }
})
app.get('/setSession', (req, res) => {
    try {
        const { year } = req.query;

        if (!year) {
            return res.status(400).json({ error: "Year parameter is required" });
        }

        // Add further validation for `year` if necessary
        sessionManager.setSession(year);

        res.status(200).json({ message: `Session set to ${year}` });
    } catch (error) {
        console.error("Error in /setSession route:", error);
        res.status(500).json({ error: "An internal server error occurred" });
    }
});

// Use routers with appropriate paths AFTER session is set up
app.use(student);
app.use(attendance);
app.use(fees);
app.use(marks);
app.use(hostel);
app.use(control);
app.use(other);
app.use(inventory);
app.use(bus);
app.use(rag);
app.use("/api", dashboard);

// Start server


// Ensure database and tables are present before starting server
const { execSync } = require("child_process");

async function checkAndInitializeDatabase() {
    try {
        await prisma.$queryRaw`SELECT 1 FROM "Student" LIMIT 1`;
        console.log("✓ Database and all tables are already present in PostgreSQL.");
    } catch (err) {
        console.log("⚠ Database or tables missing. Creating database and tables in PostgreSQL...");
        try {
            execSync("npx prisma db push", { stdio: "inherit" });
            console.log("✓ Database and tables created successfully.");
        } catch (pushErr) {
            console.error("✗ Failed to auto-create database/tables:", pushErr.message);
        }
    }

    // Ensure Admin user and initial college / categories exist in database
    try {
        const collegeName = "svpcet";
        const adminUsername = "admin";
        const adminPassword = "adminpassword";

        const existingAdmin = await prisma.user.findFirst({
            where: { username: adminUsername, college: collegeName }
        });

        if (!existingAdmin) {
            console.log("⚠ Admin details not found in database. Seeding initial admin data...");

            await prisma.college.upsert({
                where: { name: collegeName },
                update: {},
                create: { name: collegeName },
            });

            await prisma.user.upsert({
                where: {
                    username_college: {
                        username: adminUsername,
                        college: collegeName
                    }
                },
                update: {
                    password: adminPassword,
                    role: "admin"
                },
                create: {
                    username: adminUsername,
                    password: adminPassword,
                    role: "admin",
                    college: collegeName
                }
            });

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

            await prisma.session.upsert({
                where: {
                    year_college: {
                        year: '2026-2027',
                        college: collegeName
                    }
                },
                update: {},
                create: {
                    year: '2026-2027',
                    college: collegeName
                }
            });

            console.log("✓ Admin user ('admin' / 'adminpassword'), college ('svpcet'), and default categories seeded successfully.");
        } else {
            console.log("✓ Admin details are already present in database.");
        }
    } catch (seedErr) {
        console.error("✗ Error checking/seeding admin details:", seedErr.message);
    }
}

const HOST = '0.0.0.0';

checkAndInitializeDatabase().then(() => {
    app.listen(5000, HOST, () => {
        console.log(`Server is running on http://${HOST}:5000`);
    });
});
