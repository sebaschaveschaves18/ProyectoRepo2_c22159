
import { NavLink } from "react-router-dom";

// Opciones del menú: ruta y texto de cada módulo
const opciones = [
  { ruta: "/dashboard", texto: "Inicio" },
  { ruta: "/instituciones", texto: "Instituciones" },
  { ruta: "/categorias", texto: "Categorías" },
  { ruta: "/reportes", texto: "Reportes" },
  { ruta: "/seguimientos", texto: "Seguimientos" },
  { ruta: "/apoyos", texto: "Apoyos" }
];

// Barra superior: navegación entre módulos, usuario conectado y cerrar sesión
export default function Menu({ perfil, onSalir }) {
  return (
    <nav className="navbar navbar-dark bg-dark p-3">
      <div className="container">

        <span className="navbar-brand">
          Reporte Ciudadano
        </span>

        {/* Usuario y rol que devuelve /api/perfil/ */}
        {perfil && (
          <span className="text-light small">
            {perfil.username} ({perfil.rol})
          </span>
        )}

        {/* flex-wrap: en celular los botones bajan a otra línea */}
        <div className="d-flex flex-wrap gap-2 mt-2 w-100">

          {opciones.map((opcion) => (
            // NavLink marca el botón del módulo activo sin recargar la página
            <NavLink
              key={opcion.ruta}
              to={opcion.ruta}
              className={({ isActive }) =>
                `btn btn-sm ${isActive ? "btn-primary" : "btn-outline-light"}`
              }
            >
              {opcion.texto}
            </NavLink>
          ))}

          <button
            className="btn btn-danger btn-sm ms-auto"
            onClick={onSalir}
          >
            Cerrar sesión
          </button>

        </div>
      </div>
    </nav>
  );
}
