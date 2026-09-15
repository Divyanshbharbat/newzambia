const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

function jsonBigIntReplacer(key, value) {
    if (typeof value === "bigint") {
        return value.toString();
    }
    return value;
}

async function calculateTotalPercentage(recievedData) {
    let sumPercent = 0;
    let count = 0;
    const totalPercentage = recievedData.forEach((subjectWise) => {
        sumPercent += subjectWise.percentage;
        count++;
    });
    return (sumPercent / count).toFixed(2);
}

// control routes that need session context
function getSessionFromReq(req) {
  // session year stored by /setSession in server.js
  return req.session || req.query.session || req.body.year || null;
}

router.post("/control/standard", async (req, res) => {
  const { std, totalFees, category } = req.body;
  const activeCollege = req.college || req.body.college || "svpcet";
  const stdName = std ? std.trim() : "";
  const catName = category && category.trim() ? category.trim() : "General";

  if (!stdName) {
    return res.status(400).json({ error: "Division name is required." });
  }
  
  try {
    const existing = await prisma.standards.findFirst({
      where: {
        std: stdName,
        college: activeCollege
      }
    });

    let result;
    if (existing) {
      result = await prisma.standards.update({
        where: { id: existing.id },
        data: {
          totalFees: totalFees !== undefined && totalFees !== "" ? parseFloat(totalFees) : existing.totalFees,
          category: catName
        }
      });
    } else {
      result = await prisma.standards.create({
        data: {
          std: stdName,
          totalFees: totalFees !== undefined && totalFees !== "" ? parseFloat(totalFees) : 0,
          category: catName,
          college: activeCollege
        }
      });
    }

    res.status(200).json(result);
  } catch (error) {
      console.error('Error in /control/standard:', error);
      res.status(500).json({ error: error.message });
  }
});

router.get('/control/standardsByCategory', async (req, res) => {
  try {
    const standards = await prisma.standards.findMany({
      where: { college: req.college },
      select: { std: true, category: true, totalFees: true, id: true },
      orderBy: { category: 'asc' }
    });

    const grouped = standards.reduce((acc, s) => {
      const cat = s.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({std: s.std, totalFees: s.totalFees, id: s.id});
      return acc;
    }, {});

    res.status(200).json(grouped);
  } catch (error) {
    console.error('Error fetching standards by category:', error);
    res.status(500).json({ error: 'Failed to fetch standards' });
  }
});

// Get all standards with full details
router.get('/control/standards', async (req, res) => {
  try {
    const standards = await prisma.standards.findMany({
      where: { college: req.college },
      select: { id: true, std: true, category: true, totalFees: true },
      orderBy: [{ category: 'asc' }, { std: 'asc' }]
    });
    res.status(200).json(standards);
  } catch (error) {
    console.error('Error fetching standards:', error);
    res.status(500).json({ error: 'Failed to fetch standards' });
  }
});

// Delete a standard by ID
router.delete('/control/standard/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const standardId = parseInt(id);
    if (isNaN(standardId)) {
      return res.status(400).json({ error: "Invalid standard ID" });
    }

    // Delete any attached subjects first
    await prisma.subject.deleteMany({
      where: { stdId: standardId, college: req.college }
    });
    
    const deleted = await prisma.standards.delete({
      where: { id: standardId }
    });

    res.status(200).json({ message: 'Standard deleted successfully', deleted });
  } catch (error) {
    console.error('Error deleting standard:', error);
    res.status(500).json({ error: 'Failed to delete standard', details: error.message });
  }
});

// Update a standard by ID
router.put('/control/standard/:id', async (req, res) => {
  const { id } = req.params;
  const { std, totalFees, category } = req.body;

  try {
    const standardId = parseInt(id);
    if (isNaN(standardId)) {
      return res.status(400).json({ error: "Invalid standard ID" });
    }

    const existingStd = await prisma.standards.findUnique({
      where: { id: standardId }
    });

    if (!existingStd) {
      return res.status(404).json({ error: "Standard not found" });
    }

    const newStdName = std && std.trim() ? std.trim() : existingStd.std;

    // If division name changed, update student records too
    if (newStdName !== existingStd.std) {
      await prisma.student.updateMany({
        where: { standard: existingStd.std, college: req.college },
        data: { standard: newStdName }
      });
    }

    const updated = await prisma.standards.update({
      where: { id: standardId },
      data: {
        std: newStdName,
        totalFees: totalFees !== undefined && totalFees !== null ? parseFloat(totalFees) : existingStd.totalFees,
        category: category || existingStd.category || "General"
      }
    });
    res.status(200).json({ message: 'Standard updated successfully', updated });
  } catch (error) {
    console.error('Error updating standard:', error);
    res.status(500).json({ error: 'Failed to update standard', details: error.message });
  }
});

router.post("/control/subjects", async (req, res) => {
  const { stdId, subjects } = req.body;

  if (!stdId || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: "Invalid input data: stdId and subjects array are required" });
  }

  try {
    // Fetch the standard by `stdId` (ID is preferred)
    const standardIdParsed = parseInt(stdId);
    
    const standard = await prisma.standards.findFirst({
      where: { id: standardIdParsed, college: req.college }
    });

    if (!standard) {
      return res.status(404).json({ error: "Standard not found" });
    }

    // Validate subjects data
    for (const subject of subjects) {
      if (!subject.name || typeof subject.name !== 'string' || !subject.name.trim()) {
        return res.status(400).json({ error: "Subject name is required" });
      }
      if (subject.totalMarks !== undefined) {
        const totalMarks = parseFloat(subject.totalMarks);
        if (isNaN(totalMarks) || totalMarks <= 0) {
          return res.status(400).json({ error: `Total marks for ${subject.name} must be a positive number` });
        }
      }
    }

    const result = await prisma.subject.createMany({
      data: subjects.map((subject) => ({
        name: subject.name.trim(),
        stdId: standard.id, // Now using Int ID
        college: req.college,
      })),
    });

    res.status(201).json({ 
      message: "Subjects added successfully", 
      count: result.count 
    });
  } catch (error) {
    console.error("Error adding subjects:", error);
    res.status(500).json({ 
      error: "Failed to add subjects", 
      details: error.code === 'P2002' ? "One or more subjects already exist for this standard." : error.message 
    });
  }
});

// Get subjects for a standard by ID
router.get("/control/subjects/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const standardId = parseInt(id);
    if (isNaN(standardId)) {
      return res.status(400).json({ error: "Invalid standard ID" });
    }

    const subjects = await prisma.subject.findMany({
      where: { stdId: standardId, college: req.college }
    });
    res.status(200).json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// Get all subjects for college
router.get("/control/all-subjects", async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { college: req.college }
    });
    res.status(200).json(subjects);
  } catch (error) {
    console.error("Error fetching all subjects:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// Delete a subject
router.delete("/control/subject/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const deleted = await prisma.subject.delete({
      where: { id: parseInt(id) }
    });
    res.status(200).json({ message: "Subject deleted successfully", deleted });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({ error: "Failed to delete subject" });
  }
});



const promotionData = {
    sessions: {
      first: "2024-2025",
      second: "2025-2026",
      third: "2026-2027"
    },
    standards: [
      "LKG",
      "UKG",
      "1st",
      "2nd",
      "3rd",
      "4th",
      "5th"
    ]
  };
  
  // Function to get the next session based on the current session
  function getNextSession(currentSession) {
    const sessionList = Object.values(promotionData.sessions);
    const currentIndex = sessionList.indexOf(currentSession);
    
    return currentIndex !== -1 && currentIndex < sessionList.length - 1
      ? sessionList[currentIndex + 1]
      : currentSession;  // Stay in the same session if at the end
  }
  
  // Function to get the next standard based on the current standard
  function getNextStandard(currentStandard) {
    const standardList = promotionData.standards;
    const currentIndex = standardList.indexOf(currentStandard);
    
    return currentIndex !== -1 && currentIndex < standardList.length - 1
      ? standardList[currentIndex + 1]
      : currentStandard;  // Stay in the same standard if at the end
  }
  
  // Function to calculate the total percentage
  async function calculateTotalPercentage(recievedData) {
    let sumPercent = 0;
    let count = recievedData.length;  // Count of subjects
  
    recievedData.forEach((subjectWise) => {
      sumPercent += subjectWise.percentage;
    });
  
    return count > 0 ? (sumPercent / count).toFixed(2) : 0;  // Avoid division by zero
  }
  

// Get students for promotion page for a specific session & optional division
router.get("/promotion/students", async (req, res) => {
  const session = req.query.session || req.headers['x-session'] || req.session;
  const standardFilter = req.query.standard || req.headers['x-standard'];
  try {
    let collegeClause = req.college;
    if (collegeClause && session) {
      const count = await prisma.student.count({ where: { session: session, college: collegeClause } });
      if (count === 0) {
        const sample = await prisma.student.findFirst({ where: { session: session } });
        if (sample && sample.college) {
          collegeClause = sample.college;
        }
      }
    }

    const whereClause = { session: session };
    if (collegeClause) whereClause.college = collegeClause;
    if (standardFilter) whereClause.standard = standardFilter;

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        marks: true
      },
      orderBy: [{ standard: 'asc' }, { rollNo: 'asc' }]
    });

    const evaluatedStudents = students.map(s => {
      let status = s.status;
      if (status === 'None' || !status) {
        if (s.marks && s.marks.length > 0) {
          let sumPercent = 0;
          s.marks.forEach(m => {
            sumPercent += (m.percentage || (m.totalMarks > 0 ? (m.obtainedMarks / m.totalMarks) * 100 : 0));
          });
          const avg = sumPercent / s.marks.length;
          status = avg >= 40 ? 'Passed' : 'Failed';
        } else {
          status = 'Passed'; // Default active students to Passed if no fail marks present
        }
      }
      return {
        id: s.id,
        fullName: s.fullName,
        rollNo: s.rollNo,
        standard: s.standard,
        session: s.session,
        status: status,
        gender: s.gender
      };
    });

    res.status(200).json(evaluatedStudents);
  } catch (error) {
    console.error("Error fetching promotion students:", error);
    res.status(500).json({ error: "Failed to fetch students for promotion" });
  }
});

router.post("/promotion", async (req, res) => {
  const session = req.body.fromSession || req.headers['x-session'] || req.query.session || req.body.session || req.session;
  const targetSession = req.body.toSession || req.headers['x-to-session'] || req.query.toSession;
  const standardFilter = req.body.fromStandard || req.headers['x-standard'] || req.query.standard || req.body.standard;
  const targetStandard = req.body.toStandard || req.headers['x-to-standard'] || req.query.toStandard;

  try {
    let collegeClause = req.college;
    if (collegeClause && session) {
      const count = await prisma.student.count({ where: { session: session, college: collegeClause } });
      if (count === 0) {
        const sample = await prisma.student.findFirst({ where: { session: session } });
        if (sample && sample.college) {
          collegeClause = sample.college;
        }
      }
    }

    // Determine target next session
    let nextSession = targetSession;
    if (!nextSession) {
      const allSessions = await prisma.session.findMany({
        where: collegeClause ? { college: collegeClause } : {},
        orderBy: { year: 'asc' }
      });
      const sessionYears = allSessions.map(s => s.year);
      const currSessionIdx = sessionYears.indexOf(session);

      if (currSessionIdx !== -1 && currSessionIdx < sessionYears.length - 1) {
        nextSession = sessionYears[currSessionIdx + 1];
      } else {
        const parts = session ? session.split('-') : [];
        if (parts.length === 2) {
          const start = parseInt(parts[0]);
          const end = parseInt(parts[1]);
          if (!isNaN(start) && !isNaN(end)) {
            nextSession = `${start + 1}-${end + 1}`;
          }
        }
      }
    }

    if (!nextSession) {
      nextSession = session;
    }

    // Auto-create next session in DB if it doesn't exist
    try {
      const existingSess = await prisma.session.findFirst({ where: { year: nextSession, college: collegeClause || 'svpcet' } });
      if (!existingSess) {
        await prisma.session.create({ data: { year: nextSession, college: collegeClause || 'svpcet' } });
      }
    } catch (e) {}

    // Determine standard list for fallback lookup
    const allStandards = await prisma.standards.findMany({
      where: collegeClause ? { college: collegeClause } : {},
      orderBy: [{ category: 'asc' }, { id: 'asc' }]
    });
    const stdNames = allStandards.map(s => s.std);

    const whereClause = { session: session };
    if (collegeClause) whereClause.college = collegeClause;
    if (standardFilter) whereClause.standard = standardFilter;

    const studentData = await prisma.student.findMany({
      include: {
        parents: true,
        fees: true,
        marks: true  
      },
      where: whereClause,
    });

    if (studentData.length === 0) {
      return res.status(400).json({ error: `No students found in ${standardFilter ? `Division ${standardFilter}` : 'the selected division'} for session ${session}.` });
    }

    const promotedStudents = await Promise.all(
      studentData.map(async (oldStudent) => {
        let passed = oldStudent.status === "Passed";
        if (oldStudent.status === "None" || !oldStudent.status) {
          if (oldStudent.marks && oldStudent.marks.length > 0) {
            let sum = 0;
            oldStudent.marks.forEach(m => {
              sum += (m.percentage || (m.totalMarks > 0 ? (m.obtainedMarks / m.totalMarks) * 100 : 0));
            });
            const avg = sum / oldStudent.marks.length;
            passed = avg >= 40;
          } else {
            passed = true; // Default active students to pass
          }
        }

        const newStatus = passed ? "Passed" : "Failed";

        await prisma.student.update({
          where: { id: oldStudent.id },
          data: { status: newStatus }
        });

        if (passed) {
          let newStandard = targetStandard;
          if (!newStandard || !standardFilter) {
            const num = parseInt(oldStudent.standard);
            if (!isNaN(num)) {
              newStandard = String(num + 1);
            } else {
              const stdIdx = stdNames.indexOf(oldStudent.standard);
              if (stdIdx !== -1 && stdIdx < stdNames.length - 1) {
                newStandard = stdNames[stdIdx + 1];
              } else {
                newStandard = oldStudent.standard;
              }
            }
          }

          // Auto-create standard in DB if not exist
          try {
            const existingStdInDb = await prisma.standards.findFirst({ where: { std: newStandard, college: collegeClause || 'svpcet' } });
            if (!existingStdInDb) {
              await prisma.standards.create({ data: { std: newStandard, category: 'General', totalFees: 0, college: collegeClause || 'svpcet' } });
            }
          } catch (e) {}

          const newStudentData = {
            fullName: oldStudent.fullName,
            gender: oldStudent.gender,
            dateOfBirth: oldStudent.dateOfBirth,
            rollNo: oldStudent.rollNo,  
            standard: newStandard,  
            session: nextSession,  
            scholarshipApplied: !!oldStudent.scholarshipApplied,  
            remark: oldStudent.remark || "",  
            lunchAccepted: !!oldStudent.lunchAccepted,
            lunchPrice: oldStudent.lunchPrice,
            busAccepted: !!oldStudent.busAccepted,
            busStationId: oldStudent.busStationId,
            busPrice: oldStudent.busPrice,
            status: "None",  
            parents: {
              create: (oldStudent.parents || []).map((parent) => ({
                fatherName: parent.fatherName,
                motherName: parent.motherName,
                fatherContact: parent.fatherContact,
                motherContact: parent.motherContact,
                address: parent.address || "",
              })),
            },
            college: collegeClause || 'svpcet'
          };

          const existingStudentInSession = await prisma.student.findFirst({
            where: {
              rollNo: oldStudent.rollNo,
              session: nextSession,
              college: collegeClause || 'svpcet'
            },
          });

          if (existingStudentInSession) {
            const updatedStudent = await prisma.student.update({
              where: { id: existingStudentInSession.id },
              data: {
                standard: newStandard,
                fullName: oldStudent.fullName,
                gender: oldStudent.gender,
                dateOfBirth: oldStudent.dateOfBirth,
                scholarshipApplied: !!oldStudent.scholarshipApplied,
                remark: oldStudent.remark || "",
                lunchAccepted: !!oldStudent.lunchAccepted,
                lunchPrice: oldStudent.lunchPrice,
                busAccepted: !!oldStudent.busAccepted,
                busStationId: oldStudent.busStationId,
                busPrice: oldStudent.busPrice
              }
            });
            return updatedStudent;
          } else {
            const createdStudent = await prisma.student.create({
              data: newStudentData,
            });
            return createdStudent;
          }
        }

        return null;
      })
    );

    const successfulPromotions = promotedStudents.filter(student => student !== null);
    res.status(200).json(successfulPromotions);
  } catch (error) {
    console.error("Promotion error:", error);
    res.status(500).json({ error: "An error occurred during promotion." });
  }
});

  router.post("/handleInstallments",async(req,res)=>{

       const installments = req.body;
      
      // console.log(installments:installments);
      if(!installments){
        return res.status(400).json({error:"Enter Valid Data"});
      }
      try {
        const existingInstallment = await prisma.installments.findUnique({
          where: { installments_college: { installments: installments.installments, college: req.college } },
        });
        if (existingInstallment) {
          console.log("karan")
          return res.status(409).json({ error: "Installment already exists" });
        }
        const postResult = await prisma.installments.create({
          data: { ...installments, college: req.college },
        });
    
        return res.status(200).json({ postResult });
      } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Server Error" });
      }
    });

 // Update the installment
  router.post("/updateinstallment", async (req, res) => {
    console.log(req.body)
  const { uinstallment,uinstallment2 } = req.body;
  console.log("Update Request:",uinstallment,uinstallment2);

  if (!uinstallment || !uinstallment2) {
    return res.status(400).json({ error: "ID and Installment are required" });
  }
  
  try {
    const existingInstallment = await prisma.installments.findUnique({
      where: { installments_college: { installments: uinstallment, college: req.college } },
    });

    if (!existingInstallment) {
      return res.status(404).json({ error: "Installment not found" });
    }

    const updatedInstallment = await prisma.installments.update({
      where: { installments: uinstallment, college: req.college },
       data: { installments: uinstallment2 },
    });

    return res.status(200).json({ updatedInstallment });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

  
  router.get("/getInstallments",async(req,res)=>{
    const installmentsData = await prisma.installments.findMany({
      where: { college: req.college }
    });
    if(!installmentsData){
      return res.status(400).json({error:"No data found"});
    }
    res.status(200).json(installmentsData);
    console.log(installmentsData);
  })

  router.get("/getSessions", async (req, res) => {
    try {
      const sessions = await prisma.session.findMany({
        where: { college: req.college },
        orderBy: { year: 'desc' }
      });
      res.status(200).json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });
  
  // Category management routes
  router.get('/control/standard-categories', async (req, res) => {
    try {
      const categories = await prisma.standardCategory.findMany();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // College Management Routes
  router.get('/control/colleges', async (req, res) => {
    try {
      const colleges = await prisma.college.findMany();
      res.json(colleges);
    } catch (error) {
      console.error('Error fetching colleges:', error);
      res.status(500).json({ error: 'Failed to fetch colleges' });
    }
  });

  router.post('/control/colleges', async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'College name is required' });
    }
    try {
      const college = await prisma.college.create({
        data: { name: name.trim() }
      });
      res.status(201).json(college);
    } catch (error) {
      console.error('Error adding college:', error);
      res.status(500).json({ error: 'Failed to add college (Name might already exist)' });
    }
  });

  router.delete('/control/colleges/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.college.delete({
        where: { id: parseInt(id) }
      });
      res.json({ message: 'College deleted successfully' });
    } catch (error) {
      console.error('Error deleting college:', error);
      res.status(500).json({ error: 'Failed to delete college' });
    }
  });
  router.get("/control/categories", async (req, res) => {
    try {
      const categories = await prisma.standardCategory.findMany({
        where: { college: req.college },
        orderBy: { name: 'asc' }
      });
      res.status(200).json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });
  
  router.post("/control/category", async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    try {
      const result = await prisma.standardCategory.create({
        data: { name, college: req.college }
      });
      res.status(200).json(result);
    } catch (error) {
      console.error('Error adding category:', error);
      res.status(500).json({ error: 'Failed to add category' });
    }
  });
  
  router.delete("/control/category/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.standardCategory.delete({
        where: { id: parseInt(id) }
      });
      res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  // Dynamic User Management
  router.get("/control/users", async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { college: req.college },
        select: { id: true, username: true, role: true, college: true }
      });
      res.status(200).json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  router.post("/control/user", async (req, res) => {
    const { username, password, role } = req.body;
    const activeCollege = req.college; // Use the college from middleware/headers

    if (!username || !password || !role) return res.status(400).json({ error: 'All fields are required' });
    try {
      const result = await prisma.user.create({
        data: { username, password, role, college: activeCollege }
      });
      res.status(200).json({ id: result.id, username: result.username, role: result.role, college: result.college });
    } catch (error) {
      console.error('Error adding user:', error);
      res.status(500).json({ error: 'Failed to add user (Username might exist)' });
    }
  });

  router.delete("/control/user/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const userId = parseInt(id);
      
      // Verification check: only delete if user belongs to the same college
      const userToDelete = await prisma.user.findFirst({
        where: { id: userId, college: req.college }
      });

      if (!userToDelete) {
        return res.status(403).json({ error: 'Unauthorized to delete this user or user not found' });
      }

      await prisma.user.delete({
        where: { id: userId }
      });
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  router.put("/control/user/:id", async (req, res) => {
    const { id } = req.params;
    const { username, password, role } = req.body;
    try {
      const userId = parseInt(id);
      
      // Verification check: only update if user belongs to the same college
      const userToUpdate = await prisma.user.findFirst({
        where: { id: userId, college: req.college }
      });

      if (!userToUpdate) {
        return res.status(403).json({ error: 'Unauthorized to update this user or user not found' });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          username: username || undefined,
          password: password || undefined,
          role: role || undefined
        }
      });
      res.status(200).json({ message: 'User updated successfully', updated });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  
module.exports = router;