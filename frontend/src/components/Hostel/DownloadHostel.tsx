
import React from 'react'
import {downloadHosteldata } from '../../apis/api';

const DownloadHostel : React.FC = () => {
    const handleDownload = async () => {
        try {
          const response = await downloadHosteldata();
          console.log("res --> " ,response);
          if (response.status < 200 || response.status >= 300) {
            alert("here first")
            throw new Error('Failed to download Hostel records');
          }
          const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'Hostel.xlsx';
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error downloading Hostel records:', error);
          alert('Failed to download Hostel records');
        }
      };
  return (
    <div style={{marginTop:"-20px"}}>
        <button onClick={handleDownload}>Download Hostel Data</button>
    </div>
  )
}

export default DownloadHostel
