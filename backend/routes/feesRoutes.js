/* Fees Model */
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const ExcelJS = require("exceljs");

const path = require("path");
const prisma = new PrismaClient();

const formatMoney = (val) => (typeof val === 'number' ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val);


router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Autocomplete suggestions endpoint for student name search
router.get("/fees/suggestions", async (req, res) => {
  const { query, standard } = req.query;
  if (!query || !query.trim()) {
    return res.json([]);
  }
  try {
    const whereClause = {
      college: req.college,
      fullName: { contains: query.trim(), mode: 'insensitive' }
    };
    if (standard && standard.trim()) {
      whereClause.standard = standard.trim();
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        rollNo: true,
        standard: true,
        session: true
      },
      take: 15,
      orderBy: [{ fullName: 'asc' }, { id: 'desc' }]
    });

    res.json(students);
  } catch (error) {
    console.error("Error fetching fee suggestions:", error);
    res.status(500).json([]);
  }
});


// Get Fees Details with Lunch and Inventory Info
router.get("/fees/details", async (req, res) => {
    const { standard, roll_no, name } = req.query;
    const session = req.session;
    if (!standard && !roll_no && !name) {
      return res.status(400).json({ error: "Please provide standard, roll number, or student name." });
    }
  
    try {
      const whereClause = {
        session: session,
        college: req.college
      };
      if (standard && standard.trim()) {
        whereClause.standard = standard.trim();
      }
      if (roll_no && !isNaN(parseInt(roll_no))) {
        whereClause.rollNo = parseInt(roll_no);
      }
      if (name && name.trim()) {
        if (/^\d+$/.test(name.trim())) {
          whereClause.OR = [
            { rollNo: parseInt(name.trim()) },
            { fullName: { contains: name.trim(), mode: 'insensitive' } }
          ];
        } else {
          whereClause.fullName = {
            contains: name.trim(),
            mode: 'insensitive'
          };
        }
      }

      let result = await prisma.student.findFirst({
        where: whereClause,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          fullName: true,
          rollNo: true,
          standard: true,
          session: true,
          scholarshipApplied: true,
          remark: true,
          lunchAccepted: true,
          lunchPrice: true,
          busAccepted: true,
          busStationId: true,
          busPrice: true,
          busStation: {
            select: {
              id: true,
              stationName: true,
              price: true,
            }
          },
          fees: {
            where :{

            },
            select: {
              title: true,
              amount: true,
              amountDate: true,
              admissionDate: true,
            },
          },
          studentInventory: {
            select: {
              inventory: {
                select: {
                  itemName: true,
                  gender: true,
                  price: true,
                },
              },
              quantityPurchased: true,
              totalPrice: true,
            },
          },
        },
      });

      if (!result) {
        return res.status(404).json({ error: "Student not found in this academic session" });
      }

      let standardTotalFees = 0;
      if (result.standard) {
        try {
          const standardData = await prisma.standards.findFirst({
            where: { std: result.standard, college: req.college },
            select: { totalFees: true }
          });
          standardTotalFees = standardData?.totalFees || 0;
        } catch (e) {
          standardTotalFees = 0;
        }
      }

      // Format fee amounts and inventory prices for frontend display (readable strings)
      const formatted = {
        ...result,
        standardTotalFees,
        lunchPriceFormatted: formatMoney(result.lunchPrice ?? 700),
        busPriceFormatted: formatMoney(result.busPrice),
        fees: result.fees.map(f => ({
          ...f,
          amountFormatted: formatMoney(f.amount),
          amountDate: f.amountDate,
          admissionDate: f.admissionDate,
        })),
        studentInventory: result.studentInventory.map(si => ({
          ...si,
          totalPriceFormatted: formatMoney(si.totalPrice),
          inventory: {
            ...si.inventory,
            priceFormatted: formatMoney(si.inventory.price),
          }
        }))
      };

      res.status(200).json(formatted);
    } catch (error) {
      console.error("Error fetching fees details:", error);
      res.status(500).json({ error: "An error occurred" });
    }
  });
  
  // Get student fees details including lunch, bus, and inventory
  router.get("/feetable", async(req,res)=>{
    const { standard, id } = req.query;
    try{
      // allow lookup by `id` or by `standard` within current session
      const whereClause = id ? { id: parseInt(id) } : (standard ? { standard: standard.toString(), ...(req.session ? { session: req.session } : {}) } : {});

      const student = await prisma.student.findFirst({
        where: { ...whereClause, college: req.college },
        select: {
          id: true,
          fullName: true,
          rollNo: true,
          standard: true,
          scholarshipApplied: true,
          remark: true,
          lunchAccepted: true,
          lunchPrice: true,
          busAccepted: true,
          busStationId: true,
          busPrice: true,
          fees: {
            // no `title` filter — frontend provides `standard` or `id` to select student
            where: {},
            select: {
              title: true,
              amount: true,
              amountDate: true,
              admissionDate: true,
            },
          },
          studentInventory: {
            select: {
              inventory: {
                select: {
                  itemName: true,
                  gender: true,
                  price: true,
                },
              },
              quantityPurchased: true,
              totalPrice: true,
            },
          },
        },
      });
      
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Fetch the standard to get totalFees. If the DB doesn't have the column (migration not applied),
      // catch the Prisma P2022 error and default to 0 so the endpoint remains functional.
      let standardTotalFees = 0;
      if (student.standard) {
        try {
          const standardData = await prisma.standards.findFirst({
            where: { std: student.standard, college: req.college },
            select: { totalFees: true }
          });
          standardTotalFees = standardData?.totalFees || 0;
        } catch (err) {
          // P2022: column does not exist on the DB side — default to 0 and log a warning
          if (err && err.code === 'P2022') {
            console.warn('Standards.totalFees column missing in DB; defaulting standardTotalFees to 0. Run Prisma migrations to add this column.');
            standardTotalFees = 0;
          } else {
            // rethrow unexpected errors
            throw err;
          }
        }
      }

      // Format amounts for display; default lunch price to 700 when missing
      const formattedStudent = {
        ...student,
        standardTotalFees: standardTotalFees,
        lunchPriceFormatted: formatMoney(student.lunchPrice ?? 700),
        busPriceFormatted: formatMoney(student.busPrice),
        fees: student.fees.map(f => ({ ...f, amountFormatted: formatMoney(f.amount) })),
        studentInventory: student.studentInventory.map(si => ({
          ...si,
          totalPriceFormatted: formatMoney(si.totalPrice),
          inventory: { ...si.inventory, priceFormatted: formatMoney(si.inventory.price) }
        }))
      };

      // Return array with single element for compatibility with existing frontend
      res.status(200).json([formattedStudent]);
    }catch(error){
      console.log(error);
      res.status(500).json({ error: "Failed to fetch fee details" });
    }
  })
  
  //Add Fees Details
  router.post("/fees/add", async (req, res) => {
    const { title, amount, amountDate, admissionDate, studentId } = req.body;
  
    if (!title || !amount || !amountDate || !studentId) {
      return res.status(400).json({ error: "Invalid data: Title, amount, amountDate, and studentId are required." });
    }
  
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Installment amount must be greater than 0." });
    }

    try {
      // Fetch student to calculate combined total fees and remaining balance
      const student = await prisma.student.findUnique({
        where: { id: parseInt(studentId) },
        include: {
          fees: true,
          studentInventory: true
        }
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Standard base tuition fee
      let standardFee = 0;
      if (student.standard) {
        try {
          const stdData = await prisma.standards.findFirst({
            where: { std: student.standard, college: req.college },
            select: { totalFees: true }
          });
          standardFee = stdData?.totalFees || 0;
        } catch (e) {
          standardFee = 0;
        }
      }

      const mealsFee = student.lunchAccepted ? (student.lunchPrice || 0) : 0;
      const busFee = student.busAccepted ? (student.busPrice || 0) : 0;
      const inventoryFee = (student.studentInventory || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      const combinedTotal = standardFee + mealsFee + busFee + inventoryFee;

      const totalPaid = (student.fees || []).reduce((sum, f) => sum + (f.amount || 0), 0);
      const remaining = Math.max(0, combinedTotal - totalPaid);

      if (parsedAmount > (remaining + 0.01)) {
        return res.status(400).json({ 
          error: `Installment amount (K ${parsedAmount.toFixed(2)}) cannot exceed remaining balance of K ${remaining.toFixed(2)}.` 
        });
      }

      const fee = await prisma.fee.create({
        data: {
          title: title.trim(),
          amount: parsedAmount,
          amountDate: new Date(amountDate),
          admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
          studentId: parseInt(studentId),
          college: req.college
        },
      });
  
      res.status(201).json(fee);
    } catch (error) {
      console.error("Error adding fee:", error);
      res.status(500).json({ error: "An error occurred while recording installment." });
    }
  });



  router.get("/downloadfeedata", async (req, res) => {
    try {
      const session = req.session;
      const whereClause = { college: req.college };
      if (session) whereClause.session = session;

      const students = await prisma.student.findMany({
        where: whereClause,
        include: {
          fees: true,
          studentInventory: {
            include: { inventory: true }
          }
        },
        orderBy: [{ session: 'desc' }, { standard: 'asc' }, { rollNo: 'asc' }]
      });

      const standardsList = await prisma.standards.findMany({
        where: { college: req.college }
      });
      const stdFeeMap = new Map();
      standardsList.forEach(s => stdFeeMap.set(s.std, s.totalFees || 0));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("All Student Fees");

      worksheet.columns = [
        { header: "Student ID", key: "id", width: 12 },
        { header: "Full Name", key: "fullName", width: 25 },
        { header: "Roll No", key: "rollNo", width: 12 },
        { header: "Division / Standard", key: "standard", width: 20 },
        { header: "Session", key: "session", width: 15 },
        { header: "Standard Total Fee", key: "standardTotalFee", width: 20 },
        { header: "Tuition Paid", key: "tuitionPaid", width: 15 },
        { header: "Lunch / Meals Fee", key: "lunchFee", width: 18 },
        { header: "Bus / Transport Fee", key: "busFee", width: 18 },
        { header: "Inventory Charges", key: "inventoryFee", width: 18 },
        { header: "Grand Total Fee", key: "grandTotal", width: 18 },
        { header: "Total Paid", key: "totalPaid", width: 15 },
        { header: "Remaining Balance", key: "remainingBalance", width: 18 },
        { header: "Scholarship", key: "scholarship", width: 15 },
        { header: "Remark", key: "remark", width: 25 }
      ];

      students.forEach((s) => {
        const stdFee = stdFeeMap.get(s.standard) || 0;
        const tuitionPaid = (s.fees || []).reduce((sum, f) => sum + (f.amount || 0), 0);
        const lunchFee = s.lunchAccepted ? (s.lunchPrice || s.lunchFee || 0) : 0;
        const busFee = s.busAccepted ? (s.busPrice || s.busFee || 0) : 0;
        const inventoryFee = (s.studentInventory || []).reduce((sum, si) => sum + (si.totalPrice || 0), 0);

        const grandTotal = stdFee + lunchFee + busFee + inventoryFee;
        const totalPaid = tuitionPaid;
        const remainingBalance = Math.max(0, grandTotal - totalPaid);

        worksheet.addRow({
          id: s.id,
          fullName: s.fullName,
          rollNo: s.rollNo,
          standard: s.standard,
          session: s.session,
          standardTotalFee: stdFee,
          tuitionPaid: tuitionPaid,
          lunchFee: lunchFee,
          busFee: busFee,
          inventoryFee: inventoryFee,
          grandTotal: grandTotal,
          totalPaid: totalPaid,
          remainingBalance: remainingBalance,
          scholarship: s.scholarshipApplied ? "Yes" : "No",
          remark: s.remark || ""
        });
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=All_Students_Fees.xlsx");

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error generating student fees Excel file:", error);
      res.status(500).send("Failed to generate Excel file");
    }
  });

  module.exports = router;