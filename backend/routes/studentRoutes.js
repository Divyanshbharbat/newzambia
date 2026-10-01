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
        const id = parseInt(studentId);
        // Fetch student details in case hostel records need to be cleaned
        const student = await prisma.student.findUnique({ where: { id } });

        // Delete all related records to satisfy foreign key constraints
        await prisma.parent.deleteMany({ where: { studentId: id } });
        await prisma.fee.deleteMany({ where: { studentId: id } });
        await prisma.attendance.deleteMany({ where: { studentId: id } });
        await prisma.marks.deleteMany({ where: { studentId: id } });
        await prisma.studentInventory.deleteMany({ where: { studentId: id } });

        if (student) {
            await prisma.hostel.deleteMany({
                where: {
                    rollNo: student.rollNo,
                    standard: student.standard,
                    college: student.college
                }
            });
        }

        await prisma.student.delete({ where: { id } });

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
        remark,
        session: bodySession
    } = req.body;
    
    if (!fullName || !fullName.trim()) {
        return res.status(400).json({ error: "Full Name is required." });
    }

    if (!standard || !standard.trim()) {
        return res.status(400).json({ error: "Standard / Class is required." });
    }

    const session = bodySession || req.headers['x-session'] || req.query.session || req.session || "2026";
    const college = req.college || "svpcet";
    const std = standard.trim();

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

        // Check if student with same name already exists in this standard, session, and college
        const existingByName = await prisma.student.findFirst({
            where: {
                fullName: { equals: fullName.trim(), mode: 'insensitive' },
                standard: finalStandard,
                session,
                college
            }
        });
        if (existingByName) {
            return res.status(400).json({ error: `A student named '${fullName.trim()}' already exists in Class '${finalStandard}'.` });
        }

        let finalRollNo;
        if (rollNo && !isNaN(parseInt(rollNo))) {
            finalRollNo = parseInt(rollNo);
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
        } else {
            // Find max rollNo for this standard, session, and college and increment
            const maxRollStudent = await prisma.student.findFirst({
                where: { standard: finalStandard, session, college },
                orderBy: { rollNo: 'desc' }
            });
            finalRollNo = maxRollStudent ? maxRollStudent.rollNo + 1 : 1;
        }

        const validGender = (gender === "Female" || gender === "Male") ? gender : (gender ? ((gender.toLowerCase() === "female" || gender.toLowerCase() === "f") ? "Female" : (gender.toLowerCase() === "male" || gender.toLowerCase() === "m") ? "Male" : null) : null);
        let dob = null;
        if (dateOfBirth) {
            const parsedDob = new Date(dateOfBirth);
            if (!isNaN(parsedDob.getTime())) {
                dob = parsedDob;
            }
        }

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

// Search Students by Division or Name
router.get("/getallstudent", async (req, res) => {
    const { std, query } = req.query;
    const session = req.session;
    
    if (!session) {
        return res.status(400).json({ error: "Session not set. Please set a session first." });
    }
    
    try {
        const divTerm = (std || "").trim();
        const nameTerm = (query || "").trim();
        let whereClause = {
            session: session,
            college: req.college
        };

        if (divTerm && nameTerm) {
            // Both division and student name/rollNo specified: match division AND name/rollNo
            whereClause.standard = { contains: divTerm, mode: 'insensitive' };
            if (/^\d+$/.test(nameTerm)) {
                whereClause.OR = [
                    { rollNo: parseInt(nameTerm) },
                    { fullName: { contains: nameTerm, mode: 'insensitive' } }
                ];
            } else {
                whereClause.fullName = { contains: nameTerm, mode: 'insensitive' };
            }
        } else if (nameTerm) {
            // Only name/rollNo specified
            if (/^\d+$/.test(nameTerm)) {
                whereClause.OR = [
                    { rollNo: parseInt(nameTerm) },
                    { fullName: { contains: nameTerm, mode: 'insensitive' } }
                ];
            } else {
                whereClause.fullName = { contains: nameTerm, mode: 'insensitive' };
            }
        } else if (divTerm) {
            // Only division specified (or legacy single search param)
            whereClause.OR = [
                { standard: { contains: divTerm, mode: 'insensitive' } },
                { fullName: { contains: divTerm, mode: 'insensitive' } }
            ];
        }

        const result = await prisma.student.findMany({
            where: whereClause,
            include: {
                parents: true,
                fees: true,
                studentInventory: { include: { inventory: true } }
            },
            orderBy: [{ standard: 'asc' }, { rollNo: 'asc' }, { fullName: 'asc' }]
        });

        // Enrich with division / standard totalFees
        const standards = await prisma.standards.findMany({
            where: { college: req.college }
        });
        const feeMap = new Map();
        standards.forEach(stdObj => {
            if (stdObj.std) {
                feeMap.set(stdObj.std.trim().toLowerCase(), stdObj.totalFees || 0);
            }
        });

        const enrichedResult = result.map(s => {
            const stdKey = (s.standard || "").trim().toLowerCase();
            const standardTotalFees = feeMap.get(stdKey) ?? 0;
            return {
                ...s,
                standardTotalFees
            };
        });

        res.status(200).json(JSON.parse(JSON.stringify({ result: enrichedResult }, jsonBigIntReplacer)));
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({ error: "Failed to fetch students" });
    }
});


// Get searched student by rollno.:
router.get("/students/rollNo", async (req, res) => {
    const { rollno, standard } = req.query;
    const session = req.session;

    if (!session) {
        return res.status(400).json({ error: "Session not set. Please set a session first." });
    }

    try {
        const searchStds = await getSearchStandards(standard, req.college);
        const trimmedRoll = rollno !== undefined && rollno !== null ? String(rollno).trim() : "";

        // If rollno is not provided or is invalid ("NaN", "undefined", ""), return clear response
        if (!trimmedRoll || trimmedRoll === "NaN" || trimmedRoll === "undefined") {
            return res.status(400).json({ message: "A valid roll number is required." });
        }

        const whereClause = {
            standard: { in: searchStds },
            session: session,
            college: req.college
        };

        if (/^\d+$/.test(trimmedRoll)) {
            whereClause.rollNo = parseInt(trimmedRoll);
        } else {
            // If rollno is a student name
            whereClause.fullName = { contains: trimmedRoll, mode: 'insensitive' };
        }

        const student = await prisma.student.findFirst({
            where: whereClause,
            include: {
                parents: true,
                fees: true,
            },
        });

        if (student) {
            const stdObj = await prisma.standards.findFirst({
                where: { std: student.standard, college: req.college }
            });
            const enriched = {
                ...student,
                standardTotalFees: stdObj ? (stdObj.totalFees || 0) : 0
            };
            res.status(200).send(JSON.parse(JSON.stringify(enriched, jsonBigIntReplacer)));
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
    const session = req.session;

    try {
        const student = await prisma.student.findFirst({
            where: {
                rollNo: parseInt(rollNo),
                college: req.college,
                ...(session ? { session } : {})
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
        lunchAccepted,
        busAccepted,
        busStationId,
    } = req.body;

    try {
        let busPriceValue = undefined;
        if (req.body.busFee !== undefined || req.body.busPrice !== undefined) {
            const bVal = req.body.busFee !== undefined ? req.body.busFee : req.body.busPrice;
            busPriceValue = (!isNaN(parseFloat(bVal)) && parseFloat(bVal) >= 0) ? parseFloat(bVal) : null;
        } else if (busAccepted !== undefined) {
            if (busAccepted && busStationId) {
                const busStation = await prisma.busStation.findUnique({
                    where: { id: parseInt(busStationId) },
                });
                if (busStation) busPriceValue = busStation.price;
            } else {
                busPriceValue = null;
            }
        }

        let lunchPriceValue = undefined;
        if (req.body.lunchFee !== undefined || req.body.lunchPrice !== undefined) {
            const lVal = req.body.lunchFee !== undefined ? req.body.lunchFee : req.body.lunchPrice;
            lunchPriceValue = (!isNaN(parseFloat(lVal)) && parseFloat(lVal) >= 0) ? parseFloat(lVal) : null;
        } else if (lunchAccepted !== undefined) {
            if (lunchAccepted) {
                const controlSettings = await prisma.control.findFirst({
                    where: { college: req.college }
                });
                lunchPriceValue = controlSettings ? controlSettings.lunchFee : (req.body.lunchPrice ? parseFloat(req.body.lunchPrice) : null);
            } else {
                lunchPriceValue = null;
            }
        }

        const updateData = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (gender !== undefined) updateData.gender = gender;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = (dateOfBirth && !isNaN(new Date(dateOfBirth).getTime())) ? new Date(dateOfBirth) : null;
        if (rollNo !== undefined && !isNaN(parseInt(rollNo))) updateData.rollNo = parseInt(rollNo);
        if (nationality !== undefined) updateData.nationality = nationality;
        if (religion !== undefined) updateData.religion = religion;
        if (denomination !== undefined) updateData.denomination = denomination;
        if (language !== undefined) updateData.language = language;
        if (motherTongue !== undefined) updateData.motherTongue = motherTongue;
        if (standard !== undefined) updateData.standard = standard;
        if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
        if (scholarshipApplied !== undefined) updateData.scholarshipApplied = scholarshipApplied;
        if (remark !== undefined) updateData.remark = remark;
        if (residentialAddress !== undefined) updateData.residentialAddress = residentialAddress;
        if (correspondenceAddress !== undefined) updateData.correspondenceAddress = correspondenceAddress;
        if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
        if (lunchAccepted !== undefined) {
            updateData.lunchAccepted = lunchAccepted;
            updateData.lunchPrice = lunchPriceValue;
        }
        if (busAccepted !== undefined) {
            updateData.busAccepted = busAccepted;
            updateData.busStationId = (busAccepted && busStationId) ? parseInt(busStationId) : null;
            updateData.busPrice = busPriceValue;
        }

        const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
        if (!currentStudent) {
            return res.status(404).json({ error: "Student not found" });
        }

        if (fullName !== undefined || standard !== undefined) {
            const checkName = (fullName !== undefined ? fullName : currentStudent.fullName).trim();
            const checkStandard = (standard !== undefined ? standard : currentStudent.standard).trim();
            const duplicateStudent = await prisma.student.findFirst({
                where: {
                    id: { not: studentId },
                    fullName: { equals: checkName, mode: 'insensitive' },
                    standard: checkStandard,
                    session: currentStudent.session,
                    college: currentStudent.college
                }
            });
            if (duplicateStudent) {
                return res.status(400).json({ error: `A student named '${checkName}' already exists in Class '${checkStandard}'.` });
            }
        }

        if (rollNo !== undefined || standard !== undefined) {
            const checkRoll = (rollNo !== undefined && !isNaN(parseInt(rollNo))) ? parseInt(rollNo) : currentStudent.rollNo;
            const checkStandard = (standard !== undefined ? standard : currentStudent.standard).trim();
            const duplicateRoll = await prisma.student.findFirst({
                where: {
                    id: { not: studentId },
                    rollNo: checkRoll,
                    standard: checkStandard,
                    session: currentStudent.session,
                    college: currentStudent.college
                }
            });
            if (duplicateRoll) {
                return res.status(400).json({ error: `Roll No. ${checkRoll} is already assigned to '${duplicateRoll.fullName}' in Class '${checkStandard}'.` });
            }
        }

        // Update student details
        const updatedStudent = await prisma.student.update({
            where: { id: studentId },
            data: updateData,
        });

        // Update fee if feeAmount is specified
        if (req.body.feeAmount !== undefined) {
            const fAmount = parseFloat(req.body.feeAmount);
            if (!isNaN(fAmount) && fAmount >= 0) {
                const allFees = await prisma.fee.findMany({ where: { studentId } });
                if (allFees.length > 0) {
                    await prisma.fee.update({
                        where: { id: allFees[0].id },
                        data: { amount: fAmount }
                    });
                    if (allFees.length > 1) {
                        const extraIds = allFees.slice(1).map(f => f.id);
                        await prisma.fee.deleteMany({
                            where: { id: { in: extraIds } }
                        });
                    }
                } else if (fAmount > 0) {
                    await prisma.fee.create({
                        data: {
                            title: "General Fee",
                            amount: fAmount,
                            studentId: studentId,
                            college: currentStudent.college
                        }
                    });
                }
            }
        }

        // Update parent details
        let updatedParents = [];
        if (Array.isArray(parents)) {
            const existingParents = await prisma.parent.findMany({
                where: { studentId: studentId },
            });

            const parseBigIntContact = (val) => {
                if (val === null || val === undefined || val === "") return 0n;
                const clean = String(val).replace(/\D/g, "");
                if (!clean) return 0n;
                try {
                    return BigInt(clean);
                } catch {
                    return 0n;
                }
            };

            const parseNullableBigInt = (val) => {
                if (val === null || val === undefined || val === "") return null;
                const clean = String(val).replace(/\D/g, "");
                if (!clean) return null;
                try {
                    return BigInt(clean);
                } catch {
                    return null;
                }
            };

            const parseFloatNullable = (val) => {
                if (val === null || val === undefined || val === "") return null;
                const num = parseFloat(val);
                return isNaN(num) ? null : num;
            };

            for (let i = 0; i < parents.length; i++) {
                const parent = parents[i];
                if (!parent) continue;

                const fatherName = parent.fatherName ? String(parent.fatherName).trim() : "";
                const motherName = parent.motherName ? String(parent.motherName).trim() : "";
                const fatherContact = parseBigIntContact(parent.fatherContact);
                const motherContact = parseBigIntContact(parent.motherContact);
                const distanceFromSchool = parseFloatNullable(parent.distanceFromSchool);
                const preferredPhoneNumber = parseNullableBigInt(parent.preferredPhoneNumber);
                const address = parent.address ? String(parent.address).trim() : "";

                const hasInfo = Boolean(
                    fatherName ||
                    motherName ||
                    fatherContact !== 0n ||
                    motherContact !== 0n ||
                    address ||
                    distanceFromSchool !== null ||
                    preferredPhoneNumber !== null
                );

                let targetId = parent.id && !isNaN(parseInt(parent.id)) ? parseInt(parent.id) : null;
                if (!targetId && existingParents[i]) {
                    targetId = existingParents[i].id;
                }

                if (targetId) {
                    const updated = await prisma.parent.update({
                        where: { id: targetId },
                        data: {
                            fatherName: fatherName || "N/A",
                            motherName: motherName || "N/A",
                            fatherContact,
                            motherContact,
                            distanceFromSchool,
                            preferredPhoneNumber,
                            address: address || "N/A",
                        },
                    });
                    updatedParents.push(updated);
                } else if (hasInfo) {
                    const created = await prisma.parent.create({
                        data: {
                            fatherName: fatherName || "N/A",
                            motherName: motherName || "N/A",
                            fatherContact,
                            motherContact,
                            distanceFromSchool,
                            preferredPhoneNumber,
                            address: address || "N/A",
                            studentId: studentId,
                        },
                    });
                    updatedParents.push(created);
                }
            }
        }

        const response = {
            message: "Student updated successfully",
            student: updatedStudent,
            parents: updatedParents,
        };
        res.status(200).json(JSON.parse(JSON.stringify(response, jsonBigIntReplacer)));
    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ error: "Failed to update student" });
    }
});

module.exports = router;
