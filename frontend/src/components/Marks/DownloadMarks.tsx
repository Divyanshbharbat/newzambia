import React from 'react'
import {  downloadMarks } from '../../apis/api';

const DownloadMarks : React.FC = () => {
    const handleDownload = async () => {
        try {
          const response = await downloadMarks();
          console.log("res --> " ,response);
          if (response.status < 200 || response.status >= 300) {
            alert("here first")
            throw new Error('Failed to download fees records');
          }
          const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'Marks.xlsx';
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error downloading Marks records:', error);
          alert('Failed to download Marks records');
        }
      };
  return (
    <div style={{marginTop:"-20px"}}>
        <button onClick={handleDownload}>Download Marks</button>
    </div>
  )
}

export default DownloadMarks
