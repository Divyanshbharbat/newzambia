import React, { useEffect, useState } from 'react';
import {
  addControlValues, addStandard, currentSession, uploadSchoolLogo,
  getAllStandards, updateStandard, deleteStandard, getSubjectsForStandard,
  deleteSubject, addSubjectsWithInstallment, getAllSessions, deleteSession,
  fetchControlConfig, fetchCategories, addCategory, deleteCategory,
  fetchUsers, addUser, deleteUser, updateUser,
  fetchColleges, addCollege, deleteCollege,
  fetchBusStations, createBusStation, updateBusStation, deleteBusStation
} from '../apis/api';
import { useSetRecoilState } from 'recoil';
import { standardList } from '../store/store';
import axios from 'axios';
import { AxiosError } from 'axios';
import '../styles/Control.css';

interface Standard {
  id: number;
  std: string;
  category: string;
  totalFees: number;
}

interface Subject {
  id: number;
  name: string;
  totalMarks?: number;
  installment?: { id: number; installments: string };
}

interface Session {
  id: number;
  year: string;
  createdAt: string;
}

interface Installment {
  id: number;
  installments: string;
}

interface Category {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  college?: string;
}

interface College {
  id: number;
  name: string;
}

const Control: React.FC = () => {
  // State declarations - organized at top
  const userRole = localStorage.getItem('userRole');
  const userCollege = localStorage.getItem('userCollege');

  const [Standard, setStandard] = useState<string>('');
  const [standardCategory, setStandardCategory] = useState<string>('');
  const [StandardTotalFees, setStandardTotalFees] = useState<number>(0);
  const [dropdownStandard, setDropdownStandard] = useState<string>('');
  const [SubString, setSubString] = useState<string>('');
  const [subjectTotalMarks, setSubjectTotalMarks] = useState<string>('100');
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [showManageCategories, setShowManageCategories] = useState<boolean>(false);
  const [showManageUsers, setShowManageUsers] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<string>('teacher');
  const [newUserCollege, setNewUserCollege] = useState<string>('');
  const [showNewCollegeInput, setShowNewCollegeInput] = useState<boolean>(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [newCollegeName, setNewCollegeName] = useState<string>('');
  const [showManageColleges, setShowManageColleges] = useState<boolean>(false);

  const [num_of_beds, setNum_of_beds] = useState<number>(0);
  const [InstitutionName, setInstitutionName] = useState<string>('');
  const [hostelName, setHostelName] = useState<string>('');
  const [schoolAddress, setSchoolAddress] = useState<string>('');
  const [totalFee, setTotalFee] = useState<number>(0);
  const [lunchFee, setLunchFee] = useState<number>(0);
  const [url, setUrl] = useState<string>('');
  const [input1, setInput1] = useState<string>('');

  // CRUD States
  const [standards, setStandards] = useState<Standard[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionForConfig, setSelectedSessionForConfig] = useState<string>("");
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(false);
  const [configStatus, setConfigStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  // Keep isLoadingConfig used to satisfy lint
  useEffect(() => {
    if (isLoadingConfig) console.log("Loading config...");
  }, [isLoadingConfig]);

  const setGlobalStandards = useSetRecoilState(standardList);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showManageStandards, setShowManageStandards] = useState<boolean>(false);
  const [showManageSubjects, setShowManageSubjects] = useState<boolean>(false);
  const [showManageSessions, setShowManageSessions] = useState<boolean>(false);
  const [editingStandard, setEditingStandard] = useState<Standard | null>(null);
  const [editedStdName, setEditedStdName] = useState<string>('');
  const [editedTotalFees, setEditedTotalFees] = useState<number>(0);
  const [editedCategory, setEditedCategory] = useState<string>('');
  const [selectedSubjectsStandard, setSelectedSubjectsStandard] = useState<string>('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editedUsername, setEditedUsername] = useState<string>('');
  const [editedPassword, setEditedPassword] = useState<string>('');
  const [editedUserRole, setEditedUserRole] = useState<string>('');

  interface BusStation {
    id: number;
    stationName: string;
    price: number;
    description?: string;
    studentCount?: number;
  }

  const [busStations, setBusStations] = useState<BusStation[]>([]);
  const [stationName, setStationName] = useState<string>('');
  const [stationPrice, setStationPrice] = useState<number>(0);
  const [stationDesc, setStationDesc] = useState<string>('');
  const [showManageBusStations, setShowManageBusStations] = useState<boolean>(false);
  const [editingBusStation, setEditingBusStation] = useState<BusStation | null>(null);
  const [editedStationName, setEditedStationName] = useState<string>('');
  const [editedStationPrice, setEditedStationPrice] = useState<number>(0);

  const loadBusStations = async () => {
    try {
      const data = await fetchBusStations();
      setBusStations(data || []);
    } catch (error) {
      console.error('Error loading bus stations:', error);
    }
  };

  const handleAddBusStation = async () => {
    try {
      if (!stationName.trim()) {
        alert('Please enter station name');
        return;
      }
      if (stationPrice <= 0) {
        alert('Please enter a valid bus fee');
        return;
      }
      await createBusStation({
        stationName,
        price: stationPrice,
        description: stationDesc
      });
      alert('Bus Station & Fee Added Successfully');
      setStationName('');
      setStationPrice(0);
      setStationDesc('');
      loadBusStations();
    } catch (error: any) {
      console.error('Error adding bus station:', error);
      alert(error.response?.data?.message || 'Failed to add bus station');
    }
  };

  const handleUpdateBusStation = async (station: BusStation) => {
    try {
      if (!editedStationName.trim()) {
        alert('Please enter station name');
        return;
      }
      await updateBusStation(station.id, {
        stationName: editedStationName,
        price: editedStationPrice,
      });
      alert('Bus station updated successfully');
      setEditingBusStation(null);
      loadBusStations();
    } catch (error: any) {
      console.error('Error updating bus station:', error);
      alert(error.response?.data?.message || 'Failed to update bus station');
    }
  };

  const handleDeleteBusStation = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete bus station "${name}"?`)) {
      try {
        await deleteBusStation(id);
        alert('Bus station deleted successfully');
        loadBusStations();
      } catch (error: any) {
        console.error('Error deleting bus station:', error);
        alert('Failed to delete bus station');
      }
    }
  };

  // Fetch standards on component mount
  useEffect(() => {
    loadAllStandards();
    loadSessions();
    loadCategories();
    loadUsers();
    loadColleges();
    loadAllSubjects();
    loadBusStations();
  }, []);

  const [allSubjects, setAllSubjects] = useState<any[]>([]);

  const loadAllSubjects = async () => {
    try {
      const response = await axios.get(`http://${window.location.hostname}:5000/control/all-subjects`);
      setAllSubjects(response.data);
    } catch (error) {
      console.error('Error loading all subjects:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
      if (data.length > 0) {
        setStandardCategory(data[0].name);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadColleges = async () => {
    try {
      const data = await fetchColleges();
      setColleges(data);
      if (data.length > 0 && !newUserCollege) {
        setNewUserCollege(data[0].name);
      }
      // Notify other components (like Login in App.tsx)
      window.dispatchEvent(new CustomEvent('collegesUpdated'));
    } catch (error) {
      console.error('Error loading colleges:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await getAllSessions();
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // fetch config for selected session
  useEffect(() => {
    const fetchConfig = async () => {
      if (!selectedSessionForConfig) return;
      setIsLoadingConfig(true);
      try {
        const college = localStorage.getItem('userCollege');
        const cfg = await fetchControlConfig(selectedSessionForConfig, college || undefined);
        if (cfg) {
          setInstitutionName(cfg.Institution_name || '');
          setHostelName(cfg.Institution_hostel_name || '');
          setSchoolAddress(cfg.SchoolAddress || '');
          setNum_of_beds(cfg.number_of_hostel_bed || 0);
          setTotalFee(cfg.TotalFees || 0);
          setLunchFee(cfg.lunchFee || 0);
          setUrl(cfg.SchoolLogo || '');
        }
      } catch (e) {
        console.error('Failed to load control config for session', e);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [selectedSessionForConfig]);

  const loadAllStandards = async () => {
    try {
      const data = await getAllStandards();
      setStandards(data);
      let arr: any = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && Array.isArray(data.standard)) {
        arr = data.standard;
      }
      const mapped = arr.map((s: any) => (s.std ? s.std : s));
      setGlobalStandards(mapped);
      window.dispatchEvent(new CustomEvent('standardsUpdated'));
    } catch (error) {
      console.error('Error loading standards:', error);
    }
  };

  const loadSubjectsForStandard = async (id: number) => {
    try {
      const data = await getSubjectsForStandard(id);
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  // Handle functions
  const handleChangeStandard = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStandard(e.target.value);
  };

  const handleDropdownStandardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDropdownStandard(e.target.value);
  };

  const handleChangeSubject = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubString(e.target.value);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const photoUrl = await uploadSchoolLogo(file);
        setUrl(photoUrl);
      } catch (error) {
        console.error(error);
        alert('Failed to upload image');
      }
    }
  };

  // Submit handlers
  const handleSubmitStandard = async () => {
    try {
      if (!Standard.trim()) {
        alert('Please provide Standard');
        return;
      }

      const data = {
        std: Standard,
        totalFees: StandardTotalFees,
        category: standardCategory,
      };

      const res = await addStandard(data);
      if (res) {
        alert('Standard Added Successfully');
        setStandard('');
        setStandardTotalFees(0);
        loadAllStandards();
      }
    } catch (error) {
      console.error('Error adding standard:', error);
      alert('Already Exist');
    }
  };

  const handleUpdateStandard = async (std: Standard) => {
    try {
      if (!std.id) throw new Error("Standard ID missing");
      const nameToUpdate = (editedStdName || Standard || '').trim();
      if (!nameToUpdate) {
        alert("Division name is required");
        return;
      }
      const feesToUpdate = editedTotalFees !== undefined && !isNaN(editedTotalFees) ? editedTotalFees : StandardTotalFees;

      await updateStandard(std.id, {
        std: nameToUpdate,
        totalFees: Number(feesToUpdate || 0),
        category: editedCategory || std.category || 'General'
      });
      alert('Division updated successfully');
      setEditingStandard(null);
      setStandard('');
      setStandardTotalFees(0);
      loadAllStandards();
    } catch (error: any) {
      console.error('Error updating standard:', error);
      const msg = error?.error || error?.details || error?.message || 'Failed to update division';
      alert(`Failed to update division: ${msg}`);
    }
  };

  const handleDeleteStandard = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete standard ${name}?`)) {
      try {
        await deleteStandard(id);
        alert('Standard deleted successfully');
        loadAllStandards();
      } catch (error: any) {
        console.error('Error deleting standard:', error);
        alert(error.message || 'Failed to delete standard');
      }
    }
  };

  const handleDeleteSubject = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete subject ${name}?`)) {
      try {
        await deleteSubject(id);
        alert('Subject deleted successfully');
        if (selectedSubjectsStandard) {
          loadSubjectsForStandard(parseInt(selectedSubjectsStandard));
        }
      } catch (error) {
        console.error('Error deleting subject:', error);
        alert('Failed to delete subject');
      }
    }
  };

  const handleSubmitSubjects = async () => {
    try {
      if (!dropdownStandard) {
        alert("Please select a valid standard");
        return;
      }

      const standardId = parseInt(dropdownStandard);

      if (!SubString.trim()) {
        alert('Please enter subjects');
        return;
      }

      const totalMarks = parseFloat(subjectTotalMarks);
      if (isNaN(totalMarks) || totalMarks <= 0) {
        alert('Total marks must be a positive number');
        return;
      }

      const subjectsArray = SubString.trim()
        .split(' ')
        .map((subject) => ({
          name: subject,
          totalMarks: totalMarks
        }));

      const data = {
        stdId: standardId,
        subjects: subjectsArray,
      };

      const res = await addSubjectsWithInstallment(data);
      if (res) {
        alert('Subjects Added Successfully');
        setSubString('');
        setSubjectTotalMarks('100');
        if (selectedSubjectsStandard === dropdownStandard) {
          loadSubjectsForStandard(standardId);
        }
      }
    } catch (error: any) {
      console.error('Error adding subjects:', error);
      const detail = error.response?.data?.details || error.message || '';
      alert(`Failed to add subjects. ${detail}`);
    }
  };

  const handleControlChanges = async () => {
    setConfigStatus(null);
    try {
      if (!selectedSessionForConfig) {
        setConfigStatus({ type: 'error', message: 'Please select a session before saving configuration.' });
        return;
      }

      const data = {
        num_of_beds,
        InstitutionName,
        hostelName,
        schoolAddress,
        totalFee,
        url,
        lunchFee,
        year: selectedSessionForConfig,
        college: localStorage.getItem('userCollege') || undefined,
      };

      const res = await addControlValues(data);
      if (res) {
        setConfigStatus({ type: 'success', message: `Configuration for ${selectedSessionForConfig} updated successfully!` });
        // Notify other parts of the app
        try {
          window.dispatchEvent(new CustomEvent('controlUpdated', { detail: { year: selectedSessionForConfig } }));
        } catch (e) { }
      }
    } catch (error: any) {
      console.error('Control update error:', error);
      const errMsg = error.response?.data?.error || error.response?.data?.errorMsg || error.message || 'Something went wrong';
      setConfigStatus({ type: 'error', message: `Failed to update: ${errMsg}` });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await addCategory(newCategoryName);
      alert('Category added successfully');
      setNewCategoryName('');
      loadCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(id);
        alert('Category deleted successfully');
        loadCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
      }
    }
  };

  const handleAddUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      alert("Username and password are required.");
      return;
    }
    
    const collegeName = newUserCollege === "new" ? newCollegeName.trim() : newUserCollege.trim();
    if (!collegeName) {
      alert("College name is required.");
      return;
    }

    try {
      // If admin, enforce their own college. If not (superadmin?), use selected or default.
      const collegeName = userRole === 'admin' ? userCollege : (newUserCollege === "new" ? newCollegeName.trim() : newUserCollege.trim());
      
      if (!collegeName) {
        alert("College name is required.");
        return;
      }

      // Auto-add new college if needed (only for superadmins or when allowed)
      const existingCollege = colleges.find(c => c.name.toLowerCase() === collegeName.toLowerCase());
      if (!existingCollege && userRole !== 'admin') {
        try {
          await addCollege(collegeName);
          await loadColleges(); 
        } catch (e) {
          console.warn('Could not auto-add college:', e);
        }
      }

      await addUser({ username: newUsername, password: newPassword, role: newUserRole, college: collegeName });
      alert('User added successfully');
      setNewUsername('');
      setNewPassword('');
      setNewUserRole('teacher');
      setNewUserCollege(userCollege || (colleges.length > 0 ? colleges[0].name : ''));
      setNewCollegeName('');
      setShowNewCollegeInput(false);
      loadUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user (Username might exist)');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
        alert('User deleted successfully');
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    if (!editedUsername.trim()) {
      alert("Username is required.");
      return;
    }

    try {
      await updateUser(editingUser.id, {
        username: editedUsername,
        password: editedPassword || undefined, // Only update password if provided
        role: editedUserRole
      });
      alert('User updated successfully');
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleAddCollege = async () => {
    if (!newCollegeName.trim()) return;
    try {
      await addCollege(newCollegeName);
      alert('College added successfully');
      setNewCollegeName('');
      loadColleges();
    } catch (error) {
      console.error('Error adding college:', error);
      alert('Failed to add college');
    }
  };

  const handleDeleteCollege = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this college?')) {
      try {
        await deleteCollege(id);
        alert('College deleted successfully');
        loadColleges();
      } catch (error) {
        console.error('Error deleting college:', error);
        alert('Failed to delete college');
      }
    }
  };

  const handleAddSession = async () => {
    try {
      const newSession = input1.trim();
      if (newSession) {
        const response = await currentSession(newSession);

        if (response.status === 200) {
          alert('Session Added Successfully');
          setInput1('');
          loadSessions();
        }
      } else {
        alert('Session year is required (e.g. 2026).');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const { status, data } = error.response;
        if (status === 409) {
          alert(data.error || 'Session already exists');
        } else if (status === 400) {
          alert(data.error || 'Year is required');
        } else {
          alert('An unexpected error occurred. Please try again.');
        }
      } else {
        console.error('Error:', error);
        alert('An error occurred. Please check the console for details.');
      }
    }
  };

  const handleDeleteSession = async (id: number, year: string) => {
    if (window.confirm(`Are you sure you want to delete session "${year}"?`)) {
      try {
        await deleteSession(id);
        alert('Session deleted successfully');
        if (localStorage.getItem('selectedSession') === year) {
          localStorage.removeItem('selectedSession');
        }
        loadSessions();
      } catch (error: any) {
        console.error('Error deleting session:', error);
        alert(error?.error || error?.message || 'Failed to delete session');
      }
    }
  };

  const handleBackup = async () => {
    try {
      // Trigger download from backend
      window.location.href = `http://${window.location.hostname}:5000/api/backup`;
    } catch (error) {
      console.error('Error triggering backup:', error);
      alert('Failed to start backup');
    }
  };

  const studentPromoteRoute = async () => {

    try {
      const promotionData = await axios.post(`http://${window.location.hostname}:5000/promotion`);
      if (promotionData) {
        alert('Student Promoted Successfully');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error promoting students:', error);
      alert('Failed to promote students');
    }
  };

  return (
    <div className="global-container">
      <h1>Control Panel</h1>

      {/* Add Division + Fees Section */}
      <div className="control-section">
        <h2>Add Division + Fees</h2>
        <label>Enter Division:</label>
        <input
          title="Division Formatting - LKG, UKG, 1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th, 10th"
          type="text"
          placeholder="Division (e.g. Grade 1)"
          value={Standard}
          onChange={handleChangeStandard}
        />
        
        <label>Total Fees for this Division:</label>
        <input
          type="number"
          placeholder="Enter Total Fees"
          value={StandardTotalFees}
          onChange={(e) => setStandardTotalFees(Number(e.target.value))}
        />
        
        <label>Session:</label>
        <select defaultValue="">
          <option value="">Current Session</option>
          {sessions.map(s => (
            <option key={s.id} value={s.year}>{s.year}</option>
          ))}
        </select>
        
        {editingStandard ? (
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button className="btn" style={{ backgroundColor: '#28a745' }} onClick={() => handleUpdateStandard(editingStandard)}>
              Update Division
            </button>
            <button className="btn" style={{ backgroundColor: '#64748b' }} onClick={() => { setEditingStandard(null); setStandard(''); setStandardTotalFees(0); }}>
              Cancel Edit
            </button>
          </div>
        ) : (
          <button className="btn" onClick={handleSubmitStandard}>
            Add Division + Fees
          </button>
        )}
        <button className="btn manage-btn" onClick={() => { setShowManageStandards(!showManageStandards); if (!showManageStandards) loadAllStandards(); }}>
          {showManageStandards ? 'Hide' : 'Manage'} Divisions & Fees
        </button>

        {showManageStandards && (
          <div className="manage-section" style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <h3>Manage Divisions & Fees</h3>
            <table className="manage-table">
              <thead>
                <tr>
                  <th>Division</th>
                  <th>Total Fees</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {standards.map(std => {
                  const isEditing = editingStandard?.id === std.id;
                  return (
                    <tr key={std.id} style={isEditing ? { backgroundColor: '#fef3c7' } : {}}>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedStdName}
                            onChange={(e) => { setEditedStdName(e.target.value); setStandard(e.target.value); }}
                            placeholder="Division Name"
                            style={{ width: '100%', maxWidth: '160px', padding: '6px 10px', borderRadius: '4px', border: '2px solid #AF1763', fontWeight: 'bold' }}
                            autoFocus
                          />
                        ) : (
                          <strong>{std.std}</strong>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 600 }}>K</span>
                            <input
                              type="number"
                              value={editedTotalFees}
                              onChange={(e) => { setEditedTotalFees(Number(e.target.value)); setStandardTotalFees(Number(e.target.value)); }}
                              placeholder="Total Fees"
                              style={{ width: '100%', maxWidth: '140px', padding: '6px 10px', borderRadius: '4px', border: '2px solid #AF1763' }}
                            />
                          </div>
                        ) : (
                          `K${std.totalFees || 0}`
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn"
                              style={{ backgroundColor: '#28a745', padding: '6px 14px', fontSize: '0.9em' }}
                              onClick={() => handleUpdateStandard(std)}
                            >
                              Save
                            </button>
                            <button
                              className="btn"
                              style={{ backgroundColor: '#64748b', padding: '6px 14px', fontSize: '0.9em' }}
                              onClick={() => {
                                setEditingStandard(null);
                                setStandard('');
                                setStandardTotalFees(0);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn-edit"
                              onClick={() => {
                                setEditingStandard(std);
                                setEditedStdName(std.std);
                                setEditedTotalFees(std.totalFees || 0);
                                setStandard(std.std);
                                setStandardTotalFees(std.totalFees || 0);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteStandard(std.id, std.std)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {editingStandard && (
              <div className="edit-form" style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Edit Division: {editingStandard.std}</h4>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600 }}>Division Name:</label>
                  <input
                    type="text"
                    value={editedStdName}
                    onChange={(e) => setEditedStdName(e.target.value)}
                    placeholder="Division Name"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600 }}>Total Fees:</label>
                  <input
                    type="number"
                    value={editedTotalFees}
                    onChange={(e) => setEditedTotalFees(Number(e.target.value))}
                    placeholder="Total Fees"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn" onClick={() => handleUpdateStandard(editingStandard)}>Update Division</button>
                  <button className="btn" style={{ backgroundColor: '#64748b' }} onClick={() => setEditingStandard(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>



      {/* Manage Teachers and Admin Section */}
      <div className="control-section">
        <h2>Manage Teachers and Admin</h2>
        <div className="add-form" style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {userRole === 'admin' ? (
            <input type="text" value={userCollege || ''} disabled style={{ backgroundColor: '#f3f4f6' }} />
          ) : (
            <>
              <select 
                value={newUserCollege} 
                onChange={(e) => {
                  setNewUserCollege(e.target.value);
                  setShowNewCollegeInput(e.target.value === "new");
                }}
              >
                {colleges.map(col => (
                  <option key={col.id} value={col.name}>{col.name}</option>
                ))}
                <option value="new">+ Add New College...</option>
              </select>
              {showNewCollegeInput && (
                <input
                  type="text"
                  placeholder="Enter New College Name"
                  value={newCollegeName}
                  onChange={(e) => setNewCollegeName(e.target.value)}
                />
              )}
            </>
          )}
          <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
          </select>
          <button className="btn" onClick={handleAddUser}>Add User</button>
        </div>
        <table className="manage-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>College</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(users) && users.map(user => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td style={{ textTransform: 'capitalize' }}>{user.role}</td>
                <td>{user.college || 'N/A'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      className="btn-edit"
                      onClick={() => {
                        setEditingUser(user);
                        setEditedUsername(user.username);
                        setEditedPassword('');
                        setEditedUserRole(user.role);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {editingUser && (
          <div className="edit-modal" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
            <h4>Edit User: {editingUser.username}</h4>
            <div className="add-form">
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666' }}>Username</label>
                <input
                  type="text"
                  value={editedUsername}
                  onChange={(e) => setEditedUsername(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666' }}>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="********"
                  value={editedPassword}
                  onChange={(e) => setEditedPassword(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666' }}>Role</label>
                <select value={editedUserRole} onChange={(e) => setEditedUserRole(e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn" onClick={handleUpdateUser}>Update Details</button>
                <button className="btn" style={{ backgroundColor: '#6b7280' }} onClick={() => setEditingUser(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>




      {/* Set Configurations Section */}
      <div className="control-section">
        <h2>Set Configurations</h2>
        <label>Session (required):</label>
        <select value={selectedSessionForConfig} onChange={(e) => setSelectedSessionForConfig(e.target.value)} style={{ marginBottom: "15px" }}>
          <option value="">Select Session (required)</option>
          {sessions.map(s => (
            <option key={s.id} value={s.year}>{s.year}</option>
          ))}
        </select>

        <label>Set Institute Name:</label>
        <input
          type="text"
          placeholder="Enter institution name"
          value={InstitutionName}
          onChange={(e) => setInstitutionName(e.target.value)}
        />
        <label>Set School Address:</label>
        <input
          type="text"
          placeholder="Enter school address"
          value={schoolAddress}
          onChange={(e) => setSchoolAddress(e.target.value)}
        />
        <label>Set School Logo</label>
        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} />
        {url && (
          <div style={{ marginBottom: "10px" }}>
            <img src={url.startsWith('http') ? url.replace("localhost", window.location.hostname) : url} alt="School Logo Preview" style={{ height: "60px", objectFit: "contain", borderRadius: "5px" }} />
          </div>
        )}
        {isLoadingConfig && <p style={{ color: '#3b82f6', fontSize: '14px' }}>Loading configuration data...</p>}
        
        {configStatus && (
          <div style={{ 
            padding: '10px', 
            borderRadius: '4px', 
            marginBottom: '15px',
            backgroundColor: configStatus.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: configStatus.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${configStatus.type === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}>
            {configStatus.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn" onClick={handleControlChanges}>Submit</button>
          <button className="btn" style={{ backgroundColor: '#4f46e5' }} onClick={handleControlChanges}>Update</button>
        </div>
      </div>

      <br />

      {/* Set Sessions Section */}
      <div className="control-section">
        <h2>Set Sessions</h2>
        <label>Add Session:</label>
        <input
          type="text"
          placeholder="Enter session year (e.g. 2026)"
          value={input1}
          onChange={(e) => setInput1(e.target.value)}
        />
        <button onClick={handleAddSession}>Add Session</button>

        <button className="btn manage-btn" onClick={() => setShowManageSessions(!showManageSessions)}>
          {showManageSessions ? 'Hide' : 'View'} Sessions
        </button>

        {showManageSessions && (
          <div className="manage-section">
            <h3>All Sessions</h3>
            {sessions.length > 0 ? (
              <table className="manage-table">
                <thead>
                  <tr>
                    <th>Session Year</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => (
                    <tr key={session.id}>
                      <td><strong>{session.year}</strong></td>
                      <td>{new Date(session.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteSession(session.id, session.year)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No sessions found</p>
            )}
          </div>
        )}
      </div>

      {/* System Maintenance Section */}
      <div className="control-section" style={{ borderTop: '2px solid #ddd', marginTop: '30px', paddingTop: '20px' }}>
        <h2>System Maintenance</h2>
        <div style={{ marginBottom: '20px' }}>
          <label>Database Backup (SQL Format):</label>
          <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
            Clicking this button will download a complete backup of the database, including all tables, data, and relations.
          </p>
          <button className="btn" onClick={handleBackup} style={{ backgroundColor: '#28a745', color: 'white' }}>
            Backup Database
          </button>
        </div>
      </div>

      {/* Danger Zone Section */}

      <div style={{ color: '#8B0000', marginLeft: '5px' }}>
        <h2>Danger Zone - Handle with Caution</h2>
        <div>
          <label>Promote Qualified Students</label>
          <button style={{ marginTop: '5px' }} onClick={studentPromoteRoute}>
            Promote
          </button>
        </div>
      </div>
    </div>
  );
};

export default Control;