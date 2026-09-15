/* Hostel Model */
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const ExcelJS = require("exceljs");
const path = require("path");
 
const prisma = new PrismaClient();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Get Hostel Data
router.get('/gethosteldata', async (req, res) => {
    try {
      const result = await prisma.hostel.findMany({ where: { college: req.college } });
      const hostelRes = await prisma.control.findFirst({
        where: { session: { year: req.session, college: req.college }, college: req.college }
      });
      const n = hostelRes.number_of_hostel_bed ?? 0;
      const available = [];
      for (let i = 1; i <= n ; i++) {
        available.push(i);
      }
  
      available.forEach((e) => {
        result.forEach((v) => {
          if (e === v.bed_number) {
            let index = available.indexOf(e);
            available[index] = 0;
          }
        });
      });
  
      res.status(201).json({ result, available });
    } catch (error) {
      console.error("Error fetching hostel data: ", error); // Detailed logging
      res.status(500).json({ error: 'An error occurred while fetching the hostel data.' });
    }
  });
  
  // Posting Hostel Data
  router.post("/hosteldata",async (req, res)=>{
  
    const { name, rollNo, standard, gender, bed_no } = req.body;
  
    try {
        const result = await prisma.hostel.create({
            data: {
                name : name,
                standard: standard,
                gender : gender,
                bed_number: bed_no,
                rollNo : parseInt(rollNo),
                college: req.college
            },
        });
       
        res.status(201).json(result);
    }catch (error) {
        console.log(error);
        res.status(500).json({ error: "An error occurred while creating the hostel data entry." });
    }
  });
  
  // Update Hostel Data
  router.post("/updatehostel",async (req, res)=>{
  
    const { rollNo, standard, bed_no} = req.body;
    try {
        const result = await prisma.hostel.update({
            where : {
              rollNo_standard_college : {
                rollNo : parseInt(rollNo),
                standard : standard,
                college: req.college
              }
            },
            data: {
              bed_number: bed_no,
            },
        });
       
        res.status(201).json(result);
    }catch (error) {
        console.log(error);
        res.status(500).json({ error: "An error occurred while updating the hostel data entry." });
    }
  });
  
  // Delete Route for Hostel Data
  router.post("/hostel/delete" , async(req, res)=>{
      const {rollNo, bed_no } = req.body;
  
      try{
          const result = await prisma.hostel.delete({
            where :{
              rollNo_standard_college : {
                rollNo : parseInt(rollNo),
                standard : req.body.standard, // Assuming standard is passed too, wait...
                college: req.college
              }
            }
          })
          res.status(201).json(result)
      }catch(error){
        res.status(404).json({message : error})
      }
  })

  router.get("/downloadhosteldata", async (req, res) => {
    try {
      const feeRecord = await prisma.hostel.findMany({ where: { college: req.college } });
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Hostel");
  
      worksheet.columns = [
        { header: "id", key: "id", width: 30 },
        { header: "name", key: "name", width: 15 },
        { header: "rollNo", key: "rollNo", width: 30 },
        { header: "standard", key: "standard", width: 20 },
        { header: "gender", key: "gender", width: 10 },
        { header: "bed_number ", key: "bed_number", width: 10 },
      ];
  
      feeRecord.forEach((record) => {
        worksheet.addRow({
          id                  : record.id,
          name                : record.name,
          rollNo              : record.rollNo,
          standard            : record.standard,
          gender              : record.gender,
          bed_number          : record.bed_number
      })});
  
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=Hostel.xlsx"
      );
      
      await workbook.xlsx.write(res);
      res.end();
    }catch (error) {
      console.error("Error generating attendance Excel file:", error);
      res.status(500).send("Failed to generate Excel file");
    }
  });

  module.exports = router;