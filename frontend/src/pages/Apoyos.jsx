
import { useEffect, useState } from "react";
import Alertas from "../components/Alertas";
import FormularioTarjeta from "../components/FormularioTarjeta";
import Tabla from "../components/Tabla";
import { armarParametros, obtenerTodos, peticion } from "../services/api";

// Rutas de la API que usa este módulo
const API_APOYOS = "/api/apoyos/";
const API_REPORTES = "/api/reportes/";

// Estados en los que no se puede apoyar un reporte (RN-09)
const ESTADOS_CERRADOS = ["RESUELTO", "RECHAZADO"];

// Módulo 5: Apoyos (relación N:M ciudadano-reporte).
// Solo crear, consultar y eliminar: un apoyo no tiene datos que editar (sin PUT/PATCH)
export default function Apoyos({ perfil }) {
  const [apoyos, setApoyos] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [reporteSeleccionado, setReporteSeleccionado] = useState("");
  const [filtroReporte, setFiltroReporte] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Acciones visibles según el rol (el permiso real lo valida Django)
  const esCiudadano = perfil?.rol === "Ciudadano";
  const esAdmin = perfil?.rol === "Administrador";

  useEffect(() => {
    cargarReportes();
  }, []);

  // El listado se recarga cuando cambia el filtro por reporte
  useEffect(() => {
    cargarApoyos();
  }, [filtroReporte]);

  // Trae todos los reportes para el selector y para mostrar título/prioridad
  async function cargarReportes() {
    try {
      setReportes(await obtenerTodos(API_REPORTES));
    } catch (err) {
      setError(err.message);
    }
  }

  // GET /api/apoyos/?reporte= (este listado no está paginado en el backend)
  async function cargarApoyos() {
    try {
      setCargando(true);

      const parametros = armarParametros({ reporte: filtroReporte });
      setApoyos(await peticion(`${API_APOYOS}?${parametros}`));

    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  // Busca el reporte por id
  function buscarReporte(id) {
    return reportes.find((r) => r.id === Number(id));
  }

  // Ciudadano: POST /api/apoyos/ (409 si ya lo apoyó)
  async function apoyarReporte(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    // Validaciones previas (RN-09)
    const reporte = buscarReporte(reporteSeleccionado);
    if (!reporte) {
      setError("Seleccione un reporte.");
      return;
    }
    if (reporte.ciudadano === perfil?.id) {
      setError("No puede apoyar su propio reporte.");
      return;
    }

    setProcesando(true);

    try {
      await peticion(API_APOYOS, {
        method: "POST",
        body: JSON.stringify({ reporte: Number(reporteSeleccionado) })
      });

      setReporteSeleccionado("");
      setMensaje("Apoyo registrado. Con 3 apoyos el reporte sube a prioridad ALTA.");

      // Se recargan ambos: el apoyo puede cambiar la prioridad del reporte
      await Promise.all([cargarApoyos(), cargarReportes()]);

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  // DELETE /api/apoyos/<id>/ (solo el dueño del apoyo o el administrador)
  async function eliminarApoyo(id) {
    if (!window.confirm("¿Quitar este apoyo?")) {
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      await peticion(`${API_APOYOS}${id}/`, {
        method: "DELETE"
      });

      setMensaje("Apoyo eliminado correctamente");
      await cargarApoyos();

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  // Reportes que el ciudadano puede apoyar: abiertos y de otras personas
  const reportesApoyables = reportes.filter(
    (reporte) =>
      !ESTADOS_CERRADOS.includes(reporte.estado) &&
      reporte.ciudadano !== perfil?.id
  );

  return (
    <div>
      <h2>Apoyos</h2>

      <Alertas error={error} mensaje={mensaje} />

      {esCiudadano ? (
        <FormularioTarjeta
          titulo="Apoyar un reporte"
          onGuardar={apoyarReporte}
          procesando={procesando}
          editando={false}
        >
          {/* Selector de la relación: reportes abiertos de otros ciudadanos */}
          <label className="form-label" htmlFor="reporte">Reporte</label>
          <select
            id="reporte"
            className="form-select mb-3"
            value={reporteSeleccionado}
            onChange={(e) => setReporteSeleccionado(e.target.value)}
            required
          >
            <option value="">Seleccione reporte</option>

            {reportesApoyables.map((reporte) => (
              <option key={reporte.id} value={reporte.id}>
                #{reporte.id} {reporte.titulo} - {reporte.distrito} (prioridad {reporte.prioridad})
              </option>
            ))}
          </select>
        </FormularioTarjeta>
      ) : (
        <div className="alert alert-info">
          Solo los ciudadanos pueden apoyar reportes.
        </div>
      )}

      {/* Filtro por reporte (?reporte=) */}
      <div className="row g-2 mb-3">
        <div className="col-sm-6">
          <select
            className="form-select"
            value={filtroReporte}
            onChange={(e) => setFiltroReporte(e.target.value)}
          >
            <option value="">Todos los reportes</option>
            {reportes.map((reporte) => (
              <option key={reporte.id} value={reporte.id}>
                #{reporte.id} {reporte.titulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Tabla
        columnas={["Fecha", "Reporte", "Prioridad actual", "Ciudadano", "Acciones"]}
        cargando={cargando}
        vacio={apoyos.length === 0}
      >
        {apoyos.map((apoyo) => (
          <tr key={apoyo.id}>
            <td>{new Date(apoyo.fecha).toLocaleString()}</td>
            <td>
              #{apoyo.reporte} {buscarReporte(apoyo.reporte)?.titulo}
            </td>
            <td>{buscarReporte(apoyo.reporte)?.prioridad}</td>
            <td>{apoyo.ciudadano_username}</td>
            <td>
              {/* Eliminar: el ciudadano dueño del apoyo o el administrador */}
              {(apoyo.ciudadano === perfil?.id || esAdmin) ? (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => eliminarApoyo(apoyo.id)}
                  disabled={procesando}
                >
                  Eliminar
                </button>
              ) : (
                "Solo consulta"
              )}
            </td>
          </tr>
        ))}
      </Tabla>
    </div>
  );
}
