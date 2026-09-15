/* eslint-disable @typescript-eslint/no-explicit-any */
import "../styles/hostel.css";
import { useEffect, useState } from 'react';
import { fetchHostelData, submitHostelData, searchStudent, deleteHostelData, updateHostelData, constants_from_db} from "../apis/api";
import DownloadHostel from "../components/Hostel/DownloadHostel";
import UploadHostel from "../components/Hostel/UploadHostel";
import { useRecoilValue } from "recoil";
import { standardList } from "../store/store";

const Hostel = () => {
  const [rollNo, setRollNo] = useState("");
  const [standard, setStandard] = useState<string>("");
  const [bed_no, setBed] = useState<number | undefined>();
  const [occupied, setOccupied] = useState<number[]>([]);
  const [available, setAvailable] = useState<number[]>([]);
  const [show, setShow] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [res, setRes] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const standards = useRecoilValue(standardList);
  const [currentPage, setCurrentPage] = useState(1);
  const bedsPerPage = 100; // Number of beds per page
  
  const totalBeds = occupied.length;
  const totalPages = Math.ceil(totalBeds / bedsPerPage);

  // Get the beds for the current page
  const paginatedBeds = occupied.slice(
    (currentPage - 1) * bedsPerPage,
    currentPage * bedsPerPage
  );

  const submit = async () => {
    try {
      const response = await submitHostelData({
        name: res.fullName,
        rollNo,
        standard,
        gender: res.gender,
        bed_no,
      });
      console.log("Check ",response.data)
      if (response.data) {
        alert('Data added successfully');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error submitting data', error);
      alert('Bed Alread Allotted');
    }
  };

  useEffect(() => {
    const handlePromises = async() =>{
      const dataFromMiss = await constants_from_db();
      const newOccupied: number[] = [];
      for (let i = 1; i <= dataFromMiss.data.number_of_hostel_bed; i++) {
        newOccupied.push(i);
      }
      setOccupied(newOccupied);
    }
    handlePromises();
    
    const fetchData = async () => {
      try {
        const response = await fetchHostelData();
        setAvailable(response.data.available);
      } catch (error) {
        console.log('Error fetching hostel data', error);
      }
    };
    fetchData();
    
    
  }, []);
  
  const update = () => {
    setIsUpdating(true);
    setRollNo(data.rollNo);
    setStandard(data.standard);
  };

  const details = async (ele: number) => {
    try {
      const response = await fetchHostelData();
      let found = false;
      response.data.result.forEach((e: any) => {
        if (e.bed_number === ele) {
          setData(e);
          setBed(e.bed_number);
          setRollNo(e.rollNo);
          setStandard(e.standard);
          setShow(true);
          found = true;
        }
      });
      if (!found) {
        // Bed is available
        setBed(ele);
        setShow(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.log('Error fetching details', error);
    }
  };

  const search = async () => {
    if(!rollNo){
      alert("Requires Roll No or Name");
      return;
    }
    try {
      console.log("here ")
      const response = await searchStudent(parseInt(rollNo), standard);
      console.log("response " , response)
      setRes(response.data);
    } catch (error) {
      console.log('Error searching student', error);
    }
  };

  const Delete = async () => {
    try {
      await deleteHostelData({
        rollNo,
        standard,
        bed_no,
      });
      alert("Student removed successfully!");
      window.location.reload();
    } catch (error) {
      console.log('Error deleting student', error);
    }
  };

  const clear = () => {
    setRollNo("");
    setStandard("");
    setBed(undefined);
    setRes(null);
  };

  const updateHostel = async () => {
    try {
      await updateHostelData({
        rollNo,
        standard,
        bed_no,
      });
      alert("Successfully updated");
      window.location.reload();
    } catch (error) {
      alert("Update failed");
      console.log('Error updating hostel details', error);
    }
  };

  const goBack = () => {
    setIsUpdating(false);
  };

  // Pagination navigation
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  return (
    <div>
      <div className="global-container">
      <div className="import_export">
          <div className="innerbox"> 
              <h2>Download Hostel Data</h2>
              <DownloadHostel/>
          </div>
          <div className="innerbox">
              <h2>Upload Hostel data</h2>
              <UploadHostel/>
          </div>
        </div>
      </div>
      <div className="global-container">
        <div>
          <div>
            <div>
              <div>
                <h2>Hostel Accommodation</h2>

                {/* Search Student */}
                <label>Roll No</label>
                <input
                  className='inputB'
                  type='number'
                  placeholder='Roll number'
                  value={rollNo ?? ''}
                  onChange={(e) => { setRollNo(e.target.value); }}
                />

                <label>Standard</label>
                <select
                  className="selectB"
                  value={standard ?? ''}
                  onChange={(e) => { setStandard(e.target.value); }}>
                  <option value=''>Select standard</option>
                  {standards.map((standard:string) => (
                  <option key={standard} value={standard}>
                    {standard}
                  </option>
                ))}
                </select><br />
                <button onClick={search}>Search</button>
                {res && <button onClick={clear} style={{ marginLeft: "10px" }}>Clear</button>}
              </div>

              {res && (
                <div>
                  <h2>Searched Student</h2>
                  <div style={{ paddingLeft: "10px" }}>
                    <p>Name: {res.fullName}</p>
                    <p>Gender: {res.gender}</p>
                  </div>
                  <h2>Set Student Bed</h2>
                  <div>
                    <input className='inputB' type='number' placeholder='Bed no.' value={bed_no ?? ''} onChange={(e) => { setBed(Number(e.target.value)); }} />
                  </div>
                  <button onClick={submit}>Save</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="global-container">
        {show ? (
          <div>
            <div>
              <h2>Occupied By:</h2>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 0' }}><strong>Name:</strong></td>
                    <td style={{ padding: '10px 0' }}>{data.name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0' }}><strong>Roll No:</strong></td>
                    <td style={{ padding: '10px 0' }}>{data.rollNo}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0' }}><strong>Gender:</strong></td>
                    <td style={{ padding: '10px 0' }}>{data.gender}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0' }}><strong>Standard:</strong></td>
                    <td style={{ padding: '10px 0' }}>{data.standard}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0' }}><strong>Bed Number:</strong></td>
                    <td style={{ padding: '10px 0' }}>{data.bed_number}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button onClick={Delete} style={{ background: "#F88379", marginTop: '10px' }}>Delete</button>
            <button style={{ marginLeft: "10px", marginTop: '10px' }} onClick={update}>Update</button>
            <button style={{ marginLeft: "10px", marginTop: '10px' }} onClick={() => { setShow(false); }}>Back</button>
          </div>

        ) : (
          <> </>
        )}

        {isUpdating && (
          <div>
            <h2>Update Hostel Details</h2>
            <label>Roll No</label>
            <input disabled type="number" placeholder='Roll no.' value={rollNo ?? ''} onChange={(e) => setRollNo(e.target.value)} />
            <label>Standard</label>
            <select disabled className="selectB" value={standard ?? ''} onChange={(e) => setStandard(e.target.value)}>
              <option value=''>Select standard</option>
              {standards.map((standard:string) => (
                <option key={standard} value={standard}>
                  {standard}
                </option>
              ))}
            </select>
            <label>Bed No</label>
            <input type="number" placeholder='Bed no.' onChange={(e) => setBed(Number(e.target.value))} /><br />
            <button onClick={updateHostel}>Update</button>
            <button onClick={goBack} style={{ marginLeft: "10px" }}>Back</button>
          </div>
        )}

        <div>
          <div className='row'>
  
            <h2>Hostel bed rooms (Page {currentPage} of {totalPages}):</h2>
            <div className="beds-grid">
              {paginatedBeds.map((ele, index) => {
                const isAvailable = available.includes(ele);
                return (
                  <button
                    key={index}
                    onClick={() => details(ele)}
                    className={isAvailable ? "bed-available" : "bed-occupied"}
                    style={{ marginLeft: '10px', marginBottom: '10px' }}
                  >
                    {ele}
                  </button>
                );
              })}
            </div>


            <div style={{ marginTop: '20px' }}>
              <button onClick={handlePrevPage} disabled={currentPage === 1}>
                Previous
              </button>
              <button onClick={handleNextPage} disabled={currentPage === totalPages} style={{ marginLeft: '10px' }}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hostel;
