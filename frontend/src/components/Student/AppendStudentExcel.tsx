import React, { useState } from 'react';
import { uploadStudentsFile } from '../../apis/api';

const UploadStudents: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (file) {
      try {
        const response = await uploadStudentsFile(file);
        const { importedCount, duplicateCount, duplicates } = response.data;
        
        let message = `Import completed!\n- Successfully imported: ${importedCount}`;
        if (duplicateCount > 0) {
          message += `\n- Already exist (skipped): ${duplicateCount}`;
          const displayDuplicates = duplicates.slice(0, 10);
          message += `\n\nExisting Students:\n${displayDuplicates.join('\n')}`;
          if (duplicates.length > 10) {
            message += `\n... and ${duplicates.length - 10} more.`;
          }
        }
        alert(message);
      } catch (error: any) {
        console.error('Error uploading file:', error);
        alert(`Failed to upload file: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  return (
    <div>
      <h2>Upload Students at Once</h2>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
      <button  style={{ marginTop: '-2px' }} onClick={handleUpload}>Upload</button>
    </div>
  );
};

export default UploadStudents;
