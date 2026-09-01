import React, { useState } from "react";
import { fetchStudentFees, addFeeInstallment } from "../apis/api";
import "../styles/fee.css";
import FeeReicpts from "../components/Fees/FeeReicpts";
import DownloadFee from "../components/Fees/DownloadFee";
import UploadFee from "../components/Fees/UploadFee";
import { useRecoilValue } from "recoil";
import { installmentArr, standardList } from "../store/store";

interface Fee {
  title: string;
  amount: number;
  amountDate: string;
  admissionDate: string;
}

interface Student {
  id: number;
  fullName: string;
  rollNo: number;
  standard: string;
  fees: Fee[];
}

const Fees: React.FC = () => {
  const [standard, setStandard] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const standards = useRecoilValue(standardList);
  const [newInstallment, setNewInstallment] = useState<Fee>({
    title: "",
    amount: 0,
    amountDate: "",
    admissionDate: ""
  });
  const installmentArray = useRecoilValue(installmentArr);

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const search = async () => {
    if (!standard || !rollNo) {
      alert("Please enter both Standard and Roll_no.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetchStudentFees(standard, rollNo);

      if (res.data && !res.data.error) {
        setStudent(res.data);
      } else {
        setStudent(null);
        alert("Student does not exist");
      }
    } catch (error) {
      console.error("Error fetching fees details", error);
      alert("Error, Contact Developer/Check Student Presence");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setStandard("");
    setRollNo("");
    setStudent(null);
  };

  const handleAddInstallmentChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    console.log(name,value);
    setNewInstallment((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addInstallment = async () => {
    if (!student) {
      alert("No student data available.");
      return;
    }

    const updatedInstallment = {
      ...newInstallment,
      admissionDate: student.fees?.[0]?.admissionDate ?? new Date(),
      studentId: student.id,
    };
    
    try {
      let check = false;
      (student.fees || []).forEach((e : any) =>{
       
          if(e.title === updatedInstallment.title){
            
              check = true;
            
          }
      });
      
      if(check){
        
        alert("Installment Already Exists");
        return;
      }
      const res = await addFeeInstallment(updatedInstallment);

      if (res.data && !res.data.error) {
        setStudent((prevStudent) => {
          if (prevStudent) {
            return {
              ...prevStudent,
              fees: [...prevStudent.fees, updatedInstallment],
            };
          }
          return prevStudent;
        });
        setNewInstallment({
          title: "",
          amount: 0,
          amountDate: "",
          admissionDate: ""
        });
      } else {
        alert("Failed to add installment");
      }
    } catch (error) {
      console.error("Error adding installment", error);
      alert("An error occurred while adding installment. Please try again later.");
    }
  };

  return (
    <div>
      <div className="fee-container">
        <div className="import_export">
          <div className="innerbox"> 
              <h2>Download Fees Data</h2>
              <DownloadFee/>
          </div>
          <div className="innerbox">
              <h2>Upload Fees data</h2>
              <UploadFee/>
          </div>
        </div>
        
      </div>
      <div className="fee-container">
        <h1 className="fee-header">Fee System</h1>
        <div>
          <div>
            <label>Standard</label>
            <select
              name="standard"
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
            >
              <option value="">Select standard</option>
              {standards.map((standard:string) => (
              <option key={standard} value={standard}>
                {standard}
              </option>
              ))}
            </select>
          </div>

          <label>Roll No</label>
          <input
            type="text"
            placeholder="Roll No"
            className="StudentInput"
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            required
            disabled={loading}
          />
          <div className="fee-buttons">
            <button onClick={search} style={{ marginRight: "20px" }} disabled={loading}>
              Search
            </button>
            <button onClick={clearForm} style={{ marginRight: "20px" }} disabled={loading}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {student && (
        <div>
          <div className="fee-container">
            <h3>Name: {student.fullName}</h3>
            <h3>Roll No: {student.rollNo}</h3>
            <h3>Standard: {student.standard}</h3>
            <h3>Fees:</h3>
            {(student.fees || []).map((fee, index) => (
              <div key={index} style={{ marginBottom: '10px', padding: '15px' , backgroundColor:"#E0E0E0",border:"1px solid black" }}>
                <h4>Title: {fee.title}</h4>
                <p>Amount: {fee.amount}</p>
                <p>Amount Date: {formatDateForInput(fee.amountDate)}</p>
                <p>Admission Date: {formatDateForInput(fee.admissionDate)}</p>
              </div>
            ))}
          </div>

          <div className="fee-container">
            <h2>Add New Installment</h2>
            <div>
              <label>Installment Type</label>
              
              <select
                name="title"
                value={newInstallment.title}
                onChange={handleAddInstallmentChange}
              >
                <option value="">Select installment type</option>
                {installmentArray.map((ele,id)=>(
                  <option key={id} value={ele}>{ele}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Amount</label>
              <input
                type="number"
                name="amount"
                className="FeeInput"
                value={newInstallment.amount}
                onChange={handleAddInstallmentChange}
              />
            </div>
            <div>
              <label>Amount Date</label>
              <input
                type="date"
                name="amountDate"
                className="FeeInput"
                value={newInstallment.amountDate}
                onChange={handleAddInstallmentChange}
              />
            </div>
            <button onClick={addInstallment}>Add Installment</button>
          </div>

          <div className="fee-container">
            <FeeReicpts id={student.id} name={student.fullName} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Fees;
