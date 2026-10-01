import { useState, useEffect } from "react";
import "../styles/report.css";
import {
  fetchDashboardStudents,
  fetchDashboardFees,
  fetchDashboardTransport,
  fetchDashboardLunch,
  fetchDashboardTeachers,
  fetchDashboardSections,
  fetchFeesPending,
  downloadBackupZip,
  fetchTransactionsReport
} from "../apis/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import DashboardSummary from "../components/DashboardSummary";
import {
  IndianRupee,
  GraduationCap,
  ShoppingBag,
  Utensils,
  Bus,
  Search,
  Download,
  Printer,
  RefreshCw,
  Calendar
} from "lucide-react";

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

interface TransactionItem {
  id: string;
  refNo: string;
  date: string;
  studentId: number;
  studentName: string;
  rollNo: number | string;
  standard: string;
  category: "Fees" | "Inventory" | "Lunch" | "Bus Transport" | string;
  title: string;
  amount: number;
  status: string;
}

interface TransactionsSummary {
  totalTransactions: number;
  grandTotal: number;
  feesTotal: number;
  inventoryTotal: number;
  lunchTotal: number;
  busTotal: number;
}

const Report = () => {
  // Helper function to check if session is selected
  const checkSessionSelected = (): boolean => {
    const selectedSession = localStorage.getItem("selectedSession");
    if (!selectedSession) {
      alert("Please select a session first");
      return false;
    }
    return true;
  };

  // Dashboard state - default to "transactions"
  const [activeTab, setActiveTab] = useState<"transactions" | "summary" | "tables" | "fees-pending" | "backup">("transactions");
  const [selectedTable, setSelectedTable] = useState<string>("Students");
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transactions Report state
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [txnCategory, setTxnCategory] = useState<string>("All");
  const [txnClass, setTxnClass] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activePreset, setActivePreset] = useState<string>("month");
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txnSummary, setTxnSummary] = useState<TransactionsSummary>({
    totalTransactions: 0,
    grandTotal: 0,
    feesTotal: 0,
    inventoryTotal: 0,
    lunchTotal: 0,
    busTotal: 0,
  });
  const [txnLoading, setTxnLoading] = useState<boolean>(false);

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

  // Transactions Report fetch
  const loadTransactions = async () => {
    setTxnLoading(true);
    try {
      const res = await fetchTransactionsReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        category: txnCategory !== "All" ? txnCategory : undefined,
        standard: txnClass || undefined,
      });
      setTransactions(res.transactions || []);
      setTxnSummary(res.summary || {
        totalTransactions: 0,
        grandTotal: 0,
        feesTotal: 0,
        inventoryTotal: 0,
        lunchTotal: 0,
        busTotal: 0,
      });
    } catch (err) {
      console.error("Failed to load transactions report:", err);
    } finally {
      setTxnLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "transactions") {
      loadTransactions();
    }
  }, [activeTab, startDate, endDate, txnCategory, txnClass]);

  const handlePresetChange = (preset: "today" | "week" | "month" | "last_month" | "year" | "all") => {
    setActivePreset(preset);
    const now = new Date();
    let start = "";
    let end = now.toISOString().split("T")[0];

    if (preset === "today") {
      start = end;
    } else if (preset === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start = weekAgo.toISOString().split("T")[0];
    } else if (preset === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    } else if (preset === "last_month") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
    } else if (preset === "year") {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    } else if (preset === "all") {
      start = "";
      end = "";
    }
    setStartDate(start);
    setEndDate(end);
  };

  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.studentName || "").toLowerCase().includes(q) ||
      String(t.rollNo || "").toLowerCase().includes(q) ||
      (t.title || "").toLowerCase().includes(q) ||
      (t.refNo || "").toLowerCase().includes(q) ||
      (t.standard || "").toLowerCase().includes(q)
    );
  });

  const exportTransactionsCSV = () => {
    if (filteredTransactions.length === 0) {
      alert("No transactions to export");
      return;
    }
    const headers = ["Reference No", "Date", "Student Name", "Roll No", "Class", "Category", "Description", "Amount (₹)", "Status"];
    const rows = filteredTransactions.map(t => [
      `"${t.refNo}"`,
      `"${new Date(t.date).toLocaleDateString('en-GB')}"`,
      `"${(t.studentName || '').replace(/"/g, '""')}"`,
      `"${t.rollNo || '-'}"`,
      `"${t.standard || '-'}"`,
      `"${t.category}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      `"${t.status}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-report-${startDate || 'all'}-to-${endDate || 'today'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadTransactionsPDF = () => {
    if (filteredTransactions.length === 0) {
      alert("No transactions to download");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Transactions Payment History Report", doc.internal.pageSize.getWidth() / 2, 14, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Period: ${startDate || 'Start'} to ${endDate || 'Present'} | Category: ${txnCategory} | Total Paid: ₹${txnSummary.grandTotal.toFixed(2)}`, doc.internal.pageSize.getWidth() / 2, 21, { align: "center" });

    const columns = ["Date", "Ref No", "Student Name", "Roll", "Class", "Category", "Description", "Amount"];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('en-GB'),
      t.refNo,
      t.studentName,
      String(t.rollNo || "-"),
      t.standard,
      t.category,
      (t.title || "").substring(0, 30),
      `₹${t.amount.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 26,
      margin: 8,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [49, 57, 112], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`transactions-${startDate || 'all'}-to-${endDate || 'today'}.pdf`);
  };

  const printTransactions = () => {
    window.print();
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

      if (backupData.students.data.length > 0) {
        const studentHeaders = Object.keys(backupData.students.data[0]);
        zip.file("students.csv", createCSV(backupData.students.data, studentHeaders));
      }
      if (backupData.fees.data.length > 0) {
        const feeHeaders = Object.keys(backupData.fees.data[0]);
        zip.file("fees.csv", createCSV(backupData.fees.data, feeHeaders));
      }
      if (backupData.transport.data.length > 0) {
        const transportHeaders = Object.keys(backupData.transport.data[0]);
        zip.file("transport.csv", createCSV(backupData.transport.data, transportHeaders));
      }
      if (backupData.lunch.data.length > 0) {
        const lunchHeaders = Object.keys(backupData.lunch.data[0]);
        zip.file("lunch.csv", createCSV(backupData.lunch.data, lunchHeaders));
      }
      if (backupData.sections.data.length > 0) {
        const sectionHeaders = Object.keys(backupData.sections.data[0]);
        zip.file("sections.csv", createCSV(backupData.sections.data, sectionHeaders));
      }
      if (backupData.feesPending.data.length > 0) {
        const pendingHeaders = Object.keys(backupData.feesPending.data[0]);
        zip.file("fees_pending.csv", createCSV(backupData.feesPending.data, pendingHeaders));
      }

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
          onClick={() => setActiveTab("transactions")}
          style={{ backgroundColor: activeTab === "transactions" ? "#AF1763" : "#313970" }}
        >
          Transactions Report
        </button>
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

      {/* Transactions Report Tab */}
      {activeTab === "transactions" && (
        <div className="dashboard-section">
          <h2>Paid Transactions History Report</h2>

          {/* Quick Date Presets Bar */}
          <div className="date-presets-bar">
            <span className="date-presets-label">
              <Calendar size={14} style={{ display: "inline", marginRight: "4px" }} />
              Quick Range:
            </span>
            <button
              className={`preset-pill-btn ${activePreset === "today" ? "active" : ""}`}
              onClick={() => handlePresetChange("today")}
            >
              Today
            </button>
            <button
              className={`preset-pill-btn ${activePreset === "week" ? "active" : ""}`}
              onClick={() => handlePresetChange("week")}
            >
              Last 7 Days
            </button>
            <button
              className={`preset-pill-btn ${activePreset === "month" ? "active" : ""}`}
              onClick={() => handlePresetChange("month")}
            >
              This Month
            </button>
            <button
              className={`preset-pill-btn ${activePreset === "last_month" ? "active" : ""}`}
              onClick={() => handlePresetChange("last_month")}
            >
              Last Month
            </button>
            <button
              className={`preset-pill-btn ${activePreset === "year" ? "active" : ""}`}
              onClick={() => handlePresetChange("year")}
            >
              This Year
            </button>
            <button
              className={`preset-pill-btn ${activePreset === "all" ? "active" : ""}`}
              onClick={() => handlePresetChange("all")}
            >
              All Time
            </button>
          </div>

          {/* Filter Controls Bar */}
          <div className="filter-group">
            <div>
              <label htmlFor="txn-start-date">Start Date:</label>
              <input
                id="txn-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset("");
                }}
              />
            </div>

            <div>
              <label htmlFor="txn-end-date">End Date:</label>
              <input
                id="txn-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset("");
                }}
              />
            </div>

            <div>
              <label htmlFor="txn-category">Payment Category:</label>
              <select
                id="txn-category"
                value={txnCategory}
                onChange={(e) => setTxnCategory(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Fees">Fees (Tuition)</option>
                <option value="Inventory">Inventory Items</option>
                <option value="Lunch">Lunch Service</option>
                <option value="Bus Transport">Bus Transport</option>
              </select>
            </div>

            <div>
              <label htmlFor="txn-class">Class / Standard:</label>
              <select
                id="txn-class"
                value={txnClass}
                onChange={(e) => setTxnClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="txn-search">
                <Search size={14} style={{ display: "inline", marginRight: "4px" }} />
                Search Record:
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="txn-search"
                  type="text"
                  placeholder="Student, Roll No, Item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons: Refresh, CSV, PDF, Print */}
          <div className="button-group" style={{ marginBottom: "25px" }}>
            <button onClick={loadTransactions} disabled={txnLoading}>
              <RefreshCw size={14} style={{ display: "inline", marginRight: "6px" }} />
              Refresh
            </button>
            <button onClick={exportTransactionsCSV} style={{ backgroundColor: "#10b981" }}>
              <Download size={14} style={{ display: "inline", marginRight: "6px" }} />
              Export CSV
            </button>
            <button onClick={downloadTransactionsPDF} style={{ backgroundColor: "#313970" }}>
              <Download size={14} style={{ display: "inline", marginRight: "6px" }} />
              Download PDF
            </button>
            <button onClick={printTransactions} style={{ backgroundColor: "#64748b" }}>
              <Printer size={14} style={{ display: "inline", marginRight: "6px" }} />
              Print
            </button>
          </div>

          {/* Summary KPI Cards Grid */}
          <div className="transactions-summary-grid">
            {/* Grand Total */}
            <div className="txn-kpi-card card-total">
              <div className="txn-kpi-icon" style={{ backgroundColor: "#dcfce7" }}>
                <IndianRupee size={24} color="#15803d" />
              </div>
              <div className="txn-kpi-info">
                <span className="txn-kpi-title">Total Collections</span>
                <span className="txn-kpi-value">₹{(txnSummary.grandTotal || 0).toLocaleString()}</span>
                <span className="txn-kpi-count">{txnSummary.totalTransactions || 0} Transactions</span>
              </div>
            </div>

            {/* Tuition Fees */}
            <div className="txn-kpi-card card-fees">
              <div className="txn-kpi-icon" style={{ backgroundColor: "#e0e7ff" }}>
                <GraduationCap size={24} color="#313970" />
              </div>
              <div className="txn-kpi-info">
                <span className="txn-kpi-title">Tuition & Fees</span>
                <span className="txn-kpi-value">₹{(txnSummary.feesTotal || 0).toLocaleString()}</span>
                <span className="txn-kpi-count">Fee Installments</span>
              </div>
            </div>

            {/* Inventory */}
            <div className="txn-kpi-card card-inventory">
              <div className="txn-kpi-icon" style={{ backgroundColor: "#fef3c7" }}>
                <ShoppingBag size={24} color="#b45309" />
              </div>
              <div className="txn-kpi-info">
                <span className="txn-kpi-title">Inventory Items</span>
                <span className="txn-kpi-value">₹{(txnSummary.inventoryTotal || 0).toLocaleString()}</span>
                <span className="txn-kpi-count">Uniforms, Books & Items</span>
              </div>
            </div>

            {/* Lunch */}
            <div className="txn-kpi-card card-lunch">
              <div className="txn-kpi-icon" style={{ backgroundColor: "#cffafe" }}>
                <Utensils size={24} color="#0e7490" />
              </div>
              <div className="txn-kpi-info">
                <span className="txn-kpi-title">Lunch Services</span>
                <span className="txn-kpi-value">₹{(txnSummary.lunchTotal || 0).toLocaleString()}</span>
                <span className="txn-kpi-count">Meal Subscriptions</span>
              </div>
            </div>

            {/* Bus Transport */}
            <div className="txn-kpi-card card-bus">
              <div className="txn-kpi-icon" style={{ backgroundColor: "#f3e8ff" }}>
                <Bus size={24} color="#7e22ce" />
              </div>
              <div className="txn-kpi-info">
                <span className="txn-kpi-title">Bus Transport</span>
                <span className="txn-kpi-value">₹{(txnSummary.busTotal || 0).toLocaleString()}</span>
                <span className="txn-kpi-count">Route Subscriptions</span>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          {txnLoading ? (
            <div className="loading">Loading paid transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
              <p style={{ fontSize: "16px", fontWeight: "600" }}>No transactions found for the selected date range and filters.</p>
              <p style={{ fontSize: "13px" }}>Try selecting "All Time" or adjusting your search criteria.</p>
            </div>
          ) : (
            <div>
              <div className="table-summary-bar">
                <span>Showing {filteredTransactions.length} of {transactions.length} Transactions</span>
                <span>
                  Filtered Sum:{" "}
                  <strong style={{ color: "#AF1763" }}>
                    ₹{filteredTransactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </span>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Ref No</th>
                      <th>Student Name</th>
                      <th>Roll No</th>
                      <th>Class</th>
                      <th>Category</th>
                      <th>Details / Item</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((item, idx) => {
                      const badgeClass =
                        item.category === "Inventory"
                          ? "badge-inventory"
                          : item.category === "Lunch"
                          ? "badge-lunch"
                          : item.category === "Bus Transport"
                          ? "badge-bus"
                          : "badge-fees";

                      return (
                        <tr key={item.id || idx}>
                          <td style={{ color: "#64748b", fontSize: "12px" }}>{idx + 1}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatDateOnly(item.date)}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px", color: "#313970", fontWeight: "600" }}>
                            {item.refNo}
                          </td>
                          <td style={{ fontWeight: "600" }}>{item.studentName}</td>
                          <td>{item.rollNo || "-"}</td>
                          <td>{item.standard || "-"}</td>
                          <td>
                            <span className={`badge-category ${badgeClass}`}>
                              {item.category === "Inventory" && <ShoppingBag size={12} />}
                              {item.category === "Lunch" && <Utensils size={12} />}
                              {item.category === "Bus Transport" && <Bus size={12} />}
                              {item.category === "Fees" && <GraduationCap size={12} />}
                              {item.category}
                            </span>
                          </td>
                          <td>{item.title}</td>
                          <td style={{ textAlign: "right", fontWeight: "700", color: "#1e293b" }}>
                            ₹{item.amount.toFixed(2)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="badge-status-paid">Paid</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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
                {tableOptions.map((option) => (
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
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedClass("");
                    }}
                  >
                    <option value="">All Categories</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
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
                    {getClassesForCategory(selectedCategory).map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ visibility: "hidden" }}>apply</label>
                  <button className="btn" onClick={() => fetchTableData("Fees")}>
                    Apply
                  </button>
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
                            Object.keys(tableData[0]).map((col) => (
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
                                <td className={(item.remainingFee || 0) > 0 ? "pending" : "paid"}>
                                  ₹{(item.remainingFee || 0).toFixed(2)}
                                </td>
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
                                  {typeof val === "object" && val !== null
                                    ? JSON.stringify(val)
                                    : typeof val === "string" &&
                                      (val.toLowerCase().includes("date") || val.includes("-")) &&
                                      val.match(/\d{4}-\d{2}-\d{2}/)
                                    ? formatDateOnly(val)
                                    : val
                                    ? String(val).substring(0, 50)
                                    : "-"}
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
                {availableCategories.map((cat) => (
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
                {getClassesForCategory(selectedCategory).map((cls) => (
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
              style={{ opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}
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
