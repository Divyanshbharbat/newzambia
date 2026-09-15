const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const ExcelJS = require("exceljs");
const path = require("path");

const prisma = new PrismaClient();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* Marks Model */

  router.get("/downloadMarks", async (req, res) => {
    try {
      const marksRecords = await prisma.marks.findMany({ 
        where: { college: req.college },
        include: {
          student: true,
          subject: {
            include: { std: true }
          }
        }
      });
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Marks");
  
      worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Student Name", key: "studentName", width: 30 },
        { header: "Roll No", key: "rollNo", width: 15 },
        { header: "Session", key: "session", width: 15 },
        { header: "Standard", key: "standard", width: 15 },
        { header: "Category", key: "category", width: 20 },
        { header: "Subject Name", key: "subjectName", width: 30 },
        { header: "Examination Type", key: "examinationType", width: 20 },
        { header: "Obtained Marks", key: "obtainedMarks", width: 15 },
        { header: "Total Marks", key: "totalMarks", width: 15 },
        { header: "Percentage", key: "percentage", width: 15 },
      ];
  
      marksRecords.forEach((record) => {
        worksheet.addRow({
          id                  : record.id,
          studentName         : record.student?.fullName || "N/A",
          rollNo              : record.student?.rollNo || "N/A",
          session             : record.student?.session || "N/A",
          standard            : record.subject?.std?.std || record.student?.standard || "N/A",
          category            : record.subject?.std?.category || "N/A",
          subjectName         : record.subjectName,
          examinationType     : record.examinationType,
          obtainedMarks       : record.obtainedMarks,
          totalMarks          : record.totalMarks,
          percentage          : record.percentage,
        });
      });
  
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=Marks.xlsx"
      );
      
      await workbook.xlsx.write(res);
      res.end();
    }catch (error) {
      console.error("Error generating attendance Excel file:", error);
      res.status(500).send("Failed to generate Excel file");
    }
  });

  router.post('/api/marks', async (req, res) => {
    const { studentId, subjectId, subjectName, examinationType, obtainedMarks, totalMarks, percentage } = req.body;
  
    try {
      // Input validation
      if (!studentId || !subjectId || !examinationType || obtainedMarks === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Validate obtained marks
      const marks = parseFloat(obtainedMarks);
      const total = parseFloat(totalMarks);
      
      if (isNaN(marks) || marks < 0) {
        return res.status(400).json({ error: "Obtained marks must be a non-negative number" });
      }
      
      if (isNaN(total) || total <= 0) {
        return res.status(400).json({ error: "Total marks must be a positive number" });
      }

      if (marks > total) {
        return res.status(400).json({ error: `Obtained marks (${marks}) cannot exceed total marks (${total})` });
      }

      // Calculate percentage
      const calculatedPercentage = ((marks / total) * 100).toFixed(2);

      // Check for duplicate entry
      const existingMark = await prisma.marks.findUnique({
        where: {
          studentId_subjectId_examinationType_college: {
            studentId: parseInt(studentId),
            subjectId: parseInt(subjectId),
            examinationType: examinationType,
            college: req.college
          }
        }
      });

      if (existingMark) {
        return res.status(409).json({ error: "Marks for this student and subject already exist for this examination type. Please update instead." });
      }

      // Save the marks data
      const result = await prisma.marks.create({
        data: {
          studentId: parseInt(studentId),
          subjectId: parseInt(subjectId),
          subjectName: subjectName || '',
          examinationType,
          obtainedMarks: marks,
          totalMarks: total,
          percentage: parseFloat(calculatedPercentage),
          college: req.college
        },
      });
  
      res.status(201).json({ message: "Marks saved successfully", result });
    } catch (error) {
      console.error("Error saving marks:", error);
      if (error.code === 'P2002') {
        return res.status(409).json({ error: "Marks for this student and subject already exist for this examination type" });
      }
      res.status(500).json({ error: "Failed to save marks." });
    }
  });

  router.get('/api/marks/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const { examinationType } = req.query;
    try {
      const where = { studentId: parseInt(studentId) };
      if (examinationType) {
        where.examinationType = examinationType;
      }
      
      const marks = await prisma.marks.findMany({
        where: { ...where, college: req.college }
      });
      res.json(marks);
    } catch (error) {
      console.error("Error fetching marks:", error);
      res.status(500).json({ error: 'Failed to fetch marks' });
    }
  });

  // Get subjects with total marks for a standard ID
  router.get('/api/subjects-by-stdid/:stdId', async (req, res) => {
    const { stdId } = req.params;
    try {
      const subjects = await prisma.subject.findMany({
        where: { stdId: parseInt(stdId), college: req.college },
        select: {
          id: true,
          name: true,
        }
      });
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects with marks:", error);
      res.status(500).json({ error: 'Failed to fetch subjects' });
    }
  });

  // Get subjects with total marks for a standard
  router.get('/api/subjects-with-marks/:standard', async (req, res) => {
    const { standard } = req.params;
    try {
      const subjects = await prisma.subject.findMany({
        where: { std: { std: standard, college: req.college }, college: req.college },
        select: {
          id: true,
          name: true,
        }
      });
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects with marks:", error);
      res.status(500).json({ error: 'Failed to fetch subjects' });
    }
  });

  // Get marks for a student in a standard
  router.get('/api/marks-by-standard/:studentId/:standard/:examinationType', async (req, res) => {
    const { studentId, standard, examinationType } = req.params;
    try {
      const marks = await prisma.marks.findMany({
        where: {
          studentId: parseInt(studentId),
          subject: {
            std: { std: standard, college: req.college }
          },
          examinationType: examinationType,
          college: req.college
        },
        include: {
          subject: true
        }
      });
      res.json(marks);
    } catch (error) {
      console.error("Error fetching marks:", error);
      res.status(500).json({ error: 'Failed to fetch marks' });
    }
  });

  // Bulk update marks for a student
  router.post('/api/marks/bulk/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const { marksData, examinationType } = req.body;

    try {
      if (!examinationType || !Array.isArray(marksData)) {
        return res.status(400).json({ error: "Invalid input data" });
      }

      const results = [];
      const errors = [];

      for (const mark of marksData) {
        try {
          const { subjectId, subjectName, obtainedMarks, totalMarks } = mark;

          if (!subjectId || obtainedMarks === undefined) {
            errors.push({ subjectId, error: "Missing required fields" });
            continue;
          }

          const obtainedVal = parseFloat(obtainedMarks);
          const totalVal = parseFloat(totalMarks);

          if (obtainedVal < 0 || obtainedVal > totalVal) {
            errors.push({ subjectId, error: `Invalid marks: ${obtainedVal} (max: ${totalVal})` });
            continue;
          }

          const calculatedPercentage = ((obtainedVal / totalVal) * 100).toFixed(2);

          // Check for duplicate
          const existing = await prisma.marks.findUnique({
            where: {
              studentId_subjectId_examinationType_college: {
                studentId: parseInt(studentId),
                subjectId: parseInt(subjectId),
                examinationType: examinationType,
                college: req.college
              }
            }
          });

          if (existing) {
            // Update existing
            const updated = await prisma.marks.update({
              where: { id: existing.id },
              data: {
                obtainedMarks: obtainedVal,
                totalMarks: totalVal,
                percentage: parseFloat(calculatedPercentage),
              }
            });
            results.push(updated);
          } else {
            // Create new
            const created = await prisma.marks.create({
              data: {
                studentId: parseInt(studentId),
                subjectId: parseInt(subjectId),
                subjectName: subjectName || '',
                examinationType,
                obtainedMarks: obtainedVal,
                totalMarks: totalVal,
                percentage: parseFloat(calculatedPercentage),
                college: req.college
              }
            });
            results.push(created);
          }
        } catch (err) {
          console.error("Error processing individual mark:", err);
          errors.push({ subjectId: mark.subjectId, error: err.message });
        }
      }

      res.status(201).json({ 
        message: "Marks processed",
        results,
        errors: errors.length > 0 ? errors : null
      });
    } catch (error) {
      console.error("Error in bulk marks operation:", error);
      res.status(500).json({ error: "Failed to process marks" });
    }
  });


  module.exports = router;