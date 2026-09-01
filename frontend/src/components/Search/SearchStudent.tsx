import React, { useState } from "react";
import { deleteStudent, searchStudent, updateStudent } from "../../apis/api";
import { AlignmentType, Document, ImageRun, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { standardList } from "../../store/store";
import { useRecoilValue } from "recoil";


interface Student {
  remark: string;
  id: number;
  fullName: string;
  rollNo: string;
  nationality?: string;
  religion?: string;
  denomination?: string;
  language?: string;
  motherTongue?: string;
  standard: string;
  photoUrl?: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup?: string;
  scholarshipApplied: boolean;
  residentialAddress?: string;
  correspondenceAddress?: string;
  parents: Parent[];
}

interface Parent {
  id: number;
  studentId: number;
  fatherName: string;
  motherName: string;
  fatherContact: string;
  motherContact: string;
  distanceFromSchool?: number;
  preferredPhoneNumber?: string;
  address: string;
}

const SearchStudent: React.FC = () => {
  const [rollNo,setRollNo] = useState("");
  const [standard, setStandard] = useState("");
  const [searchResult, setSearchResult] = useState<Student | null>(null);
  const [editableStudent, setEditableStudent] = useState<Student | null>(null);
  const standards = useRecoilValue(standardList);
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const generateWordDocument = async () => {
    if (!searchResult) return;
    let arrayBuffer = null;
    
    if (searchResult.photoUrl) {
        try {
            const imageUrl = searchResult.photoUrl.replace(/\\/g, '/');
            const response = await fetch(imageUrl);

            if (!response.ok) {
                throw new Error('Failed to fetch image');
            }

            const imageBlob = await response.blob();
            arrayBuffer = await imageBlob.arrayBuffer();
        } catch (error) {
            console.error('Error fetching or processing image:', error);
        }
    }
    
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              children: [
                new TextRun({
                  text: "Student Form",
                  bold: true,
                  size: 48,
                  
                }),
              ],
            }),
            new Paragraph({
              children: [
                new ImageRun({
                  data: arrayBuffer??"",
                  transformation: {
                    width: 100,  
                    height: 100, 
                  },
                }),
            ]}),
            new Paragraph({ text: "" }), 
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 300, after: 200 },
              children: [
                new TextRun({
                  text: `Student Details`,
                  bold: true,
                  underline: {},
                  size: 32,
                  
                }),
              ],
            }),
            new Paragraph({ text: "" }), 
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `Full Name: `,
                  bold: true,
                  size: 28,
                  
                }),
                new TextRun({
                  text: searchResult.fullName,
                  size: 28,
                  
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `Gender: `,
                  bold: true,
                  size: 28,
                  
                }),
                new TextRun({
                  text: searchResult.gender,
                  size: 28,
                  
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `Date of Birth: `,
                  bold: true,
                  size: 28,
                  
                }),
                new TextRun({
                  text: searchResult.dateOfBirth,
                  size: 28,
                  
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `Roll No: `,
                  bold: true,
                  size: 28,
                  
                }),
                new TextRun({
                  text: searchResult.rollNo,
                  size: 28,
                  
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `Class: `,
                  bold: true,
                  size: 28,
                  
                }),
                new TextRun({
                  text: searchResult.standard,
                  size: 28,
                  
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `Blood Group: `,
                  bold: true,
                  size: 28,
                  
                }),
                new TextRun({
                  text: searchResult.bloodGroup || '',
                  size: 28,
                  
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `Scholarship Applied: `,
                  bold: true,
                  size: 28,
                  
                }),
                new TextRun({
                  text: searchResult.scholarshipApplied ? "Yes" : "No",
                  size: 28,
                  
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `Residential Address: `,
                  bold: true,
                  size: 28,
                  
                }),
                new TextRun({
                  text: searchResult.residentialAddress || '',
                  size: 28,
                  
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `Correspondence Address: `,
                  bold: true,
                  size: 28,
                  
                }),
                new TextRun({
                  text: searchResult.correspondenceAddress || '',
                  size: 28,
                  
                }),
              ],
            }),
            new Paragraph({ text: "" }), 
            
            ...(searchResult.parents || []).map((parent) => [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 300, after: 200 },
                children: [
                  new TextRun({
                    text: `Parent Details`,
                    bold: true,
                    underline: {},
                    size: 32,
                    
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: `Father Name: `,
                    bold: true,
                    size: 28,
                    
                  }),
                  new TextRun({
                    text: parent.fatherName,
                    size: 28,
                    
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: `Mother Name: `,
                    bold: true,
                    size: 28,
                    
                  }),
                  new TextRun({
                    text: parent.motherName,
                    size: 28,
                    
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: `Father Contact: `,
                    bold: true,
                    size: 28,
                    
                  }),
                  new TextRun({
                    text: parent.fatherContact,
                    size: 28,
                    
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: `Mother Contact: `,
                    bold: true,
                    size: 28,
                    
                  }),
                  new TextRun({
                    text: parent.motherContact,
                    size: 28,
                    
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: `Distance from School (kms): `,
                    bold: true,
                    size: 28,
                    
                  }),
                  new TextRun({
                    text: parent.distanceFromSchool?.toString() || '',
                    size: 28,
                    
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: `Preferred Phone Number for School: `,
                    bold: true,
                    size: 28,
                    
                  }),
                  new TextRun({
                    text: parent.preferredPhoneNumber || '',
                    size: 28,
                    
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: `Address: `,
                    bold: true,
                    size: 28,
                    
                  }),
                  new TextRun({
                    text: parent.address,
                    size: 28,
                    
                  }),
                ],
              }),
              new Paragraph({ text: "" }), 
            ]),
          ].flat(),
        },
      ],
    });
  
    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `${searchResult.fullName}_${searchResult.standard}_Profile.docx`);
    });
  };

  const handleSearch = async () => {
    try {
      if(!rollNo){
        alert("Check Search Query");
        return;
      }
      
      const response = await searchStudent(parseInt(rollNo), standard);
      
      setSearchResult(response.data);
      setEditableStudent({
        ...response.data,
        dateOfBirth: formatDateForInput(response.data.dateOfBirth),
      });
    } catch (error) {
      alert("Student Not Found");
    }
  };

  const handleDelete = async () => {
    try {
      if (!searchResult?.id) {
        alert("Please search and select a valid student to delete.");
        return;
      }
      await deleteStudent(searchResult.id);
      alert("Student deleted successfully");
      setSearchResult(null); 
      setEditableStudent(null); // Clear the editable student state
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student");
    }
  };

  const handleUpdate = async () => {
    try {
      if (!editableStudent) {
        alert("No student data to update.");
        return;
      }
      const updateResponse = await updateStudent(editableStudent.id,editableStudent);
      if(updateResponse){
        alert("Student updated successfully");
      }
      setSearchResult(null);
      setEditableStudent(null);
    } catch (error) {
      console.error("Error updating student:", error);
      alert("Failed to update student");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editableStudent) return;
    const { name, value } = e.target;
    setEditableStudent({
      ...editableStudent,
      [name]: value,
    });
  };

  const handleParentChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editableStudent) return;
    const { name, value } = e.target;
    const updatedParents = editableStudent.parents.map((parent, i) =>
      i === index ? { ...parent, [name]: value } : parent
    );
    setEditableStudent({
      ...editableStudent,
      parents: updatedParents,
    });
  };

  const clearSearchResult = () => {
    setSearchResult(null);
    setEditableStudent(null);
  };

  return (
    <div>
      <h2>Search, Update, Delete Students</h2>
      <div>
        <label>Name/Roll No.</label>
        <input
          className="StudentInput"
          type="text"
          placeholder="Search by Name/Roll No"
          value={rollNo}
          onChange={(e) => setRollNo(e.target.value)}
        />
      </div>
      <div>
        <label>Select Standard</label>
        <select value={standard} onChange={(e) => setStandard(e.target.value)}>
          <option value="">Select Standard</option>
          {standards.map((standard:string) => (
            <option key={standard} value={standard}>
              {standard}
            </option>
          ))}
        </select>
      </div>
      <button onClick={handleSearch}>Search</button>
      &nbsp;
      <button onClick={clearSearchResult}>Clear</button>

      {searchResult && (
        <div>
          <h2 style={{paddingTop:"10px"}}>Student Profile</h2>
          <div style={{display:"flex"}} className="profile-container">
          
            <div className="profile-header">
              {searchResult.photoUrl && (
                <div className="profile-photo">
                  <img src={searchResult.photoUrl} alt="Student Photo" />
                </div>
              )}
            </div>

            <div>
              <div className="profile-section">
                <h4>Personal Information</h4>
                <div style={{marginLeft:"10px",display:"flex"}}>
                  <section>
                    <div className="profile-field">
                      <label>Full Name:</label>
                      <p>{searchResult.fullName}</p>
                    </div>
                    <div className="profile-field">
                      <label>Gender:</label>
                      <p>{searchResult.gender}</p>
                    </div>
                    <div className="profile-field">
                      <label>Date of Birth:</label>
                      <p>{formatDateForInput(searchResult.dateOfBirth)}</p>
                    </div>
                    <div className="profile-field">
                      <label>Blood Group:</label>
                      <p>{searchResult.bloodGroup}</p>
                    </div>
                    <div className="profile-field">
                      <label>Religion:</label>
                      <p>{searchResult.religion}</p>
                    </div>
                    <div className="profile-field">
                      <label>Denomination:</label>
                      <p>{searchResult.denomination}</p>
                    </div>
                    <div className="profile-field">
                      <label>Nationality:</label>
                      <p>{searchResult.nationality}</p>
                    </div>
                    <div className="profile-field">
                      <label>Language:</label>
                      <p>{searchResult.language}</p>
                    </div>
                    <div className="profile-field">
                      <label>Mother Tongue:</label>
                      <p>{searchResult.motherTongue}</p>
                    </div>
                    <div className="profile-field">
                      <label>Roll No:</label>
                      <p>{searchResult.rollNo}</p>
                    </div>
                    <div className="profile-field">
                      <label>Class:</label>
                      <p>{searchResult.standard}</p>
                    </div>
                  </section>
                  <section>
                    <div className="profile-field">
                      <label>Scholarship Applied:</label>
                      <p>{searchResult.scholarshipApplied ? "Yes" : "No"}</p>
                    </div>
                    <div className="profile-field">
                      <label>Residential Address:</label>
                      <p>{searchResult.residentialAddress}</p>
                    </div>
                    <div className="profile-field">
                      <label>Correspondence Address:</label>
                      <p>{searchResult.correspondenceAddress}</p>
                    </div>
                  </section>
                </div>
              </div>

              <div className="profile-section">
                <h4>Parents Information</h4>
                <div style={{marginLeft:"10px"}}>
                  {(searchResult.parents || []).map((parent) => (
                    <div key={parent.id}>
                      <section style={{display:"flex"}}>
                        <section>
                          <div className="profile-field">
                            <label>Father Name:</label>
                            <p>{parent.fatherName}</p>
                          </div>
                          <div className="profile-field">
                            <label>Mother Name:</label>
                            <p>{parent.motherName}</p>
                          </div>
                          <div className="profile-field">
                            <label>Father Contact:</label>
                            <p>{parent.fatherContact}</p>
                          </div>
                          <div className="profile-field">
                            <label>Mother Contact:</label>
                            <p>{parent.motherContact}</p>
                          </div>
                          <div className="profile-field">
                            <label>Distance from School (kms):</label>
                            <p>{parent.distanceFromSchool}</p>
                          </div>
                          <div className="profile-field">
                            <label>Preferred Phone Number for School:</label>
                            <p>{parent.preferredPhoneNumber}</p>
                          </div>
                        </section>
                      </section>
                      <div className="profile-field">
                        <label>Address:</label>
                        <p>{parent.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
                
          </div>
          <button style={{margin:"2px"}} onClick={generateWordDocument}>Download as Word</button>
          <button style={{margin:"2px"}} onClick={handleDelete}>Delete Student</button>
        </div>
      )}

      {editableStudent && (
        <div>
          <h3>Edit Student Profile</h3>
          <form>
            <div>
              <label>Full Name:</label>
              <input
                className="StudentInput"
                type="text"
                name="fullName"
                value={editableStudent.fullName}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Gender:</label>
              <input
                className="StudentInput"
                type="text"
                name="gender"
                value={editableStudent.gender}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Date of Birth:</label>
              <input
                className="StudentInput"
                type="date"
                name="dateOfBirth"
                value={editableStudent.dateOfBirth}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Blood Group:</label>
              <input
                className="StudentInput"
                type="text"
                name="bloodGroup"
                value={editableStudent.bloodGroup}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Religion</label>
              <input
                className="studentInput"
                type="text"
                name="religion"
                value={editableStudent.religion}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Denomination</label>
              <input
                className="studentInput"
                type="text"
                name="denomination"
                value={editableStudent.denomination}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Nationality</label>
              <input
                className="studentInput"
                type="text"
                name="nationality"
                value={editableStudent.nationality}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Language</label>
              <input
                className="studentInput"
                type="text"
                name="language"
                value={editableStudent.language}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Mother Tongue</label>
              <input
                className="studentInput"
                type="text"
                name="motherTongue"
                value={editableStudent.motherTongue}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Residential Address:</label>
              <textarea
                className="StudentInput"
                name="residentialAddress"
                value={editableStudent.residentialAddress}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Correspondence Address:</label>
              <textarea
                className="StudentInput"
                name="correspondenceAddress"
                value={editableStudent.correspondenceAddress}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Roll No:</label>
              <input
                className="StudentInput"
                type="text"
                name="rollNo"
                value={editableStudent.rollNo}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Class:</label>
              <input
                className="StudentInput"
                type="text"
                name="standard"
                value={editableStudent.standard}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label>Scholarship Applied:</label>
              <input
                type="checkbox"
                name="scholarshipApplied"
                checked={editableStudent.scholarshipApplied}
                onChange={(e) =>
                  setEditableStudent({
                    ...editableStudent,
                    scholarshipApplied: e.target.checked,
                  })
                }
              />
            </div>
            <div>
              <label>Remark:</label>
              <input
                className="StudentInput"
                type="text"
                name="remark"
                value={editableStudent.remark}
                onChange={handleInputChange}
              />
            </div>

            <h4>Edit Parents Information</h4>
            {(editableStudent.parents || []).map((parent, index) => (
              <div key={parent.id}>
                <div>
                  <label>Father Name:</label>
                  <input
                    className="StudentInput"
                    type="text"
                    name="fatherName"
                    value={parent.fatherName}
                    onChange={(e) => handleParentChange(index, e)}
                  />
                </div>
                <div>
                  <label>Father Contact:</label>
                  <input
                    className="StudentInput"
                    type="text"
                    name="fatherContact"
                    value={parent.fatherContact}
                    onChange={(e) => handleParentChange(index, e)}
                  />
                </div>
                <div>
                  <label>Mother Name:</label>
                  <input
                    className="StudentInput"
                    type="text"
                    name="motherName"
                    value={parent.motherName}
                    onChange={(e) => handleParentChange(index, e)}
                  />
                </div>
                <div>
                  <label>Mother Contact:</label>
                  <input
                    className="StudentInput"
                    type="text"
                    name="motherContact"
                    value={parent.motherContact}
                    onChange={(e) => handleParentChange(index, e)}
                  />
                </div>
                <div>
                  <label>Distance from School (in kms):</label>
                  <input
                    className="StudentInput"
                    type="number"
                    name="distanceFromSchool"
                    value={parent.distanceFromSchool || ''}
                    onChange={(e) => handleParentChange(index, e)}
                  />
                </div>
                <div>
                  <label>Preferred Phone Number for School:</label>
                  <input
                    className="StudentInput"
                    type="text"
                    name="preferredPhoneNumber"
                    value={parent.preferredPhoneNumber || ''}
                    onChange={(e) => handleParentChange(index, e)}
                  />
                </div>
                <div>
                  <label>Address:</label>
                  <input
                    className="StudentInput"
                    type="text"
                    name="address"
                    value={parent.address}
                    onChange={(e) => handleParentChange(index, e)}
                  />
                </div>
              </div>
            ))}

            <button type="button" onClick={handleUpdate}>
              Update Student
            </button>
            
          </form>
        </div>
      )}
    </div>
  );
};

export default SearchStudent;


