import axios from "axios";
import Student from "../pages/Student";

const root = `http://${window.location.hostname}:5000`;

// Add a request interceptor to include the session in headers/query for all requests
axios.interceptors.request.use(
  (config) => {
    const selectedSession = localStorage.getItem("selectedSession");
    const userCollege = localStorage.getItem("userCollege");

    if (selectedSession) {
      // Add as header
      config.headers["x-session"] = selectedSession;
      // Also add as query param for robustness
      config.params = {
        ...config.params,
        session: selectedSession,
      };
    }

    if (userCollege) {
      config.headers["x-college-name"] = userCollege;
      config.params = {
        ...config.params,
        college: userCollege,
      };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const uploadPhoto = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post<string>(`${root}/uploadPhoto`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error("Error uploading image");
  }
};

export const report = async () => {
  return await axios.get(`${root}/reportsdata`);
};


//Student Operations
export const createStudent = async (student: Student) => {
  try {
    const response = await axios.post(`${root}/students`, student);
    return response.data;
  } catch (error) {
    console.error("Error creating student:", error);
    throw error;
  }
};

export const updateStudent = async (studentId: number,editableStudent:any) => {
  try {
    const response = await axios.get(`http://${window.location.hostname}:5000/students/rollNo`, {
      params: { rollno: editableStudent.rollNo, standard : editableStudent.standard }
    });
    const currentData = response.data;
    if(editableStudent.url){
      console.log(editableStudent.url);
      const updateData = { ...currentData, photoUrl: editableStudent.url};
      return await axios.put(`http://${window.location.hostname}:5000/update/student/${studentId}`, updateData);
    }
    return await axios.put(`http://${window.location.hostname}:5000/update/student/${studentId}`, editableStudent);  
  } catch (error) {
    console.error("Error updating student:", error);
    throw error;
  }
};


export const deleteStudent = async (studentId: number) => {
  try {
    await axios.delete(`${root}/delete/students`, {
      params: {
        studentId: studentId,
      },
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    throw error;
  }
};


// As per standard
export const fetchAllStudents = async (std: string) => {
  try {
    const response = await axios.get(`${root}/getallstudent`, {
      params: { std },
    });
    return response.data.result;
  } catch (error) {
    throw new Error("Error fetching students");
  }
};

// As per scholarship search

export const fetchAllStudentsSc = async()=>{
  try{
    const res = await axios.get(`${root}/getallstudentsc`);
    return res.data;
  }catch(error){
    throw new Error("Error fetching students");
  }
}

export const downloadStudentsExcel = async () => {
  return await axios.get(`${root}/excelstudents`, {
    responseType: 'blob',
  });
};

export const downloadStudentsCSV = async () => {
  return await axios.get(`${root}/csvstudents`, {
    responseType: 'blob',
  });
};

export const uploadStudentsFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return await axios.post(`${root}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Attendance Routes

export const uploadAttendance  = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return await axios.post(`${root}/uploadAttendance`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};


export const fetchStandards = async () => {
    return await axios.get(`${root}/getstandards`);
};
  
export const fetchSubjects = async (selectedStandard:string) => {
    return await axios.get(`${root}/getsubjects`,{
      params :{
        selectedStandard
      }
    });
};
  
export const fetchStudents = async (standard: string) => {
    return await axios.get(`http://${window.location.hostname}:5000/getattendancelist?standard=${standard}`);
};
  
export const submitAttendance = async (data: unknown) => {
    return await axios.post(`${root}/submitattendance`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
};

export const downloadAttendance = async () => {
  return await fetch(`${root}/downloadattendance`);
};


// New API calls for Hostel

export const downloadHosteldata = async () => {
  console.log("here too");
  return await axios.get(`${root}/downloadhosteldata`, {
    responseType: 'blob',
  });
};

export const uploadHosteldata = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return await axios.post(`${root}/uploadHostel`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};


export const fetchHostelData = async () => {
    return await axios.get(`${root}/gethosteldata`);
  };
  
  export const submitHostelData = async (hostelData: unknown) => {
    return await axios.post(`${root}/hosteldata`, hostelData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };
  
  export const searchStudent = (rollNo: number, standard: string ) => {
    return axios.get(`${root}/students/rollNo`, {
      params: { rollno: rollNo, standard }
    });
  };
  
  export const deleteHostelData = async (data: unknown) => {
    return await axios.post(`${root}/hostel/delete`, data, {
      headers: {
        "Content-Type": "application/json",
      }
    });
  };
  
  export const updateHostelData = async (data: unknown) => {
    return await axios.post(`${root}/updatehostel`, data, {
      headers: {
        "Content-Type": "application/json",
      }
    });
  };


  //marks

  export const downloadMarks = async () => {
    console.log("here too");
    return await axios.get(`${root}/downloadMarks`, {
      responseType: 'blob',
    });
  };
  
  export const uploadMarks = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
  
    return await axios.post(`${root}/uploadMarks`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  };

  export const addMarks = async (formData: unknown) => {
    return await axios.post(`${root}/add`, formData);
  };
  
  export const searchMarks = async (params: number | string, standard: string) => {
    return await axios.get(`${root}/marks/search`, {
      params: {
        params,
        standard
      }
    });
  };

  //fees


  export const downloadfeedata = async () => {
    console.log("here too");
    return await axios.get(`${root}/downloadfeedata`, {
      responseType: 'blob',
    });
  };
  
  export const uploadfeedata = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
  
    return await axios.post(`${root}/uploadFee`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  };

  export const fetchStudentFees = async (standard: string, rollNo: string) => {
    return await axios.get(`${root}/fees/details`, {
      params: { standard: standard.trim(), roll_no: rollNo.trim() },
    });
  };
  
  export const addFeeInstallment = async (installment: unknown) => {
    return await axios.post(`${root}/fees/add`, installment);
  };

  export const feetable = async (id:number,title:string)=>{
    const res = await axios.get(`${root}/feetable`, {
      params: {
        id,
        title,
      },
    });

    return res;
  }


// control panel

export const addStandard = async(data : any)=>{
  const res = await axios.post(`${root}/control/standard`, {
      std : data.std,
      totalFees : data.totalFees,
      category: data.category,
      // subjects : data.subjects
  }, {
    headers : {
      'Content-Type' : 'application/json'
    }
  })
  return res;
}

export const fetchStandardsByCategory = async () => {
  const res = await axios.get(`${root}/control/standardsByCategory`);
  return res.data;
}

export const addSubjects = async(data : any)=>{
  const res = await axios.post(`${root}/control/subjects`, {
      stdId : data.stdId, // Pass the numeric ID
      subjects : data.subjects
  }, {
    headers : {
      'Content-Type' : 'application/json'
    }
  })
  return res;
}

export const addControlValues = async(data : any) =>{
  const payload = {
    number_of_hostel_bed: data.num_of_beds,
    institutioName: data.InstitutionName,
    hostelName: data.hostelName,
    schoolAddress: data.schoolAddress,
    totalFee: data.totalFee,
    schoolLogo: data.url,
    lunchFee: data.lunchFee,
    year: data.year, // required: session year
  };

  const res = await axios.post(`${root}/changesFromControlPanel`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return res;
}

export const constants_from_db = async ()=>{
  const data = await axios.get(`${root}/getChanges`);
  return data || {};
}


export const currentSession = async (year : string)=>{
  return await axios.post(`${root}/session`,{
    year : year
  });
}

export const getCurrentSession = async ()=>{
  return await axios.get(`${root}/getSessions`);
}

export const DownloadScholarshipStudent = async()=>{
  return await axios.get(`${root}/scholarshipStudents`, {
    responseType: 'blob',
  });
}

export const getInstitutionNameAndLogo = async (year: string, college?: string) => {
  try {
    const response = await axios.get(`${root}/getChanges`, { params: { year, college } });
    const { Institution_name, SchoolLogo } = response.data;
    return { Institution_name, SchoolLogo };
  } catch (error) {
    console.error('Error fetching institution info:', error);
    return { Institution_name: 'School', SchoolLogo: null };
  }
};

export const fetchControlConfig = async (year: string, college?: string) => {
  try {
    const resp = await axios.get(`${root}/getChanges`, { params: { year, college } });
    return resp.data;
  } catch (err) {
    return null;
  }
};


export const getCredentials = async (username: string, password: string, role: string, college: string) => {
  try {
    const response = await axios.post(`${root}/credentials`, {
      username,
      password,
      role,
      college
    });
    return response.data; 
  } catch (error: any) {
    console.error("Error while fetching credentials:", error);
    throw new Error(error.response?.data?.message || "Backend Error.");
  }
};

export const uploadSchoolLogo = async (file: File)=>{
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post<string>(`${root}/uploadSchoolLogo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }catch (error) {
    throw new Error("Error uploading image");
  }

}

export const fetchInstallments = async ()=>{
  const response = await axios.get(`${root}/getInstallments`);
  if(response){
    return response.data;
  }
}

// Inventory Management APIs
export const fetchInventory = async () => {
  try {
    const response = await axios.get(`${root}/inventory`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching inventory");
  }
};

export const createInventoryItem = async (data: any) => {
  try {
    const response = await axios.post(`${root}/inventory`, data);
    return response.data;
  } catch (error) {
    throw new Error("Error creating inventory item");
  }
};

export const updateInventoryItem = async (id: number, data: any) => {
  try {
    const response = await axios.put(`http://${window.location.hostname}:5000/inventory/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error("Error updating inventory item");
  }
};

export const deleteInventoryItem = async (id: number) => {
  try {
    const response = await axios.delete(`http://${window.location.hostname}:5000/inventory/${id}`);
    return response.data;
  } catch (error) {
    throw new Error("Error deleting inventory item");
  }
};

export const getStudentInventory = async (studentId: number) => {
  try {
    const response = await axios.get(`http://${window.location.hostname}:5000/student-inventory/${studentId}`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching student inventory");
  }
};

export const assignInventoryToStudent = async (data: any) => {
  try {
    const response = await axios.post(`${root}/student-inventory`, data);
    return response.data;
  } catch (error) {
    throw new Error("Error assigning inventory to student");
  }
};

// Bus Station Operations
export const fetchBusStations = async () => {
  try {
    const response = await axios.get(`${root}/busStations`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching bus stations");
  }
};

export const createBusStation = async (data: any) => {
  try {
    const response = await axios.post(`${root}/busStations`, data);
    return response.data;
  } catch (error) {
    throw new Error("Error creating bus station");
  }
};

export const updateBusStation = async (id: number, data: any) => {
  try {
    const response = await axios.put(`http://${window.location.hostname}:5000/busStations/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error("Error updating bus station");
  }
};

export const deleteBusStation = async (id: number) => {
  try {
    const response = await axios.delete(`http://${window.location.hostname}:5000/busStations/${id}`);
    return response.data;
  } catch (error) {
    throw new Error("Error deleting bus station");
  }
};

// Dashboard APIs
export const fetchDashboardOverview = async () => {
  const response = await axios.get(`http://${window.location.hostname}:5000/api/dashboard/summary`);
  return response.data;
};

export const fetchDashboardPerformance = async () => {
  const response = await axios.get(`http://${window.location.hostname}:5000/api/dashboard/student-performance`);
  return response.data;
};

export const fetchDashboardClassStats = async () => {
  const response = await axios.get(`http://${window.location.hostname}:5000/api/dashboard/class-stats`);
  return response.data;
};

export const fetchDashboardDetailedStats = async () => {
  const response = await axios.get(`http://${window.location.hostname}:5000/api/dashboard/detailed-stats`);
  return response.data;
};

// Attendance summaries (daily/weekly) with optional class, date, and subject filters
export const fetchAttendanceSummary = async (
  standard: string | undefined,
  period: "daily" | "weekly",
  date?: string,
  subjectId?: string | number
) => {
  const params: any = { period };
  if (standard) params.standard = standard;
  if (date) params.date = date;
  if (subjectId) params.subjectId = subjectId;

  const response = await axios.get(`http://${window.location.hostname}:5000/api/dashboard/attendance`, {
    params,
  });
  return response.data;
};

export const fetchResultStatus = async (standard: string) => {
  const response = await axios.get(`http://${window.location.hostname}:5000/api/dashboard/result-status`, {
    params: { standard },
  });
  return response.data;
};
export const fetchDashboardStudents = async () => {
  try {
    const response = await axios.get(`${root}/dashboard/students`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching students");
  }
};

export const fetchDashboardFees = async (filterClass?: string, filterCategory?: string) => {
  try {
    const params: any = {};
    if (filterClass) params.class = filterClass;
    if (filterCategory) params.category = filterCategory;

    const response = await axios.get(`${root}/dashboard/fees`, { params });
    return response.data;
  } catch (error) {
    throw new Error("Error fetching fees");
  }
};

export const fetchDashboardTransport = async () => {
  try {
    const response = await axios.get(`${root}/dashboard/transport`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching transport");
  }
};

export const fetchDashboardLunch = async () => {
  try {
    const response = await axios.get(`${root}/dashboard/lunch`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching lunch");
  }
};

export const fetchDashboardTeachers = async () => {
  try {
    const response = await axios.get(`${root}/dashboard/teachers`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching teachers");
  }
};

export const fetchDashboardSections = async () => {
  try {
    const response = await axios.get(`${root}/dashboard/sections`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching sections");
  }
};

export const fetchFeesPending = async (filterSession?: string, filterClass?: string, filterCategory?: string) => {
  try {
    const params: any = {};
    if (filterSession) params.session = filterSession;
    if (filterClass) params.class = filterClass;
    if (filterCategory) params.category = filterCategory;

    const response = await axios.get(`${root}/dashboard/fees-pending`, { params });
    return response.data;
  } catch (error) {
    throw new Error("Error fetching fees pending");
  }
};

export const downloadBackupZip = async () => {
  try {
    const response = await axios.get(`${root}/dashboard/backup`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching backup data");
  }
};

// CRUD Operations for Standards
export const getAllStandards = async () => {
  try {
    const response = await axios.get(`${root}/control/standards`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching standards");
  }
};

export const updateStandard = async (id: number, data: any) => {
  try {
    const response = await axios.put(`http://${window.location.hostname}:5000/control/standard/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error("Error updating standard");
  }
};

export const deleteStandard = async (id: number) => {
  try {
    const response = await axios.delete(`http://${window.location.hostname}:5000/control/standard/${id}`);
    return response.data;
  } catch (error) {
    throw new Error("Error deleting standard");
  }
};

// Get subjects for a standard by ID
export const getSubjectsForStandard = async (id: number) => {
  try {
    const response = await axios.get(`http://${window.location.hostname}:5000/control/subjects/${id}`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching subjects");
  }
};

// Delete a subject
export const deleteSubject = async (id: number) => {
  try {
    const response = await axios.delete(`http://${window.location.hostname}:5000/control/subject/${id}`);
    return response.data;
  } catch (error) {
    throw new Error("Error deleting subject");
  }
};

// Add subjects with installment
export const addSubjectsWithInstallment = async (data: any) => {
  try {
    const response = await axios.post(`${root}/control/subjects`, data);
    return response.data;
  } catch (error) {
    throw new Error("Error adding subjects");
  }
};

// Session Management
export const getAllSessions = async () => {
  try {
    const response = await axios.get(`${root}/getSessions`);
    return response.data;
  } catch (error) {
    throw new Error("Error fetching sessions");
  }
};

export const addSession = async (year: string) => {
  try {
    const response = await axios.post(`${root}/session`, { year });
    return response.data;
  } catch (error) {
    throw new Error("Error adding session");
  }
};
// Marks Management - Bulk Operations
export const fetchSubjectsWithTotalMarks = async (standard: string) => {
  try {
    const response = await axios.get(`http://${window.location.hostname}:5000/api/subjects-with-marks/${standard}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching subjects with marks:", error);
    throw new Error("Error fetching subjects with marks");
  }
};

export const submitBulkMarks = async (studentId: number, marksData: any[], examinationType: string) => {
  try {
    const response = await axios.post(
      `http://${window.location.hostname}:5000/api/marks/bulk/${studentId}`,
      { marksData, examinationType }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error submitting bulk marks:", error);
    throw error.response?.data || error;
  }
};

export const submitSingleMark = async (studentId: number, subjectId: number, subjectName: string, examinationType: string, obtainedMarks: number, totalMarks: number) => {
  try {
    const response = await axios.post(`${root}/api/marks`, {
      studentId,
      subjectId,
      subjectName,
      examinationType,
      obtainedMarks,
      totalMarks,
      percentage: ((obtainedMarks / totalMarks) * 100).toFixed(2),
    });
    return response.data;
  } catch (error: any) {
    console.error("Error submitting marks:", error);
    throw error.response?.data || error;
  }
};

export const getStudentMarksForStandard = async (studentId: number, standard: string, examinationType: string) => {
  try {
    const response = await axios.get(
      `http://${window.location.hostname}:5000/api/marks-by-standard/${studentId}/${standard}/${examinationType}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching student marks:", error);
    throw new Error("Error fetching student marks");
  }
};

export const fetchCategories = async () => {
  try {
    const response = await axios.get(`${root}/control/categories`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const addCategory = async (name: string) => {
  try {
    const response = await axios.post(`${root}/control/category`, { name });
    return response.data;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const deleteCategory = async (id: number) => {
  try {
    const response = await axios.delete(`${root}/control/category/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// College Management APIs
export const fetchColleges = async () => {
  try {
    const response = await axios.get(`${root}/control/colleges`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching colleges:', error);
    return [];
  }
};

export const addCollege = async (name: string) => {
  try {
    const response = await axios.post(`${root}/control/colleges`, { name });
    return response.data;
  } catch (error) {
    console.error('Error adding college:', error);
    throw error;
  }
};

export const deleteCollege = async (id: number) => {
  try {
    const response = await axios.delete(`${root}/control/colleges/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting college:', error);
    throw error;
  }
};

// User Management APIs (Restricted to school)
export const fetchUsers = async () => {
  try {
    const response = await axios.get(`${root}/control/users`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const addUser = async (data: any) => {
  try {
    const response = await axios.post(`${root}/control/user`, data);
    return response.data;
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
};

export const deleteUser = async (id: number) => {
  try {
    const response = await axios.delete(`${root}/control/user/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};
export const updateUser = async (id: number, data: any) => {
  try {
    const response = await axios.put(`${root}/control/user/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};
