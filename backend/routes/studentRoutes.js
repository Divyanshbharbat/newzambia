const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();
const { findMatchingStandard } = require("../utils/standardMatcher");


function jsonBigIntReplacer(key, value) {
    if (typeof value === "bigint") {
        return value.toString();
    }
    return value;
}

// Delete Function
const deleteStudent = async (studentId) => {
    try {
        // Delete related records
        await prisma.parent.deleteMany({ where: { studentId: studentId } });
        await prisma.fee.deleteMany({ where: { studentId: studentId } });
        await prisma.attendance.deleteMany({ where: { studentId: studentId } });
        await prisma.student.delete({ where: { id: parseInt(studentId) } });

        return {
            success: true,
            message: "Student and related records deleted successfully",
        };
    } catch (error) {
        console.error("Error deleting student:", error);
        throw new Error("Failed to delete student");
    }
};

// Create Student
router.post("/students", async (req, res) => {
    const {
        fullName,
        gender,
        dateOfBirth,
        rollNo,
        standard,
        bloodGroup,
        scholarshipApplied,
        lunchAccepted,
        lunchPrice,
        busAccepted,
        busStationId,
        residentialAddress,
        correspondenceAddress,
        nationality,
        religion,
        denomination,
        language,
        motherTongue,
        parents,
        fees,
        photoUrl,
        remark
    } = req.body;
    
    if (!fullName || !fullName.trim()) {
        return res.status(400).json({ error: "Full Name is required." });
    }

    if (!rollNo || isNaN(parseInt(rollNo))) {
        return res.status(400).json({ error: "Roll Number is required." });
    }

    if (!standard || !standard.trim()) {
        return res.status(400).json({ error: "Standard / Class is required." });
    }

    const session = req.session || "2026-2027";
    const college = req.college || "svpcet";
    const std = standard.trim();
    const finalRollNo = parseInt(rollNo);

    try {
        // Verify class (Standards) existence in database
        const dbStandards = await prisma.standards.findMany({
            where: { college }
        });

        if (dbStandards.length === 0) {
            return res.status(400).json({ error: "No classes found in the database. Please add classes first before creating a student." });
        }

        const matchedStandard = findMatchingStandard(std, dbStandards);
        if (!matchedStandard) {
            return res.status(400).json({ error: `Class '${std}' does not exist in the database. Please add this class first.` });
        }

        const finalStandard = matchedStandard.std;

        // Check uniqueness for (standard, rollNo, session, college)
        const existingStudent = await prisma.student.findUnique({
            where: {
                standard_rollNo_session_college: {
                    standard: finalStandard,
                    rollNo: finalRollNo,
                    session,
                    college
                }
            }
        });

        if (existingStudent) {
            return res.status(400).json({ error: `Roll Number ${finalRollNo} already exists for Class '${finalStandard}'.` });
        }

        const validGender = (gender === "Female" || gender === "Male") ? gender : "Male";
        let dob = dateOfBirth ? new Date(dateOfBirth) : new Date();
        if (isNaN(dob.getTime())) dob = new Date();

        // Fetch bus station price if bus is accepted
        let busPriceValue = null;
        if (busAccepted && busStationId) {
            const busStation = await prisma.busStation.findUnique({
                where: { id: parseInt(busStationId) },
            });
            if (busStation) {
                busPriceValue = busStation.price;
            }
        }

        // Fetch control settings to get global lunch fee if needed for this college
        const controlSettings = await prisma.control.findFirst({
            where: { college }
        });
        const globalLunchFee = controlSettings ? controlSettings.lunchFee : null;

        const validParents = Array.isArray(parents) 
            ? parents.filter(p => p && (
                (p.fatherName && p.fatherName.trim()) || 
                (p.motherName && p.motherName.trim()) || 
                (p.fatherContact && !isNaN(parseInt(p.fatherContact)) && parseInt(p.fatherContact) !== 0) || 
                (p.motherContact && !isNaN(parseInt(p.motherContact)) && parseInt(p.motherContact) !== 0)
              )).map((p) => ({
                fatherName: (p.fatherName && p.fatherName.trim()) ? p.fatherName.trim() : "N/A",
                motherName: (p.motherName && p.motherName.trim()) ? p.motherName.trim() : "N/A",
                fatherContact: p.fatherContact && !isNaN(parseInt(p.fatherContact)) ? parseInt(p.fatherContact) : 0,
                motherContact: p.motherContact && !isNaN(parseInt(p.motherContact)) ? parseInt(p.motherContact) : 0,
                distanceFromSchool: p.distanceFromSchool && !isNaN(parseFloat(p.distanceFromSchool)) ? parseFloat(p.distanceFromSchool) : null,
                preferredPhoneNumber: p.preferredPhoneNumber && !isNaN(parseInt(p.preferredPhoneNumber)) ? parseInt(p.preferredPhoneNumber) : null,
                address: (p.address && p.address.trim()) ? p.address.trim() : "N/A",
            }))
            : [];

        const validFees = Array.isArray(fees)
            ? fees.filter(f => f && (
                (f.installmentType && f.installmentType.trim()) || 
                (f.amount && !isNaN(parseFloat(f.amount)) && parseFloat(f.amount) > 0)
              )).map((f) => ({
                title: (f.installmentType && f.installmentType.trim()) ? f.installmentType.trim() : "General Fee",
                amount: f.amount && !isNaN(parseFloat(f.amount)) ? parseFloat(f.amount) : 0,
                amountDate: f.amountDate && !isNaN(new Date(f.amountDate).getTime()) ? new Date(f.amountDate) : new Date(),
                admissionDate: f.admissionDate && !isNaN(new Date(f.admissionDate).getTime()) ? new Date(f.admissionDate) : new Date(),
                college
            }))
            : [];

        const student = await prisma.student.create({
            data: {
                fullName: fullName.trim(),
                gender: validGender,
                dateOfBirth: dob,
                rollNo: finalRollNo,
                standard: finalStandard,
                bloodGroup: (bloodGroup && bloodGroup.trim()) ? bloodGroup.trim() : null,
                scholarshipApplied: scholarshipApplied || false,
                lunchAccepted: lunchAccepted || false,
                lunchPrice: lunchAccepted ? (globalLunchFee ?? (lunchPrice ? parseFloat(lunchPrice) : null)) : null,
                busAccepted: busAccepted || false,
                busStationId: busAccepted && busStationId ? parseInt(busStationId) : null,
                busPrice: busPriceValue,
                residentialAddress: (residentialAddress && residentialAddress.trim()) ? residentialAddress.trim() : null,
                correspondenceAddress: (correspondenceAddress && correspondenceAddress.trim()) ? correspondenceAddress.trim() : null,
                photoUrl: (photoUrl && photoUrl.trim()) ? photoUrl.trim() : null,
                remark: (remark && remark.trim()) ? remark.trim() : null,
                nationality: (nationality && nationality.trim()) ? nationality.trim() : null,
                religion: (religion && religion.trim()) ? religion.trim() : null,
                denomination: (denomination && denomination.trim()) ? denomination.trim() : null,
                language: (language && language.trim()) ? language.trim() : null,
                motherTongue: (motherTongue && motherTongue.trim()) ? motherTongue.trim() : null,
                session,
                college,
                parents: {
                    create: validParents,
                },
                fees: {
                    create: validFees,
                },
            },
            include: {
                parents: true,
                fees: true,
                attendanceRecords: true,
            },
        });

        // After creating student, first process any requested inventory selections
        try {
            const { inventorySelections } = req.body; // optional array of { inventoryId, size, quantity }
            if (Array.isArray(inventorySelections) && inventorySelections.length > 0) {
                for (const sel of inventorySelections) {
                    try {
                        const invId = parseInt(sel.inventoryId);
                        const qty = sel.quantity ? parseInt(sel.quantity) : 1;
                        const invItem = await prisma.inventory.findFirst({ 
                            where: { id: invId, college: req.college } 
                        });
                        if (!invItem) continue;
                        if (typeof invItem.quantity === 'number' && invItem.quantity < qty) {
                            console.warn(`Insufficient inventory for item ${invId}. Available: ${invItem.quantity}, requested: ${qty}`);
                            continue;
                        }

                        await prisma.studentInventory.create({
                            data: {
                                studentId: student.id,
                                inventoryId: invId,
                                quantityPurchased: qty,
                                totalPrice: (invItem.price || 0) * qty,
                            },
                        });

                        // decrement inventory
                        await prisma.inventory.update({ where: { id: invId }, data: { quantity: invItem.quantity ? invItem.quantity - qty : null } });
                    } catch (err) {
                        console.error('Error assigning requested inventory selection:', err);
                    }
                }
            }

            // Then assign default uniform items (compulsory) if any remain to be assigned
            const uniformItemsRaw = await prisma.inventory.findMany({
                where: { category: { equals: "Uniform" }, college: req.college },
            });

            // Normalize item gender and filter by student's gender
            const uniformItems = uniformItemsRaw.filter((it) => {
                const itemGender = it.gender || null;
                if (!itemGender) return true; // if no gender info, include by default
                const normalized = String(itemGender).toLowerCase();
                if (normalized === "all" || normalized === "all classes") return true;
                return normalized === String(student.gender).toLowerCase();
            });

            for (const item of uniformItems) {
                // Only assign if there's stock
                if (typeof item.quantity === 'number' && item.quantity > 0) {
                    try {
                        // Skip if student already has this inventory assigned (from selections)
                        const existing = await prisma.studentInventory.findUnique({ where: { studentId_inventoryId: { studentId: student.id, inventoryId: item.id } } });
                        if (existing) continue;

                        // Create StudentInventory record
                        await prisma.studentInventory.create({
                            data: {
                                studentId: student.id,
                                inventoryId: item.id,
                                quantityPurchased: 1,
                                totalPrice: item.price,
                            },
                        });

                        // Decrement inventory quantity
                        await prisma.inventory.update({
                            where: { id: item.id },
                            data: { quantity: item.quantity - 1 },
                        });
                    } catch (err) {
                        console.error(`Error assigning uniform item ${item.id} to student ${student.id}:`, err);
                    }
                }
            }
        } catch (err) {
            console.error("Error processing uniform assignments:", err);
        }

        // Return student with related records and assigned inventory
        const createdStudent = await prisma.student.findFirst({
            where: { id: student.id, college: req.college },
            include: {
                parents: true,
                fees: true,
                studentInventory: {
                    include: { inventory: true },
                },
                attendanceRecords: true,
            },
        });

        res.status(201).json(JSON.stringify(createdStudent, jsonBigIntReplacer));
    } catch (error) {
        console.error("Error creating student:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "Roll Number already exists for this class, session, and college." });
        }
        res.status(500).json({ error: error.message || "Failed to create student" });
    }
});

// Delete Student
router.delete("/delete/students", async (req, res) => {
    const { studentId } = req.query;
    try {
        await deleteStudent(parseInt(studentId));
        res.status(200).send({ message: "Student deleted successfully" });
    } catch (error) {
        res.status(500).send({ error: "Failed to delete student" });
    }
});

async function getSearchStandards(inputStd, college) {
    const searchStds = new Set();
    if (inputStd && String(inputStd).trim()) {
        searchStds.add(String(inputStd).trim());
    }
    if (college) {
        const dbStandards = await prisma.standards.findMany({ where: { college } });
        const matched = findMatchingStandard(inputStd, dbStandards);
        if (matched) {
            searchStds.add(matched.std.trim());
        }
    }
    return Array.from(searchStds);
}

// Search Students
router.get("/getallstudent", async (req, res) => {
    const { std } = req.query;
    const session = req.session;
    
    if (!session) {
        return res.status(400).json({ error: "Session not set. Please set a session first." });
    }
    
    try {
        const searchStds = await getSearchStandards(std, req.college);
        const result = await prisma.student.findMany({
            where: {
                standard: { in: searchStds },
                session : session,
                college: req.college
            }
        });
        res.status(200).json(JSON.parse(JSON.stringify({ result }, jsonBigIntReplacer)));
    } catch (error) {
        res.status(400).json(error);
    }
});


// Get searched student by rollno.:
router.get("/students/rollNo", async (req, res) => {
    const { rollno , standard } = req.query;
    const session = req.session;

    if (!session) {
        return res.status(400).json({ error: "Session not set. Please set a session first." });
    }

    try {
        const searchStds = await getSearchStandards(standard, req.college);
        let student;
        if (/^\d+$/.test(rollno)){
            student = await prisma.student.findFirst({
                where: {
                    rollNo: parseInt(rollno),
                    standard: { in: searchStds },
                    session: session,
                    college: req.college
                },
                include: {
                    parents: true,
                    fees: true,
                },
            });    
        }else{
            student = await prisma.student.findFirst({
                where: {
                    rollNo: parseInt(rollno),
                    standard: { in: searchStds },
                    session: session,
                    college: req.college
                },
                include: {
                    parents: true,
                    fees: true,
                },
            });   
        }
        if (student) {
            res.status(200).send(JSON.parse(JSON.stringify(student, jsonBigIntReplacer)));
        } else {
            res.status(404).json({ message: "Student not found" });
        }
    } catch (error) {
        console.error("Error fetching student:", error);
        res.status(500).json({ message: "An error occurred while fetching the student" });
    }
});

// Get student by rollNo only (for TC auto-fill)
router.get("/students/byRollNo/:rollNo", async (req, res) => {
    const { rollNo } = req.params;
    // const session = req.session;

    // if (!session) {
    //     return res.status(400).json({ error: "Session not set. Please set a session first." });
    // }

    try {
        const student = await prisma.student.findFirst({
            where: {
                rollNo: parseInt(rollNo),
                college: req.college
                // session: session
            },
            include: {
                parents: true,
                fees: true,
            },
        });
        if (student) {
            res.status(200).send(JSON.stringify(student, jsonBigIntReplacer));
        } else {
            res.status(404).json({ message: "Student not found" });
        }
    } catch (error) {
        console.error("Error fetching student:", error.message);
        res.status(500).json({ message: "An error occurred while fetching the student" });
    }
});

// get all who applied for scholarship
router.get("/getallstudentsc",async (req,res)=>{
    const session = req.session;
    
    if (!session) {
        return res.status(400).json({ error: "Session not set. Please set a session first." });
    }
    
    try{
        const studentsc = await prisma.student.findMany({
            where:{
                scholarshipApplied:true,
                session:session,
                college: req.college
            }
        })
        if (studentsc) {
            res.status(200).send(JSON.stringify(studentsc, jsonBigIntReplacer));
        } else {
            res.status(404).json({ message: "Student not found" });
        }
    }catch(error){
        console.error("Error fetching student:", error.message);
        console.error("Stack trace:", error.stack);
        res.status(500).json({ message: "An error occurred while fetching the student" });
    }
})

// Update student route
router.put("/update/student/:id", async (req, res) => {
    const studentId = parseInt(req.params.id);
    const {
        fullName,
        gender,
        dateOfBirth,
        nationality,
        religion,
        denomination,
        language,
        motherTongue,
        rollNo,
        standard,
        bloodGroup,
        scholarshipApplied,
        remark,
        residentialAddress,
        correspondenceAddress,
        photoUrl,   
        parents,
    } = req.body;

    try {
        // Update student details
        const updatedStudent = await prisma.student.update({
            where: { id: studentId },
            data: {
                fullName,
                gender,
                dateOfBirth: new Date(dateOfBirth),
                rollNo: parseInt(rollNo),
                nationality,
                religion,
                denomination,
                language,
                motherTongue,
                standard,
                bloodGroup,
                scholarshipApplied,
                remark,
                residentialAddress,
                correspondenceAddress,
                photoUrl,
            },
        });

        // Update parent details
        const updatedParents = Array.isArray(parents)
            ? await Promise.all(
                parents.map((parent) =>
                    prisma.parent.update({
                        where: { id: parent.id },
                        data: {
                            fatherName: parent.fatherName,
                            motherName: parent.motherName,
                            fatherContact: parent.fatherContact,
                            motherContact: parent.motherContact,
                            distanceFromSchool: parent.distanceFromSchool ? parseFloat(parent.distanceFromSchool) : null,
                            preferredPhoneNumber: parent.preferredPhoneNumber ? parseInt(parent.preferredPhoneNumber) : null,
                            address: parent.address,
                        },
                    })
                )
            )
            : [];

        const response = {
            message: "Student updated successfully",
            student: updatedStudent,
            parents: updatedParents,
        };
        res.status(201).json(JSON.stringify(response, jsonBigIntReplacer));
    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ error: "Failed to update student" });
    }
});

module.exports = router;
