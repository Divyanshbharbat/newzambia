import React, { useState } from 'react'
import { uploadfeedata } from '../../apis/api';

const UploadFee = () => {
    const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (file) {
      try {
        await uploadfeedata(file);
        alert('File uploaded successfully');
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload file');
      }
    }
  };

  return (
    <div className="action-button-container">
      <div className="file-input-wrapper">
        <input accept=".xlsx, .xls" onChange={handleFileChange} type="file" />
      </div>
      <button onClick={handleUpload}>Upload</button>
    </div>
  )
}

export default UploadFee
