/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { DownloadScholarshipStudent, fetchAllStudentsSc } from "../../apis/api";

export default function Scholarship() {
    const [list, setList] = useState<any[]>([]);
    const [showTable, setShowTable] = useState(false);

    const getStudents = async () => {
        try {
            const students = await fetchAllStudentsSc();
            if (students.length === 0) {
                alert("No Student Found");
            }
            setList(students);
            setShowTable(true);
        } catch (error) {
            console.log(error);
        }
    };
    const handleDownload = async()=>{
            try {
                const response = await DownloadScholarshipStudent();
                if (response.status < 200 || response.status >= 300) {
                  alert("here first")
                  throw new Error('Failed to download Scholarship records');
                }
                const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Scholarship.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Error downloading Scholarship records:', error);
                alert('Failed to download Scholarship records');
              }
        }

    return (
        <>
            <div>
                <h2>Scholarship Students :-</h2>
                <button onClick={getStudents}>Get Students</button>
                &nbsp;
                <button style={{ marginTop: '-2px' }} onClick={handleDownload}>Dowload Students</button>
                &nbsp;
                <button onClick={() => setShowTable(false)}>Clear</button>
                {showTable && (
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Standard</th>
                                <th>Roll No</th>
                                <th>Scholarship Applied</th>
                                <th>Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((item, id) => (
                                <tr key={id}>
                                    <td>{item.fullName}</td>
                                    <td>{item.standard}</td>
                                    <td>{item.rollNo}</td>
                                    <td>{item.scholarshipApplied ? "Yes" : "No"}</td>
                                    <td>{item.remark}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
