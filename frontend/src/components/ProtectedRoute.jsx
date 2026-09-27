import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
