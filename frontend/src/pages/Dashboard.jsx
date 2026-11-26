
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Alertas from "../components/Alertas";
import IndicadorCard from "../components/IndicadorCard";
import { peticion } from "../services/api";

// Accesos directos a los cinco módulos
const modulos = [
  { ruta: "/instituciones", nombre: "Instituciones", detalle: "Entidades que atienden los reportes" },
  { ruta: "/categorias", nombre: "Categorías", detalle: "Tipos de problema y su prioridad" },
  { ruta: "/reportes", nombre: "Reportes", detalle: "Problemas reportados por ciudadanos" },
  { ruta: "/seguimientos", nombre: "Seguimientos", detalle: "Avances registrados por operadores" },
  { ruta: "/apoyos", nombre: "Apoyos", detalle: "Ciudadanos que apoyan un reporte" }
];

// Pantalla inicial después del login: indicadores reales y accesos a los módulos
export default function Dashboard({ perfil }) {
  const [indicadores, setIndicadores] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Se ejecuta al abrir la pantalla
  useEffect(() => {
    cargarIndicadores();
  }, []);

  // Obtiene los totales usando el campo "count" de los listados paginados
  async function cargarIndicadores() {
    try {
      setCargando(true);
      setError("");

      // Las consultas se hacen en paralelo
      const [total, enProceso, resueltos] = await Promise.all([
        peticion("/api/reportes/"),
        peticion("/api/reportes/?estado=EN_PROCESO"),
        peticion("/api/reportes/?estado=RESUELTO")
      ]);

      setIndicadores({
        total: total.count,
        enProceso: enProceso.count,
        resueltos: resueltos.count
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  // Estadísticas generales: el backend solo las permite al administrador (otros reciben 403)
  async function cargarEstadisticas() {
    try {
      setError("");
      const datos = await peticion("/api/reportes/estadisticas/");
      setEstadisticas(datos);
    } catch (err) {
      setEstadisticas(null);
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Inicio</h2>
      <p>
        Bienvenido(a) <strong>{perfil?.username}</strong>. Rol: {perfil?.rol}
      </p>

      <Alertas error={error} />

      {cargando && <p>Cargando indicadores...</p>}

      {/* Indicadores obtenidos de la API */}
      {indicadores && (
        <div className="row g-3 mb-4">
          <IndicadorCard titulo="Reportes totales" valor={indicadores.total} color="primary" />
          <IndicadorCard titulo="En proceso" valor={indicadores.enProceso} color="warning" />
          <IndicadorCard titulo="Resueltos" valor={indicadores.resueltos} color="success" />
        </div>
      )}

      {/* Accesos a los cinco módulos */}
      <h4>Módulos</h4>
      <div className="row g-3 mb-4">
        {modulos.map((modulo) => (
          <div className="col-md-4" key={modulo.ruta}>
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title">{modulo.nombre}</h5>
                <p className="card-text">{modulo.detalle}</p>
                <Link to={modulo.ruta} className="btn btn-outline-primary btn-sm">
                  Abrir
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* El botón se muestra a todos: el permiso lo decide Django (403 si no es admin) */}
      <h4>Estadísticas generales</h4>
      <button className="btn btn-dark mb-3" onClick={cargarEstadisticas}>
        Ver estadísticas
      </button>

      {estadisticas && (
        <div className="card p-3">
          <p>
            <strong>Reportes abiertos:</strong> {estadisticas.reportes_abiertos}
          </p>
          <p>
            <strong>Institución con más reportes abiertos:</strong>{" "}
            {estadisticas.institucion_mas_reportes_abiertos
              ? `${estadisticas.institucion_mas_reportes_abiertos.siglas} (${estadisticas.institucion_mas_reportes_abiertos.reportes_abiertos})`
              : "Sin datos"}
          </p>

          <h6>Reportes por categoría</h6>
          <ul>
            {estadisticas.por_categoria.map((categoria) => (
              <li key={categoria.id}>
                {categoria.nombre}: {categoria.total_reportes}
              </li>
            ))}
          </ul>

          <h6>Reportes con más apoyos</h6>
          <ul>
            {estadisticas.reportes_mas_apoyados.map((reporte) => (
              <li key={reporte.id}>
                #{reporte.id} {reporte.titulo}: {reporte.total_apoyos} apoyos
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
