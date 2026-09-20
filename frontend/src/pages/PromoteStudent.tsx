import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { UserCheck, ArrowRightCircle, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { getAllSessions, getAllStandards } from "../apis/api";

const getNextSession = (sessionStr: string): string => {
  if (!sessionStr) return "";
  if (!sessionStr.includes("-")) {
    const yr = parseInt(sessionStr);
    if (!isNaN(yr)) return String(yr + 1);
  }
  const parts = sessionStr.split("-");
  if (parts.length === 2) {
    const s = parseInt(parts[0]);
    const e = parseInt(parts[1]);
    if (!isNaN(s) && !isNaN(e)) {
      return `${s + 1}-${e + 1}`;
    }
  }
  return sessionStr;
};

const getNextDivision = (divStr: string, availableDivisions: string[]): string => {
  if (!divStr) return "";
  const idx = availableDivisions.indexOf(divStr);
  if (idx !== -1 && idx < availableDivisions.length - 1) {
    return availableDivisions[idx + 1];
  }
  const num = parseInt(divStr);
  if (!isNaN(num)) {
    return String(num + 1);
  }
  return divStr;
};

const PromoteStudent: React.FC = () => {
  const [fromSession, setFromSession] = useState<string>(
    localStorage.getItem("selectedSession") || "2026"
  );
  const [toSession, setToSession] = useState<string>(
    getNextSession(localStorage.getItem("selectedSession") || "2026")
  );

  const [sessions, setSessions] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [fromDivision, setFromDivision] = useState<string>("");
  const [toDivision, setToDivision] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [students, setStudents] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [fetchingStats, setFetchingStats] = useState<boolean>(false);

  const loadDivisions = async () => {
    try {
      const data = await getAllStandards();
      let arr: any = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && Array.isArray(data.standard)) {
        arr = data.standard;
      }
      const mapped: string[] = arr.map((s: any) => String(s.std ? s.std : s));
      setDivisions(mapped);
      if (mapped.length > 0 && !fromDivision) {
        const initialFrom = mapped[0];
        setFromDivision(initialFrom);
        setToDivision(getNextDivision(initialFrom, mapped));
      }
    } catch (e) {
      console.error("Error loading divisions in PromoteStudent:", e);
    }
  };

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await getAllSessions();
        if (Array.isArray(data)) {
          setSessions(data);
          if (data.length > 0 && !fromSession) {
            const initialSess = data[0].year;
            setFromSession(initialSess);
            setToSession(getNextSession(initialSess));
          }
        }
      } catch (e) {
        console.error("Error loading sessions in PromoteStudent:", e);
      }
    }
    loadSessions();
    loadDivisions();

    window.addEventListener('standardsUpdated', loadDivisions);
    return () => {
      window.removeEventListener('standardsUpdated', loadDivisions);
    };
  }, []);

  // Compute available options for To Division dropdown (showing only available divisions from database + target division)
  const availableToDivisions = useMemo(() => {
    const set = new Set<string>();
    divisions.forEach(d => set.add(d));
    if (fromDivision) {
      const next = getNextDivision(fromDivision, divisions);
      if (next) set.add(next);
    }
    if (toDivision) set.add(toDivision);

    return Array.from(set).sort((a, b) => {
      const na = parseInt(a);
      const nb = parseInt(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [divisions, fromDivision, toDivision]);

  // Compute available options for To Session dropdown
  const availableToSessions = useMemo(() => {
    const defaultSessions = ['2025', '2026', '2027', '2028', '2029', '2030'];
    const fetchedYears = sessions.map(s => s.year);
    const nextSess = getNextSession(fromSession);
    const combined = Array.from(new Set([...fetchedYears, nextSess, ...defaultSessions])).filter(Boolean);
    return combined;
  }, [sessions, fromSession]);

  const fetchSessionStudents = async (sessionToFetch?: string, standardToFetch?: string) => {
    const targetSession = sessionToFetch !== undefined ? sessionToFetch : fromSession;
    const targetStandard = standardToFetch !== undefined ? standardToFetch : fromDivision;
    setFetchingStats(true);
    try {
      const paramsObj: any = { session: targetSession };
      if (targetStandard) paramsObj.standard = targetStandard;

      const headersObj: any = { "x-session": targetSession };
      if (targetStandard) headersObj["x-standard"] = targetStandard;

      const response = await axios.get(
        `http://${window.location.hostname}:5000/promotion/students`,
        {
          params: paramsObj,
          headers: headersObj
        }
      );
      if (Array.isArray(response.data)) {
        setStudents(response.data);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error("Error fetching session students:", err);
      setStudents([]);
    } finally {
      setFetchingStats(false);
    }
  };

  useEffect(() => {
    fetchSessionStudents(fromSession, fromDivision);
  }, [fromSession, fromDivision]);

  const handlePromoteStudents = async () => {
    const fromScope = fromDivision ? `Division ${fromDivision}` : 'All Divisions';
    const targetDiv = toDivision || getNextDivision(fromDivision, divisions);
    const toScope = targetDiv ? `Division ${targetDiv}` : 'Next Division';
    const targetSess = toSession || getNextSession(fromSession);

    if (!window.confirm(`Are you sure you want to promote eligible students from ${fromScope} (${fromSession}) to ${toScope} (${targetSess})?`)) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const payload: any = {
        fromSession: fromSession,
        toSession: targetSess,
        fromStandard: fromDivision,
        toStandard: targetDiv
      };

      const headersObj: Record<string, string> = {
        "x-session": fromSession,
        "x-to-session": targetSess
      };
      if (fromDivision) headersObj["x-standard"] = fromDivision;
      if (targetDiv) headersObj["x-to-standard"] = targetDiv;

      const response = await axios.post(
        `http://${window.location.hostname}:5000/promotion`,
        payload,
        { headers: headersObj }
      );

      let promotedCount = 0;
      if (response.data) {
        let data = response.data;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (e) {}
        }
        if (Array.isArray(data)) {
          promotedCount = data.length;
        }
      }

      setMessage({
        type: "success",
        text: `Promotion completed successfully! ${promotedCount > 0 ? `${promotedCount} student(s)` : 'Eligible students'} promoted from ${fromScope} (${fromSession}) to ${toScope} (${targetSess}).`
      });
      await loadDivisions();
      window.dispatchEvent(new Event('standardsUpdated'));
      setFromSession(targetSess);
      setFromDivision(targetDiv);
      fetchSessionStudents(targetSess, targetDiv);
    } catch (error: any) {
      console.error("Error promoting students:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.error || error.message || "Failed to promote students. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const displayedStudents = students;

  return (
    <div className="global-container" style={{ padding: "30px", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        borderRadius: "16px",
        padding: "30px",
        color: "#ffffff",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
        marginBottom: "30px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
          <UserCheck size={36} style={{ color: "#38bdf8" }} />
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>Student Promotion Management</h1>
        </div>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "15px" }}>
          Promote passed students directly from one Division to another and across academic sessions.
        </p>
      </div>

      {message && (
        <div style={{
          padding: "16px 20px",
          borderRadius: "12px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          backgroundColor: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: message.type === "success" ? "#166534" : "#991b1b"
        }}>
          {message.type === "success" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <span style={{ fontWeight: 500, fontSize: "15px" }}>{message.text}</span>
        </div>
      )}

      {/* Promotion Configuration Card */}
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        marginBottom: "24px"
      }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "20px" }}>
          Promotion Rules Configuration
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: "20px",
          alignItems: "center",
          backgroundColor: "#f8fafc",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid #cbd5e1"
        }}>
          {/* Source Box */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Source (From)
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                From Session
              </label>
              <select
                value={fromSession}
                onChange={(e) => {
                  const val = e.target.value;
                  setFromSession(val);
                  localStorage.setItem("selectedSession", val);
                  const nextSess = getNextSession(val);
                  setToSession(nextSess);
                  fetchSessionStudents(val, fromDivision);
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  fontWeight: 600,
                  backgroundColor: "#ffffff"
                }}
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.year}>{s.year}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                From Division
              </label>
              <select
                value={fromDivision}
                onChange={(e) => {
                  const val = e.target.value;
                  setFromDivision(val);
                  const nextDiv = getNextDivision(val, divisions);
                  setToDivision(nextDiv);
                  fetchSessionStudents(fromSession, val);
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  fontWeight: 600,
                  backgroundColor: "#ffffff"
                }}
              >
                <option value="">All Divisions</option>
                {divisions.map((d, idx) => (
                  <option key={idx} value={d}>Division {d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Arrow */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px" }}>
            <ArrowRightCircle size={36} style={{ color: "#2563eb" }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginTop: "6px", textTransform: "uppercase" }}>PROMOTE TO</span>
          </div>

          {/* Target Box */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Target (To)
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                To Session
              </label>
              <select
                value={toSession}
                onChange={(e) => setToSession(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  fontWeight: 600,
                  backgroundColor: "#ffffff"
                }}
              >
                {availableToSessions.map((s, idx) => (
                  <option key={idx} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                To Division
              </label>
              <select
                value={toDivision}
                onChange={(e) => setToDivision(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  fontWeight: 600,
                  backgroundColor: "#ffffff"
                }}
              >
                {availableToDivisions.map((d, idx) => (
                  <option key={idx} value={d}>Division {d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "24px" }}>
          <div style={{ padding: "20px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Students in {fromDivision ? `Division ${fromDivision}` : 'All Divisions'}</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", marginTop: "8px" }}>
              {fetchingStats ? "..." : displayedStudents.length}
            </div>
          </div>
          <div style={{ padding: "20px", backgroundColor: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: "13px", color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>Eligible Passed Students</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#15803d", marginTop: "8px" }}>
              {fetchingStats ? "..." : displayedStudents.filter(s => s.status === "Passed").length}
            </div>
          </div>
          <div style={{ padding: "20px", backgroundColor: "#fef2f2", borderRadius: "12px", border: "1px solid #fecaca" }}>
            <div style={{ fontSize: "13px", color: "#991b1b", fontWeight: 600, textTransform: "uppercase" }}>Failed / Retained Students</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#b91c1c", marginTop: "8px" }}>
              {fetchingStats ? "..." : displayedStudents.filter(s => s.status === "Failed").length}
            </div>
          </div>
        </div>

        {/* Students Table */}
        {displayedStudents.length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "12px" }}>
              Students List ({displayedStudents.length})
            </h3>
            <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "10px 12px" }}>Roll No</th>
                    <th style={{ padding: "10px 12px" }}>Student Name</th>
                    <th style={{ padding: "10px 12px" }}>Current Division</th>
                    <th style={{ padding: "10px 12px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedStudents.map((st) => (
                    <tr key={st.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{st.rollNo}</td>
                      <td style={{ padding: "10px 12px" }}>{st.fullName}</td>
                      <td style={{ padding: "10px 12px" }}>{st.standard}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: st.status === "Passed" ? "#dcfce7" : "#fee2e2",
                          color: st.status === "Passed" ? "#166534" : "#991b1b"
                        }}>
                          {st.status || "Passed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "20px", marginTop: "24px", borderTop: "1px solid #e2e8f0" }}>
          <button
            onClick={() => fetchSessionStudents(fromSession, fromDivision)}
            disabled={fetchingStats}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: "14px"
            }}
          >
            <RefreshCw size={16} className={fetchingStats ? "spin" : ""} /> Refresh Data
          </button>

          <button
            onClick={handlePromoteStudents}
            disabled={loading || displayedStudents.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: (loading || displayedStudents.length === 0) ? "#94a3b8" : "#2563eb",
              color: "#ffffff",
              cursor: (loading || displayedStudents.length === 0) ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "15px",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)"
            }}
          >
            {loading ? (
              <>Promoting Students...</>
            ) : (
              <>
                <ArrowRightCircle size={20} /> Promote Students (Division {fromDivision || 'All'} → Division {toDivision || getNextDivision(fromDivision, divisions)})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoteStudent;

