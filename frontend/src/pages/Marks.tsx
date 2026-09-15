import "../styles/marks.css";
import DownloadMarks from "../components/Marks/DownloadMarks";
import UploadMarks from "../components/Marks/UploadMarks";
import { useState, useEffect } from "react";
import { fetchStudents, fetchStandards } from "../apis/api";
import { useRecoilValue } from "recoil";
import axios from 'axios';
import { standardList } from "../store/store";

interface Subject {
  id: number;
  name: string;
  totalMarks: number;
}

interface Student {
  id: number;
  fullName: string;
  rollNo: number;
}

interface StudentMarks {
  [studentId: number]: {
    [subjectId: number]: number; // obtained marks
  };
}

interface SubjectTotals {
  [subjectId: number]: number; // total marks for each subject
}

const Marks: React.FC = () => {
  const [selectedStandard, setSelectedStandard] = useState<string>("");
  const [selectedStandardId, setSelectedStandardId] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [allStandardsData, setAllStandardsData] = useState<any[]>([]);
  const [filteredStandards, setFilteredStandards] = useState<any[]>([]);

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exam, setExam] = useState<string>("");
  const [marks, setMarks] = useState<StudentMarks>({});
  const [subjectTotals, setSubjectTotals] = useState<SubjectTotals>({});
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  // Fetch standards for the current session on mount
  useEffect(() => {
    const loadStandards = async () => {
      try {
        const response = await axios.get(`http://${window.location.hostname}:5000/control/standards`);
        const data = Array.isArray(response.data) ? response.data : (response.data.standard || []);
        setAllStandardsData(data);

        const cats = new Set<string>();
        data.forEach((s: any) => {
          if (s.category) cats.add(s.category);
          else cats.add("Uncategorized");
        });
        setCategories(Array.from(cats));
      } catch (error) {
        console.error("Error fetching standards:", error);
      }
    };
    loadStandards();
  }, []);

  // Fetch subjects with total marks based on selected standard ID
  const fetchSubjectsList = async (stdId: string) => {
    setLoadingSubjects(true);
    try {
      const response = await axios.get(`http://${window.location.hostname}:5000/api/subjects-by-stdid/${stdId}`);
      const subjectsData = response.data;
      setSubjects(subjectsData);
      
      // Initialize subject totals from the fetched data
      const totals: SubjectTotals = {};
      subjectsData.forEach((subject: Subject) => {
        totals[subject.id] = subject.totalMarks || 100;
      });
      setSubjectTotals(totals);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      alert("Failed to load subjects");
      setSubjects([]);
      setSubjectTotals({});
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Fetch students based on selected standard
  const fetchStudentsList = async (standard: string) => {
    try {
      const response = await fetchStudents(standard);
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
      alert("Failed to load students");
      setStudents([]);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCategory(value);
    setSelectedStandard("");
    setSelectedStandardId("");
    setMarks({});
    setExam("");
    setSubjects([]);
    setStudents([]);
    setSubjectTotals({});

    if (value) {
      const filtered = allStandardsData.filter(s => 
        s.category === value || (value === "Uncategorized" && !s.category)
      );
      setFilteredStandards(filtered);
    } else {
      setFilteredStandards([]);
    }
  };

  // Handle standard change
  const handleStandardChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stdIdValue = e.target.value;
    setSelectedStandardId(stdIdValue);
    setMarks({});
    setExam("");

    if (stdIdValue) {
      const selectedObj = allStandardsData.find(s => s.id.toString() === stdIdValue);
      if (selectedObj) {
        setSelectedStandard(selectedObj.std);
        await fetchSubjectsList(stdIdValue);
        await fetchStudentsList(selectedObj.std);
      }
    } else {
      setSelectedStandard("");
      setStudents([]);
      setSubjects([]);
      setSubjectTotals({});
    }
  };

  // Handle exam type change
  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setExam(e.target.value);
  };

  // Handle marks input change
  const handleMarksChange = (studentId: number, subjectId: number, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value);
    
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: numValue,
      },
    }));
  };

  // Calculate percentage for a student
  const calculatePercentage = (studentId: number): number => {
    const totalMarksSum = Object.values(subjectTotals).reduce((acc, total) => acc + total, 0);
    const obtainedMarksSum = Object.values(marks[studentId] || {}).reduce((acc, mark) => acc + mark, 0);
    return totalMarksSum > 0 ? Math.round((obtainedMarksSum / totalMarksSum) * 100) : 0;
  };

  // Validate marks for a student
  const validateStudentMarks = (studentId: number): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    subjects.forEach((subject) => {
      const obtainedMarks = marks[studentId]?.[subject.id] || 0;
      const totalMarks = subjectTotals[subject.id] || 100;

      if (obtainedMarks < 0) {
        errors.push(`${subject.name}: Marks cannot be negative`);
      }
      if (obtainedMarks > totalMarks) {
        errors.push(`${subject.name}: Marks (${obtainedMarks}) cannot exceed total marks (${totalMarks})`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  // Submit marks for a single student
  const handleSubmitStudent = async (studentId: number) => {
    try {
      if (!exam) {
        alert("Please select examination type");
        return;
      }

      const validation = validateStudentMarks(studentId);
      if (!validation.valid) {
        alert("Validation errors:\n" + validation.errors.join("\n"));
        return;
      }

      setSubmitting(true);
      setSubmitMessage("");

      const marksData = subjects.map((subject) => ({
        subjectId: subject.id,
        subjectName: subject.name,
        obtainedMarks: marks[studentId]?.[subject.id] || 0,
        totalMarks: subjectTotals[subject.id] || 100,
      }));

      const response = await axios.post(
        `http://${window.location.hostname}:5000/api/marks/bulk/${studentId}`,
        { marksData, examinationType: exam }
      );

      if (response.status === 201) {
        setSubmitMessage(`✓ Marks submitted successfully for student ${studentId}`);
        // Clear marks for this student
        const updatedMarks = { ...marks };
        delete updatedMarks[studentId];
        setMarks(updatedMarks);
        
        // Show success message for few seconds
        setTimeout(() => setSubmitMessage(""), 3000);
      }
    } catch (error: any) {
      console.error("Error submitting marks:", error);
      const errorMsg = error.response?.data?.error || "Error submitting marks";
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit marks for all students
  const handleSubmitAll = async () => {
    try {
      if (!exam) {
        alert("Please select examination type");
        return;
      }

      const studentsToSubmit = students.filter(s => marks[s.id]);
      if (studentsToSubmit.length === 0) {
        alert("No students have marks entered");
        return;
      }

      setSubmitting(true);
      setSubmitMessage("");

      let successCount = 0;
      let errorCount = 0;

      for (const student of studentsToSubmit) {
        try {
          const validation = validateStudentMarks(student.id);
          if (!validation.valid) {
            console.warn(`Skipping student ${student.id}: ${validation.errors.join(", ")}`);
            errorCount++;
            continue;
          }

          const marksData = subjects.map((subject) => ({
            subjectId: subject.id,
            subjectName: subject.name,
            obtainedMarks: marks[student.id]?.[subject.id] || 0,
            totalMarks: subjectTotals[subject.id] || 100,
          }));

          await axios.post(
            `http://${window.location.hostname}:5000/api/marks/bulk/${student.id}`,
            { marksData, examinationType: exam }
          );

          successCount++;
        } catch (error) {
          console.error(`Error for student ${student.id}:`, error);
          errorCount++;
        }
      }

      const message = `Marks submitted: ${successCount} successful${errorCount > 0 ? `, ${errorCount} failed` : ""}`;
      setSubmitMessage(message);
      alert(message);

      // Clear all marks
      if (successCount > 0) {
        setMarks({});
      }
    } catch (error) {
      console.error("Error submitting bulk marks:", error);
      alert("Error submitting marks");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="global-container">
      <div className="import_export">
        <div className="innerbox">
          <h2>Download Marks Data</h2>
          <DownloadMarks />
        </div>
        <div className="innerbox">
          <h2>Upload Marks Data</h2>
          <UploadMarks />
        </div>
      </div>

      <div className="global-container">
        <h2>Bulk Student Marks Entry</h2>
        
        {/* Filters Section */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label htmlFor="category" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Select Category:
              </label>
              <select
                id="category"
                name="category"
                value={selectedCategory}
                onChange={handleCategoryChange}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Select category</option>
                {categories.map((cat: string) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1', minWidth: '200px' }}>
              <label htmlFor="standard" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Select Standard:
              </label>
              <select
                id="standard"
                name="standard"
                value={selectedStandardId}
                onChange={handleStandardChange}
                disabled={!selectedCategory}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Select standard</option>
                {filteredStandards.map((stdObj: any) => (
                  <option key={stdObj.id} value={stdObj.id}>
                    {stdObj.std}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1', minWidth: '200px' }}>
              <label htmlFor="exam" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Examination Type:
              </label>
              <select
                id="exam"
                name="examinationType"
                required
                value={exam}
                onChange={handleExamChange}
                disabled={!selectedStandard}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Select Examination Type</option>
                <option value="Annual">Annual</option>
                <option value="First Semester">First Semester</option>
                <option value="Second Semester">Second Semester</option>
                <option value="Final Semester">Final Semester</option>
              </select>
            </div>
          </div>

          {loadingSubjects && <p style={{ color: '#666' }}>Loading subjects...</p>}
          {selectedStandard && subjects.length > 0 && (
            <p style={{ margin: '10px 0', color: '#666' }}>
              <strong>Subjects:</strong> {subjects.map(s => `${s.name} (${s.totalMarks || 100})`).join(", ")}
            </p>
          )}
        </div>

        {/* Submit Message */}
        {submitMessage && (
          <div style={{ 
            padding: '10px', 
            marginBottom: '10px', 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            borderRadius: '4px',
            border: '1px solid #c3e6cb'
          }}>
            {submitMessage}
          </div>
        )}

        {/* Marks Entry Table */}
        {selectedStandard && exam && subjects.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="AttendanceTable" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Roll No</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Student Name</th>
                  {subjects.map((subject) => (
                    <th key={subject.id} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', minWidth: '120px' }}>
                      <div>{subject.name}</div>
                      <div style={{ fontSize: '0.85em', color: '#666', marginTop: '3px' }}>
                        (Total: {subject.totalMarks || 100})
                      </div>
                    </th>
                  ))}
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', minWidth: '120px' }}>Percentage (%)</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', minWidth: '100px' }}>Submit</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} style={{ backgroundColor: '#fff' }}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{student.rollNo}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{student.fullName}</td>
                    {subjects.map((subject) => (
                      <td key={subject.id} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          max={subjectTotals[subject.id] || 100}
                          step="0.5"
                          placeholder="0"
                          value={marks[student.id]?.[subject.id] || ""}
                          onChange={(e) =>
                            handleMarksChange(student.id, subject.id, e.target.value)
                          }
                          style={{
                            width: '80px',
                            padding: '6px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            textAlign: 'center'
                          }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                      {calculatePercentage(student.id)}%
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <button
                        onClick={() => handleSubmitStudent(student.id)}
                        disabled={submitting || !marks[student.id]}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: !marks[student.id] ? '#ccc' : '#007bff',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: !marks[student.id] ? 'not-allowed' : 'pointer',
                          fontSize: '0.9em'
                        }}
                      >
                        {submitting ? "..." : "Submit"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bulk Submit Button */}
            {students.length > 0 && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  onClick={handleSubmitAll}
                  disabled={submitting || Object.keys(marks).length === 0}
                  style={{
                    padding: '10px 30px',
                    backgroundColor: Object.keys(marks).length === 0 ? '#ccc' : '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: Object.keys(marks).length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '1em',
                    fontWeight: 'bold'
                  }}
                >
                  {submitting ? "Submitting..." : `Submit All Marks (${Object.keys(marks).length} students)`}
                </button>
              </div>
            )}
          </div>
        )}

        {selectedStandard && students.length === 0 && !loadingSubjects && (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
            No students found for selected standard
          </p>
        )}

        {selectedStandard && subjects.length === 0 && !loadingSubjects && (
          <p style={{ textAlign: 'center', color: '#dc3545', marginTop: '20px' }}>
            No subjects found for this standard. Please add subjects in the Control Panel first.
          </p>
        )}

        {selectedStandard && subjects.length > 0 && students.length > 0 && !exam && (
          <p style={{ textAlign: 'center', color: '#007bff', marginTop: '20px', fontWeight: 'bold' }}>
            Please select an Examination Type to view the students and enter marks.
          </p>
        )}
      </div>
    </div>
  );
};

export default Marks;
