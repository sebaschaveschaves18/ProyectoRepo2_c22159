
import { Link } from "react-router-dom";

// Muestra el mensaje de error (rojo) y el de éxito (verde) de cada página
export default function Alertas({ error, mensaje }) {
  return (
    <>
      {error && (
        <div className="alert alert-danger">
          {error}

          {/* En un 401 la sesión ya se cerró: se ofrece volver al login */}
          {error.includes("(401)") && (
            <Link to="/login" className="alert-link ms-2">
              Ir a iniciar sesión
            </Link>
          )}
        </div>
      )}

      {mensaje && (
        <div className="alert alert-success">
          {mensaje}
        </div>
      )}
    </>
  );
}
