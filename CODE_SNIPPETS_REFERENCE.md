# Dashboard Implementation - Code Snippets Reference

## 📝 Key Code Changes

### 1. Navigation Update - Navbar.tsx

```typescript
// BEFORE:
const links = [
  { name: "Report", roles: ["admin"] },
  ...
];

// AFTER:
const links = [
  { name: "Dashboard", roles: ["admin"] },
  { name: "Fee Incompleted Student Backup", roles: ["admin"] },
  ...
];
```

### 2. Route Configuration - App.tsx

```typescript
// BEFORE:
<Route path="/" element={<Navigate to="/Report" />} />
<Route path="/Report" element={<ProtectedRoute...><Report /></ProtectedRoute>} />

// AFTER:
<Route path="/" element={<Navigate to="/Dashboard" />} />
<Route path="/Dashboard" element={<ProtectedRoute...><Report /></ProtectedRoute>} />
<Route path="/Fee Incompleted Student Backup" element={<ProtectedRoute...><Report /></ProtectedRoute>} />
```

### 3. API Functions - api.ts

```typescript
// Dashboard Students
export const fetchDashboardStudents = async () => {
  try {
    const response = await axios.get("http://localhost:5000/dashboard/students");
    return response.data;
  } catch (error) {
    throw new Error("Error fetching students");
  }
};

// Fees Pending with Filters
export const fetchFeesPending = async (
  filterSession?: string,
  filterClass?: string,
  filterSection?: string
) => {
  try {
    const params: any = {};
    if (filterSession) params.session = filterSession;
    if (filterClass) params.class = filterClass;
    if (filterSection) params.section = filterSection;

    const response = await axios.get(
      "http://localhost:5000/dashboard/fees-pending",
      { params }
    );
    return response.data;
  } catch (error) {
    throw new Error("Error fetching fees pending");
  }
};
```

### 4. Backend Endpoints - otherRoutes.js

#### Fees Pending Endpoint
```javascript
// Dashboard: Get fees pending students with calculations
router.get("/dashboard/fees-pending", async (req, res) => {
  const session = req.session;
  const { session: filterSession, class: filterClass, section: filterSection } = req.query;
  
  if (!session) {
    return res.status(400).json({ error: "Session not set" });
  }

  try {
    // Fetch students with fees
    let students = await prisma.student.findMany({
      where: { session },
      include: { fees: true },
    });

    // Filter by class
    if (filterClass) {
      students = students.filter(s => s.standard === filterClass);
    }

    // Filter by section
    if (filterSection) {
      students = students.filter(s => s.standard === filterSection);
    }

    // Get standard fees
    const standardFees = await prisma.standards.findMany({
      select: { std: true, totalFees: true },
    });
    const stdFeeMap = Object.fromEntries(
      standardFees.map(s => [s.std, s.totalFees || 0])
    );

    // Calculate pending fees
    const studentFeesPending = students.map(student => {
      const totalFee = stdFeeMap[student.standard] || 0;
      const paidFee = student.fees.reduce((sum, fee) => sum + fee.amount, 0);
      const remainingFee = totalFee - paidFee;

      return {
        id: student.id,
        studentName: student.fullName,
        rollNo: student.rollNo,
        standard: student.standard,
        totalFee,
        paidFee,
        remainingFee,
      };
    });

    res.status(200).json(studentFeesPending);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch fees-pending data" });
  }
});
```

### 5. PDF Generation - Report.tsx

```typescript
// Table Report PDF
const generateTablePDF = () => {
  if (tableData.length === 0) {
    alert("No data to generate PDF");
    return;
  }

  const doc = new jsPDF();
  const title = `${selectedTable} Report`;
  doc.setFontSize(16);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, {
    align: "center",
  });

  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];
  const rows = tableData.map(item =>
    columns.map(col => {
      const value = item[col];
      return value ? String(value).substring(0, 50) : "";
    })
  );

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 25,
    margin: 10,
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [49, 57, 112] }, // Dark Blue
  });

  doc.save(`${selectedTable}-report.pdf`);
};

// Fee Pending PDF
const generateFeesPendingPDF = () => {
  if (feesPendingData.length === 0) {
    alert("No fees pending data to generate PDF");
    return;
  }

  const doc = new jsPDF();
  const title = "Fee Pending List";
  doc.setFontSize(16);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, {
    align: "center",
  });

  const columns = [
    "Student Name",
    "Class",
    "Section",
    "Total Fee",
    "Paid Fee",
    "Remaining Fee",
  ];
  const rows = feesPendingData.map(item => [
    item.studentName,
    item.standard,
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
    headStyles: { fillColor: [175, 23, 99] }, // Maroon
  });

  doc.save("fee-pending-list.pdf");
};
```

### 6. Component State - Report.tsx

```typescript
// Main state management
const [activeTab, setActiveTab] = useState<"summary" | "tables" | "fees-pending">("summary");
const [selectedTable, setSelectedTable] = useState<string>("Students");
const [tableData, setTableData] = useState<any[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const [feesPendingData, setFeesPendingData] = useState<FeesPendingData[]>([]);
const [selectedClass, setSelectedClass] = useState<string>("");
const [selectedSection, setSelectedSection] = useState<string>("");
const [availableClasses, setAvailableClasses] = useState<string[]>([]);
```

### 7. Event Handlers - Report.tsx

```typescript
// Fetch table data
const fetchTableData = async (tableName: string) => {
  setLoading(true);
  setError(null);
  try {
    let data: any[] = [];
    switch (tableName) {
      case "Students":
        data = await fetchDashboardStudents();
        break;
      case "Fees":
        data = await fetchDashboardFees();
        break;
      case "Transport":
        data = await fetchDashboardTransport();
        break;
      case "Lunch":
        data = await fetchDashboardLunch();
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

// Fetch fees pending with filters
const fetchFeesPendingData = async () => {
  setLoading(true);
  setError(null);
  try {
    const data = await fetchFeesPending(
      undefined,
      selectedClass,
      selectedSection
    );
    setFeesPendingData(data);
  } catch (error) {
    setError("Failed to fetch fees pending data");
    console.error(error);
    setFeesPendingData([]);
  } finally {
    setLoading(false);
  }
};
```

### 8. CSS Styling - report.css

```css
/* Dashboard Section */
.dashboard-section {
  background-color: white;
  padding: 20px;
  margin-bottom: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dashboard-section h2 {
  color: #313970;
  margin-bottom: 20px;
  border-bottom: 2px solid #AF1763;
  padding-bottom: 10px;
}

/* Filter Group */
.filter-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.filter-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #313970;
}

.filter-group select,
.filter-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

/* Buttons */
.button-group button {
  padding: 10px 20px;
  background-color: #313970;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.button-group button:hover {
  background-color: #AF1763;
}

/* Tables */
.table-container table {
  width: 100%;
  border-collapse: collapse;
  background-color: #fff;
}

.table-container th {
  background-color: #313970;
  color: white;
  padding: 12px;
  text-align: left;
  font-weight: bold;
  border-bottom: 2px solid #AF1763;
}

.table-container tr:nth-child(even) {
  background-color: #f9f9f9;
}

.table-container tr:hover {
  background-color: #f0f0f0;
}

/* Messages */
.error-message {
  color: #d32f2f;
  background-color: #ffebee;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}
```

### 9. Package.json Dependencies

```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.5.28",
    ...
  },
  "devDependencies": {
    "@types/jspdf": "^2.5.7",
    ...
  }
}
```

### 10. TypeScript Interfaces - Report.tsx

```typescript
interface FeesPendingData {
  id: number;
  studentName: string;
  rollNo: number;
  standard: string;
  totalFee: number;
  paidFee: number;
  remainingFee: number;
}
```

## 🔄 Data Flow Examples

### Example 1: Generate Students PDF

```
User Action: Select "Students" from dropdown
    ↓
handleTableSelect("Students") called
    ↓
fetchTableData("Students") called
    ↓
API: GET /dashboard/students
    ↓
Returns: [
  { id: 1, fullName: "John", rollNo: 101, standard: "10A", gender: "M" },
  { id: 2, fullName: "Jane", rollNo: 102, standard: "10B", gender: "F" },
]
    ↓
setState(tableData) → Table renders
    ↓
User clicks "Download PDF Report"
    ↓
generateTablePDF() called
    ↓
new jsPDF() → Add title → autoTable() → document.save("students-report.pdf")
    ↓
File saved to Downloads folder
```

### Example 2: Filter and Download Fee Pending

```
User selects Class = "10A"
    ↓
User clicks "Refresh Data"
    ↓
fetchFeesPendingData() called with filterClass="10A"
    ↓
API: GET /dashboard/fees-pending?class=10A
    ↓
Backend:
  1. Fetch all students where standard="10A"
  2. Fetch Standards to get totalFees for "10A"
  3. For each student:
     - Calculate paidFee = sum(fees.amount)
     - Calculate remainingFee = totalFee - paidFee
  4. Return array with calculations
    ↓
Returns: [
  {
    id: 1,
    studentName: "John",
    rollNo: 101,
    standard: "10A",
    totalFee: 50000,
    paidFee: 20000,
    remainingFee: 30000
  },
  ...
]
    ↓
setState(feesPendingData) → Table renders
    ↓
User clicks "Download Fee Pending List (PDF)"
    ↓
generateFeesPendingPDF() called
    ↓
PDF created with maroon header
    ↓
document.save("fee-pending-list.pdf")
    ↓
File saved to Downloads folder
```

## 🐛 Common Code Patterns

### Safe Data Access
```typescript
// Always check before accessing
if (tableData.length > 0) {
  const columns = Object.keys(tableData[0]);
  // Use columns safely
}
```

### Error Handling Pattern
```typescript
try {
  setLoading(true);
  setError(null);
  const data = await fetchData();
  setData(data);
} catch (error) {
  setError("User-friendly message");
  console.error(error); // Debug
  setData([]);
} finally {
  setLoading(false);
}
```

### Conditional Rendering
```typescript
{loading ? (
  <div className="loading">Loading data...</div>
) : error ? (
  <div className="error-message">{error}</div>
) : tableData.length > 0 ? (
  <div>Render table...</div>
) : (
  <div>No data message</div>
)}
```

### State Update with Filters
```typescript
let students = await fetchAllStudents();
if (filterClass) {
  students = students.filter(s => s.standard === filterClass);
}
if (filterSection) {
  students = students.filter(s => s.standard === filterSection);
}
setFilteredData(students);
```

## 📚 Import Statements

```typescript
// Frontend imports in Report.tsx
import { useState, useEffect } from "react";
import "../styles/report.css";
import {
  report,
  fetchDashboardStudents,
  fetchDashboardFees,
  fetchDashboardTransport,
  fetchDashboardLunch,
  fetchDashboardTeachers,
  fetchDashboardSections,
  fetchFeesPending
} from "../apis/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
```

```javascript
// Backend imports in otherRoutes.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();
```

## 🎯 Key Constants

```typescript
// Table options
const tableOptions = [
  { value: "Students", label: "Students" },
  { value: "Fees", label: "Fees" },
  { value: "Transport", label: "Transport" },
  { value: "Lunch", label: "Lunch" },
  { value: "Teachers", label: "Teachers" },
  { value: "Sections", label: "Sections" },
];

// Color scheme
const COLORS = {
  primary: "#313970",      // Dark Blue
  secondary: "#AF1763",    // Maroon
  light: "#f4f4f4",        // Light Gray
  white: "#ffffff",
};

// Default values
const DEFAULT_LUNCH_PRICE = 700; // in rupees
```

## ✅ Validation Examples

```typescript
// Session validation (Backend)
if (!session) {
  return res.status(400).json({ error: "Session not set" });
}

// Data validation (Frontend)
if (tableData.length === 0) {
  alert("No data to generate PDF");
  return;
}

// Type checking (TypeScript)
const classes: string[] = [...new Set(sections.map((s: any) => s.std))] as string[];
```

---

This reference guide provides quick access to all key code implementations and patterns used in the Dashboard feature.
