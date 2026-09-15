# Dashboard Features Documentation

## Overview
The new Dashboard feature replaces the Report page with a comprehensive reporting system that includes:
1. Summary overview of key statistics
2. Table-based report generation for all major data entities
3. Fee pending student tracking with filterable PDF reports

## Changes Made

### 1. Frontend Changes

#### Navigation Bar Update
- Renamed "Report" to "Dashboard" in the sidebar
- Added new menu item: "Fee Incompleted Student Backup"
- Both navigate to the Dashboard page

**File:** `frontend/src/components/Navbar.tsx`

#### Dashboard Component
Completely rewrote `frontend/src/pages/Report.tsx` with three main tabs:

##### Tab 1: Summary
- Displays total number of students
- Shows total money collected (fees)
- Shows total bed remaining in hostel

##### Tab 2: Download Table Reports
**Features:**
- Dropdown to select table/relation:
  - Students
  - Fees
  - Transport (Bus data)
  - Lunch
  - Teachers
  - Sections
  
- After selecting a relation:
  - Button: "Download PDF Report"
  - Generated PDF includes all data in formatted table
  - On-screen preview of data in an HTML table

**PDF Generation:**
- Uses `jsPDF` library for PDF creation
- Uses `jspdf-autotable` for formatted tables
- Professional styling with:
  - Centered title
  - Dark header rows
  - Proper column widths
  - Pagination support for large datasets

##### Tab 3: Fee Incompleted Student Backup
**Features:**
- Filter options:
  - Session dropdown
  - Class dropdown
  - Section dropdown

- Displays students with pending fees:
  - Student Name
  - Class
  - Section
  - Total Fee (₹)
  - Paid Fee (₹)
  - Remaining Fee (₹)

- Button: "Download Fee Pending List (PDF)"
  - Generates formatted PDF with all pending fee information
  - Uses professional styling with maroon header

#### New CSS Styling
**File:** `frontend/src/styles/report.css`

Enhanced styles include:
- Dashboard section cards with shadows
- Professional filter groups with labeled inputs
- Responsive button styling
- Table styling with alternating row colors
- Loading states and error messages
- Proper spacing and alignment

#### API Integration
**File:** `frontend/src/apis/api.ts`

Added new API calls:
```typescript
fetchDashboardStudents()      // Get all students
fetchDashboardFees()          // Get all fees
fetchDashboardTransport()     // Get bus/transport data
fetchDashboardLunch()         // Get lunch data
fetchDashboardTeachers()      // Get teachers data
fetchDashboardSections()      // Get standards/sections
fetchFeesPending()            // Get fees pending students
```

### 2. Backend Changes

#### New API Endpoints
**File:** `backend/routes/otherRoutes.js`

Added 7 new API endpoints:

1. **GET `/dashboard/students`**
   - Returns: All students with basic info
   - Fields: id, fullName, rollNo, standard, gender

2. **GET `/dashboard/fees`**
   - Returns: All fee records with student information
   - Includes: fee title, amount, student details

3. **GET `/dashboard/transport`**
   - Returns: Students enrolled in bus/transport
   - Fields: Student info, bus station, bus price

4. **GET `/dashboard/lunch`**
   - Returns: Students enrolled in lunch program
   - Fields: Student info, lunch price

5. **GET `/dashboard/teachers`**
   - Returns: Teacher list (currently empty)
   - Ready for future teacher model integration

6. **GET `/dashboard/sections`**
   - Returns: All standards/sections
   - Fields: id, std, category, totalFees

7. **GET `/dashboard/fees-pending`**
   - Returns: Students with incomplete fees
   - Query params: session, class (standard), section
   - Calculates:
     - Total fee for student's standard
     - Paid fee (sum of all fee entries)
     - Remaining fee (total - paid)

### 3. Dependencies Added
**File:** `frontend/package.json`

```json
{
  "jspdf": "^2.5.1",
  "jspdf-autotable": "^3.5.28"
}
```

TypeScript types:
```json
{
  "@types/jspdf": "^2.5.7"
}
```

## Usage Guide

### Accessing the Dashboard
1. Log in as Admin
2. Click "Dashboard" in the sidebar
3. You will see three tabs

### Generating Table Reports
1. Go to "Download Table Reports" tab
2. Select a table type from dropdown:
   - Students
   - Fees
   - Transport
   - Lunch
   - Teachers
   - Sections
3. Data will load automatically
4. Review the on-screen table preview
5. Click "Download PDF Report" to download

### Checking Fee Pending Students
1. Go to "Fee Incompleted Student Backup" tab
2. (Optional) Filter by:
   - Session
   - Class
   - Section
3. Click "Refresh Data" to load filtered results
4. Review the table showing:
   - Student names
   - Class/Section they belong to
   - Total fees they owe
   - Fees they have paid
   - Remaining balance
5. Click "Download Fee Pending List (PDF)" to generate report

## PDF Report Features

### Table Report PDF
- Document title: "[Table Name] Report"
- Professional table with headers
- All data columns included
- Auto-pagination for large datasets
- Dark blue header styling

### Fee Pending PDF
- Document title: "Fee Pending List"
- Columns: Student Name, Class, Section, Total Fee, Paid Fee, Remaining Fee
- Formatted currency values (₹)
- Maroon/pink header styling
- Automatic file naming

## Data Sources

### Students Table
- Source: `Student` model
- Filters: Current session

### Fees Table
- Source: `Fee` model with `Student` relations
- Shows all fee transactions

### Transport Table
- Source: `Student` model with `busAccepted: true`
- Includes bus station information

### Lunch Table
- Source: `Student` model with `lunchAccepted: true`
- Shows lunch fees

### Sections Table
- Source: `Standards` model
- Includes category and total fees

### Fees Pending Report
- Compares paid fees against standard's total fee
- Automatically calculates pending amount
- Respects session context
- Filterable by class/section

## Error Handling

All API endpoints include:
- Session validation
- Database error handling
- User-friendly error messages
- Error display in UI alerts

## Future Enhancements

1. **Teachers Table:** Can be populated once Teacher model is added
2. **Advanced Filters:** Add more filter options to table reports
3. **Email Reports:** Send PDF reports via email
4. **Scheduled Reports:** Set up automated report generation
5. **Export to Excel:** Add Excel export alongside PDF
6. **Chart Visualizations:** Add pie charts/bar charts to summary
7. **Payment Tracking:** More detailed fee payment history
8. **Transaction Details:** Timestamp and transaction ID in fee reports

## Troubleshooting

### PDF Not Generating
- Check browser console for errors
- Ensure data is loaded (see table preview)
- Check file naming and permissions

### No Data Appearing
- Verify session is selected
- Check backend logs for API errors
- Ensure database has records in that session

### Styling Issues
- Clear browser cache
- Rebuild frontend: `npm run build`
- Check report.css is properly loaded

### Filter Not Working
- Ensure dropdown values match database standards
- Try "Refresh Data" button
- Check browser console for API errors

## Installation Instructions

### Prerequisites
- Node.js and npm installed
- Backend server running
- Database configured

### Steps
1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## File Manifest

### Modified Files
- `frontend/src/components/Navbar.tsx` - Navigation menu
- `frontend/src/pages/Report.tsx` - Complete dashboard component
- `frontend/src/styles/report.css` - Dashboard styling
- `frontend/src/apis/api.ts` - API integration
- `frontend/src/App.tsx` - Route updates
- `backend/routes/otherRoutes.js` - New API endpoints

### Dependencies
- `jspdf` - PDF generation
- `jspdf-autotable` - Table formatting in PDFs
- `@types/jspdf` - TypeScript definitions

## Technical Details

### Technology Stack
- **Frontend:** React 18 with TypeScript
- **PDF Generation:** jsPDF + jspdf-autotable
- **Backend:** Node.js/Express
- **Database:** Prisma ORM with PostgreSQL
- **HTTP Client:** Axios

### Component Structure
```
Report.tsx
├── Summary Tab
│   └── Overview statistics
├── Table Reports Tab
│   ├── Dropdown selector
│   ├── Table preview
│   └── PDF download
└── Fees Pending Tab
    ├── Filters (Session, Class, Section)
    ├── Data refresh
    ├── Table preview
    └── PDF download
```

### API Flow
```
Frontend (Report.tsx)
    ↓
Axios API calls (api.ts)
    ↓
Express Routes (backend/routes/otherRoutes.js)
    ↓
Prisma Queries
    ↓
PostgreSQL Database
    ↓
Response → PDF Generation → Download
```

## Support

For issues or feature requests:
1. Check the Troubleshooting section
2. Review browser console for errors
3. Check backend logs
4. Verify database connectivity

