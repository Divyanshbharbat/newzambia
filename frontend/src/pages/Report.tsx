import { useState, useEffect } from "react";
import "../styles/report.css";
import { fetchDashboardStudents, fetchDashboardFees, fetchDashboardTransport, fetchDashboardLunch, fetchDashboardTeachers, fetchDashboardSections, fetchFeesPending, downloadBackupZip } from "../apis/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import DashboardSummary from "../components/DashboardSummary";

interface FeesPendingData {
  id: number;
  studentName: string;
  rollNo: number;
  standard: string;
  category?: string;
  totalFee: number;
  paidFee: number;
  remainingFee: number;
}

interface SectionInfo {
  std: string;
  category: string;
  totalFees: number;
}

const Report = () => {
  // Helper function to check if session is selected

  // Helper function to check if session is selected
  const checkSessionSelected = (): boolean => {
    const selectedSession = localStorage.getItem("selectedSession");
    if (!selectedSession) {
      alert("Please select a session first");
      return false;
    }
    return true;
  };

  // Dashboard state
  const [activeTab, setActiveTab] = useState<"summary" | "tables" | "fees-pending" | "backup">("summary");
  const [selectedTable, setSelectedTable] = useState<string>("Students");
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fees pending filters
  const [feesPendingData, setFeesPendingData] = useState<FeesPendingData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [sectionInfo, setSectionInfo] = useState<SectionInfo[]>([]);

  const tableOptions = [
    { value: "Students", label: "Students" },
    { value: "Fees", label: "Fees" },
    { value: "Transport", label: "Transport" },
    { value: "Lunch", label: "Lunch" },
    { value: "Teachers", label: "Teachers" },
    { value: "Sections", label: "Sections" },
  ];

  useEffect(() => {
    fetchAvailableClassesAndCategories();
  }, []);

  const fetchAvailableClassesAndCategories = async () => {
    try {
      const sections = await fetchDashboardSections();
      setSectionInfo(sections);
      
      const classes = [...new Set(sections.map((s: any) => s.std))] as string[];
      setAvailableClasses(classes);
      
      const categories = [...new Set(sections.map((s: any) => s.category).filter((c: any) => c))] as string[];
      setAvailableCategories(categories);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const getClassesForCategory = (category: string): string[] => {
    if (!category) return availableClasses;
    return sectionInfo
      .filter(s => s.category === category)
      .map(s => s.std)
      .sort((a, b) => parseInt(a) - parseInt(b));
  };

  const fetchTableData = async (tableName: string) => {
    setLoading(true);
    setError(null);
    try {
      let data: any[] = [];
      switch (tableName) {
        case "Students":
          data = await fetchDashboardStudents();
          data.sort((a, b) => parseInt(a.standard) - parseInt(b.standard));
          break;
        case "Fees":
          data = await fetchDashboardFees(selectedClass || undefined, selectedCategory || undefined);
          data.sort((a, b) => parseInt(a.standard) - parseInt(b.standard));
          break;
        case "Transport":
          data = await fetchDashboardTransport();
          data.sort((a, b) => parseInt(a.standard) - parseInt(b.standard));
          break;
        case "Lunch":
          data = await fetchDashboardLunch();
          data.sort((a, b) => parseInt(a.standard) - parseInt(b.standard));
          break;
        case "Teachers":
          data = await fetchDashboardTeachers();
          break;
        case "Sections":
          data = await fetchDashboardSections();
          break;
        default:
          data = [];
      }
      setTableData(data);
    } catch (error) {
      setError(`Failed to fetch ${tableName} data`);
      console.error(error);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (table: string) => {
    setSelectedTable(table);
    fetchTableData(table);
  };

  const fetchFeesPendingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFeesPending(undefined, selectedClass, selectedCategory);
      // Sort by standard (class)
      const sorted = (data as FeesPendingData[]).sort((a, b) => {
        const stdA = parseInt(a.standard) || 0;
        const stdB = parseInt(b.standard) || 0;
        return stdA - stdB;
      });
      setFeesPendingData(sorted);
    } catch (error) {
      setError("Failed to fetch fees pending data");
      console.error(error);
      setFeesPendingData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateOnly = (dateString: any) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const generateTablePDF = () => {
    if (!checkSessionSelected()) return;
    
    if (tableData.length === 0) {
      alert("No data to generate PDF");
      return;
    }

    const doc = new jsPDF();
    const title = `${selectedTable} Report`;
    doc.setFontSize(16);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });

    // Prepare columns and rows
    let columns: string[] = [];
    let rows: any[] = [];

    if (selectedTable === "Fees") {
      columns = ["Student Name", "Roll No", "Standard", "Total Fee", "Total Paid", "Remaining Fee"];
      rows = tableData.map(item => [
        item.studentName || "",
        item.rollNo || "",
        item.standard || "",
        `₹${(item.totalFee || 0).toFixed(2)}`,
        `₹${(item.totalPaid || 0).toFixed(2)}`,
        `₹${(item.remainingFee || 0).toFixed(2)}`,
      ]);
    } else if (selectedTable === "Transport") {
      columns = ["Student Name", "Roll No", "Standard", "Bus Station", "Bus Price"];
      rows = tableData.map(item => [
        item.fullName || "",
        item.rollNo || "",
        item.standard || "",
        item.busStation?.stationName || "N/A",
        `₹${(item.busPrice || 0).toFixed(2)}`,
      ]);
    } else {
      columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];
      rows = tableData.map(item =>
        columns.map(col => {
          const value = item[col];
          if (col.toLowerCase().includes('date') || col.toLowerCase().includes('dateofbirth')) {
            return formatDateOnly(value);
          }
          return value ? String(value).substring(0, 50) : "";
        })
      );
    }

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 25,
      margin: 10,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [49, 57, 112], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    doc.save(`${selectedTable}-report.pdf`);
  };

  const generateFeesPendingPDF = () => {
    if (!checkSessionSelected()) return;
    
    if (feesPendingData.length === 0) {
      alert("No fees pending data to generate PDF");
      return;
    }

    const doc = new jsPDF();
    const title = "Fee Pending List";
    doc.setFontSize(16);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });

    const columns = ["Student Name", "Roll No", "Class", "Total Fee", "Paid Fee", "Remaining Fee"];
    const rows = feesPendingData.map(item => [
      item.studentName,
      item.rollNo.toString(),
      item.standard,
      `₹${item.totalFee.toFixed(2)}`,
      `₹${item.paidFee.toFixed(2)}`,
      `₹${item.remainingFee.toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 25,
      margin: 10,
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [175, 23, 99], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    doc.save("fee-pending-list.pdf");
  };

  const generateBackupZip = async () => {
    if (!checkSessionSelected()) return;
    
    setLoading(true);
    setError(null);
    try {
      const backupData = await downloadBackupZip();
      const zip = new JSZip();

      // Create CSV files for each section
      const createCSV = (data: any[], headers: string[]) => {
        const rows = [headers];
        data.forEach(item => {
          rows.push(headers.map(h => {
            const value = item[h] || "";
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          }));
        });
        return rows.map(row => row.join(",")).join("\n");
      };

      // Students CSV
      if (backupData.students.data.length > 0) {
        const studentHeaders = Object.keys(backupData.students.data[0]);
        const studentCSV = createCSV(backupData.students.data, studentHeaders);
        zip.file("students.csv", studentCSV);
      }

      // Fees CSV
      if (backupData.fees.data.length > 0) {
        const feeHeaders = Object.keys(backupData.fees.data[0]);
        const feeCSV = createCSV(backupData.fees.data, feeHeaders);
        zip.file("fees.csv", feeCSV);
      }

      // Transport CSV
      if (backupData.transport.data.length > 0) {
        const transportHeaders = Object.keys(backupData.transport.data[0]);
        const transportCSV = createCSV(backupData.transport.data, transportHeaders);
        zip.file("transport.csv", transportCSV);
      }

      // Lunch CSV
      if (backupData.lunch.data.length > 0) {
        const lunchHeaders = Object.keys(backupData.lunch.data[0]);
        const lunchCSV = createCSV(backupData.lunch.data, lunchHeaders);
        zip.file("lunch.csv", lunchCSV);
      }

      // Sections CSV
      if (backupData.sections.data.length > 0) {
        const sectionHeaders = Object.keys(backupData.sections.data[0]);
        const sectionCSV = createCSV(backupData.sections.data, sectionHeaders);
        zip.file("sections.csv", sectionCSV);
      }

      // Fees Pending CSV
      if (backupData.feesPending.data.length > 0) {
        const pendingHeaders = Object.keys(backupData.feesPending.data[0]);
        const pendingCSV = createCSV(backupData.feesPending.data, pendingHeaders);
        zip.file("fees_pending.csv", pendingCSV);
      }

      // Generate and download
      const blob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${backupData.session}-${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert("Backup downloaded successfully!");
    } catch (error) {
      setError("Failed to generate backup");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Dashboard">

      {/* Tab Navigation */}
      <div className="button-group">
        <button
          onClick={() => setActiveTab("summary")}
          style={{ backgroundColor: activeTab === "summary" ? "#AF1763" : "#313970" }}
        >
          Summary
        </button>
        <button
          onClick={() => {
            if (checkSessionSelected()) {
              setActiveTab("tables");
            }
          }}
          style={{ backgroundColor: activeTab === "tables" ? "#AF1763" : "#313970" }}
        >
          Download Table Reports
        </button>
        <button
          onClick={() => {
            if (checkSessionSelected()) {
              setActiveTab("fees-pending");
              if (feesPendingData.length === 0) fetchFeesPendingData();
            }
          }}
          style={{ backgroundColor: activeTab === "fees-pending" ? "#AF1763" : "#313970" }}
        >
          Fee Pending Report
        </button>
        <button
          onClick={() => {
            if (checkSessionSelected()) {
              setActiveTab("backup");
            }
          }}
          style={{ backgroundColor: activeTab === "backup" ? "#AF1763" : "#313970" }}
        >
          Download Backup
        </button>
      </div>

      {/* Summary Tab */}
      {activeTab === "summary" && (
        <div className="dashboard-section p-0 bg-transparent shadow-none border-none">
          <DashboardSummary />
        </div>
      )}

      {/* Download Table Reports Tab */}
      {activeTab === "tables" && (
        <div className="dashboard-section">
          <h2>Download Report</h2>
          <div className="filter-group">
            <div>
              <label htmlFor="table-select">Select Table/Relation:</label>
              <select
                id="table-select"
                value={selectedTable}
                onChange={(e) => handleTableSelect(e.target.value)}
              >
                {tableOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedTable === "Fees" && (
              <>
                <div>
                  <label htmlFor="table-category">Category (Optional):</label>
                  <select
                    id="table-category"
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setSelectedClass(""); }}
                  >
                    <option value="">All Categories</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="table-class">Class (Optional):</label>
                  <select
                    id="table-class"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">All Classes</option>
                    {getClassesForCategory(selectedCategory).map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ visibility: 'hidden' }}>apply</label>
                  <button className="btn" onClick={() => fetchTableData('Fees')}>Apply</button>
                </div>
              </>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading">Loading data...</div>
          ) : (
            <>
              {tableData.length > 0 && (
                <div>
                  <div className="button-group">
                    <button onClick={generateTablePDF}>Download PDF Report</button>
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          {selectedTable === "Fees" ? (
                            <>
                              <th>Student Name</th>
                              <th>Roll No</th>
                              <th>Standard</th>
                              <th>Total Fee</th>
                              <th>Total Paid</th>
                              <th>Remaining Fee</th>
                            </>
                          ) : selectedTable === "Transport" ? (
                            <>
                              <th>Student Name</th>
                              <th>Roll No</th>
                              <th>Standard</th>
                              <th>Bus Station</th>
                              <th>Bus Price</th>
                            </>
                          ) : (
                            Object.keys(tableData[0]).map(col => (
                              <th key={col}>{col}</th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((item, idx) => (
                          <tr key={idx}>
                            {selectedTable === "Fees" ? (
                              <>
                                <td>{item.studentName || ""}</td>
                                <td>{item.rollNo || ""}</td>
                                <td>{item.standard || ""}</td>
                                <td>₹{(item.totalFee || 0).toFixed(2)}</td>
                                <td>₹{(item.totalPaid || 0).toFixed(2)}</td>
                                <td className={(item.remainingFee || 0) > 0 ? 'pending' : 'paid'}>₹{(item.remainingFee || 0).toFixed(2)}</td>
                              </>
                            ) : selectedTable === "Transport" ? (
                              <>
                                <td>{item.fullName || ""}</td>
                                <td>{item.rollNo || ""}</td>
                                <td>{item.standard || ""}</td>
                                <td>{item.busStation?.stationName || "N/A"}</td>
                                <td>₹{(item.busPrice || 0).toFixed(2)}</td>
                              </>
                            ) : (
                              Object.values(item).map((val, colIdx) => (
                                <td key={colIdx}>
                                  {typeof val === 'object' && val !== null
                                    ? JSON.stringify(val)
                                    : typeof val === 'string' && (val.toLowerCase().includes('date') || val.includes('-')) && val.match(/\d{4}-\d{2}-\d{2}/)
                                    ? formatDateOnly(val)
                                    : val ? String(val).substring(0, 50) : "-"}
                                </td>
                              ))
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Fees Pending Tab */}
      {activeTab === "fees-pending" && (
        <div className="dashboard-section">
          <h2>Fee Incompleted Student Backup</h2>
          <div className="filter-group">
            <div>
              <label htmlFor="category-filter">Section (Optional):</label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedClass("");
                }}
              >
                <option value="">All Sections</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="class-filter">Class {selectedCategory ? `(${selectedCategory})` : ""}:</label>
              <select
                id="class-filter"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {getClassesForCategory(selectedCategory).map(cls => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="button-group">
            <button onClick={fetchFeesPendingData}>Refresh Data</button>
            <button onClick={generateFeesPendingPDF}>Download Fee Pending List (PDF)</button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading">Loading data...</div>
          ) : (
            <>
              {feesPendingData.length > 0 && (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Roll No</th>
                        <th>Class</th>
                        <th>Total Fee</th>
                        <th>Paid Fee</th>
                        <th>Remaining Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feesPendingData.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.studentName}</td>
                          <td>{item.rollNo}</td>
                          <td>{item.standard}</td>
                          <td>₹{item.totalFee.toFixed(2)}</td>
                          <td>₹{item.paidFee.toFixed(2)}</td>
                          <td className={item.remainingFee > 0 ? "pending" : "paid"}>
                            ₹{item.remainingFee.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Download Backup Tab */}
      {activeTab === "backup" && (
        <div className="dashboard-section">
          <h2>Download Session Backup</h2>
          <p>Download all session data (Students, Fees, Transport, Lunch, Sections, Fee Pending) as a ZIP file.</p>
          
          <div className="backup-info">
            <p><strong>Included Files:</strong></p>
            <ul>
              <li>Students Data (CSV)</li>
              <li>Fees Data (CSV)</li>
              <li>Transport/Bus Data (CSV)</li>
              <li>Lunch Data (CSV)</li>
              <li>Sections/Standards Data (CSV)</li>
              <li>Fees Pending Data (CSV)</li>
            </ul>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button 
              onClick={generateBackupZip}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? "Generating Backup..." : "Download Backup ZIP"}
            </button>
          </div>

          {loading && <div className="loading">Generating backup file...</div>}
        </div>
      )}
    </div>
  );
};

export default Report;

