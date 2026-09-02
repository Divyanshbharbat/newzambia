/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { fetchAllStudents } from '../../apis/api';
import { useRecoilValue } from 'recoil';
import { standardList } from '../../store/store';

const Searchall = () => {
  const [std, setStd] = useState<string>("");
  const [result, setResult] = useState<any[]>([]);
  const standards = useRecoilValue(standardList);
  const search = async () => {
    try {
      const data = await fetchAllStudents(std);
      if(data.length === 0){
        alert("No Student Found");
      }
      setResult(data);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <h2>Search Students By Standard</h2>
      <div>
        <label>Select Standard</label>
        <select onChange={(e) => setStd(e.target.value)}>
          <option value="">Select Standard</option>
          {standards.map((standard:string) => (
            <option key={standard} value={standard}>
              {standard}
            </option>
          ))}
        </select>
        <button onClick={search}>Search</button>
      </div>
      {result.length > 0 && (
        <div>
          <table>
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Date of Birth</th>
                <th>Blood Group</th>
                <th>Residential Address</th>
                <th>Gender</th>
                <th>Roll No</th>
                <th>Scholarship Applied</th>
                <th>Standard</th>
              </tr>
            </thead>
            <tbody>
              {result.map((e: any) => {
                const formattedDate = e.dateOfBirth ? new Date(e.dateOfBirth).toISOString().split('T')[0] : 'N/A';
                const scholarshipApplied: string = e.scholarshipApplied ? "True" : "False";
                return (
                  <tr key={e.rollNo}>
                    <td>{e.fullName}</td>
                    <td>{formattedDate}</td>
                    <td>{e.bloodGroup}</td>
                    <td>{e.residentialAddress}</td>
                    <td>{e.gender}</td>
                    <td>{e.rollNo}</td>
                    <td>{scholarshipApplied}</td>
                    <td>{e.standard}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Searchall;
