const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const ExcelJS = require("exceljs");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const { exec } = require("child_process");
const { findMatchingStandard } = require("../utils/standardMatcher");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/photos/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

router.get("/api/backup", async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: "DATABASE_URL not found in .env" });
    }

    const urlRegex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
    const match = dbUrl.match(urlRegex);

    if (!match) {
      return res.status(500).json({ error: "Invalid DATABASE_URL format" });
    }

    const [_, user, password, host, port, dbname] = match;
    const backupFile = path.join(__dirname, `../backup_${Date.now()}.sql`);

    const env = { ...process.env, PGPASSWORD: password };
    const command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${dbname} -f "${backupFile}"`;

    exec(command, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`pg_dump error: ${error.message}`);
        return res.status(500).json({ error: "Backup failed", details: error.message });
      }

      res.download(backupFile, "erp_backup.sql", (err) => {
        if (err) {
          console.error(`Download error: ${err.message}`);
        }
        if (fs.existsSync(backupFile)) {
          fs.unlinkSync(backupFile);
        }
      });
    });
  } catch (error) {
    console.error("Backup route error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const prisma = new PrismaClient();
//Get all student information in excel file 
router.get('/excelstudents', async (req, res) => {
  const session = req.session;
  try {
    const studentsInfo = await prisma.student.findMany({
      where: { session: session, college: req.college },
      include: {
        parents: true,
        fees: true,
        marks: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    // Define columns for the worksheet
    worksheet.columns = [

      // { header: 'StudentId', key: 'sid', width: 10 },
      { header: 'Full Name', key: 'fullName', width: 30 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'Roll No', key: 'rollNo', width: 10 },
      { header: 'Standard', key: 'standard', width: 10 },
      { header: 'Blood Group', key: 'bloodGroup', width: 15 },
      { header: 'Scholarship Applied', key: 'scholarshipApplied', width: 15 },
      { header: 'Residential Address', key: 'residentialAddress', width: 30 },
      { header: 'Correspondence Address', key: 'correspondenceAddress', width: 30 },
      { header: 'Nationality', key: 'nationality', width: 15 },
      { header: 'Religion', key: 'religion', width: 15 },
      { header: 'Denomination', key: 'denomination', width: 15 },
      { header: 'Language', key: 'language', width: 15 },
      { header: 'Mother Tongue', key: 'motherTongue', width: 15 },
      { header: 'Photo URL', key: 'photoUrl', width: 30 },
      { header: 'Father Name', key: 'fatherName', width: 20 },
      { header: 'Mother Name', key: 'motherName', width: 20 },
      { header: 'Father Contact', key: 'fatherContact', width: 15 },
      { header: 'Mother Contact', key: 'motherContact', width: 15 },
      { header: 'Distance from School (kms)', key: 'distanceFromSchool', width: 20 },
      { header: 'Preferred Phone Number for School', key: 'preferredPhoneNumber', width: 25 },
      { header: 'Parent Address', key: 'parentAddress', width: 30 },
      { header: 'Fee Title', key: 'feeTitle', width: 15 },
      { header: 'Fee Amount', key: 'feeAmount', width: 15 },
      { header: 'Amount Date', key: 'feeAmountDate', width: 15 },
      { header: 'Admission Date', key: 'admissionDate', width: 15 },
      { header: 'Remark', key: 'remark', width: 15 },
      { header: 'Session', key: 'session', width: 10 },
      { header: 'Nationality', key: 'nationality', width: 15 },
      { header: 'Religion', key: 'religion', width: 15 },
    ];

    // Add student data to worksheet
    studentsInfo.forEach((student) => {
      const feesPaid = student.fees.reduce((sum, fee) => sum + fee.amount, 0);
      worksheet.addRow({

        // sid: student.id,
        fullName: student.fullName,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth.toISOString().split('T')[0],
        rollNo: student.rollNo,
        standard: student.standard,
        bloodGroup: student.bloodGroup || '',
        scholarshipApplied: student.scholarshipApplied,
        residentialAddress: student.residentialAddress,
        correspondenceAddress: student.correspondenceAddress,
        nationality: student.nationality || '',
        religion: student.religion || '',
        denomination: student.denomination || '',
        language: student.language || '',
        motherTongue: student.motherTongue || '',
        photoUrl: student.photoUrl,
        fatherName: student.parents[0]?.fatherName || '',
        motherName: student.parents[0]?.motherName || '',
        fatherContact: student.parents[0]?.fatherContact?.toString() || '',
        motherContact: student.parents[0]?.motherContact?.toString() || '',
        distanceFromSchool: student.parents[0]?.distanceFromSchool || '',
        preferredPhoneNumber: student.parents[0]?.preferredPhoneNumber?.toString() || '',
        parentAddress: student.parents[0]?.address || '',
        feeTitle: student.fees[0]?.title || '',
        feeAmount: student.fees[0]?.amount,
        feeAmountDate: student.fees[0]?.amountDate,
        admissionDate: student.fees[0]?.admissionDate,
        remark: student.remark || '',
        session: student.session,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="students_data.xlsx"'
    );

    // Send Excel file as response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error fetching students data:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

//Upload Photo
router.post('/uploadPhoto', upload.single('file'), async (req, res) => {
  try {
    const fileUrl = 'http://localhost:5000/uploads/photos/' + req.file.filename;
    res.status(200).send(fileUrl);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Error uploading file');
  }
});

// Upload Student In Bulk with Excel
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const filePath = req.file.path;

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    const students = [];

    const getVal = (row, colIndex) => {
      const cell = row.getCell(colIndex);
      if (!cell || cell.value === null || cell.value === undefined) return null;
      let v = cell.value;
      if (typeof v === 'object') {
        if (v instanceof Date) return v;
        if (v.result !== undefined) v = v.result;
        else if (v.text !== undefined) v = v.text;
        else if (v.richText) v = v.richText.map(t => t.text).join('');
      }
      return v;
    };

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber !== 1) {
        const rawName = getVal(row, 1);
        if (!rawName) return; // skip rows without name
        const fullName = String(rawName).trim();
        if (!fullName) return;

        const genderRaw = getVal(row, 2);
        const genderStr = genderRaw ? String(genderRaw).trim().toLowerCase() : 'male';
        const gender = (genderStr === 'female' || genderStr === 'f') ? 'Female' : 'Male';

        const dobRaw = getVal(row, 3);
        let dateOfBirth = dobRaw ? new Date(dobRaw) : new Date();
        if (isNaN(dateOfBirth.getTime())) dateOfBirth = new Date();

        const rollNoRaw = getVal(row, 4);
        const rollNo = rollNoRaw ? parseInt(rollNoRaw) || 0 : 0;

        const standardRaw = getVal(row, 5);
        const standard = standardRaw ? String(standardRaw).trim() : '1st';

        const bloodGroupRaw = getVal(row, 6);
        const bloodGroup = bloodGroupRaw ? String(bloodGroupRaw).trim() : null;

        const scholarshipRaw = getVal(row, 7);
        const scholarshipApplied = scholarshipRaw ? (String(scholarshipRaw).toLowerCase() === "true" || String(scholarshipRaw).toLowerCase() === "yes") : false;

        const residentialAddress = getVal(row, 8) ? String(getVal(row, 8)).trim() : null;
        const correspondenceAddress = getVal(row, 9) ? String(getVal(row, 9)).trim() : null;
        const nationality = getVal(row, 10) ? String(getVal(row, 10)).trim() : null;
        const religion = getVal(row, 11) ? String(getVal(row, 11)).trim() : null;
        const denomination = getVal(row, 12) ? String(getVal(row, 12)).trim() : null;
        const language = getVal(row, 13) ? String(getVal(row, 13)).trim() : null;
        const motherTongue = getVal(row, 14) ? String(getVal(row, 14)).trim() : null;
        const photoUrl = getVal(row, 15) ? String(getVal(row, 15)).trim() : null;

        const fatherName = getVal(row, 16) ? String(getVal(row, 16)).trim() : null;
        const motherName = getVal(row, 17) ? String(getVal(row, 17)).trim() : null;
        const fatherContactRaw = getVal(row, 18);
        const motherContactRaw = getVal(row, 19);
        const distanceFromSchool = getVal(row, 20) ? parseFloat(getVal(row, 20)) : null;
        const preferredPhoneRaw = getVal(row, 21);
        const address = getVal(row, 22) ? String(getVal(row, 22)).trim() : null;

        const parents = (fatherName || motherName || fatherContactRaw || motherContactRaw) ? [{
          fatherName: fatherName || 'N/A',
          motherName: motherName || 'N/A',
          fatherContact: fatherContactRaw && !isNaN(parseInt(fatherContactRaw)) ? BigInt(parseInt(fatherContactRaw)) : BigInt(0),
          motherContact: motherContactRaw && !isNaN(parseInt(motherContactRaw)) ? BigInt(parseInt(motherContactRaw)) : BigInt(0),
          distanceFromSchool: isNaN(distanceFromSchool) ? null : distanceFromSchool,
          preferredPhoneNumber: preferredPhoneRaw && !isNaN(parseInt(preferredPhoneRaw)) ? BigInt(parseInt(preferredPhoneRaw)) : null,
          address: address || 'N/A',
        }] : [];

        const feeTitle = getVal(row, 23) ? String(getVal(row, 23)).trim() : null;
        const feeAmountRaw = getVal(row, 24);
        const feeAmount = feeAmountRaw ? parseFloat(feeAmountRaw) || 0 : 0;
        const feeAmountDateRaw = getVal(row, 25);
        let amountDate = feeAmountDateRaw ? new Date(feeAmountDateRaw) : new Date();
        if (isNaN(amountDate.getTime())) amountDate = new Date();

        const admissionDateRaw = getVal(row, 26);
        let admissionDate = admissionDateRaw ? new Date(admissionDateRaw) : new Date();
        if (isNaN(admissionDate.getTime())) admissionDate = new Date();

        const fees = feeTitle ? [{
          title: feeTitle,
          amount: feeAmount,
          amountDate,
          admissionDate
        }] : [];

        const remark = getVal(row, 27) ? String(getVal(row, 27)).trim() : null;
        const session = getVal(row, 28) ? String(getVal(row, 28)).trim() : (req.session || '2026-2027');

        students.push({
          fullName,
          gender,
          dateOfBirth,
          rollNo,
          standard,
          bloodGroup,
          scholarshipApplied,
          residentialAddress,
          correspondenceAddress,
          nationality,
          religion,
          denomination,
          language,
          motherTongue,
          photoUrl,
          parents,
          fees,
          remark,
          session
        });
      }
    });

    const results = {
      importedCount: 0,
      duplicateCount: 0,
      duplicates: []
    };

    if (students.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: "No student records found in the uploaded file." });
    }

    const targetCollege = req.college || 'svpcet';

    // Verify classes (Standards) exist in database for targetCollege
    const dbStandards = await prisma.standards.findMany({
      where: { college: targetCollege }
    });

    if (dbStandards.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        error: "No classes (standards) found in the database. Please add classes first before uploading students."
      });
    }

    const missingClasses = new Set();

    for (const student of students) {
      const matched = findMatchingStandard(student.standard, dbStandards);
      if (matched) {
        // Map to exact canonical standard string stored in DB
        student.standard = matched.std;
      } else {
        missingClasses.add(student.standard || "Unassigned");
      }
    }

    if (missingClasses.size > 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      const missingList = Array.from(missingClasses).map(c => `'${c}'`).join(', ');
      return res.status(400).json({
        error: `The following class(es) in the uploaded file do not exist in the database: ${missingList}. Please add these classes first before uploading students.`
      });
    }

    for (const student of students) {
      let rollNoToUse = student.rollNo;
      if (!rollNoToUse) {
        const maxStudent = await prisma.student.findFirst({
          where: { standard: student.standard, session: student.session, college: targetCollege },
          orderBy: { rollNo: 'desc' }
        });
        rollNoToUse = (maxStudent && maxStudent.rollNo) ? maxStudent.rollNo + 1 : 1;
      }

      const existingStudent = await prisma.student.findUnique({
        where: {
          standard_rollNo_session_college: {
            standard: student.standard,
            rollNo: rollNoToUse,
            session: student.session,
            college: targetCollege
          }
        }
      });

      if (existingStudent) {
        results.duplicateCount++;
        results.duplicates.push(`${student.fullName} (Roll: ${rollNoToUse}, Std: ${student.standard})`);
        continue;
      }

      await prisma.student.create({
        data: {
          fullName: student.fullName,
          gender: student.gender,
          dateOfBirth: student.dateOfBirth,
          rollNo: rollNoToUse,
          standard: student.standard,
          bloodGroup: student.bloodGroup,
          scholarshipApplied: student.scholarshipApplied,
          residentialAddress: student.residentialAddress,
          correspondenceAddress: student.correspondenceAddress,
          photoUrl: student.photoUrl,
          remark: student.remark,
          session: student.session,
          nationality: student.nationality,
          religion: student.religion,
          denomination: student.denomination,
          language: student.language,
          motherTongue: student.motherTongue,
          parents: {
            create: student.parents,
          },
          fees: {
            create: student.fees.map(f => ({ ...f, college: targetCollege })),
          },
          college: targetCollege
        },
      });
      results.importedCount++;
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(200).json({
      message: "Data import completed",
      ...results
    });
  } catch (error) {
    console.error("Error importing data:", error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({ error: "Failed to import data", details: error.message });
  }
});


router.get('/reportsdata', async (req, res) => {
  const session = req.session;
  try {
    // Fetch all required student data (including fees) in one query
    const studentData = await prisma.student.findMany({
      where: {
        session: session,
        college: req.college
      },
      include: {
        fees: true,  // Include the related fees data
      },
    });

    // Count of students
    const len = studentData.length;

    // Calculate the total fee amount
    let sumFee = 0;
    studentData.forEach(student => {
      student.fees.forEach(fee => {
        sumFee += fee.amount;
      });
    });

    // Get hostel count and bed-related data
    const hostelData = await prisma.hostel.count({ where: { college: req.college } });
    let totalBed = await prisma.control.findFirst({ where: { college: req.college } });
    totalBed = totalBed?.number_of_hostel_bed ?? 0;
    const sumBed = totalBed - hostelData;

    // Send the result
    res.send({ len, sumFee, sumBed });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});


router.post("/changesFromControlPanel", async (req, res) => {
  const { number_of_hostel_bed, institutioName, hostelName, schoolAddress, totalFee, schoolLogo, year, lunchFee, college } = req.body;
  const activeCollege = req.college || college || null;

  if (!year) {
    return res.status(400).json({ error: 'Session year is required' });
  }

  try {
    // Find the session by year and college
    const sessionRecord = await prisma.session.findUnique({
      where: { year_college: { year, college: activeCollege } }
    });

    if (!sessionRecord) {
      return res.status(404).json({ error: 'Session not found. Please add the session first.' });
    }

    const payload = {
      sessionId: sessionRecord.id,
      college: activeCollege,
      number_of_hostel_bed: number_of_hostel_bed ? parseInt(number_of_hostel_bed) : undefined,
      Institution_name: institutioName,
      Institution_hostel_name: hostelName,
      SchoolAddress: schoolAddress,
      TotalFees: totalFee ? parseInt(totalFee) : undefined,
      SchoolLogo: schoolLogo,
      lunchFee: lunchFee ? parseFloat(lunchFee) : undefined,
    };

    // 1. Try to find session-specific record
    let existingRecord = await prisma.control.findUnique({
      where: { sessionId_college: { sessionId: sessionRecord.id, college: activeCollege } }
    });

    if (existingRecord) {
      // Update session-specific record
      const updated = await prisma.control.update({
        where: { id: existingRecord.id },
        data: payload
      });
      return res.status(200).json(updated);
    }

    // 2. If not found, check for legacy record (null sessionId) for THIS college
    const legacyRecord = await prisma.control.findFirst({
      where: { sessionId: null, college: activeCollege }
    });

    if (legacyRecord) {
      // Transition legacy record to session-specific
      const updated = await prisma.control.update({
        where: { id: legacyRecord.id },
        data: payload
      });
      return res.status(200).json(updated);
    }

    // 3. If no legacy record, create a new one
    const newRecord = await prisma.control.create({ data: payload });
    return res.status(201).json(newRecord);

  } catch (error) {
    console.error('Error in changesFromControlPanel:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get("/getChanges", async (req, res) => {
  try {
    const { year } = req.query;
    const activeCollege = req.college || req.query.college || null;

    if (!year) {
      // If no year is provided, return the first control record for this college
      const controlData = await prisma.control.findFirst({
        where: { college: activeCollege },
        orderBy: { sessionId: 'desc' } // prefer session-specific over legacy
      });
      if (controlData) return res.status(200).json(controlData);
      return res.status(404).json({ message: "Data not found" });
    }

    // Find the session by year and college
    const sessionRecord = await prisma.session.findUnique({
      where: { year_college: { year, college: activeCollege } }
    });

    if (!sessionRecord) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get control record for this session and college
    let controlData = await prisma.control.findUnique({
      where: {
        sessionId_college: {
          sessionId: sessionRecord.id,
          college: activeCollege
        }
      }
    });

    if (controlData) {
      return res.status(200).json(controlData);
    }

    // if no session-specific record, look for a legacy record for this college
    controlData = await prisma.control.findFirst({
      where: { sessionId: null, college: activeCollege }
    });
    if (controlData) {
      return res.status(200).json(controlData);
    }

    // If still no config, return blank defaults tied to this session/college
    return res.status(200).json({
      id: null,
      sessionId: sessionRecord.id,
      college: activeCollege,
      number_of_hostel_bed: null,
      Institution_name: "School",
      Institution_hostel_name: "Hostel",
      SchoolLogo: null,
      SchoolAddress: null,
      TotalFees: null,
      lunchFee: null,
    });
  } catch (error) {
    console.error('Error in getChanges:', error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});


router.post("/uploadAttendance", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const filePath = req.file.path;
  const targetCollege = req.college || 'svpcet';

  try {
    const dbStandards = await prisma.standards.findMany({ where: { college: targetCollege } });
    if (dbStandards.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: "No classes found in the database. Please add classes first before uploading attendance." });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    const Attendance = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber !== 1) {
        let dateValue = row.getCell(4).value;
        if (typeof dateValue === 'number') {
          dateValue = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
        } else {
          dateValue = new Date(dateValue);
          dateValue = new Date(Date.UTC(
            dateValue.getFullYear(),
            dateValue.getMonth(),
            dateValue.getDate()
          ));
        }

        const attendance = {
          studentName: row.getCell(1).value,
          standard: row.getCell(2).value,
          subjectName: row.getCell(3).value,
          date: dateValue,
          status: row.getCell(5).value,
          rollNo: row.getCell(6).value,
          session: row.getCell(7).value,
          studentId: row.getCell(8).value,
        };
        Attendance.push(attendance);
      }
    });

    for (const at of Attendance) {
      await prisma.attendance.create({
        data: {
          studentName: at.studentName,
          date: at.date,
          status: at.status == "Absent" ? false : true,
          subjectName: at.subjectName,
          rollNo: at.rollNo,
          standard: at.standard,
          subjectId: at.subjectId ? parseInt(at.subjectId) : null,
          session: at.session,
          studentId: at.studentId,
          college: targetCollege
        },
      });
    }

    fs.unlinkSync(filePath);
    res.status(200).send("File uploaded and data imported successfully");
  } catch (error) {
    console.error("Error importing data:", error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: "Failed to import attendance data", details: error.message });
  }
});

router.post("/uploadFee", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const filePath = req.file.path;
  const targetCollege = req.college || 'svpcet';

  try {
    const studentsCount = await prisma.student.count({ where: { college: targetCollege } });
    if (studentsCount === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: "No students found in the database. Please add students first before uploading fees." });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    const fees = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber !== 1) {
        const fee = {
          id: row.getCell(1).value,
          title: row.getCell(2).value,
          amount: row.getCell(3).value,
          amountDate: row.getCell(4).value,
          admissionDate: row.getCell(5).value,
          studentId: row.getCell(6).value,
        };
        fees.push(fee);
      }
    });

    for (const at of fees) {
      await prisma.fee.create({
        data: {
          title: at.title,
          amount: at.amount,
          amountDate: at.amountDate,
          admissionDate: at.admissionDate,
          studentId: at.studentId,
          college: targetCollege
        },
      });
    }

    fs.unlinkSync(filePath);
    res.status(200).send("File uploaded and data imported successfully");
  } catch (error) {
    console.error("Error importing data:", error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: "Failed to import fee data", details: error.message });
  }
});

router.post("/uploadHostel", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const filePath = req.file.path;
  const targetCollege = req.college || 'svpcet';

  try {
    const dbStandards = await prisma.standards.findMany({ where: { college: targetCollege } });
    if (dbStandards.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: "No classes found in the database. Please add classes first before uploading hostel data." });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    const Hostel = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber !== 1) {
        const hostel = {
          id: row.getCell(1).value,
          name: row.getCell(2).value,
          rollNo: row.getCell(3).value,
          standard: row.getCell(4).value,
          gender: row.getCell(5).value,
          bed_number: row.getCell(6).value,
        };
        Hostel.push(hostel);
      }
    });

    for (const at of Hostel) {
      await prisma.hostel.create({
        data: {
          name: at.name,
          rollNo: at.rollNo,
          standard: at.standard,
          gender: at.gender,
          bed_number: at.bed_number,
          college: targetCollege
        },
      });
    }

    fs.unlinkSync(filePath);
    res.status(200).send("File uploaded and data imported successfully");
  } catch (error) {
    console.error("Error importing data:", error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: "Failed to import hostel data", details: error.message });
  }
});

router.post("/uploadMarks", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const filePath = req.file.path;
  const targetCollege = req.college || 'svpcet';

  try {
    const dbStandards = await prisma.standards.findMany({ where: { college: targetCollege } });
    if (dbStandards.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: "No classes found in the database. Please add classes first before uploading marks." });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    const Marks = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber !== 1) {
        const mark = {
          id: row.getCell(1).value,
          studentId: row.getCell(2).value,
          subjectId: row.getCell(3).value,
          subjectName: row.getCell(4).value,
          examinationType: row.getCell(5).value,
          obtainedMarks: row.getCell(6).value,
          totalMarks: row.getCell(7).value,
          percentage: row.getCell(8).value,
        };
        Marks.push(mark);
      }
    });

    for (const at of Marks) {
      await prisma.marks.create({
        data: {
          studentId: at.studentId,
          subjectId: at.subjectId,
          subjectName: at.subjectName,
          examinationType: at.examinationType,
          obtainedMarks: at.obtainedMarks,
          totalMarks: at.totalMarks,
          percentage: at.percentage,
          college: targetCollege
        },
      });
    }

    fs.unlinkSync(filePath);
    res.status(200).send("File uploaded and data imported successfully");
  } catch (error) {
    console.error("Error importing data:", error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: "Failed to import marks data", details: error.message });
  }
});



router.get('/scholarshipStudents', async (req, res) => {
  const session = req.session;
  try {
    const studentsInfo = await prisma.student.findMany({
      where: {
        session: session,
        scholarshipApplied: true,
        college: req.college
      },
      include: {
        parents: true,
        fees: true,
        marks: true,
      },
    });

    console.log()

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Scholarship');

    // Define columns for the worksheet
    worksheet.columns = [

      // { header: 'StudentId', key: 'sid', width: 10 },
      { header: 'Full Name', key: 'fullName', width: 30 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'Roll No', key: 'rollNo', width: 10 },
      { header: 'Standard', key: 'standard', width: 10 },
      { header: 'Scholarship Applied', key: 'scholarshipApplied', width: 15 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Photo URL', key: 'photoUrl', width: 30 },
      { header: 'Father Name', key: 'fatherName', width: 20 },
      { header: 'Father Occupation', key: 'fatherOccupation', width: 20 },
      { header: 'Mother Name', key: 'motherName', width: 20 },
      { header: 'Mother Occupation', key: 'motherOccupation', width: 20 },
      { header: 'Father Contact', key: 'fatherContact', width: 15 },
      { header: 'Mother Contact', key: 'motherContact', width: 15 },
      { header: 'Fee Title', key: 'feeTitle', width: 15 },
      { header: 'Fee Amount', key: 'feeAmount', width: 15 },
      { header: 'Amount Date', key: 'feeAmountDate', width: 15 },
      { header: 'Admission Date', key: 'admissionDate', width: 15 },
      { header: 'Remark', key: 'remark', width: 15 },
      { header: 'Session', key: 'session', width: 10 },
    ];

    // Add student data to worksheet
    studentsInfo.forEach((student) => {

      worksheet.addRow({

        // sid: student.id,
        fullName: student.fullName || 'N/A',  // Handle missing names
        gender: student.gender || 'N/A',
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split('T')[0] : 'N/A',
        rollNo: student.rollNo || 'N/A',
        standard: student.standard || 'N/A',
        scholarshipApplied: student.scholarshipApplied ? 'Yes' : 'No',
        address: student.address || 'N/A',
        photoUrl: student.photoUrl || '',
        fatherName: student.parents[0]?.fatherName || 'N/A',
        fatherOccupation: student.parents[0]?.fatherOccupation || 'N/A',
        motherName: student.parents[0]?.motherName || 'N/A',
        motherOccupation: student.parents[0]?.motherOccupation || 'N/A',
        fatherContact: student.parents[0]?.fatherContact?.toString() || '',
        motherContact: student.parents[0]?.motherContact?.toString() || '',
        feeTitle: student.fees[0]?.title || 'N/A',
        feeAmount: student.fees[0]?.amount || 0,
        feeAmountDate: student.fees[0]?.amountDate ? student.fees[0].amountDate.toISOString().split('T')[0] : 'N/A',
        admissionDate: student.fees[0]?.admissionDate ? student.fees[0].admissionDate.toISOString().split('T')[0] : 'N/A',
        remark: student.remark || '',
        session: student.session || 'N/A',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Scholarship.xlsx"'
    );

    // Send Excel file as response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error fetching students data:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

router.post("/credentials", async (req, res) => {
  const { username, password, role, college } = req.body;
  const token = crypto.randomBytes(16).toString("hex");

  try {
    const dbUser = await prisma.user.findUnique({ 
      where: { 
        username_college: { username, college: college || null } 
      } 
    });
    if (dbUser && dbUser.password === password) {
      if (dbUser.role !== role) {
        return res.status(401).json({ message: "Invalid role selected." });
      }
      if (dbUser.college && dbUser.college !== college) {
        return res.status(401).json({ message: "Invalid college selected." });
      }
      tokenRoleMap[token] = { role: dbUser.role, college: dbUser.college, username: dbUser.username };
      return res.status(200).json({ 
        token, 
        role: dbUser.role, 
        college: dbUser.college, 
        username: dbUser.username 
      });
    }
  } catch (error) {
    console.error("Error checking DB users:", error);
  }

  const hashedUsername = crypto.createHash("sha256").update(username).digest("hex");
  const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
  const adminStoredUsername = process.env.ADMIN_HASH ?? "";
  const userStoredUsername = process.env.USER_HASH ?? "";

  if (hashedUsername == adminStoredUsername) {
    const adminStoredPassword = process.env.ADMINPASSWORD_HASH;
    if (hashedPassword == adminStoredPassword) {
      tokenRoleMap[token] = { role: "admin", college: "admin", username: "admin" };
      return res.status(200).json({ token, role: "admin", college: "admin", username: "admin" });
    }
  } else if (hashedUsername == userStoredUsername) {
    const userStoredPassword = process.env.USERPASSWORD_HASH;
    if (hashedPassword == userStoredPassword) {
      tokenRoleMap[token] = { role: "teacher", college: "st vincent", username: "teacher" };
      return res.status(200).json({ token, role: "teacher", college: "st vincent", username: "teacher" });
    }
  }
  return res.status(401).json({ message: "Invalid credentials" });
});

const tokenRoleMap = {};
router.post("/validate-token", (req, res) => {
  const { token } = req.body;
  const userData = tokenRoleMap[token]; // Retrieve user data for the token
  if (userData) {
    return res.status(200).json({ 
      token, 
      role: userData.role, 
      college: userData.college, 
      username: userData.username 
    });
  }
  return res.status(401).json({ message: "Invalid or expired token" });
});

router.get("/standards", async (req, res) => {
  const standard = await prisma.standards.findMany({
    where: { college: req.college }
  });
  if (!standard) {
    return res.status(500).json({ error: "Error fetching standard" })
  }
  return res.status(200).json({ standard });
})

router.get("/standard/:std", async (req, res) => {
  try {
    const { std } = req.params;
    const standard = await prisma.standards.findUnique({
      where: { std_college: { std: std, college: req.college } },
    });
    if (!standard) {
      return res.status(404).json({ error: "Standard not found" });
    }
    return res.status(200).json(standard);
  } catch (error) {
    console.error("Error fetching standard:", error);
    res.status(500).json({ error: "Error fetching standard" });
  }
});


router.post('/uploadSchoolLogo', upload.single('file'), async (req, res) => {
  try {
    const fileUrl = 'http://localhost:5000/uploads/photos/' + req.file.filename;
    res.status(200).send(fileUrl);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Error uploading file');
  }
});

// Dashboard: Get all students data
router.get("/dashboard/students", async (req, res) => {
  const session = req.session;
  if (!session) {
    return res.status(400).json({ error: "Session not set" });
  }
  try {
    const students = await prisma.student.findMany({
      where: { session, college: req.college },
      select: {
        id: true,
        fullName: true,
        rollNo: true,
        standard: true,
        gender: true,
      },
    });
    res.status(200).json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// Dashboard: Get all fees data
router.get("/dashboard/fees", async (req, res) => {
  const session = req.session;
  if (!session) {
    return res.status(400).json({ error: "Session not set" });
  }
  try {
    // Optional filters
    const { class: filterClass, category: filterCategory } = req.query;

    // Fetch students in session (apply class/category filters)
    let students = await prisma.student.findMany({
      where: { session, college: req.college },
      include: { fees: true },
    });

    if (filterClass) {
      students = students.filter(s => s.standard === filterClass);
    }

    if (filterCategory) {
      // fetch standards to map categories
      const standards = await prisma.standards.findMany({ 
        where: { college: req.college },
        select: { std: true, category: true, totalFees: true } 
      });
      const stdMap = Object.fromEntries(standards.map(s => [s.std, s]));
      students = students.filter(s => stdMap[s.standard]?.category === filterCategory);
    }

    // Fetch standards fees map
    const standardFees = await prisma.standards.findMany({ 
      where: { college: req.college },
      select: { std: true, totalFees: true } 
    });
    const stdFeeMap = Object.fromEntries(standardFees.map(s => [s.std, s.totalFees || 0]));

    // Aggregate per-student totals
    const aggregated = students.map(student => {
      const totalPaid = (student.fees || []).reduce((sum, f) => sum + (f.amount || 0), 0);
      const totalFee = stdFeeMap[student.standard] || 0;
      const remaining = totalFee - totalPaid;
      return {
        studentId: student.id,
        studentName: student.fullName,
        rollNo: student.rollNo,
        standard: student.standard,
        totalFee,
        totalPaid,
        remainingFee: remaining,
      };
    }).sort((a, b) => {
      const sa = parseInt(a.standard) || 0;
      const sb = parseInt(b.standard) || 0;
      return sa - sb;
    });

    res.status(200).json(aggregated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch fees" });
  }
});

// Dashboard: Get all transport (bus) data
router.get("/dashboard/transport", async (req, res) => {
  const session = req.session;
  if (!session) {
    return res.status(400).json({ error: "Session not set" });
  }
  try {
    const transport = await prisma.student.findMany({
      where: { session, busAccepted: true, college: req.college },
      select: {
        id: true,
        fullName: true,
        rollNo: true,
        standard: true,
        busStationId: true,
        busPrice: true,
        busStation: { select: { stationName: true } },
      },
    });
    res.status(200).json(transport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch transport data" });
  }
});

// Dashboard: Get all lunch data
router.get("/dashboard/lunch", async (req, res) => {
  const session = req.session;
  if (!session) {
    return res.status(400).json({ error: "Session not set" });
  }
  try {
    const lunch = await prisma.student.findMany({
      where: { session, lunchAccepted: true, college: req.college },
      select: {
        id: true,
        fullName: true,
        rollNo: true,
        standard: true,
        lunchPrice: true,
      },
    });
    res.status(200).json(lunch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch lunch data" });
  }
});

// Dashboard: Get all teachers data (empty for now)
router.get("/dashboard/teachers", async (req, res) => {
  try {
    res.status(200).json([]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});

// Dashboard: Get all sections data (fetching from standards as sections)
router.get("/dashboard/sections", async (req, res) => {
  try {
    const sections = await prisma.standards.findMany({
      where: { college: req.college },
      select: { id: true, std: true, category: true, totalFees: true },
    });
    res.status(200).json(sections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch sections" });
  }
});

// Dashboard: Get fees pending students
router.get("/dashboard/fees-pending", async (req, res) => {
  const session = req.session;
  const { class: filterClass, category: filterCategory } = req.query;

  if (!session) {
    return res.status(400).json({ error: "Session not set" });
  }

  try {
    let students = await prisma.student.findMany({
      where: { session, college: req.college },
      include: {
        fees: true,
      },
    });

    // Get all standards with their categories
    const standards = await prisma.standards.findMany({
      where: { college: req.college },
      select: { std: true, category: true, totalFees: true },
    });
    const stdMap = Object.fromEntries(standards.map(s => [s.std, s]));

    // Filter by category if provided
    if (filterCategory) {
      students = students.filter(s => stdMap[s.standard]?.category === filterCategory);
    }

    // Filter by class if provided
    if (filterClass) {
      students = students.filter(s => s.standard === filterClass);
    }

    const studentFeesPending = students.map(student => {
      const stdData = stdMap[student.standard] || { totalFees: 0, category: '' };
      const totalFee = stdData.totalFees || 0;
      const paidFee = student.fees.reduce((sum, fee) => sum + fee.amount, 0);
      const remainingFee = totalFee - paidFee;

      return {
        id: student.id,
        studentName: student.fullName,
        rollNo: student.rollNo,
        standard: student.standard,
        category: stdData.category,
        totalFee,
        paidFee,
        remainingFee,
      };
    }).sort((a, b) => {
      // Sort by standard number (ascending)
      const stdA = parseInt(a.standard) || 0;
      const stdB = parseInt(b.standard) || 0;
      return stdA - stdB;
    });

    res.status(200).json(studentFeesPending);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch fees-pending data" });
  }
});

// Dashboard: Get backup data for all relations
router.get("/dashboard/backup", async (req, res) => {
  const session = req.session;

  if (!session) {
    return res.status(400).json({ error: "Session not set" });
  }

  try {
    // Fetch all data
    const studentsData = await prisma.student.findMany({
      where: { session, college: req.college },
      include: {
        busStation: { select: { stationName: true } },
        fees: true,
        parents: true,
      },
      orderBy: { standard: 'asc' }
    });

    const feesData = await prisma.fee.findMany({
      where: {
        student: { session, college: req.college },
        college: req.college
      },
      include: {
        student: {
          select: { fullName: true, standard: true, rollNo: true }
        },
      },
    });

    const transportData = await prisma.student.findMany({
      where: { session, busAccepted: true },
      select: {
        fullName: true,
        rollNo: true,
        standard: true,
        busStationId: true,
        busStation: { select: { stationName: true } },
        busPrice: true,
      },
    });

    const lunchData = await prisma.student.findMany({
      where: { session, lunchAccepted: true },
      select: {
        fullName: true,
        rollNo: true,
        standard: true,
        lunchPrice: true,
      },
    });

    const sectionsData = await prisma.standards.findMany({
      where: { college: req.college },
      select: { std: true, category: true, totalFees: true },
    });

    // Get fees pending data
    const studentFeesPending = studentsData.map(student => {
      const stdData = sectionsData.find(s => s.std === student.standard);
      const totalFee = stdData?.totalFees || 0;
      const paidFee = student.fees.reduce((sum, fee) => sum + fee.amount, 0);
      const remainingFee = totalFee - paidFee;

      return {
        studentName: student.fullName,
        rollNo: student.rollNo,
        standard: student.standard,
        category: stdData?.category,
        totalFee,
        paidFee,
        remainingFee,
      };
    }).sort((a, b) => {
      const stdA = parseInt(a.standard) || 0;
      const stdB = parseInt(b.standard) || 0;
      return stdA - stdB;
    });

    // Format fees with student info
    const formattedFees = feesData.map(fee => ({
      studentName: fee.student.fullName,
      rollNo: fee.student.rollNo,
      standard: fee.student.standard,
      amount: fee.amount,
      amountDate: fee.amountDate,
      remark: fee.remark,
    }));

    // Prepare backup data
    const backupData = {
      session,
      exportDate: new Date().toISOString(),
      students: {
        count: studentsData.length,
        data: studentsData.map(s => ({
          fullName: s.fullName,
          rollNo: s.rollNo,
          standard: s.standard,
          gender: s.gender,
          dateOfBirth: s.dateOfBirth,
          busStation: s.busStation?.stationName || 'N/A',
          busPrice: s.busPrice,
          lunchPrice: s.lunchPrice,
          lunchAccepted: s.lunchAccepted,
          busAccepted: s.busAccepted,
        }))
      },
      fees: {
        count: feesData.length,
        data: formattedFees
      },
      transport: {
        count: transportData.length,
        data: transportData.map(t => ({
          fullName: t.fullName,
          rollNo: t.rollNo,
          standard: t.standard,
          busStation: t.busStation?.stationName,
          busPrice: t.busPrice,
        }))
      },
      lunch: {
        count: lunchData.length,
        data: lunchData
      },
      sections: {
        count: sectionsData.length,
        data: sectionsData
      },
      feesPending: {
        count: studentFeesPending.length,
        data: studentFeesPending
      },
    };

    res.status(200).json(backupData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch backup data" });
  }
});

module.exports = router;