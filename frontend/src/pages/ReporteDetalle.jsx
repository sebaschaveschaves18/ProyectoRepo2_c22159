
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Alertas from "../components/Alertas";
import Tabla from "../components/Tabla";
import { peticion } from "../services/api";

// Detalle de un reporte con su información relacionada (categoría, seguimientos y apoyos)
export default function ReporteDetalle() {
  // id que viene en la ruta /reportes/:id
  const { id } = useParams();

  const [historial, setHistorial] = useState(null);
  const [categoria, setCategoria] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Se ejecuta al abrir la pantalla (y si cambia el id)
  useEffect(() => {
    cargarHistorial();
  }, [id]);

  // GET /api/reportes/<id>/historial/ y luego la categoría del reporte
  async function cargarHistorial() {
    try {
      setCargando(true);
      setError("");

      const datos = await peticion(`/api/reportes/${id}/historial/`);
      setHistorial(datos);

      // Categoría relacionada (incluye la institución responsable)
      setCategoria(await peticion(`/api/categorias/${datos.reporte.categoria}/`));

    } catch (err) {
      // Si el id no existe el backend responde 404
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <Link to="/reportes" className="btn btn-outline-secondary btn-sm mb-3">
        Volver a reportes
      </Link>

      <Alertas error={error} />

      {cargando && <p>Cargando reporte...</p>}

      {historial && (
        <>
          <div className="card p-3 mb-4">
            <h2 className="h4">
              #{historial.reporte.id} {historial.reporte.titulo}
            </h2>
            <p>{historial.reporte.descripcion}</p>

            <div className="row">
              <p className="col-md-4 mb-1"><strong>Estado:</strong> {historial.reporte.estado}</p>
              <p className="col-md-4 mb-1"><strong>Prioridad:</strong> {historial.reporte.prioridad}</p>
              <p className="col-md-4 mb-1"><strong>Apoyos:</strong> {historial.total_apoyos}</p>
              <p className="col-md-4 mb-1"><strong>Categoría:</strong> {categoria?.nombre}</p>
              <p className="col-md-4 mb-1"><strong>Ciudadano:</strong> {historial.reporte.ciudadano_username}</p>
              <p className="col-md-4 mb-1"><strong>Distrito:</strong> {historial.reporte.distrito}</p>
              <p className="col-md-8 mb-1"><strong>Dirección:</strong> {historial.reporte.direccion}</p>
              <p className="col-md-4 mb-1">
                <strong>Creado:</strong> {new Date(historial.reporte.fecha_creacion).toLocaleString()}
              </p>
              {/* La fecha de resolución la llena el backend al pasar a RESUELTO */}
              {historial.reporte.fecha_resolucion && (
                <p className="col-md-4 mb-1">
                  <strong>Resuelto:</strong> {new Date(historial.reporte.fecha_resolucion).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <h4>Seguimientos</h4>
          <Tabla
            columnas={["Fecha", "Tipo", "Comentario", "Operador"]}
            cargando={false}
            vacio={historial.seguimientos.length === 0}
          >
            {historial.seguimientos.map((seguimiento) => (
              <tr key={seguimiento.id}>
                <td>{new Date(seguimiento.fecha).toLocaleString()}</td>
                <td>{seguimiento.tipo}</td>
                <td>{seguimiento.comentario}</td>
                <td>{seguimiento.operador_username}</td>
              </tr>
            ))}
          </Tabla>
        </>
      )}
    </div>
  );
}
