import { NavLink } from "react-router-dom";
import "../styles/navbar.css";
import { SetStateAction, useState, useEffect } from "react";
import { getCurrentSession, fetchControlConfig } from "../apis/api";
import { useSetRecoilState } from "recoil";
import { handleInstitutionName, handleInstitutionLogo } from "../store/store";
import axios from "axios";

interface NavbarProps {
  auth: { token: string; role: "teacher" | "admin" } | null;
  logout: () => void;
  onSessionChange: (session: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ auth, logout, onSessionChange }) => {
  const links = [
    { name: "Student", path: "Student", roles: ["admin", "teacher"] },
    { name: "Promote Student", path: "PromoteStudent", roles: ["admin", "teacher"] },
    { name: "Fees", path: "Fees", roles: ["admin"] },
    { name: "Inventory", path: "Inventory", roles: ["admin"] },
    { name: "Control", path: "control", roles: ["admin"] },
  ];

  // Initialize state with value from localStorage if available
  const savedSession = localStorage.getItem("selectedSession");
  const [selectYear, setSelectedYear] = useState(
    savedSession || ""
  );
  const [years, setYears] = useState<string[]>([]);
  const [sessionSelected, setSessionSelected] = useState(!!savedSession);
  const setSchoolName = useSetRecoilState(handleInstitutionName);
  const setSchoolLogo = useSetRecoilState(handleInstitutionLogo);

  useEffect(() => {
    // On component mount, check if there's a saved session and load available sessions
    const saved = localStorage.getItem("selectedSession");
    if (saved) {
      setSelectedYear(saved);
      setSessionSelected(true);
    }

    const loadSessions = async () => {
      try {
        const resp = await getCurrentSession();
        const data = resp.data || [];
        const yearsArr = Array.isArray(data) ? data.map((s: any) => s.year || s) : [];
        setYears(yearsArr);
        // Fetch school name and logo for saved session
        const sessionToUse = saved || yearsArr[0] || "2026-2027";
        if (sessionToUse) {
          if (!saved) {
            localStorage.setItem("selectedSession", sessionToUse);
            setSelectedYear(sessionToUse);
            setSessionSelected(true);
            onSessionChange(sessionToUse);
          }
          axios.get(`http://${window.location.hostname}:5000/setSession`, {
            params: { year: sessionToUse },
          }).catch(console.error);

          const cfg = await fetchControlConfig(sessionToUse);
          setSchoolName(cfg?.Institution_name || "School");
          setSchoolLogo(cfg?.SchoolLogo || "");
        }
      } catch (err) {
        console.error("Failed to load sessions:", err);
        setYears([]);
      }
    };

    loadSessions();
  }, []);

  const handleYearChange = async (event: any) => {
    const selectedValue = event.target.value as string;
    if (!selectedValue) return;

    setSelectedYear(selectedValue);
    try {
      // 1. Update on backend
      const response = await axios.get(`http://${window.location.hostname}:5000/setSession`, {
        params: { year: selectedValue },
      });

      if (response.status === 200) {
        // 2. Update localStorage and state
        localStorage.setItem("selectedSession", selectedValue);
        setSessionSelected(true);

        // 3. Update school info (Recoil)
        const cfg = await fetchControlConfig(selectedValue);
        setSchoolName(cfg?.Institution_name || "School");
        setSchoolLogo(cfg?.SchoolLogo || "");

        // 4. Notify parent App
        onSessionChange(selectedValue);
      }
    } catch (err) {
      console.error("Failed to update session instantaneously:", err);
      alert("Failed to set session. Please try again.");
    }
  };



  return (
    <div className="navbar">
      {!sessionSelected ? (
        <div className="session-warning">
          <h3 style={{color:"#AF1763"}}>Please select a <br /> session to continue.</h3>
          <label>Select Year</label>
          <select
            value={selectYear}
            onChange={handleYearChange}
            style={{ width: "150px" }}
          >
            <option value="">Select Session</option>
            {years.length==0 ? (
              <option value="2026-2027">2026-2027</option>
            ) :years.map((ele, key) => (
              <option key={key} value={ele}>
                {ele}
              </option>
            ))}
          </select>
          <button style={{ width: "150px", padding: "8px", marginTop: "12px", backgroundColor: "#dc2626", color: "white" }} onClick={logout}>
            Logout
          </button>
        </div>
      ) : (
        <>
          <label>Select Year</label>
          <select
            value={selectYear}
            onChange={handleYearChange}
            style={{ width: "150px" }}
          >
            {years.map((ele, key) => (
              <option key={key} value={ele}>
                {ele}
              </option>
            ))}
          </select>
          <ul style={{ paddingLeft: "5px" }}>
            {auth &&
              links
                .filter((link) => link.roles.includes(auth.role))
                .map((link) => (
                  <li key={`link-${link.name}`}>
                    <NavLink
                      className={({ isActive }) => (isActive ? "active" : "")}
                      to={`/${link.path || link.name}`}
                      style={{ fontSize: "18px" }}
                    >
                      {link.name}
                    </NavLink>
                  </li>
                ))}
          </ul>
          {auth && (
            <button style={{ width: "150px", padding: "10px", marginTop: "15px", backgroundColor: "#dc2626", color: "white" }} onClick={logout}>
              Logout
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Navbar;
