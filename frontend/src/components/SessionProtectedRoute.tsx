import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface SessionProtectedRouteProps {
  children: React.ReactNode;
}

const SessionProtectedRoute: React.FC<SessionProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const selectedSession = localStorage.getItem("selectedSession");
    if (!selectedSession) {
      // First time session is checked on this route - redirect to dashboard
      alert("Please select a session first");
      navigate("/Dashboard");
    } else {
      // Session exists - allow rendering
      setHasSession(true);
    }
  }, [navigate]);

  // If no session found, show loading (will redirect in useEffect)
  if (!hasSession) {
    return <div style={{padding: "20px", textAlign: "center"}}>Loading session...</div>;
  }

  return <>{children}</>;
};

export default SessionProtectedRoute;

