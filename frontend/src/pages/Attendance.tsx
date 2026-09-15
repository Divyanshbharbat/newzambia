/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import DownloadAttendance from "../components/Attendance/DownloadAttendanceExcel";
import "../styles/attendance.css";
import { fetchSubjects, fetchStudents, submitAttendance } from "../apis/api";
import UploadAttendance from "../components/Attendance/UploadAttendance";
import { useRecoilValue } from "recoil";
import { standardList } from "../store/store";
// import SelectStandard from "../components/SelectStandard";

interface Student {
  id: number;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  rollNo: number;
  standard: string;
  adhaarCardNo: bigint;
  scholarshipApplied: boolean;
  address: string;
}

interface Subject {
  id: number;
  name: string;
}

const Attendance: React.FC = () => {
  // const [standards, setStandards] = useState<string[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string>("");
  const [attendanceDate, setAttendanceDate] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [absentStudents, setAbsentStudents] = useState<number[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const standards = useRecoilValue(standardList);


  const fetchSubjectsList = async (standard: string) => {
    try {
      const response = await fetchSubjects(standard); // Fetch subjects for the selected standard
      setSubjects(response.data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchStudentsList = async (standard: string) => {
    try {
      const response = await fetchStudents(standard);
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleStandardChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedStandard(value);

    if (value) {
      await fetchSubjectsList(value); // Fetch relevant subjects
      fetchStudentsList(value); // Fetch students for the selected standard
    } else {
      setStudents([]);
      setSubjects([]); // Clear subjects if no standard is selected
    }
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubject(e.target.value);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttendanceDate(e.target.value);
  };

  const handleCheckboxChange = (rollNo: number) => {
    const updatedAbsentStudents = [...absentStudents];
    const index = updatedAbsentStudents.indexOf(rollNo);
    if (index === -1) {
      updatedAbsentStudents.push(rollNo);
    } else {
      updatedAbsentStudents.splice(index, 1);
    }
    setAbsentStudents(updatedAbsentStudents);
  };

  const handleSubmit = async () => {
    const data = {
      standard: selectedStandard,
      date: attendanceDate,
      absentStudents: absentStudents,
      subjectId: selectedSubject,
    };

    try {
      await submitAttendance(data);
      alert("Attendance recorded successfully");
      window.location.reload();
    } catch (error) {
      console.error("Error recording attendance:", error);
      alert("Check Input Parameters");
    }
  };

  return (
    <div className="global-container">  
      <div className="import_export">
        <div className="innerbox">
            <h2>Download Attendance</h2>
            <DownloadAttendance />
        </div>
        <div className="innerbox" >
            <h2>Upload Attendance</h2>
            <UploadAttendance/>
        </div>
      </div>
      
      
      <h2>Attendance Markup</h2>
      <div style={{marginTop:"-8px"}}>
        <label htmlFor="standard">Select Standard:</label>
        <select
          id="standard"
          name="standard"
          value={selectedStandard}
          onChange={handleStandardChange}
        >
          <option value="" disabled>
            Select standard
          </option>
          {standards.map((standard:string) => (
            <option key={standard} value={standard}>
              {standard}
            </option>
          ))}
        </select>

        <label htmlFor="attendance-date">Select Date:</label>
        <input
          type="date"
          id="attendance-date"
          name="attendance-date"
          value={attendanceDate}
          onChange={handleDateChange}
        />

        <label htmlFor="subject">Select Subject:</label>
        <select
          id="subject"
          name="subject"
          value={selectedSubject || ""}
          onChange={handleSubjectChange}
        >
          <option value="">Global Attendance</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>

        <div>
          {attendanceDate && (
            <>
              <table className="AttendanceTable">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Full Name</th>
                  <th>Mark Absent</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.rollNo}</td>
                    <td>{student.fullName}</td>
                    <td>
                      <input
                        style={{width:"20px"}}
                        type="checkbox"
                        id={`student-${student.rollNo}`}
                        name="absentStudents"
                        checked={absentStudents.includes(student.rollNo)}
                        onChange={() => handleCheckboxChange(student.rollNo)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="CustomButton" onClick={handleSubmit}>
              Submit Attendance
            </button>
          </>
          )}
        </div>


      </div>
    </div>
  );
};

export default Attendance;
