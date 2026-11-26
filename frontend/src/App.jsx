
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import Login from "./components/Login";
import Layout from "./components/Layout";
import RutaProtegida from "./components/RutaProtegida";

import Dashboard from "./pages/Dashboard";
import Instituciones from "./pages/Instituciones";
import Categorias from "./pages/Categorias";
import Reportes from "./pages/Reportes";
import ReporteDetalle from "./pages/ReporteDetalle";
import Seguimientos from "./pages/Seguimientos";
import Apoyos from "./pages/Apoyos";

import {
  cerrarSesion,
  consultarPerfil,
  guardarToken,
  obtenerToken
} from "./services/api";

export default function App() {
  const navigate = useNavigate();

  // Estado de autenticación compartido por toda la aplicación
  const [token, setToken] = useState(obtenerToken());
  const [perfil, setPerfil] = useState(null);
  const [aviso, setAviso] = useState("");

  // Cada vez que cambia el token se consulta el perfil (usuario y rol)
  useEffect(() => {
    if (!token) {
      return;
    }

    consultarPerfil()
      .then((datos) => setPerfil(datos))
      .catch((err) => {
        // Token inválido (401): se limpia la sesión y se vuelve al login
        setAviso(err.message);
        salir();
      });
  }, [token]);

  // Recibe el token del Login, lo guarda y entra al dashboard
  function iniciarSesion(nuevoToken) {
    guardarToken(nuevoToken);
    setToken(nuevoToken);
    setAviso("");
    navigate("/dashboard", { replace: true });
  }

  // Logout: borra el token del navegador, limpia el estado y redirige al login
  function salir() {
    cerrarSesion();
    setToken(null);
    setPerfil(null);
    navigate("/login", { replace: true });
  }

  // Envuelve una página privada con la protección de ruta y el layout
  function privada(pagina) {
    return (
      <RutaProtegida>
        <Layout perfil={perfil} onSalir={salir}>
          {pagina}
        </Layout>
      </RutaProtegida>
    );
  }

  return (
    <Routes>
      {/* Si ya hay sesión, /login manda directo al dashboard */}
      <Route
        path="/login"
        element={
          obtenerToken()
            ? <Navigate to="/dashboard" replace />
            : <Login onLogin={iniciarSesion} aviso={aviso} />
        }
      />

      {/* Rutas privadas: una por módulo */}
      <Route path="/dashboard" element={privada(<Dashboard perfil={perfil} />)} />
      <Route path="/instituciones" element={privada(<Instituciones perfil={perfil} />)} />
      <Route path="/categorias" element={privada(<Categorias perfil={perfil} />)} />
      <Route path="/reportes" element={privada(<Reportes perfil={perfil} />)} />
      <Route path="/reportes/:id" element={privada(<ReporteDetalle />)} />
      <Route path="/seguimientos" element={privada(<Seguimientos perfil={perfil} />)} />
      <Route path="/apoyos" element={privada(<Apoyos perfil={perfil} />)} />

      {/* Cualquier otra ruta va al dashboard (o al login si no hay sesión) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
