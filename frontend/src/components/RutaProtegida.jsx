
import { Navigate } from "react-router-dom";
import { obtenerToken } from "../services/api";

// Protege las rutas privadas: si no hay token redirige al login
export default function RutaProtegida({ children }) {
  if (!obtenerToken()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
