// ProtectedRoute.tsx
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  auth: { token: string; role: 'teacher' | 'admin' };
  allowedRoles: ('teacher' | 'admin')[];
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ auth, allowedRoles, children }) => {
  if (!auth || !allowedRoles.includes(auth.role)) {
    return (
      <>
        <Navigate to="/" />
      </>
    );
  }
  return <>{children}</>;
};

export default ProtectedRoute;
