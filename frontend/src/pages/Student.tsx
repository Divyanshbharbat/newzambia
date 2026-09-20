import React, { useCallback, useEffect, useState } from "react";
import { createStudent, uploadPhoto, fetchStandardsByCategory, fetchCategories, getAllStandards, updateStudent } from "../apis/api";
import "../styles/student.css";
import UploadStudents from "../components/Student/AppendStudentExcel";
import StudentsInfoDownload from "../components/Student/RetriveStudentExcel";
import axios from "axios";
import { useRecoilValue } from "recoil";
import { installmentArr } from "../store/store";

interface Student {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  rollNo: string;
  standard: string;
  bloodGroup?: string;
  scholarshipApplied: boolean;
  lunchAccepted?: boolean;
  busAccepted?: boolean;
  busStationId?: number;
  photoUrl?: string;
  residentialAddress?: string;
  correspondenceAddress?: string;
  remark:string;
  nationality?:string;
  religion?:string;
  denomination?:string;
  language?:string;
  motherTongue?:string;
  parents: Parent[];
  fees: Fee[];
}

interface Parent {
  studentId: number;
  fatherName: string;
  motherName: string;
  fatherContact: string;
  motherContact: string;
  distanceFromSchool?: string;
  preferredPhoneNumber?: string;
  address: string;
}

interface Fee {
  installmentType: string;
  amount: number;
  amountDate: string;
  admissionDate: string;
}

interface SubjectMark {
  name: string;
  marks: number;
  total: number;
}

const Student: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<Record<number, { selected: boolean; size?: string; quantity?: number }>>({});
  const [standardTotalFees, setStandardTotalFees] = useState<number>(0);
  const [showMarksheetForm, setShowMarksheetForm] = useState(false);
  const [showTCForm, setShowTCForm] = useState(false);
  const [showMarksheet, setShowMarksheet] = useState(false);
  const [marksheetError, setMarksheetError] = useState('');
  const [marksheet, setMarksheet] = useState({
    schoolName: 'ST. VINCENT PALLOTTI CATHOLIC SCHOOL WESTWOOD, LUSAKA, ZAMBIA',
    studentName: '',
    class: '',
    rollNo: '',
    subjects: [] as SubjectMark[],
    result: ''
  });
  const [selectedMarksheetExam, setSelectedMarksheetExam] = useState('Annual');
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [tc, setTc] = useState({
    schoolName: 'ST. VINCENT PALLOTTI CATHOLIC SCHOOL WESTWOOD, LUSAKA, ZAMBIA',
    schoolAddress: 'WESTWOOD, LUSAKA, ZAMBIA',
    schoolLogo: '',
    email: 'stvincentpzambia@yahoo.com',
    rollNo: '',
    class: '',
    studentName: '',
    fatherName: '',
    motherName: '',
    nationality: '',
    dateOfBirth: '',
    admittedClass: '',
    presentGrade: '',
    lastAttendanceDate: '',
    annualResult: '',
    remarks: '',
    admissionNo: ''
  });
  const [student, setStudent] = useState<Student>({
    fullName: "",
    gender: "Male",
    dateOfBirth: "",
    rollNo: "",
    standard: "",
    bloodGroup: "",
    scholarshipApplied: false,
    lunchAccepted: false,
    busAccepted: false,
    busStationId: undefined,
    residentialAddress: "",
    correspondenceAddress: "",
    photoUrl: "",
    nationality: "",
    religion:"",
    denomination: "",
    language: "",
    motherTongue: "",
    parents: [
      {
        fatherName: "",
        motherName: "",
        fatherContact: "",
        motherContact: "",
        distanceFromSchool: "",
        preferredPhoneNumber: "",
        address: "",
        studentId: 0,
      },
    ],
    fees: [
      {
        installmentType: "",
        amount: 0,
        amountDate: "",
        admissionDate: "",
      },
    ],
    remark :""
  });
  
  const [classes, setClasses] = useState<string[]>([]);
  const [standardsByCategory, setStandardsByCategory] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const installmentArray = useRecoilValue(installmentArr);

  useEffect(()=>{
    async function fetchSubjects() {
      try {
        const response = await axios.get(`http://${window.location.hostname}:5000/getsubjects`);
        setSubjects(response.data);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    }
    async function loadCategories() {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    }
    
    async function fetchStandards() {
      try {
        const data = await getAllStandards();
        let arr: any = [];
        if (Array.isArray(data)) {
          arr = data;
        } else if (data && Array.isArray(data.standard)) {
          arr = data.standard;
        }
        const mapped = arr.map((s: any) => (s.std ? s.std : s));
        setClasses(mapped);
      } catch (err) {
        console.error('Error fetching standards in Student.tsx', err);
      }
    }

    async function fetchInventory() {
      try {
        const res = await axios.get(`http://${window.location.hostname}:5000/inventory`);
        setInventoryItems(res.data || []);
      } catch (err) {
        console.error('Error fetching inventory', err);
      }
    }

    fetchSubjects();
    loadCategories();
    fetchStandards();
    fetchInventory();

    window.addEventListener('standardsUpdated', fetchStandards);
    return () => {
      window.removeEventListener('standardsUpdated', fetchStandards);
    };
  },[])

  // Auto-fill marksheet student details on blur
  // Auto-fill TC student details when both class and rollNo are entered
  useEffect(() => {
    if (tc.rollNo.trim() && tc.class.trim()) {
      handleTcRollNoBlur();
    }
  }, [tc.rollNo, tc.class]);

  // Fetch totalFees for selected standard
  useEffect(() => {
    if (student.standard) {
      async function fetchStandardTotalFees() {
        try {
          const response = await axios.get(`http://${window.location.hostname}:5000/standard/${student.standard}`);
          const totalFees = response.data?.totalFees || 0;
          setStandardTotalFees(totalFees);
        } catch (err) {
          console.error('Error fetching standard total fees', err);
        }
      }
      fetchStandardTotalFees();
    }
  }, [student.standard]);
  

  const handleSubmit = async () => {
    // Validation: Student Full Name and Standard are required
    if (!student.fullName || !student.fullName.trim()) { 
      alert("Student Full Name is required."); 
      return; 
    }
    if (!student.standard || !student.standard.trim()) {
      alert("Division / Standard is required. Please select a Division.");
      return;
    }
    try {
      // prepare inventory selections
      const inventorySelections = Object.entries(selectedInventory)
        .map(([key, val]) => ({ inventoryId: parseInt(key), size: val.size, quantity: val.quantity }))
        .filter((s) => s.quantity && s.quantity > 0);

      const currentSession = localStorage.getItem("selectedSession") || "2026";
      // Fees are NOT paid automatically upon registration; installments are recorded manually in Fees section
      await createStudent(({ 
        ...student, 
        fees: [],
        session: currentSession, 
        inventorySelections 
      } as any));
      alert("Student created successfully");
      resetForm();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || error.message || "Failed to create student");
    }
  };

  const handleQueryChange = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length > 0) {
      try {
        const resp = await axios.get(`http://${window.location.hostname}:5000/fees/suggestions`, {
          params: { query: val, standard: selectedDivision }
        });
        setSuggestions(resp.data || []);
        setShowSuggestions(true);
      } catch (e) {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = async (item: any) => {
    setSearchQuery(item.fullName);
    if (item.standard) setSelectedDivision(item.standard);
    setShowSuggestions(false);
    handleSearchStudents(item.fullName, item.standard);
  };

  const handleSearchStudents = async (queryVal?: string, divVal?: string) => {
    const term = (queryVal !== undefined ? queryVal : searchQuery).trim();
    const div = (divVal !== undefined ? divVal : selectedDivision).trim();
    setIsSearching(true);
    setShowSuggestions(false);
    try {
      const resp = await axios.get(`http://${window.location.hostname}:5000/getallstudent`, {
        params: { 
          std: div || undefined, 
          query: term || undefined 
        }
      });
      setSearchResults(resp.data.result || []);
    } catch (err) {
      console.error("Error searching students:", err);
      alert("Error searching students");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSelectedDivision("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchResults([]);
    setEditingStudent(null);
  };

  const handleEditClick = (st: any) => {
    const dobFormatted = st.dateOfBirth ? new Date(st.dateOfBirth).toISOString().split('T')[0] : "";
    setEditingStudent({
      ...st,
      dateOfBirth: dobFormatted,
      parents: (st.parents && st.parents.length > 0) ? st.parents : [{
        fatherName: "",
        motherName: "",
        fatherContact: "",
        motherContact: "",
        distanceFromSchool: "",
        preferredPhoneNumber: "",
        address: ""
      }]
    });
  };

  const handleSaveStudentEdit = async () => {
    if (!editingStudent || !editingStudent.id) return;
    try {
      await updateStudent(editingStudent.id, editingStudent);
      alert("Student updated successfully!");
      setEditingStudent(null);
      handleSearchStudents(searchQuery);
    } catch (err: any) {
      console.error("Error updating student:", err);
      alert("Failed to update student: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    try {
      await axios.delete(`http://${window.location.hostname}:5000/delete/students`, {
        params: { studentId }
      });
      alert("Student deleted successfully");
      handleSearchStudents(searchQuery);
    } catch (err) {
      console.error("Error deleting student:", err);
      alert("Failed to delete student");
    }
  };

  const resetForm = () => {
    setStudent({
      fullName: "",
      gender: "Male",
      dateOfBirth: "",
      rollNo: "",
      standard: "",
      bloodGroup: "",
      scholarshipApplied: false,
      lunchAccepted: false,
      busAccepted: false,
      busStationId: undefined,
      residentialAddress: "",
      correspondenceAddress: "",
      photoUrl: "",
      nationality: "",
      religion:"",
      denomination: "",
      language: "",
      motherTongue: "",
      parents: [
        {
          fatherName: "",
          motherName: "",
          fatherContact: "",
          motherContact: "",
          distanceFromSchool: "",
          preferredPhoneNumber: "",
          address: "",
          studentId: 0,
        },
      ],
      fees: [
        {
          installmentType: "",
          amount: 0,
          amountDate: "",
          admissionDate: "",
        },
      ],
      remark :""
    });
    setSelectedInventory({});
    setSelectedCategory("");
    setStandardTotalFees(0);
  };

  const handleParentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number) => {
      const { name, value } = e.target;
      const newParents = [...student.parents];
      newParents[index] = { ...newParents[index], [name]: value };
      setStudent((prev) => ({ ...prev, parents: newParents }));
    },
    [student]
  );
  

  const handleFeeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const { name, value } = e.target;
    const newFees = [...student.fees];
    newFees[index] = { ...newFees[index], [name]: value };
    setStudent((prev) => ({ ...prev, fees: newFees }));
  };

  const handleFeeChange2 = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, index: number) => {
    const { name, value } = e.target;
    const updatedFees = [...student.fees]; // Create a copy of the fees array
    
    // Update the fee object at the specified index with the new value
    updatedFees[index] = { ...updatedFees[index], [name]: value };
    
    // Set the updated fees back into the student state
    setStudent((prevState) => ({
      ...prevState,
      fees: updatedFees, // Update only the fees field
    }));
  };
  


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const photoUrl = await uploadPhoto(file);
        setStudent((prev) => ({ ...prev, photoUrl }));
      } catch (error) {
        console.error("Error uploading image:", error);
        alert('Failed to upload image');
      }
    }
  };

  const handleMarksheetChange = (e: React.ChangeEvent<any>, field: string) => {
    setMarksheet((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // Subject helper functions removed (unused)

  const saveMarksheet = async () => {
    if (!marksheet.rollNo || !marksheet.class || marksheet.subjects.length === 0) {
      alert('Please fill in roll number, class, and add subjects.');
      return;
    }

    try {
      // Fetch student by rollNo and class
      const response = await axios.get(`http://${window.location.hostname}:5000/students/rollNo?rollno=${marksheet.rollNo}&standard=${marksheet.class}`);
      if (response.status !== 200 || !response.data || response.data.message) {
        alert('Student not found.');
        return;
      }
      const student = response.data;
      const studentId = student.id;

      // For each subject, find subjectId and save
      for (const subj of marksheet.subjects) {
        const subject = subjects.find(s => s.name === subj.name && s.stdId === marksheet.class);
        if (!subject) {
          alert(`Subject ${subj.name} not found for class ${marksheet.class}.`);
          continue;
        }
        const subjectId = subject.id;
        const percentage = subj.total > 0 ? (subj.marks / subj.total) * 100 : 0;

        await axios.post(`http://${window.location.hostname}:5000/api/marks`, {
          studentId,
          subjectId,
          subjectName: subj.name,
          examinationType: selectedMarksheetExam,
          obtainedMarks: subj.marks,
          totalMarks: subj.total,
          percentage
        });
      }

      alert('Marksheet saved successfully.');
    } catch (error: any) {
      console.error('Error saving marksheet:', error);
      alert(`Failed to save marksheet: ${error.response?.data?.error || error.message}`);
    }
  };

  const downloadMarksheet = () => {
    window.print();
  };

  const handleMarksheetRollNoBlur = async () => {
     await fetchMarksForMarksheet(selectedMarksheetExam);
  };

  const fetchMarksForMarksheet = async (examType: string) => {
    if (!marksheet.rollNo.trim() || !marksheet.class.trim()) {
      return;
    }

    try {
      const response = await axios.get(`http://${window.location.hostname}:5000/students/rollNo?rollno=${marksheet.rollNo}&standard=${marksheet.class}`);
      if (response.status === 200 && response.data && !response.data.message) {
        const student = response.data;
        const studentId = student.id;
        setMarksheet((prev) => ({
          ...prev,
          studentName: student.fullName || ''
        }));
        setMarksheetError('');
        // Fetch marks and populate subjects
        try {
          const marksResponse = await axios.get(`http://${window.location.hostname}:5000/api/marks/${studentId}?examinationType=${examType}`);
          const marks = marksResponse.data;
          const subjectsFromMarks = marks.map((m: any) => ({ name: m.subjectName, marks: m.obtainedMarks, total: m.totalMarks }));
          setMarksheet((prev) => ({ ...prev, subjects: subjectsFromMarks }));
        } catch (marksError) {
          console.error('Error fetching marks:', marksError);
          setMarksheet((prev) => ({ ...prev, subjects: [] }));
        }
      } else {
        setMarksheetError('Student not exist');
        setMarksheet((prev) => ({ ...prev, studentName: '', subjects: [] }));
      }
    } catch (error) {
      console.error('Error fetching student for marksheet:', error);
      alert('Error fetching student.');
    }
  };

  const handleTcChange = (e: React.ChangeEvent<any>, field: string) => {
    setTc((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleTcRollNoBlur = async () => {
    if (!tc.rollNo.trim() || !tc.class.trim()) {
      return;
    }

    try {
      const response = await axios.get(`http://${window.location.hostname}:5000/students/rollNo?rollno=${tc.rollNo}&standard=${tc.class}`);
      if (response.status === 200 && response.data && !response.data.message) {
        const student = response.data;
        const studentId = student.id;
        setTc((prev) => ({
          ...prev,
          studentName: student.fullName || '',
          nationality: student.nationality || '',
          dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
          admittedClass: student.standard || '',
          admissionNo: student.id.toString(),
          fatherName: student.parents?.[0]?.fatherName || '',
          motherName: student.parents?.[0]?.motherName || ''
        }));

        // Fetch institution details - only overwrite if we have real data (not defaults)
        try {
          const configRes = await axios.get(`http://${window.location.hostname}:5000/api/config?college=${localStorage.getItem('userCollege') || ''}&session=${localStorage.getItem('selectedSession') || ''}`);
          if (configRes.data) {
            setTc(prev => ({
              ...prev,
              schoolName: (configRes.data.Institution_name && configRes.data.Institution_name !== 'School') ? configRes.data.Institution_name : prev.schoolName,
              schoolAddress: (configRes.data.SchoolAddress && configRes.data.SchoolAddress !== 'Address') ? configRes.data.SchoolAddress : prev.schoolAddress,
              schoolLogo: configRes.data.SchoolLogo || prev.schoolLogo
            }));
          }
        } catch (e) { console.error('Error fetching config for TC:', e); }

        // Fetch marks and calculate annual result and grade
        try {
          const marksResponse = await axios.get(`http://${window.location.hostname}:5000/api/marks/${studentId}`);
          const marks = marksResponse.data;
          
          // Filter for Final exam or Annual if possible, or just use all
          const finalMarks = marks.filter((m: any) => m.examinationType === 'Annual' || m.examinationType === 'Final Semester');
          const sourceMarks = finalMarks.length > 0 ? finalMarks : marks;

          const totalObtained = sourceMarks.reduce((sum: number, m: any) => sum + m.obtainedMarks, 0);
          const totalPossible = sourceMarks.reduce((sum: number, m: any) => sum + m.totalMarks, 0);
          const overallPercentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;
          
          // 45% threshold as requested
          const result = overallPercentage >= 45 ? 'Passed' : 'Failed';
          
          let grade = '';
          if (overallPercentage >= 90) grade = 'A+';
          else if (overallPercentage >= 80) grade = 'A';
          else if (overallPercentage >= 70) grade = 'B';
          else if (overallPercentage >= 60) grade = 'C';
          else if (overallPercentage >= 45) grade = 'D';
          else grade = 'F';
          
          setTc((prev) => ({ ...prev, annualResult: result, presentGrade: grade }));
        } catch (marksError) {
          console.error('Error fetching marks:', marksError);
          setTc((prev) => ({ ...prev, annualResult: 'No marks available', presentGrade: student.standard || '' }));
        }
      } else {
        alert('Student not found.');
      }
    } catch (error) {
      console.error('Error fetching student:', error);
    }
  };

  const downloadTC = () => {
    window.print();
  };

  return (
    <div>
      <div className="global-container">
        <div className="import_export">
          <div className="innerbox"> 
            <StudentsInfoDownload />
          </div>
          <div className="innerbox">
            <UploadStudents/>
          </div>
        </div>
        <div style={{ marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "10px" }}>
          <button 
            onClick={() => setShowForm(!showForm)}
            style={{ margin: 0, padding: "8px 20px" }}
          >
            {showForm ? 'Hide Form' : 'Create Student'}
          </button>
        </div>
      </div>
      {showForm && (
        <div className="global-container">
          <h2>Create Student Profile</h2>
          
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Student Details</h4>
            
            <div style={{ marginBottom: '12px' }}>
              <label>Full Name *</label>
              <input
                className="StudentInput"
                type="text"
                name="fullName"
                placeholder="Enter Student Full Name"
                value={student.fullName}
                onChange={(e) => {
                  setStudent((prev) => ({ ...prev, fullName: e.target.value }));
                }}
              />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label>Gender *</label>
              <select
                name="gender"
                value={student.gender}
                onChange={(e) =>
                  setStudent((prev) => ({ ...prev, gender: e.target.value }))
                }
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label>Division / Standard *</label>
              <select
                name="standard"
                value={student.standard}
                onChange={(e) =>
                  setStudent((prev) => ({ ...prev, standard: e.target.value }))
                }
              >
                <option value="">Select Division / Standard</option>
                {classes.map((cls: string, idx: number) => (
                  <option key={idx} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>

           {standardTotalFees > 0 && (
             <div style={{ marginBottom: 16, padding: '12px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '15px' }}><strong>Standard Fee for {student.standard}:</strong> K {standardTotalFees.toFixed(2)}</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>Initial installments and additional services (meals, bus, inventory) are recorded in the <strong>Fees</strong> section.</p>
            </div>
          )}
          <button type="button" onClick={handleSubmit} style={{ marginTop: '8px', padding: '10px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
            Submit Profile
          </button>
        </div>
      )}

      {/* Search & Edit Students Section */}
      <div className="global-container" style={{ marginTop: '20px' }}>
        <h2 style={{ fontSize: '20px', color: '#0f172a', marginBottom: '16px' }}>Search & Edit Students</h2>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px' }}>
          {/* Division Selector */}
          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Division
            </label>
            <select
              value={selectedDivision}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDivision(val);
                if (searchQuery.trim()) {
                  handleSearchStudents(searchQuery, val);
                }
              }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            >
              <option value="">Select Division</option>
              {classes.map((cls: string, idx: number) => (
                <option key={idx} value={cls}>Division {cls}</option>
              ))}
            </select>
          </div>

          {/* Student Name / Query Input with Live Suggestions Dropdown */}
          <div style={{ flex: '1', minWidth: '260px', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Name
            </label>
            <input
              type="text"
              className="StudentInput"
              placeholder="Type student name (e.g. 'd') to see matching list"
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearchStudents(); }}
              autoComplete="off"
            />

            {/* Suggestions Overlay Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                zIndex: 100,
                maxHeight: '220px',
                overflowY: 'auto',
                marginTop: '4px'
              }}>
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => selectSuggestion(s)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{s.fullName}</span>
                      {s.rollNo && <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>(Roll: {s.rollNo})</span>}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                      Division {s.standard} ({s.session})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleSearchStudents()}
              disabled={isSearching}
              style={{ padding: '10px 24px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              {isSearching ? "Searching..." : "Search"}
            </button>

            <button
              onClick={handleClearSearch}
              style={{ padding: '10px 20px', backgroundColor: '#64748b', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '12px' }}>
              Found {searchResults.length} Student(s)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {searchResults.map((st: any) => {
                const parent = (st.parents && st.parents.length > 0) ? st.parents[0] : null;
                const dobStr = st.dateOfBirth ? new Date(st.dateOfBirth).toISOString().split('T')[0] : 'N/A';

                return (
                  <div
                    key={st.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
                          {st.fullName}
                        </h4>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: '#475569' }}>
                          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            Division / Standard: {st.standard}
                          </span>
                          <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            Session: {st.session}
                          </span>
                          <span>Gender: <strong>{st.gender || 'N/A'}</strong></span>
                          <span>DOB: <strong>{dobStr}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEditClick(st)}
                          style={{ padding: '6px 14px', backgroundColor: '#eab308', color: '#000000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                        >
                          Edit Student
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(st.id)}
                          style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Detailed info grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px', color: '#334155' }}>
                      <div>
                        <strong>Nationality:</strong> {st.nationality || 'N/A'}<br />
                        <strong>Religion:</strong> {st.religion || 'N/A'}<br />
                        <strong>Blood Group:</strong> {st.bloodGroup || 'N/A'}
                      </div>
                      <div>
                        <strong>Father Name:</strong> {parent?.fatherName && parent.fatherName !== 'N/A' ? parent.fatherName : 'N/A'}<br />
                        <strong>Mother Name:</strong> {parent?.motherName && parent.motherName !== 'N/A' ? parent.motherName : 'N/A'}<br />
                        <strong>Parent Contact:</strong> {parent?.fatherContact && parent.fatherContact.toString() !== '0' ? parent.fatherContact : (parent?.motherContact && parent.motherContact.toString() !== '0' ? parent.motherContact : 'N/A')}
                      </div>
                      <div>
                        <strong>Residential Address:</strong> {st.residentialAddress || 'N/A'}<br />
                        <strong>Scholarship:</strong> {st.scholarshipApplied ? 'Applied' : 'No'}<br />
                        <strong>Meals:</strong> {st.lunchAccepted ? 'Yes' : 'No'} | <strong>Bus:</strong> {st.busAccepted ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Edit Student Modal / Inline Form */}
        {editingStudent && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                Edit Student Profile: {editingStudent.fullName}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Full Name *</label>
                  <input
                    type="text"
                    className="StudentInput"
                    value={editingStudent.fullName || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Division / Standard *</label>
                  <select
                    value={editingStudent.standard || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, standard: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">Select Division</option>
                    {classes.map((cls: string, idx: number) => (
                      <option key={idx} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Gender</label>
                  <select
                    value={editingStudent.gender || 'Male'}
                    onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date of Birth</label>
                  <input
                    type="date"
                    className="StudentInput"
                    value={editingStudent.dateOfBirth || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, dateOfBirth: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nationality</label>
                  <input
                    type="text"
                    className="StudentInput"
                    value={editingStudent.nationality || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nationality: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Religion</label>
                  <input
                    type="text"
                    className="StudentInput"
                    value={editingStudent.religion || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, religion: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Residential Address</label>
                <input
                  type="text"
                  className="StudentInput"
                  value={editingStudent.residentialAddress || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, residentialAddress: e.target.value })}
                />
              </div>

              <h4 style={{ margin: '16px 0 8px 0', fontSize: '15px', color: '#1e293b' }}>Parents Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Father Name</label>
                  <input
                    type="text"
                    className="StudentInput"
                    value={editingStudent.parents?.[0]?.fatherName || ''}
                    onChange={(e) => {
                      const newParents = [...(editingStudent.parents || [{}])];
                      newParents[0] = { ...newParents[0], fatherName: e.target.value };
                      setEditingStudent({ ...editingStudent, parents: newParents });
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mother Name</label>
                  <input
                    type="text"
                    className="StudentInput"
                    value={editingStudent.parents?.[0]?.motherName || ''}
                    onChange={(e) => {
                      const newParents = [...(editingStudent.parents || [{}])];
                      newParents[0] = { ...newParents[0], motherName: e.target.value };
                      setEditingStudent({ ...editingStudent, parents: newParents });
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Father Contact</label>
                  <input
                    type="text"
                    className="StudentInput"
                    value={editingStudent.parents?.[0]?.fatherContact || ''}
                    onChange={(e) => {
                      const newParents = [...(editingStudent.parents || [{}])];
                      newParents[0] = { ...newParents[0], fatherContact: e.target.value };
                      setEditingStudent({ ...editingStudent, parents: newParents });
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mother Contact</label>
                  <input
                    type="text"
                    className="StudentInput"
                    value={editingStudent.parents?.[0]?.motherContact || ''}
                    onChange={(e) => {
                      const newParents = [...(editingStudent.parents || [{}])];
                      newParents[0] = { ...newParents[0], motherContact: e.target.value };
                      setEditingStudent({ ...editingStudent, parents: newParents });
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  style={{ padding: '8px 18px', backgroundColor: '#64748b', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStudentEdit}
                  style={{ padding: '8px 20px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Student;

