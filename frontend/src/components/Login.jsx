
import { useState } from "react";
import { iniciarSesionAPI } from "../services/api";

// Pantalla de inicio de sesión: pide usuario y contraseña y obtiene el token real de Django
export default function Login({ onLogin, aviso }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Envía las credenciales a POST /api/token/
  async function iniciarSesion(e) {
    e.preventDefault();

    // Validación previa: no enviar campos vacíos
    if (!usuario.trim() || !password) {
      setError("Digite su usuario y contraseña.");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const token = await iniciarSesionAPI(usuario.trim(), password);
      // El componente padre (App) guarda el token y carga el perfil
      onLogin(token);

    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="container mt-5">
      <div className="card mx-auto p-4 shadow"
           style={{ maxWidth: "400px" }}>

        <h2 className="text-center">Reporte Ciudadano</h2>
        <h4 className="text-center">Iniciar sesión</h4>

        {/* Aviso cuando la sesión anterior expiró (401) */}
        {aviso && (
          <div className="alert alert-warning">
            {aviso}
          </div>
        )}

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <form onSubmit={iniciarSesion}>
          <label className="form-label" htmlFor="usuario">Usuario</label>
          <input
            id="usuario"
            className="form-control mb-3"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />

          <label className="form-label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            className="form-control mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            className="btn btn-primary w-100"
            disabled={cargando}
          >
            {cargando ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
