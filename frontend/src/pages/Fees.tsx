import React, { useState, useEffect } from "react";
import axios from "axios";
import { fetchStudentFees, addFeeInstallment, fetchCategories, fetchStandardsByCategory, getAllStandards } from "../apis/api";
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
  session?: string;
  scholarshipApplied?: boolean;
  remark?: string;
  lunchAccepted?: boolean;
  lunchFee?: number;
  lunchPrice?: number;
  busAccepted?: boolean;
  busStationId?: number;
  busStation?: any;
  busFee?: number;
  busPrice?: number;
  fees: Fee[];
}

const Fees: React.FC = () => {
  const [standard, setStandard] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [studentName, setStudentName] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [standardsByCategory, setStandardsByCategory] = useState<Record<string, string[]>>({});
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const standards = useRecoilValue(standardList);
  const [divisionList, setDivisionList] = useState<string[]>([]);
  const [newInstallment, setNewInstallment] = useState<Fee>({
    title: "",
    amount: 0,
    amountDate: "",
    admissionDate: ""
  });
  const [installmentArray] = useState<string[]>(useRecoilValue(installmentArr));
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<Record<number, { selected: boolean; quantity: number; price?: number; id?: number }>>({});
  const [standardBaseFee, setStandardBaseFee] = useState<number>(0);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  useEffect(() => {
    async function loadDivisions() {
      try {
        const data = await getAllStandards();
        let arr: any = [];
        if (Array.isArray(data)) {
          arr = data;
        } else if (data && Array.isArray(data.standard)) {
          arr = data.standard;
        }
        const mapped = arr.map((s: any) => (s.std ? s.std : s));
        setDivisionList(mapped);
      } catch (err) {
        console.error("Error loading divisions in Fees:", err);
      }
    }

    async function loadInventory() {
      try {
        const resp = await axios.get(`http://${window.location.hostname}:5000/inventory`);
        setAvailableInventory(resp.data || []);
      } catch (e) {
        console.error("Error loading inventory in Fees:", e);
      }
    }

    loadDivisions();
    loadInventory();

    window.addEventListener('standardsUpdated', loadDivisions);
    return () => {
      window.removeEventListener('standardsUpdated', loadDivisions);
    };
  }, []);

  useEffect(() => {
    async function loadStudentInventory() {
      if (student && student.id) {
        try {
          const resp = await axios.get(`http://${window.location.hostname}:5000/student-inventory/${student.id}`);
          const initialMap: Record<number, { selected: boolean; quantity: number; price?: number; id?: number }> = {};
          (resp.data || []).forEach((si: any) => {
            const qty = si.quantityPurchased || 1;
            const unitP = si.totalPrice !== undefined && si.totalPrice !== null
              ? (qty > 0 ? si.totalPrice / qty : si.totalPrice)
              : (si.inventory?.price || 0);
            initialMap[si.inventoryId] = {
              selected: true,
              quantity: qty,
              price: unitP,
              id: si.id
            };
          });
          setSelectedInventoryItems(initialMap);
        } catch (e) {
          console.error("Error fetching student inventory:", e);
        }
      } else {
        setSelectedInventoryItems({});
      }
    }
    loadStudentInventory();
  }, [student?.id]);

  useEffect(() => {
    if (student?.standard) {
      if ((student as any).standardTotalFees !== undefined && (student as any).standardTotalFees !== null && Number((student as any).standardTotalFees) > 0) {
        setStandardBaseFee(Number((student as any).standardTotalFees));
      } else {
        axios.get(`http://${window.location.hostname}:5000/standard/${student.standard}`)
          .then(res => setStandardBaseFee(Number(res.data?.totalFees || 0)))
          .catch(() => setStandardBaseFee(0));
      }
    } else {
      setStandardBaseFee(0);
    }
  }, [student?.standard, (student as any)?.standardTotalFees]);

  const handleNameChange = async (val: string) => {
    setStudentName(val);
    if (val.trim().length > 0) {
      try {
        const resp = await axios.get(`http://${window.location.hostname}:5000/fees/suggestions`, {
          params: { query: val, standard: standard }
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
    setStudentName(item.fullName);
    setRollNo(String(item.rollNo));
    if (item.standard) setStandard(item.standard);
    setShowSuggestions(false);

    setLoading(true);
    try {
      const res = await fetchStudentFees(item.standard, String(item.rollNo), item.fullName);
      if (res.data && !res.data.error) {
        setStudent(res.data);
      } else {
        setStudent(null);
      }
    } catch (err) {
      console.error("Error fetching selected student fees:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const search = async () => {
    if (!standard && !rollNo && !studentName) {
      alert("Please enter Division/Standard, Roll No, or Student Name.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetchStudentFees(standard, rollNo, studentName);

      if (res.data && !res.data.error) {
        setStudent(res.data);
      } else {
        setStudent(null);
        alert("Student does not exist");
      }
    } catch (error) {
      console.error("Error fetching fees details", error);
      alert("Error: Student not found or check details");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setStandard("");
    setRollNo("");
    setStudentName("");
    setSelectedCategory("");
    setStudent(null);
    setSelectedInventoryItems({});
  };

  const handleSaveFeeServices = async () => {
    if (!student) return;
    try {
      const lFee = (student as any).lunchFee !== undefined ? (student as any).lunchFee : ((student as any).lunchPrice || 0);
      const bFee = (student as any).busFee !== undefined ? (student as any).busFee : ((student as any).busPrice || 0);

      await axios.put(`http://${window.location.hostname}:5000/update/student/${student.id}`, {
        scholarshipApplied: !!student.scholarshipApplied,
        remark: student.remark || "",
        lunchAccepted: !!student.lunchAccepted,
        lunchFee: student.lunchAccepted ? lFee : 0,
        lunchPrice: student.lunchAccepted ? lFee : 0,
        busAccepted: !!student.busAccepted,
        busStationId: student.busAccepted ? (student.busStationId ? parseInt(student.busStationId.toString()) : null) : null,
        busFee: student.busAccepted ? bFee : 0,
        busPrice: student.busAccepted ? bFee : 0,
      });

      // Save selected inventory items
      for (const item of availableInventory) {
        const sel = selectedInventoryItems[item.id];
        if (sel?.selected && sel.quantity > 0) {
          const itemPrice = sel.price !== undefined ? sel.price : (item.price || 0);
          await axios.post(`http://${window.location.hostname}:5000/student-inventory`, {
            studentId: student.id,
            inventoryId: item.id,
            quantityPurchased: sel.quantity,
            unitPrice: itemPrice,
            customTotalPrice: sel.quantity * itemPrice
          });
        } else if ((!sel?.selected || sel.quantity <= 0) && sel?.id) {
          try {
            await axios.delete(`http://${window.location.hostname}:5000/student-inventory/${sel.id}`);
          } catch (err) {}
        }
      }

      alert("Fee options & inventory items saved successfully!");
      await search();
    } catch (error: any) {
      console.error("Error updating fee options:", error);
      const errMsg = error?.response?.data?.message || error?.response?.data?.error || "Failed to update fee options";
      alert(`Error: ${errMsg}`);
    }
  };

  // Fee Calculations
  const standardFee = standardBaseFee;

  const mealsFee = student?.lunchAccepted 
    ? Number((student as any)?.lunchFee !== undefined ? (student as any).lunchFee : ((student as any)?.lunchPrice || 0))
    : 0;

  const busFee = student?.busAccepted 
    ? Number((student as any)?.busFee !== undefined ? (student as any).busFee : ((student as any)?.busPrice || 0))
    : 0;

  const inventoryFee = Object.values(selectedInventoryItems).reduce((sum, item) => {
    if (item?.selected && item.quantity > 0) {
      return sum + (item.quantity * (item.price || 0));
    }
    return sum;
  }, 0);

  const totalOtherCharges = mealsFee + busFee + inventoryFee;
  const combinedTotalFees = standardFee + totalOtherCharges;
  const totalPaid = (student?.fees || []).reduce((sum, f) => sum + (parseFloat(f.amount?.toString() || '0') || 0), 0);
  const remainingFees = Math.max(0, combinedTotalFees - totalPaid);

  const handleAddInstallmentChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
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

    if (!newInstallment.title) {
      alert("Please select an installment type.");
      return;
    }

    const amountVal = parseFloat(newInstallment.amount.toString());
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Please enter a valid installment amount greater than 0.");
      return;
    }

    if (amountVal > (remainingFees + 0.01)) {
      alert(`Installment amount (K ${amountVal.toFixed(2)}) cannot exceed the remaining balance of K ${remainingFees.toFixed(2)}.`);
      return;
    }

    const updatedInstallment = {
      ...newInstallment,
      amount: amountVal,
      amountDate: newInstallment.amountDate || new Date().toISOString().split('T')[0],
      admissionDate: student.fees?.[0]?.admissionDate ?? new Date(),
      studentId: student.id,
    };
    
    try {
      let check = false;
      (student.fees || []).forEach((e: any) => {
        if (e.title === updatedInstallment.title) {
          check = true;
        }
      });
      
      if (check) {
        alert(`Installment type "${updatedInstallment.title}" already exists for this student.`);
        return;
      }

      const res = await addFeeInstallment(updatedInstallment);

      if (res.data && !res.data.error) {
        alert(`Installment of K ${amountVal.toFixed(2)} added successfully!`);
        setNewInstallment({
          title: "",
          amount: 0,
          amountDate: "",
          admissionDate: ""
        });
        await search();
      } else {
        alert("Failed to add installment: " + (res.data?.error || "Unknown error"));
      }
    } catch (error: any) {
      console.error("Error adding installment", error);
      const errMsg = error?.response?.data?.error || error?.message || "An error occurred while adding installment.";
      alert(`Error: ${errMsg}`);
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
          <div style={{ marginBottom: "12px" }}>
            <label>Division</label>
            <select
              name="standard"
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
            >
              <option value="">Select Division</option>
              {(divisionList.length > 0 ? divisionList : standards).map((std: string, idx: number) => (
                <option key={idx} value={std}>{std}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "12px", position: "relative" }}>
            <label>Name</label>
            <input
              type="text"
              placeholder="Type student name (e.g. 'd') to see matching list"
              className="StudentInput"
              value={studentName}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              disabled={loading}
              autoComplete="off"
            />

            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                zIndex: 100,
                maxHeight: "220px",
                overflowY: "auto",
                marginTop: "4px"
              }}>
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => selectSuggestion(s)}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f9ff"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{s.fullName}</span>
                      <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>(Roll No: {s.rollNo})</span>
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#2563eb", backgroundColor: "#eff6ff", padding: "2px 8px", borderRadius: "4px" }}>
                      Division {s.standard} ({s.session})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="fee-buttons" style={{ marginTop: "16px" }}>
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
          <div className="fee-container" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Student Name</span>
                <h3 style={{ margin: "4px 0 0 0", color: "#0f172a", fontSize: "20px", fontWeight: 700 }}>{student.fullName}</h3>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Division / Standard</span>
                <h3 style={{ margin: "4px 0 0 0", color: "#2563eb", fontSize: "20px", fontWeight: 700 }}>{student.standard}</h3>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Academic Session</span>
                <h3 style={{ margin: "4px 0 0 0", color: "#16a34a", fontSize: "20px", fontWeight: 700 }}>{student.session || localStorage.getItem("selectedSession")}</h3>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Roll Number</span>
                <h3 style={{ margin: "4px 0 0 0", color: "#0f172a", fontSize: "20px", fontWeight: 700 }}>{student.rollNo}</h3>
              </div>
            </div>

            {/* Combined Fee Breakdown Card */}
            <div style={{
              margin: "16px 0",
              padding: "16px",
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#1e293b", fontSize: "16px", fontWeight: 700 }}>
                Combined Total Fees Breakdown
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                <div style={{ padding: "10px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Standard Base Tuition Fee</span>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>K {standardFee.toFixed(2)}</div>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Standard {student.standard}</span>
                </div>

                <div style={{ padding: "10px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Meals / Lunch Fee</span>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: student.lunchAccepted ? "#0f172a" : "#94a3b8" }}>
                    K {mealsFee.toFixed(2)}
                  </div>
                  <span style={{ fontSize: "11px", color: student.lunchAccepted ? "#16a34a" : "#94a3b8" }}>
                    {student.lunchAccepted ? "Enrolled" : "Not Enrolled"}
                  </span>
                </div>

                <div style={{ padding: "10px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Bus Transportation Fee</span>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: student.busAccepted ? "#0f172a" : "#94a3b8" }}>
                    K {busFee.toFixed(2)}
                  </div>
                  <span style={{ fontSize: "11px", color: student.busAccepted ? "#16a34a" : "#94a3b8" }}>
                    {student.busAccepted ? "Enrolled" : "Not Enrolled"}
                  </span>
                </div>

                <div style={{ padding: "10px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Inventory & Uniforms</span>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: inventoryFee > 0 ? "#0f172a" : "#94a3b8" }}>
                    K {inventoryFee.toFixed(2)}
                  </div>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Materials selected</span>
                </div>
              </div>

              <div style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                padding: "12px 16px",
                borderRadius: "6px",
                backgroundColor: remainingFees <= 0 ? "#ecfdf5" : "#eff6ff",
                border: `1px solid ${remainingFees <= 0 ? "#a7f3d0" : "#bfdbfe"}`
              }}>
                <div>
                  <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600, textTransform: "uppercase" }}>Combined Total Fees</span>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#1e3a8a" }}>
                    K {combinedTotalFees.toFixed(2)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600, textTransform: "uppercase" }}>Total Paid So Far</span>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#059669" }}>
                    K {totalPaid.toFixed(2)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600, textTransform: "uppercase" }}>Remaining Balance</span>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: remainingFees <= 0 ? "#059669" : "#dc2626" }}>
                    K {remainingFees.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <h4 style={{ margin: "16px 0 10px 0", borderTop: "1px solid #cbd5e1", paddingTop: "12px", color: "#334155" }}>Fee Installments History:</h4>
            {(student.fees || []).length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "14px", fontStyle: "italic", margin: "8px 0" }}>
                No installments recorded yet. You can add the first installment below.
              </p>
            ) : (
              (student.fees || []).map((fee, index) => (
                <div key={index} style={{ marginBottom: '10px', padding: '15px' , backgroundColor:"#f1f5f9", borderRadius: "6px", border:"1px solid #cbd5e1" }}>
                  <h4 style={{ margin: "0 0 6px 0", color: "#1e293b" }}>{fee.title}</h4>
                  <p style={{ margin: "2px 0", fontWeight: 600, color: "#0f172a" }}>Amount Paid: K {parseFloat(fee.amount?.toString() || '0').toFixed(2)}</p>
                  <p style={{ margin: "2px 0", color: "#64748b", fontSize: "13px" }}>Payment Date: {formatDateForInput(fee.amountDate)}</p>
                  <p style={{ margin: "2px 0", color: "#64748b", fontSize: "13px" }}>Admission Date: {formatDateForInput(fee.admissionDate)}</p>
                </div>
              ))
            )}
          </div>

          <div className="fee-container" style={{ marginTop: '20px' }}>
            <h2>Fee Options & Services</h2>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  name="scholarshipApplied"
                  checked={student.scholarshipApplied || false}
                  onChange={(e) =>
                    setStudent((prev) => prev ? { ...prev, scholarshipApplied: e.target.checked } : null)
                  }
                />
                Scholarship Applied
              </label>
            </div>

            {student.scholarshipApplied && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Scholarship Remark</label>
                <input
                  type="text"
                  className="StudentInput"
                  placeholder="Enter scholarship remark"
                  value={student.remark || ""}
                  onChange={(e) =>
                    setStudent((prev) => prev ? { ...prev, remark: e.target.value } : null)
                  }
                />
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  name="lunchAccepted"
                  checked={student.lunchAccepted || false}
                  onChange={(e) =>
                    setStudent((prev: any) => prev ? { ...prev, lunchAccepted: e.target.checked } : null)
                  }
                />
                Accept Meals / School Lunch
              </label>
            </div>

            {student.lunchAccepted && (
              <div style={{ marginBottom: '12px', marginLeft: '24px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Meal / Lunch Fee Amount (K)</label>
                <input
                  type="number"
                  className="StudentInput"
                  placeholder="Enter Meal Fee Amount"
                  value={(student as any).lunchFee !== undefined ? (student as any).lunchFee : ((student as any).lunchPrice || "")}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                    setStudent((prev: any) => prev ? { ...prev, lunchFee: val, lunchPrice: val } : null);
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  name="busAccepted"
                  checked={student.busAccepted || false}
                  onChange={(e) =>
                    setStudent((prev: any) => prev ? { ...prev, busAccepted: e.target.checked } : null)
                  }
                />
                Accept Bus Service
              </label>
            </div>

            {student.busAccepted && (
              <div style={{ marginBottom: '16px', marginLeft: '24px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>
                  Enter Bus Service Fee Amount (K)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="StudentInput"
                  placeholder="Enter Bus Service Fee Amount"
                  value={(student as any).busFee !== undefined ? (student as any).busFee : ((student as any).busPrice || "")}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                    setStudent((prev: any) => prev ? { ...prev, busFee: val, busPrice: val } : null);
                  }}
                  style={{ maxWidth: '400px' }}
                />
              </div>
            )}

            {/* Inventory / Materials Selection */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #cbd5e1' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                Inventory / Material Items & Uniform Charges
              </h3>
              {availableInventory.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>No inventory items added yet in Control/Inventory panel.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {availableInventory.map((item: any) => {
                    const sel = selectedInventoryItems[item.id];
                    const rawQty = item.quantity;
                    const stockQty = (rawQty !== null && rawQty !== undefined && rawQty !== "") ? Number(rawQty) : 0;
                    const isOutOfStock = stockQty <= 0;
                    const isSelected = !isOutOfStock && (sel?.selected || false);
                    const qty = sel?.quantity !== undefined ? sel.quantity : 1;
                    const itemPrice = sel?.price !== undefined ? sel.price : (item.price || 0);
                    const subtotal = (qty * itemPrice).toFixed(2);

                    return (
                      <div key={item.id} style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: `1px solid ${isOutOfStock ? '#fca5a5' : (isSelected ? '#3b82f6' : '#cbd5e1')}`,
                        backgroundColor: isOutOfStock ? '#fff1f2' : (isSelected ? '#eff6ff' : '#ffffff'),
                        opacity: isOutOfStock ? 0.75 : 1,
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: isOutOfStock ? 'not-allowed' : 'pointer', fontWeight: 600, color: '#1e293b' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isOutOfStock}
                              onChange={(e) => {
                                if (isOutOfStock) {
                                  alert(`Item "${item.itemName}" has 0 quantity in stock and cannot be activated.`);
                                  return;
                                }
                                const checked = e.target.checked;
                                setSelectedInventoryItems(prev => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    selected: checked,
                                    quantity: checked ? (prev[item.id]?.quantity || 1) : 0,
                                    price: checked ? (prev[item.id]?.price !== undefined ? prev[item.id].price : (item.price || 0)) : (item.price || 0)
                                  }
                                }));
                              }}
                              style={{ width: '18px', height: '18px', cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                            />
                            <span>{item.itemName}</span>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#2563eb', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>
                              Default: K {(item.price || 0).toFixed(2)} / item
                            </span>
                            {isOutOfStock ? (
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '4px' }}>
                                Out of Stock (0 quantity in stock)
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '4px' }}>
                                Stock: {stockQty} available
                              </span>
                            )}
                          </label>

                          {isSelected && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                                  Enter Quantity / Number:
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max={stockQty}
                                  value={qty}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    let newQty = Math.max(1, val);
                                    if (newQty > stockQty) {
                                      alert(`Cannot request ${newQty} items. Only ${stockQty} in stock.`);
                                      newQty = stockQty;
                                    }
                                    setSelectedInventoryItems(prev => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        selected: true,
                                        quantity: newQty
                                      }
                                    }));
                                  }}
                                  style={{
                                    width: '80px',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: qty > stockQty ? '1px solid #dc2626' : '1px solid #3b82f6',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    textAlign: 'center',
                                    backgroundColor: '#ffffff'
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                                  Enter Price (K):
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={itemPrice}
                                  onChange={(e) => {
                                    const newPrice = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                    setSelectedInventoryItems(prev => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        selected: true,
                                        price: newPrice
                                      }
                                    }));
                                  }}
                                  style={{
                                    width: '100px',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #3b82f6',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    textAlign: 'center',
                                    backgroundColor: '#ffffff'
                                  }}
                                />
                              </div>

                              <span style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>
                                Total: K {subtotal}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button 
              onClick={handleSaveFeeServices}
              style={{ padding: '10px 24px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '15px' }}
            >
              Save Fee Options & Inventory Items
            </button>
          </div>

          <div className="fee-container">
            <h2>Add New Installment</h2>

            {/* Remaining balance notice banner */}
            <div style={{
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '16px',
              backgroundColor: remainingFees <= 0 ? '#ecfdf5' : '#eff6ff',
              border: `1px solid ${remainingFees <= 0 ? '#a7f3d0' : '#bfdbfe'}`
            }}>
              {remainingFees <= 0 ? (
                <div style={{ color: '#065f46', fontWeight: 600 }}>
                  ✓ All fees are fully paid! There is no remaining balance (Combined Total: K {combinedTotalFees.toFixed(2)}, Paid: K {totalPaid.toFixed(2)}).
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ color: '#1e40af', fontWeight: 600 }}>
                    Remaining Balance to Pay: <span style={{ color: '#b91c1c', fontSize: '16px', fontWeight: 800 }}>K {remainingFees.toFixed(2)}</span>
                  </span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>
                    Combined Total: K {combinedTotalFees.toFixed(2)} | Paid: K {totalPaid.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label>Installment Type</label>
              <select
                name="title"
                value={newInstallment.title}
                onChange={handleAddInstallmentChange}
                disabled={remainingFees <= 0}
              >
                <option value="">Select installment type</option>
                {installmentArray.map((ele,id)=>(
                  <option key={id} value={ele}>{ele}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Amount (K) {remainingFees > 0 && <span style={{ fontSize: '12px', color: '#64748b' }}>(Max allowed: K {remainingFees.toFixed(2)})</span>}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingFees}
                name="amount"
                className="FeeInput"
                placeholder={remainingFees <= 0 ? "Fully paid" : `Enter amount (<= ${remainingFees.toFixed(2)})`}
                value={newInstallment.amount || ""}
                onChange={handleAddInstallmentChange}
                disabled={remainingFees <= 0}
              />
              {Number(newInstallment.amount) > (remainingFees + 0.01) && (
                <p style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
                  ⚠ Amount cannot exceed remaining balance of K {remainingFees.toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <label>Amount Date</label>
              <input
                type="date"
                name="amountDate"
                className="FeeInput"
                value={newInstallment.amountDate}
                onChange={handleAddInstallmentChange}
                disabled={remainingFees <= 0}
              />
            </div>

            <button 
              onClick={addInstallment}
              disabled={remainingFees <= 0 || Number(newInstallment.amount) > (remainingFees + 0.01)}
              style={{
                opacity: (remainingFees <= 0 || Number(newInstallment.amount) > (remainingFees + 0.01)) ? 0.6 : 1,
                cursor: (remainingFees <= 0 || Number(newInstallment.amount) > (remainingFees + 0.01)) ? 'not-allowed' : 'pointer'
              }}
            >
              Add Installment
            </button>
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
