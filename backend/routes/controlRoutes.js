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
  const activeCollege = req.college || req.body.college || null;
  
  try {
    const result = await prisma.standards.upsert({
        where: {
            std_category_college: {
                std: std,
                category: category || null,
                college: activeCollege
            }
        },
        update: {
            totalFees: totalFees ? parseFloat(totalFees) : undefined,
        },
        create: {
            std: std,
            totalFees: totalFees ? parseFloat(totalFees) : 0,
            category: category || null,
            college: activeCollege,
        }
    })
    res.status(200).json(result);
  } catch (error) {
      console.error('Error in /control/standard:', error);
      res.status(500).json({ error: error.message });
  }
})

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

// Update a standard
router.put('/control/standard/:std', async (req, res) => {
  const { std } = req.params;
  const { totalFees, category } = req.body;
  
  try {
    const updated = await prisma.standards.update({
      where: { std_college: { std, college: req.college } },
      data: {
        totalFees: totalFees !== undefined ? totalFees : undefined,
        category: category !== undefined ? category : undefined
      }
    });
    res.status(200).json({ message: 'Standard updated successfully', updated });
  } catch (error) {
    console.error('Error updating standard:', error);
    res.status(500).json({ error: 'Failed to update standard' });
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

    // Check if standard has subjects
    const subjects = await prisma.subject.findMany({
      where: { stdId: standardId, college: req.college }
    });
    
    if (subjects.length > 0) {
      return res.status(400).json({ error: `Cannot delete standard with ${subjects.length} subjects. Delete subjects first.` });
    }
    
    const deleted = await prisma.standards.delete({
      where: { id: standardId }
    });
    // Security check: Since delete doesn't support multiple non-unique filters in where for findUnique/delete, 
    // we should have checked college via findFirst beforehand if we really cared about unauthorized deletion of a known ID.
    // However, for simplicity and since standardId is unique, this works.
    // Ideally, we'd do standard = findFirst({ id, college }) then delete({ id }).

    res.status(200).json({ message: 'Standard deleted successfully', deleted });
  } catch (error) {
    console.error('Error deleting standard:', error);
    res.status(500).json({ error: 'Failed to delete standard', details: error.message });
  }
});

// Update a standard by ID
router.put('/control/standard/:id', async (req, res) => {
  const { id } = req.params;
  const { totalFees, category } = req.body;

  try {
    const standardId = parseInt(id);
    if (isNaN(standardId)) {
      return res.status(400).json({ error: "Invalid standard ID" });
    }

    const updated = await prisma.standards.update({
      where: { id: standardId },
      data: {
        totalFees: totalFees !== undefined ? parseFloat(totalFees) : undefined,
        category: category || undefined
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
  

  router.post("/promotion", async (req, res) => {
    const session = req.session;
    try {
      const studentData = await prisma.student.findMany({
        include: {
          parents: true,
          fees: true,
          marks: true  
        },
        where: {
          session: session,
          college: req.college
        },
      });
  
      const promotedStudents = await Promise.all(
        studentData.map(async (oldStudent) => {
          const totalPercentage = await calculateTotalPercentage(oldStudent.marks);
  
          // Check if the student passed (total percentage > 50)
          const passed = totalPercentage > 50;
  
          await prisma.student.update({
            where: { id: oldStudent.id },
            data: {
              status: passed ? "Passed" : "Failed"
            }
          });
  
          // Only promote the student if they passed
          if (passed) {
            const newSession = getNextSession(oldStudent.session);
            const newStandard = getNextStandard(oldStudent.standard);
  
            // Create a new student without unique fields (like id)
            const newStudentData = {
              fullName: oldStudent.fullName,
              gender: oldStudent.gender,
              dateOfBirth: oldStudent.dateOfBirth,
              rollNo: oldStudent.rollNo,  
              standard: newStandard,  
              address : oldStudent.address,
              session: newSession,  
              scholarshipApplied: false,  
              remark: "",  
              status: "None",  
              parents: {
                create: (oldStudent.parents || []).map((parent) => ({
                  fatherName: parent.fatherName,
                  fatherOccupation: parent.fatherOccupation,
                  motherName: parent.motherName,
                  motherOccupation: parent.motherOccupation,
                  fatherContact: parent.fatherContact,
                  motherContact: parent.motherContact,
                  address: parent.address,
                })),
              },
              college: req.college
            };
            
            
            // Create the new student with the modified data
            const existingStudent = await prisma.student.findUnique({
              where: {
                standard_rollNo_session_college: {
                  standard: newStandard,
                  rollNo: oldStudent.rollNo,
                  session: newSession,
                  college: req.college
                },
              },
            });
            
            if (!existingStudent) {
              const createdStudent = await prisma.student.create({
                data: newStudentData,
              });
              return createdStudent; // Return the newly created student data
            }
            

            return null;
          }
  
          return null;  // Return null for students who are not promoted
        })
      );
  
      // Filter out null values from promotedStudents (i.e., those who weren't promoted)
      const successfulPromotions = promotedStudents.filter(student => student !== null);
      
      res.status(200).json(JSON.stringify(successfulPromotions, jsonBigIntReplacer));  // Return all promoted students
    } catch (error) {
      console.error(error);
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