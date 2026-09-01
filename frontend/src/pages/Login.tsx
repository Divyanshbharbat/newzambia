import React, { useState } from "react";
import { 
  User, 
  Lock, 
  Shield, 
  School, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Loader2 
} from "lucide-react";
import { getCredentials } from "../apis/api";

interface LoginProps {
  setAuth: (auth: any) => void;
  setIsLoading: (loading: boolean) => void;
  availableColleges: string[];
}

const Login: React.FC<LoginProps> = ({ setAuth, setIsLoading, availableColleges }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "teacher">("admin");
  const [college, setCollege] = useState("svpcet");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (availableColleges && availableColleges.length > 0) {
      const hasSvpcet = availableColleges.some((c: any) => (typeof c === 'string' ? c : c?.name || '').toLowerCase() === 'svpcet');
      if (hasSvpcet) {
        setCollege("svpcet");
      } else if (!college) {
        const firstCol = availableColleges[0] as any;
        setCollege(typeof firstCol === 'string' ? firstCol : firstCol?.name || 'svpcet');
      }
    } else {
      setCollege("svpcet");
    }
  }, [availableColleges]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !college) {
      alert("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await getCredentials(username, password, role, college);
      
      if (response.token && response.role) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("userRole", response.role);
        localStorage.setItem("username", response.username);
        localStorage.setItem("userCollege", response.college || "");
        setAuth({ ...response, role: response.role as "admin" | "teacher" });
        setIsLoading(false);
      }
    } catch (error: any) {
      alert(error.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      minHeight: "100vh", 
      background: "#f8fafc", // Very light gray/blue background
      fontFamily: "'Poppins', sans-serif",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Decorative background shapes for a professional look */}
      <div style={{
        position: "absolute",
        top: "-10%",
        right: "-5%",
        width: "30vw",
        height: "30vw",
        background: "rgba(37, 99, 235, 0.03)",
        borderRadius: "50%",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%",
        left: "5%",
        width: "20vw",
        height: "20vw",
        background: "rgba(37, 99, 235, 0.05)",
        borderRadius: "50%",
        zIndex: 0
      }} />

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
          
          .login-card {
            background: white;
            border: 1px solid #e2e8f0;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
            transition: transform 0.3s ease;
          }
          .input-group:focus-within .input-icon {
            color: #2563eb;
          }
          .input-group:focus-within input, .input-group:focus-within select {
            border-color: #2563eb;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
          }
          input::placeholder {
            color: #94a3b8;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div className="login-card" style={{ 
        padding: "56px 48px", 
        borderRadius: "24px", 
        width: "100%",
        maxWidth: "480px",
        zIndex: 1
      }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            width: "60px",
            height: "60px",
            background: "#2563eb",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 8px 16px -4px rgba(37, 99, 235, 0.3)"
          }}>
            <School size={30} color="white" />
          </div>
          <h1 style={{ 
            fontSize: "28px", 
            fontWeight: "700", 
            color: "#1e293b", 
            margin: "0 0 8px 0",
            letterSpacing: "-0.01em" 
          }}>
            Sign In
          </h1>
          <p style={{ color: "#64748b", fontSize: "15px", fontWeight: "400" }}>
            Access your School Management System
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {/* Username */}
          <div className="input-group" style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>Username</label>
            <div style={{ position: "relative" }}>
              <div className="input-icon" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", transition: "color 0.2s" }}>
                <User size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Enter username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "14px 16px 14px 48px", 
                  borderRadius: "12px", 
                  border: "1.5px solid #e2e8f0",
                  backgroundColor: "#fcfdfe",
                  fontSize: "15px",
                  color: "#1e293b",
                  outline: "none",
                  transition: "all 0.2s"
                }} 
              />
            </div>
          </div>

          {/* Password */}
          <div className="input-group" style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>Password</label>
            <div style={{ position: "relative" }}>
              <div className="input-icon" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", transition: "color 0.2s" }}>
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "14px 48px 14px 48px", 
                  borderRadius: "12px", 
                  border: "1.5px solid #e2e8f0",
                  backgroundColor: "#fcfdfe",
                  fontSize: "15px",
                  color: "#1e293b",
                  outline: "none",
                  transition: "all 0.2s"
                }} 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: "absolute", 
                  right: "16px", 
                  top: "50%", 
                  transform: "translateY(-50%)", 
                  color: "#94a3b8",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role & College */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
            <div className="input-group">
              <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</label>
              <div style={{ position: "relative" }}>
                <div className="input-icon" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                  <Shield size={16} />
                </div>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value as "admin" | "teacher")}
                  style={{ 
                    width: "100%", 
                    padding: "12px 12px 12px 36px", 
                    borderRadius: "12px", 
                    border: "1.5px solid #e2e8f0",
                    backgroundColor: "#fcfdfe",
                    color: "#1e293b",
                    cursor: "pointer",
                    outline: "none",
                    fontWeight: "500",
                    appearance: "none",
                    fontSize: "14px"
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>College</label>
              <div style={{ position: "relative" }}>
                <div className="input-icon" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                  <School size={16} />
                </div>
                <input 
                  type="text"
                  value="svpcet"
                  readOnly
                  style={{ 
                    width: "100%", 
                    padding: "12px 12px 12px 36px", 
                    borderRadius: "12px", 
                    border: "1.5px solid #e2e8f0",
                    backgroundColor: "#fcfdfe",
                    color: "#1e293b",
                    fontWeight: "500",
                    outline: "none",
                    fontSize: "14px"
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{ 
              width: "100%", 
              padding: "16px", 
              background: "#2563eb", 
              color: "white", 
              border: "none", 
              borderRadius: "12px", 
              cursor: isSubmitting ? "not-allowed" : "pointer", 
              fontSize: "16px",
              fontWeight: "600",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: isSubmitting ? 0.7 : 1
            }}
            onMouseOver={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = "#1d4ed8";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseOut={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = "#2563eb";
                e.currentTarget.style.transform = "none";
              }
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            Need help? <span style={{ color: "#2563eb", cursor: "pointer", fontWeight: "600" }}>Contact Support</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
