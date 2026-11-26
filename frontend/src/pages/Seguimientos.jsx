
import { useEffect, useState } from "react";
import Alertas from "../components/Alertas";
import FormularioTarjeta from "../components/FormularioTarjeta";
import Paginacion from "../components/Paginacion";
import Tabla from "../components/Tabla";
import { armarParametros, obtenerTodos, peticion } from "../services/api";

// Rutas de la API que usa este módulo
const API_SEGUIMIENTOS = "/api/seguimientos/";
const API_REPORTES = "/api/reportes/";

// Estados en los que el reporte no admite seguimientos (RN-08)
const ESTADOS_CERRADOS = ["RESUELTO", "RECHAZADO"];

// Valores vacíos del formulario
const inicial = {
  reporte: "",
  tipo: "COMENTARIO",
  comentario: ""
};

// Filtros combinables del backend: ?reporte=&tipo=
const filtrosIniciales = {
  reporte: "",
  tipo: ""
};

// Módulo 4: Seguimientos (el operador registra y edita, el administrador elimina)
export default function Seguimientos({ perfil }) {
  const [seguimientos, setSeguimientos] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [filtrosForm, setFiltrosForm] = useState(filtrosIniciales);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [formulario, setFormulario] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Acciones visibles según el rol (el permiso real lo valida Django)
  const puedeRegistrar = perfil?.rol === "Operador" || perfil?.rol === "Administrador";
  const esAdmin = perfil?.rol === "Administrador";

  // Reportes para el selector y para mostrar su título
  useEffect(() => {
    cargarReportes();
  }, []);

  // El listado se recarga al cambiar la página o los filtros
  useEffect(() => {
    cargarSeguimientos();
  }, [pagina, filtros]);

  // Trae todos los reportes (todas las páginas)
  async function cargarReportes() {
    try {
      setReportes(await obtenerTodos(API_REPORTES));
    } catch (err) {
      setError(err.message);
    }
  }

  // GET /api/seguimientos/?reporte=&tipo=&page=
  async function cargarSeguimientos() {
    try {
      setCargando(true);

      const parametros = armarParametros({ ...filtros, page: pagina });
      const datos = await peticion(`${API_SEGUIMIENTOS}?${parametros}`);

      setSeguimientos(datos.results);
      setTotal(datos.count);

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

  // Texto del reporte para la tabla
  function nombreReporte(id) {
    const reporte = buscarReporte(id);

    return reporte ? `#${reporte.id} ${reporte.titulo}` : `Reporte ${id}`;
  }

  // Actualiza el campo del formulario que cambió
  function cambio(e) {
    setFormulario({
      ...formulario,
      [e.target.name]: e.target.value
    });
  }

  // Actualiza el campo de filtro que cambió
  function cambioFiltro(e) {
    setFiltrosForm({
      ...filtrosForm,
      [e.target.name]: e.target.value
    });
  }

  // Aplica los filtros combinados
  function aplicarFiltros(e) {
    e.preventDefault();
    setPagina(1);
    setFiltros(filtrosForm);
  }

  // Quita los filtros
  function limpiarFiltros() {
    setPagina(1);
    setFiltrosForm(filtrosIniciales);
    setFiltros(filtrosIniciales);
  }

  // Precarga el seguimiento en el formulario
  function editarSeguimiento(seguimiento) {
    setEditandoId(seguimiento.id);

    setFormulario({
      reporte: seguimiento.reporte,
      tipo: seguimiento.tipo,
      comentario: seguimiento.comentario
    });

    setError("");
    setMensaje("");
  }

  // Sale del modo edición
  function cancelarEdicion() {
    setEditandoId(null);
    setFormulario(inicial);
  }

  // POST (registrar) o PATCH (editar) del seguimiento
  async function guardarSeguimiento(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    // Validaciones previas (RN-08)
    if (!formulario.reporte) {
      setError("Seleccione un reporte.");
      return;
    }
    if (formulario.comentario.trim().length < 5) {
      setError("El comentario debe tener al menos 5 caracteres.");
      return;
    }
    const reporte = buscarReporte(formulario.reporte);
    if (reporte && ESTADOS_CERRADOS.includes(reporte.estado)) {
      setError("El reporte está cerrado; no admite seguimientos.");
      return;
    }

    setProcesando(true);

    try {
      const editando = editandoId !== null;

      // Al editar no se envía el reporte (no se puede cambiar); el operador lo pone Django
      const datos = editando
        ? { tipo: formulario.tipo, comentario: formulario.comentario }
        : { ...formulario, reporte: Number(formulario.reporte) };

      await peticion(editando ? `${API_SEGUIMIENTOS}${editandoId}/` : API_SEGUIMIENTOS, {
        method: editando ? "PATCH" : "POST",
        body: JSON.stringify(datos)
      });

      cancelarEdicion();

      setMensaje(
        editando
          ? "Seguimiento actualizado correctamente"
          : "Seguimiento registrado. Si el reporte estaba RECIBIDO, pasó a EN_PROCESO."
      );

      // Se recargan ambos: el seguimiento puede cambiar el estado del reporte
      await Promise.all([cargarSeguimientos(), cargarReportes()]);

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  // Solo administrador: DELETE /api/seguimientos/<id>/
  async function eliminarSeguimiento(id) {
    if (!window.confirm("¿Eliminar seguimiento?")) {
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      await peticion(`${API_SEGUIMIENTOS}${id}/`, {
        method: "DELETE"
      });

      if (editandoId === id) {
        cancelarEdicion();
      }

      setMensaje("Seguimiento eliminado correctamente");

      // Si se borró el último registro de la página, se regresa a la anterior
      if (seguimientos.length === 1 && pagina > 1) {
        setPagina(pagina - 1);
      } else {
        await cargarSeguimientos();
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  // Al registrar solo se ofrecen reportes abiertos
  const reportesAbiertos = reportes.filter(
    (reporte) => !ESTADOS_CERRADOS.includes(reporte.estado)
  );

  return (
    <div>
      <h2>Seguimientos</h2>

      <Alertas error={error} mensaje={mensaje} />

      {puedeRegistrar ? (
        <FormularioTarjeta
          titulo={editandoId ? "Editar seguimiento" : "Registrar seguimiento"}
          onGuardar={guardarSeguimiento}
          onCancelar={cancelarEdicion}
          procesando={procesando}
          editando={editandoId !== null}
        >
          {/* Selector de la relación: reportes abiertos consultados a la API */}
          <label className="form-label" htmlFor="reporte">Reporte</label>
          <select
            id="reporte"
            className="form-select mb-2"
            name="reporte"
            value={formulario.reporte}
            onChange={cambio}
            disabled={editandoId !== null}
            required
          >
            <option value="">Seleccione reporte</option>

            {(editandoId ? reportes : reportesAbiertos).map((reporte) => (
              <option key={reporte.id} value={reporte.id}>
                #{reporte.id} {reporte.titulo} ({reporte.estado})
              </option>
            ))}
          </select>

          <label className="form-label" htmlFor="tipo">Tipo</label>
          <select
            id="tipo"
            className="form-select mb-2"
            name="tipo"
            value={formulario.tipo}
            onChange={cambio}
          >
            <option value="COMENTARIO">COMENTARIO</option>
            <option value="INSPECCION">INSPECCION</option>
            <option value="REPARACION">REPARACION</option>
          </select>

          <label className="form-label" htmlFor="comentario">Comentario (mínimo 5 caracteres)</label>
          <textarea
            id="comentario"
            className="form-control mb-3"
            name="comentario"
            maxLength="300"
            rows="2"
            value={formulario.comentario}
            onChange={cambio}
            required
          />
        </FormularioTarjeta>
      ) : (
        <div className="alert alert-info">
          Solo los operadores registran seguimientos. Aquí puede consultar el avance de los reportes.
        </div>
      )}

      {/* Filtros combinables: reporte + tipo */}
      <form className="row g-2 mb-3" onSubmit={aplicarFiltros}>
        <div className="col-sm-5">
          <select className="form-select" name="reporte" value={filtrosForm.reporte} onChange={cambioFiltro}>
            <option value="">Todos los reportes</option>
            {reportes.map((reporte) => (
              <option key={reporte.id} value={reporte.id}>
                #{reporte.id} {reporte.titulo}
              </option>
            ))}
          </select>
        </div>

        <div className="col-sm-4">
          <select className="form-select" name="tipo" value={filtrosForm.tipo} onChange={cambioFiltro}>
            <option value="">Todos los tipos</option>
            <option value="COMENTARIO">COMENTARIO</option>
            <option value="INSPECCION">INSPECCION</option>
            <option value="REPARACION">REPARACION</option>
          </select>
        </div>

        <div className="col-sm-3 d-flex gap-2">
          <button className="btn btn-primary">Filtrar</button>
          <button type="button" className="btn btn-outline-secondary" onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>
      </form>

      <Tabla
        columnas={["Fecha", "Reporte", "Tipo", "Comentario", "Operador", "Acciones"]}
        cargando={cargando}
        vacio={seguimientos.length === 0}
      >
        {seguimientos.map((seguimiento) => (
          <tr key={seguimiento.id}>
            <td>{new Date(seguimiento.fecha).toLocaleString()}</td>
            <td>{nombreReporte(seguimiento.reporte)}</td>
            <td>{seguimiento.tipo}</td>
            <td>{seguimiento.comentario}</td>
            <td>{seguimiento.operador_username}</td>
            <td className="text-nowrap">
              {puedeRegistrar && (
                <button
                  className="btn btn-warning btn-sm me-2"
                  onClick={() => editarSeguimiento(seguimiento)}
                  disabled={procesando}
                >
                  Editar
                </button>
              )}

              {esAdmin && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => eliminarSeguimiento(seguimiento.id)}
                  disabled={procesando}
                >
                  Eliminar
                </button>
              )}

              {!puedeRegistrar && "Solo consulta"}
            </td>
          </tr>
        ))}
      </Tabla>

      <Paginacion pagina={pagina} total={total} onCambiar={setPagina} />
    </div>
  );
}
