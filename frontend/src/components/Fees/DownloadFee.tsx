import React from 'react'
import { downloadfeedata } from '../../apis/api';

const DownloadFee : React.FC = () => {
    const handleDownload = async () => {
        try {
          const response = await downloadfeedata();
          if (response.status < 200 || response.status >= 300) {
            throw new Error('Failed to download fees records');
          }
          const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'Fees.xlsx';
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error downloading fees records:', error);
          alert('Failed to download fees records');
        }
      };
  return (
    <div className="action-button-container">
        <button onClick={handleDownload}>Download Fees</button>
    </div>
  )
}

export default DownloadFee
