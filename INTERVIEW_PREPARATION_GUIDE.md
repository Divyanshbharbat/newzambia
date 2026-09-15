# 🎓 Sacred Heart School ERP System - Interview Preparation Guide

---

## 1. Problem Statement

Modern educational institutions often face severe operational inefficiencies due to fragmented legacy tools, paper-based workflows, and disconnected administrative systems. Key challenges include:

1. **Fragmented Data & Administrative Overhead**:
   - Student records, fee records, attendance logs, hostel assignments, inventory purchases, and exam marks are frequently stored across different spreadsheets or manual registers.
   - Administrative staff spend significant hours manually cross-referencing student data for routine operations.

2. **Complex Fee Tracking & Calculation Errors**:
   - Tracking partially paid fees vs. outstanding dues across multiple academic sessions, standards, and categories (e.g., transport fee, lunch fee, base tuition fee) is error-prone.
   - Manual identification of fee defaulters leads to delayed collection cycles and accounting discrepancies.

3. **Lack of Role-Based Access Control (RBAC)**:
   - Unrestricted data access risks data tampering or privacy breaches. Admins require high-level financial oversight, while teachers only require access to class attendance, mark entry, and student lists.

4. **Inflexible & Slow Reporting Systems**:
   - Generating instant, filtered reports (e.g., class-wise fee defaulter backups, daily/weekly attendance statistics, table snapshots) usually requires manual formatting or server-heavy PDF compiling, creating performance bottlenecks.

5. **Lack of Visual Analytics for Decision Making**:
   - School leadership lacks real-time visual representation (charts/graphs) of daily and weekly student attendance trends across different grades and sections.

---

## 2. Solution + Flow + Key Points

### 💡 Solution
The **Sacred Heart School ERP System** is a full-stack, enterprise-grade school management and analytics platform engineered to streamline administrative, academic, and financial operations. 

- **Role-Based Access Control (RBAC)**: Distinct permissions and workflows for `Admin` and `Teacher` roles.
- **Automated Financial Defaulter Engine**: Computes total expected fees based on standard categories and subtracts historical payments to isolate remaining balances dynamically.
- **Client-Side PDF Generation Architecture**: High-speed, offloaded PDF report generation using `jsPDF` and `jsPDF-AutoTable`, eliminating backend rendering strain.
- **Real-Time Visual Dashboards**: Interactive charts using `Recharts` providing daily and weekly attendance analysis.
- **Comprehensive Academic & Logistics Modules**: Student tracking, Hostel allocation, Bus station logistics, Inventory allocation, Marks management, and Session management.

---

### 🔄 System Architecture & Core Data Flows

```
                   +---------------------------------------+
                   |          React 18 Frontend            |
                   |  (TypeScript, Vite, Recoil, Recharts) |
                   +-------------------+-------------------+
                                       |
                                 REST API (Axios)
                                       |
                                       v
                   +-------------------+-------------------+
                   |         Node.js / Express.js          |
                   |       (Role-Based Middleware)         |
                   +-------------------+-------------------+
                                       |
                                  Prisma ORM
                                       |
                                       v
                   +-------------------+-------------------+
                   |        PostgreSQL Database            |
                   | (Students, Fees, Attendance, etc.)    |
                   +---------------------------------------+
```

#### Flow 1: Authentication & Session Scoping Flow
1. User enters login credentials (`username`, `password`).
2. Express server validates credentials against the `User` model via Prisma ORM and checks `college` scoping.
3. Server returns user session info and assigned `role` (`admin` or `teacher`).
4. React router dynamically permits access to authorized paths (e.g., Teachers cannot access Financial Dashboard or Fee Backup modules).

#### Flow 2: Dynamic Fee Balance & Defaulter Tracking Flow
1. **User Action**: Admin accesses the *Fee Incompleted Student Backup* tab and selects filters (`Class`, `Section`).
2. **Backend Query**: Express endpoint `/dashboard/fees-pending` executes a Prisma query fetching students belonging to the target class and session.
3. **Calculation Logic**:
   $$\text{Total Fee} = \text{Standard.totalFees}$$
   $$\text{Paid Fee} = \sum (\text{Student.Fee.amount})$$
   $$\text{Remaining Fee} = \text{Total Fee} - \text{Paid Fee}$$
4. **Response**: JSON array containing calculated student objects with outstanding fees.
5. **PDF Export**: User clicks "Download Fee Pending List (PDF)". Client-side `jsPDF-AutoTable` parses state data and instantly triggers browser file download.

#### Flow 3: Marks Entry & Performance Flow
1. Teacher selects `Class/Standard`, `Subject`, and `Examination Type`.
2. System pulls registered students for the selected subject.
3. Teacher inputs `obtainedMarks` and `totalMarks`.
4. System automatically computes percentage:
   $$\text{Percentage} = \left(\frac{\text{obtainedMarks}}{\text{totalMarks}}\right) \times 100$$
5. Upsert query is sent to Prisma to update/create records in the `Marks` table using compound unique key `[studentId, subjectId, examinationType, college]`.

#### Flow 4: Attendance Analytics Flow
1. Teacher marks daily attendance for students (Present / Absent).
2. Backend aggregates data into `/api/dashboard/attendance`.
3. Frontend queries aggregated endpoint and renders:
   - **Pie Chart**: Present vs. Absent percentage for the selected day.
   - **Bar Chart**: Monday–Saturday attendance trends for weekly analysis.

---

### 🔑 Key Points & Technical Highlights (Interview Talking Points)

1. **Zero-Server-Load Report Generation**:
   *Talking Point*: "Instead of relying on backend rendering engines (like Puppeteer or HTML-to-PDF templates on Node.js) which consume significant server CPU/memory under load, I implemented client-side PDF generation using `jsPDF` and `jspdf-autotable`. The browser formats and builds the document directly, making report downloads instantaneous and zero-cost for the server."

2. **Type-Safe Relational Data Modeling with Prisma**:
   *Talking Point*: "We used Prisma ORM with PostgreSQL. The schema utilizes strict relational constraints and composite unique keys (e.g., `@@unique([standard, rollNo, session, college])` or `@@unique([bed_number, college])`) to enforce data integrity at the database level, preventing duplicate roll numbers, double bed assignments, or redundant marks entries."

3. **Multi-Tenant / Multi-College Scoping**:
   *Talking Point*: "The database schema incorporates a `college` domain identifier on almost every entity (`Student`, `Fee`, `Hostel`, `User`, `Standards`). This enables horizontal multi-tenancy and data isolation across multiple institutions within the same system."

4. **Modular Architecture & State Isolation**:
   *Talking Point*: "The frontend uses React 18 with Vite for ultra-fast builds and Recoil for global state management. Components like the Dashboard are split into clean tabbed sub-views (Summary, Dynamic Tables, Fee Defaulter Backup) to prevent unnecessary re-renders."

5. **Future-Proof AI Capabilities**:
   *Talking Point*: "The backend dependencies include `@langchain/community` and `@langchain/ollama`. This architecture is pre-configured to allow local LLM integrations for smart natural language queries on school data (e.g., 'Show me attendance trends for Class 10 B this month')."

---

## 3. Tech Stack

### 🎨 Frontend (Client-Side)
- **Core Library & Language**: React 18 (TypeScript)
- **Build Tool**: Vite (Lightning-fast HMR and modular bundling)
- **State Management**: Recoil (Atomic global state handling)
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios (REST API interaction)
- **Data Visualization**: Recharts (Interactive SVG charts for attendance analytics)
- **PDF & Document Libraries**:
  - `jspdf` & `jspdf-autotable` (Client-side PDF report rendering)
  - `docx` & `file-saver` (Word document export capabilities)
  - `html2canvas` (Canvas capture)
- **UI Styling**: Tailwind CSS, PostCSS, Lucide React (Modern iconography)

### ⚙️ Backend (Server-Side)
- **Runtime**: Node.js
- **Web Framework**: Express.js (REST API endpoints & middleware routing)
- **ORM (Object-Relational Mapping)**: Prisma ORM v6 (Type-safe queries, migration management, schema seeding)
- **Database Engine**: PostgreSQL (Production DB with relational integrity) / SQLite supported
- **Data Processing & Utilities**:
  - `multer` (File upload handling)
  - `exceljs` & `json2csv` (CSV/Excel report parsing and processing)
  - `pdfkit` (Server-side document utilities)
- **AI & LLM Stack**: LangChain ecosystem (`@langchain/core`, `@langchain/community`, `@langchain/ollama`)
- **Dev Tooling**: Nodemon, Dotenv, CORS

---

### 📄 File Generated
*Interview Preparation Guide saved to repository as:*
[`INTERVIEW_PREPARATION_GUIDE.md`](file:///d:/zambianew/Zambia_Project/INTERVIEW_PREPARATION_GUIDE.md)
