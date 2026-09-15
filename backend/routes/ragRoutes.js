const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { ChatOllama } = require("@langchain/ollama");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");

const prisma = new PrismaClient();

const llm = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: "gemma3:1b", // Smaller model for much faster responses
});

// Helper function to get context from the database
async function getSchoolContext(query) {
    try {
        let context = "";
        const lowerQuery = query.toLowerCase();

        // 1. Fee related context
        if (lowerQuery.includes("fee") || lowerQuery.includes("remaining") || lowerQuery.includes("paid")) {
            const standards = await prisma.standards.findMany();
            const control = await prisma.control.findFirst();

            const standardsInfo = standards.map(s => `Standard: ${s.std}`).join("\n");
            context += `Available Standards in School:\n${standardsInfo}\n\n`;

            if (control && control.TotalFees) {
                context += `General School Total Fees: ${control.TotalFees}\n\n`;
            }

            // Fetch students to check for individual fee status
            const students = await prisma.student.findMany({
                include: { fees: true },
                take: 10 // Limit context size
            });

            const studentData = students.map(s => {
                const paid = s.fees.reduce((sum, f) => sum + f.amount, 0);
                return `Student: ${s.fullName}, Roll: ${s.rollNo}, Standard: ${s.standard}, Fees Paid so far: ${paid}`;
            }).join("\n");

            context += `Individual Student Fee Status:\n${studentData}\n\n`;
        }

        // 2. Student count and general student info
        if (lowerQuery.includes("student") || lowerQuery.includes("total") || lowerQuery.includes("count") || lowerQuery.includes("number") || lowerQuery.includes("many") || lowerQuery.includes("who") || lowerQuery.includes("list") || lowerQuery.includes("name")) {
            const studentCount = await prisma.student.count();
            context += `Total Students Enrolled: ${studentCount}\n\n`;

            const studentsByStandard = await prisma.student.groupBy({
                by: ['standard'],
                _count: {
                    _all: true
                }
            });

            const breakdown = studentsByStandard.map(s => `Standard ${s.standard}: ${s._count._all} students`).join("\n");
            context += `Student Breakdown by Standard:\n${breakdown}\n\n`;

            // List of student names if specifically asked or for general query
            if (lowerQuery.includes("who") || lowerQuery.includes("name") || lowerQuery.includes("list") || studentCount < 20) {
                const students = await prisma.student.findMany({
                    select: { fullName: true, rollNo: true, standard: true },
                    take: 50
                });
                const studentList = students.map(s => `- ${s.fullName} (Roll: ${s.rollNo}, Std: ${s.standard})`).join("\n");
                context += `List of Students:\n${studentList}\n\n`;
            }
        }

        // 3. Hostel related info
        if (lowerQuery.includes("hostel") || lowerQuery.includes("bed")) {
            const control = await prisma.control.findFirst();
            const hostelCount = await prisma.hostel.count();
            if (control) {
                context += `Hostel Info: Total Beds: ${control.number_of_hostel_bed}, Occupied: ${hostelCount}, Available: ${control.number_of_hostel_bed - hostelCount}\n`;
            }
        }

        return context || "No specific database context found for this query. Provide general guidance based on the ERP structure.";
    } catch (error) {
        console.error("Context retrieval error:", error);
        return "Error retrieving data from the school system.";
    }
}

router.post("/api/chat", async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        const context = await getSchoolContext(message);

        const template = `
    You are a professional School AI Assistant. 
    Your goal is to provide CLEAR, CONCISE, and EASY-TO-READ answers about students, fees, and school info.
    
    Rules for response:
    1. Use Markdown Tables for data comparisons or fee structures.
    2. Use Bulleted Lists for names or lists of items.
    3. Be direct. Avoid long introductory sentences.
    4. If student details are requested, present them in a clean list or table.
    
    Context:
    {context}
    
    User Question: {question}
    
    Assistant:`;

        const prompt = PromptTemplate.fromTemplate(template);
        const chain = prompt.pipe(llm).pipe(new StringOutputParser());

        const response = await chain.invoke({
            context: context,
            question: message,
        });

        res.json({ response });
    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ error: "Failed to process chat", details: error.message });
    }
});

module.exports = router;
