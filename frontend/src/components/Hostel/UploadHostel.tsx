import React, { useState } from 'react'
import {uploadHosteldata } from '../../apis/api';

const UploadHostel = () => {
    const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (file) {
      try {
        await uploadHosteldata(file);
        alert('File uploaded successfully');
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload file');
      }
    }
  };

  return (
    <div style={{marginTop:"-20px"}}>
      <span>
          <input style={{margin : "0"}} accept=".xlsx, .xls" onChange={handleFileChange} type="file"  />
      </span>
      <span style={{marginLeft : "15px"}}>
        <button onClick={handleUpload}>Upload</button>
      </span>
    </div>
  )
}

export default UploadHostel
