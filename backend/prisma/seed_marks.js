const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const session = "2025-2026";
  
  // Ensure standards exist
  const standardsList = ["1", "2", "3"];
  for (const std of standardsList) {
    await prisma.standards.upsert({
      where: { std: std },
      update: {},
      create: { std: std, category: "General", totalFees: 5000 }
    });
  }

  // Ensure subjects exist for standard "1"
  const subjects = ["Math", "Science", "English"];
  for (const subName of subjects) {
    const existingSubject = await prisma.subject.findFirst({
        where: { name: subName, stdId: "1" }
    });
    if (!existingSubject) {
        await prisma.subject.create({
            data: {
              name: subName,
              stdId: "1"
            }
          });
    }
  }

  const fetchedSubjects = await prisma.subject.findMany({ where: { stdId: "1" } });

  // Create some students in standard "1"
  const studentsData = [
    { fullName: "John Doe", rollNo: 101, standard: "1", session: session, scholarshipApplied: false, status: "None", gender: "Male" },
    { fullName: "Jane Smith", rollNo: 102, standard: "1", session: session, scholarshipApplied: false, status: "None", gender: "Female" },
    { fullName: "Bob Johnson", rollNo: 103, standard: "1", session: session, scholarshipApplied: false, status: "None", gender: "Male" },
    { fullName: "Alice Brown", rollNo: 104, standard: "1", session: session, scholarshipApplied: false, status: "None", gender: "Female" },
  ];

  for (const s of studentsData) {
    const student = await prisma.student.upsert({
      where: { standard_rollNo_session: { standard: s.standard, rollNo: s.rollNo, session: s.session } },
      update: { gender: s.gender },
      create: s
    });

    // Add marks for "Final Semester"
    const marksMapping = {
      "John Doe": 48, // 48/60 = 80%
      "Jane Smith": 36, // 36/60 = 60%
      "Bob Johnson": 24, // 24/60 = 40%
      "Alice Brown": 18, // 18/60 = 30%
    };

    const obtained = marksMapping[s.fullName];

    for (const sub of fetchedSubjects) {
      await prisma.marks.upsert({
        where: {
          studentId_subjectId_examinationType: {
            studentId: student.id,
            subjectId: sub.id,
            examinationType: "Final Semester"
          }
        },
        update: {
          obtainedMarks: obtained,
          totalMarks: 60,
          percentage: (obtained / 60) * 100
        },
        create: {
          studentId: student.id,
          subjectId: sub.id,
          subjectName: sub.name,
          examinationType: "Final Semester",
          obtainedMarks: obtained,
          totalMarks: 60,
          percentage: (obtained / 60) * 100
        }
      });
    }
  }

  console.log("✓ Successfully seeded students and marks for Final Semester in Class 1");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
