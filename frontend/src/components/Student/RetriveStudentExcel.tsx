import React from 'react';
import { downloadStudentsExcel, downloadStudentsCSV } from '../../apis/api';

const StudentsInfoDownload: React.FC = () => {
  const downloadExcel = async () => {
    try {
      const response = await downloadStudentsExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'students_data.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading Excel file', error);
      alert('An error occurred while downloading the Excel file. Please try again later.');
    }
  };

  const downloadCSV = async () => {
    try {
      const response = await downloadStudentsCSV();
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'students_data.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading CSV file', error);
      alert('An error occurred while downloading the CSV file. Please try again later.');
    }
  };

  return (
    <div>
      <h2>Download All Student Data</h2>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button style={{ marginTop: '-2px' }} onClick={downloadExcel}>Download Excel</button>
        <button style={{ marginTop: '-2px' }} onClick={downloadCSV}>Download CSV</button>
      </div>
    </div>
  );
};

export default StudentsInfoDownload;
