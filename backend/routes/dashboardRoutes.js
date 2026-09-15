const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/dashboard/summary
router.get("/dashboard/summary", async (req, res) => {
  try {
    const session = req.session;

    // Students
    const studentData = await prisma.student.findMany({
      where: { session: session, college: req.college },
      include: { fees: true }
    });
    const totalStudents = studentData.length;

    // Total Teachers (if we have a user role mapping, or we just mock/count users. There is a User model? The prompt asks for total teachers if available). 
    // Wait, let's see if Teacher model exists. In schema.prisma there isn't one. Let's return 0.
    const totalTeachers = 0; 

    // Hostel Beds
    const hostelData = await prisma.hostel.count({ where: { college: req.college } });
    let controlData = await prisma.control.findFirst({
      where: {
        session: { year: session, college: req.college },
        college: req.college
      }
    });
    const totalBeds = controlData?.number_of_hostel_bed ?? 0;
    const availableBeds = Math.max(0, totalBeds - hostelData);

    // Fees
    let totalFeesCollected = 0;
    studentData.forEach(student => {
      student.fees.forEach(fee => {
        totalFeesCollected += fee.amount;
      });
    });

    // Approximate pending fees (Requires linking standards to students if standards has totalFee)
    let pendingFees = 0;
    const standards = await prisma.standards.findMany({ where: { college: req.college } });
    const stdFeeMap = {};
    standards.forEach(s => {
      stdFeeMap[s.std] = s.totalFees || 0;
    });

    studentData.forEach(student => {
       const stdTotal = stdFeeMap[student.standard] || 0;
       let paid = 0;
       student.fees.forEach(fee => { paid += fee.amount; });
       if (stdTotal > paid) {
           pendingFees += (stdTotal - paid);
       }
    });

    // Bus stations
    const totalBusStations = await prisma.busStation.count({ where: { college: req.college } });

    // Inventory Items
    const totalInventoryItems = await prisma.inventory.count({ where: { college: req.college } });

    res.status(200).json({
      totalStudents,
      totalTeachers,
      totalBeds,
      availableBeds,
      totalFeesCollected,
      pendingFees,
      totalBusStations,
      totalInventoryItems
    });
  } catch (error) {
    console.error("Error in dashboard summary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/dashboard/student-performance
router.get("/dashboard/student-performance", async (req, res) => {
    try {
        const session = req.session;
        const passedStudents = await prisma.student.count({
            where: { session: session, college: req.college, status: "Passed" }
        });
        const failedStudents = await prisma.student.count({
            where: { session: session, college: req.college, status: "Failed" }
        });
        
        let totalStudents = passedStudents + failedStudents;
        
        // If no one is explicitly passed/failed yet, maybe total students that exist
        if (totalStudents === 0) {
           totalStudents = await prisma.student.count({ where: { session: session, college: req.college }});
        }
        
        let passingPercentage = 0;
        if (totalStudents > 0) {
            passingPercentage = (passedStudents / totalStudents) * 100;
        }
        
        res.status(200).json({
            totalStudents,
            passedStudents,
            failedStudents,
            passingPercentage: passingPercentage.toFixed(2)
        });
    } catch(error) {
       console.error(error);
       res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /api/dashboard/class-stats
router.get("/dashboard/class-stats", async (req, res) => {
    try {
        const session = req.session;
        const students = await prisma.student.groupBy({
            by: ['standard'],
            where: { session: session, college: req.college },
            _count: {
                id: true
            }
        });
        
        const result = students.map(s => ({
            className: s.standard,
            studentCount: s._count.id
        }));
        
        // Sort
        result.sort((a,b) => parseInt(a.className) - parseInt(b.className));
        
        res.status(200).json(result);
    } catch(error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /api/dashboard/attendance?period=daily|weekly&standard=...&date=YYYY-MM-DD&subjectId=...
router.get("/dashboard/attendance", async (req, res) => {
    try {
        const session = req.session;
        const { period, standard, date, subjectId } = req.query;

        if (!period || (period !== 'daily' && period !== 'weekly')) {
            return res.status(400).json({ error: 'Invalid or missing period parameter' });
        }

        // Helper to apply standard and optional subject filter
        const whereBase = { session, college: req.college };
        if (standard) {
            whereBase.standard = standard;
        }
        if (subjectId) {
            // subjectId may come as string; convert to int
            const sid = parseInt(subjectId);
            if (!isNaN(sid)) {
                whereBase.subjectId = sid;
            }
        }

        if (period === 'daily') {
            // determine target date (use provided date or today)
            let target = date ? new Date(date) : new Date();
            // zero out time
            target.setHours(0,0,0,0);
            const start = new Date(target);
            const end = new Date(target);
            end.setDate(end.getDate() + 1);

            const records = await prisma.attendance.findMany({
                where: {
                    ...whereBase,
                    date: { gte: start, lt: end }
                },
                select: { status: true }
            });

            const total = records.length;
            let absent = 0;
            records.forEach(r => { if (r.status) absent += 1; });
            const present = total - absent;
            const percentage = total > 0 ? (present / total) * 100 : 0;

            return res.status(200).json({
                date: target.toISOString().split('T')[0],
                total,
                present,
                absent,
                percentage: percentage.toFixed(2)
            });
        }

        if (period === 'weekly') {
            // compute week boundaries based on provided date (or today)
            const baseDate = date ? new Date(date) : new Date();
            const day = baseDate.getDay(); // 0=Sunday,1=Monday
            let diffToMonday = 1 - day;
            if (day === 0) diffToMonday = -6; // sunday go back to previous monday
            const monday = new Date(baseDate);
            monday.setHours(0,0,0,0);
            monday.setDate(monday.getDate() + diffToMonday);
            const saturday = new Date(monday);
            saturday.setDate(monday.getDate() + 5);
            saturday.setHours(23,59,59,999);

            const records = await prisma.attendance.findMany({
                where: {
                    ...whereBase,
                    date: { gte: monday, lte: saturday }
                },
                select: { date: true, status: true }
            });

            // group by date string
            const grouped = {};
            records.forEach(r => {
                const d = new Date(r.date);
                d.setHours(0,0,0,0);
                const key = d.toISOString().split('T')[0];
                if (!grouped[key]) grouped[key] = { total: 0, absent: 0 };
                grouped[key].total += 1;
                if (r.status) grouped[key].absent += 1;
            });

            const result = [];
            for (let i = 0; i < 6; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                const key = d.toISOString().split('T')[0];
                const entry = grouped[key] || { total: 0, absent: 0 };
                const present = entry.total - entry.absent;
                const percentage = entry.total > 0 ? (present / entry.total) * 100 : 0;
                result.push({
                    date: key,
                    total: entry.total,
                    present,
                    absent: entry.absent,
                    percentage: percentage.toFixed(2),
                });
            }

            return res.status(200).json(result);
        }

    } catch (error) {
        console.error("Error fetching attendance summary:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /api/dashboard/detailed-stats
router.get("/dashboard/detailed-stats", async (req, res) => {
    try {
        const session = req.session;

        // Gender counts
        const genderStats = await prisma.student.groupBy({
            by: ['gender'],
            where: { session: session, college: req.college },
            _count: { id: true }
        });

        // Category (denomination) counts
        const categoryStats = await prisma.student.groupBy({
            by: ['denomination'],
            where: { session: session, college: req.college },
            _count: { id: true }
        });

        // Religion counts
        const religionStats = await prisma.student.groupBy({
            by: ['religion'],
            where: { session: session, college: req.college },
            _count: { id: true }
        });

        // Language counts
        const languageStats = await prisma.student.groupBy({
            by: ['language'],
            where: { session: session, college: req.college },
            _count: { id: true }
        });

        res.status(200).json({
            gender: genderStats.map(s => ({ type: s.gender, count: s._count.id })),
            categories: categoryStats.map(s => ({ type: s.denomination || "General", count: s._count.id })),
            religions: religionStats.map(s => ({ type: s.religion || "None", count: s._count.id })),
            languages: languageStats.map(s => ({ type: s.language || "None", count: s._count.id }))
        });
    } catch (error) {
        console.error("Error in dashboard detailed stats:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /api/dashboard/result-status?standard=...
router.get("/dashboard/result-status", async (req, res) => {
    try {
        const session = req.session;
        const { standard } = req.query;

        if (!standard) {
            return res.status(400).json({ error: "Standard parameter is required" });
        }

        // Get all students in this standard and session
        const students = await prisma.student.findMany({
            where: {
                standard: standard,
                session: session,
                college: req.college
            },
            select: {
                id: true,
                fullName: true
            }
        });

        if (students.length === 0) {
            return res.status(200).json({
                totalStudents: 0,
                passedStudents: 0,
                failedStudents: 0,
                passPercentage: 0,
                failPercentage: 0,
                message: "No students found for this standard"
            });
        }

        const studentIds = students.map(s => s.id);

        // Get all marks for "Final Semester" for these students
        const marks = await prisma.marks.findMany({
            where: {
                studentId: { in: studentIds },
                examinationType: "Final Semester",
                college: req.college
            }
        });

        if (marks.length === 0) {
            return res.status(200).json({
                totalStudents: students.length,
                passedStudents: 0,
                failedStudents: 0,
                passPercentage: 0,
                failPercentage: 0,
                message: "No final exam marks found for this standard"
            });
        }

        // Group marks by student and calculate pass/fail status
        // A student passes if their average percentage across all subjects is >= 50%
        const studentStats = {};
        marks.forEach(m => {
            if (!studentStats[m.studentId]) {
                studentStats[m.studentId] = { totalPercentage: 0, count: 0 };
            }
            studentStats[m.studentId].totalPercentage += m.percentage;
            studentStats[m.studentId].count += 1;
        });

        let passedCount = 0;
        let failedCount = 0;
        const evaluatedStudentIds = Object.keys(studentStats);

        evaluatedStudentIds.forEach(sid => {
            const avg = studentStats[sid].totalPercentage / studentStats[sid].count;
            if (avg >= 50) {
                passedCount++;
            } else {
                failedCount++;
            }
        });

        const totalEvaluated = evaluatedStudentIds.length;
        const passPercentage = totalEvaluated > 0 ? (passedCount / totalEvaluated) * 100 : 0;
        const failPercentage = totalEvaluated > 0 ? (failedCount / totalEvaluated) * 100 : 0;

        res.status(200).json({
            totalStudents: totalEvaluated,
            passedStudents: passedCount,
            failedStudents: failedCount,
            passPercentage: parseFloat(passPercentage.toFixed(2)),
            failPercentage: parseFloat(failPercentage.toFixed(2))
        });

    } catch (error) {
        console.error("Error in dashboard result-status:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
