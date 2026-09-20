import React, { useState, useEffect, useCallback } from "react";
import "./styles/App.css";
import { useNavigate } from "react-router-dom";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Report from "./pages/Report";
import Student from "./pages/Student";
import Attendance from "./pages/Attendance";
import Fees from "./pages/Fees";
import Hostel from "./pages/Hostel";
import Marks from "./pages/Marks";
import ProtectedRoute from "./components/ProtectedRoute";
import SessionProtectedRoute from "./components/SessionProtectedRoute";
import Search from "./pages/Search";
import Control from "./pages/Control";
import Inventory from "./pages/Inventory";
import Bus from "./pages/Bus";
import PromoteStudent from "./pages/PromoteStudent";
import Chatbot from "./components/Chatbot";
import Login from "./pages/Login";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { handleInstitutionLogo, handleInstitutionName, standardList } from "./store/store";
import { getAllStandards, fetchColleges, getInstitutionNameAndLogo, getAllSessions } from "./apis/api";
import { getCredentials } from "./apis/api";
import axios from "axios";
import { School } from "lucide-react";

interface Auth {
  token: string;
  role: "teacher" | "admin";
  college?: string;
  username?: string;
}
const App: React.FC = () => {
  const navigate = useNavigate();
  const [auth, setAuth] = useState<Auth | null>(null);
  const setStandards = useSetRecoilState(standardList);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavbarOpen, setIsNavbarOpen] = useState(true);
  const setInstitutionName = useSetRecoilState(handleInstitutionName);
  const setInstitutionLogo = useSetRecoilState(handleInstitutionLogo);
  const InstitueName = useRecoilValue(handleInstitutionName);
  const InstitueLogo = useRecoilValue(handleInstitutionLogo);

  const [sessions, setSessions] = useState<{ id: number; year: string }[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>(localStorage.getItem("selectedSession") || "");
  const [availableColleges, setAvailableColleges] = useState<string[]>([]);
  const loadColleges = useCallback(async () => {
    try {
      const colleges = await fetchColleges();
      setAvailableColleges(colleges);
    } catch (err) {
      console.error("Error fetching colleges:", err);
    }
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const sessionData = await getAllSessions();
        setSessions(sessionData);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      }
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    const fetchInstitutionalData = async () => {
      const year = localStorage.getItem("selectedSession");
      const college = localStorage.getItem("userCollege");
      if (year) {
        try {
          const data = await getInstitutionNameAndLogo(year, college || undefined);
          setInstitutionName(data.Institution_name || "School");
          // Add cache buster to logo URL
          let logoUrl = "";
          if (data.SchoolLogo) {
            if (data.SchoolLogo.startsWith("http")) {
              logoUrl = `${data.SchoolLogo}?t=${Date.now()}`;
              // Replace localhost with window.location.hostname just in case
              logoUrl = logoUrl.replace("localhost", window.location.hostname);
            } else {
              logoUrl = `http://${window.location.hostname}:5000${data.SchoolLogo.startsWith('/') ? '' : '/'}${data.SchoolLogo}?t=${Date.now()}`;
            }
          }
          setInstitutionLogo(logoUrl);
        } catch (err) {
          console.error("Error fetching institution data:", err);
        }
      }
    };
    fetchInstitutionalData();

    const handler = async (e: any) => {
      const updatedYear = e?.detail?.year;
      const currentYear = localStorage.getItem("selectedSession") || "";
      // If no year specific provided, or if it matches current year, refresh
      if (!updatedYear || updatedYear === currentYear) {
        await fetchInstitutionalData();
      }
    };
    window.addEventListener('controlUpdated', handler as EventListener);
    window.addEventListener('collegesUpdated', loadColleges as EventListener);
    return () => {
      window.removeEventListener('controlUpdated', handler as EventListener);
      window.removeEventListener('collegesUpdated', loadColleges as EventListener);
    };
  }, [selectedSession, setInstitutionLogo, setInstitutionName, loadColleges, auth]);


  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");

    // Immediately restore auth state from localStorage (fast path for page refresh)
    if (token && userRole && !auth) {
      setAuth({ token, role: userRole as "teacher" | "admin" });
      setIsLoading(false);

      // Validate token in background (optional verification)
      fetchRole(token);
    } else {
      setIsLoading(false);
    }

    // populate global standards into recoil store
    (async () => {
      try {
        const all = await getAllStandards();
        // getAllStandards returns response.data from /control/standards
        // it may be an array of objects [{id,std,...}] or an object containing array
        let arr: any = [];
        if (Array.isArray(all)) {
          arr = all;
        } else if (all && Array.isArray(all.standard)) {
          arr = all.standard;
        }
        const mappedStandards = arr.map((s: any) => (s.std ? s.std : s));
        setStandards(mappedStandards);
      } catch (err) {
        console.error("Error fetching standards on app load:", err);
      }
    })();
    // fetch colleges for login dropdown
    loadColleges();
  }, [loadColleges, auth, selectedSession]);

  const fetchRole = async (token: string) => {
    try {
      const response = await axios.post(`http://${window.location.hostname}:5000/validate-token`, { token }, {
        headers: { "Content-Type": "application/json" },
      });

      // Token is still valid, update auth state
      const data: Auth = response.data;
      setAuth(data);
    } catch (error) {
      // Background validation failed, but user is already authenticated from localStorage
      // Log the error but don't force logout
      if (axios.isAxiosError(error)) {
        console.warn("Token validation failed (background check):", error.response?.data || error.message);
      } else {
        console.warn("Token validation failed (background check):", error);
      }
      // If token validation fails, it might indicate server restart or token corruption
      // In production, you might want to prompt user to re-login on next action
    }
  };




  const logout = () => {
    setAuth(null);
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    if (localStorage.getItem("selectedSession")) {
      localStorage.removeItem("selectedSession");
    }
    setSelectedSession("");
    navigate("/");
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
        <div style={{ textAlign: "center", padding: "40px", borderRadius: "20px", background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(10px)", boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)" }}>
          <h2 style={{ color: "#313970", fontSize: "24px", marginBottom: "10px" }}>Loading...</h2>
          <p style={{ color: "#666" }}>Authenticating your session...</p>
        </div>
      </div>
    );
  }

  if (!auth) {
    return (
      <Login 
        setAuth={setAuth} 
        setIsLoading={setIsLoading} 
        availableColleges={availableColleges} 
      />
    );
  }

  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          backgroundColor: "#313970",
          color: "white",
          height: "60px",
          padding: "10px 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
        }}
      >
        <button
          style={{
            fontFamily: "Times New Roman",
            fontSize: "16px",
            color: "white",
            marginTop: "0",
            padding: "0",
            border: "none",
          }}
          onClick={() => setIsNavbarOpen(!isNavbarOpen)}
        >
          {isNavbarOpen ? <div>Close</div> : <div>Open</div>}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {InstitueLogo ? (
            <img
              src={InstitueLogo}
              style={{ height: "45px", width: "auto", objectFit: "contain", borderRadius: "5px" }}
              alt="School Logo"
            />
          ) : null}
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "white", margin: 0 }}>
            {InstitueName || "School Name"}
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        </div>
      </div>

      <div className="App">
        {isNavbarOpen && <Navbar auth={auth} logout={logout} onSessionChange={setSelectedSession} />}
        <div 
          className="content-wrapper"
          style={{
            marginLeft: isNavbarOpen ? "200px" : "0",
            width: isNavbarOpen ? "calc(100% - 200px)" : "100%",
            transition: "margin-left 0.2s ease, width 0.2s ease",
            boxSizing: "border-box"
          }}
        >
          {!selectedSession ? (
            <div style={{ 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              height: "calc(100vh - 60px)",
              flexDirection: "column",
              color: "#64748b"
            }}>
              <School size={64} style={{ marginBottom: "20px", opacity: 0.2 }} />
              <h2 style={{ fontWeight: "600", fontSize: "24px" }}>No Session Selected</h2>
              <p>Please use the sidebar to select an academic session to view data.</p>
            </div>
          ) : (
            <Routes key={selectedSession}>
              {/* Default redirect to /Student */}
              <Route path="/" element={<Navigate to="/Student" />} />
              <Route
                path="/PromoteStudent"
                element={
                  <ProtectedRoute auth={auth} allowedRoles={["admin", "teacher"]}>
                    <SessionProtectedRoute>
                      <PromoteStudent />
                    </SessionProtectedRoute>
                  </ProtectedRoute>
                }
              />
            <Route
              path="/Dashboard"
              element={
                <ProtectedRoute auth={auth} allowedRoles={["admin"]}>
                  <Report />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Fee Incompleted Student Backup"
              element={
                <ProtectedRoute auth={auth} allowedRoles={["admin"]}>
                  <SessionProtectedRoute>
                    <Report />
                  </SessionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/Student"
              element={
                <ProtectedRoute auth={auth} allowedRoles={["admin", "teacher"]}>
                  <SessionProtectedRoute>
                    <Student />
                  </SessionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/Search"
              element={
                <ProtectedRoute auth={auth} allowedRoles={["admin", "teacher"]}>
                  <SessionProtectedRoute>
                    <Search />
                  </SessionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/Attendance"
              element={
                <ProtectedRoute auth={auth} allowedRoles={["teacher", "admin"]}>
                  <SessionProtectedRoute>
                    <Attendance />
                  </SessionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/Fees"
              element={
                <ProtectedRoute auth={auth} allowedRoles={["admin"]}>
                  <SessionProtectedRoute>
                    <Fees />
                  </SessionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/Hostel"
              element={
                <ProtectedRoute auth={auth} allowedRoles={["admin"]}>
                  <SessionProtectedRoute>
                    <Hostel />
                  </SessionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/Marks"
              element={
                <ProtectedRoute auth={auth} allowedRoles={["teacher", "admin"]}>
                  <SessionProtectedRoute>
                    <Marks />
                  </SessionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/control"
              element={
                <ProtectedRoute auth={auth} allowedRoles={["admin"]}>
                  <SessionProtectedRoute>
                    <Control />
                  </SessionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/Inventory"
              element={
                <ProtectedRoute auth={auth} allowedRoles={["admin"]}>
                  <SessionProtectedRoute>
                    <Inventory />
                  </SessionProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/Bus"
              element={
                <ProtectedRoute auth={auth} allowedRoles={["admin"]}>
                  <SessionProtectedRoute>
                    <Bus />
                  </SessionProtectedRoute>
                </ProtectedRoute>
              }
            />
          </Routes>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
