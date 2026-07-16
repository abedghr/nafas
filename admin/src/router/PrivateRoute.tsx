import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { authed } = useAuth();
  return authed ? <>{children}</> : <Navigate to="/login" replace />;
}
