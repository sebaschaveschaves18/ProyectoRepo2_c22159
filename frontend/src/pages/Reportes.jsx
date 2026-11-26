
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Alertas from "../components/Alertas";
import FormularioTarjeta from "../components/FormularioTarjeta";
import Paginacion from "../components/Paginacion";
import Tabla from "../components/Tabla";
import { armarParametros, obtenerTodos, peticion } from "../services/api";

// Rutas de la API que usa este módulo
const API_REPORTES = "/api/reportes/";
const API_CATEGORIAS = "/api/categorias/";
const API_INSTITUCIONES = "/api/instituciones/";

// Mismos cambios de estado permitidos que en el backend (RN-06)
const TRANSICIONES = {
  RECIBIDO: ["EN_PROCESO", "RECHAZADO"],
  EN_PROCESO: ["RESUELTO", "RECHAZADO"],
  RESUELTO: [],
  RECHAZADO: []
};

// Estados en los que el reporte ya no se puede modificar
const ESTADOS_CERRADOS = ["RESUELTO", "RECHAZADO"];

// Color de la etiqueta según el estado
const COLORES_ESTADO = {
  RECIBIDO: "secondary",
  EN_PROCESO: "warning",
  RESUELTO: "success",
  RECHAZADO: "danger"
};

// Valores vacíos del formulario
const inicial = {
  titulo: "",
  descripcion: "",
  categoria: "",
  distrito: "",
  direccion: "",
  estado: "RECIBIDO"
};

// Filtros, búsqueda y ordenamiento que acepta el backend
const filtrosIniciales = {
  estado: "",
  prioridad: "",
  categoria: "",
  institucion: "",
  distrito: "",
  buscar: "",
  ordering: "-fecha_creacion"
};

// Módulo 3: Reportes (el ciudadano crea, el operador edita/cambia estado, el admin elimina)
export default function Reportes({ perfil }) {
  const [reportes, setReportes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [instituciones, setInstituciones] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [filtrosForm, setFiltrosForm] = useState(filtrosIniciales);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [formulario, setFormulario] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);
  const [estadoOriginal, setEstadoOriginal] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Acciones visibles según el rol (el permiso real lo valida Django)
  const esCiudadano = perfil?.rol === "Ciudadano";
  const puedeEditar = perfil?.rol === "Operador" || perfil?.rol === "Administrador";
  const esAdmin = perfil?.rol === "Administrador";

  // Categorías e instituciones para selectores y filtros
  useEffect(() => {
    cargarCatalogos();
  }, []);

  // El listado se recarga al cambiar la página o los filtros
  useEffect(() => {
    cargarReportes();
  }, [pagina, filtros]);

  // Trae categorías e instituciones (todas las páginas)
  async function cargarCatalogos() {
    try {
      const [listaCategorias, listaInstituciones] = await Promise.all([
        obtenerTodos(API_CATEGORIAS),
        obtenerTodos(API_INSTITUCIONES)
      ]);

      setCategorias(listaCategorias);
      setInstituciones(listaInstituciones);

    } catch (err) {
      setError(err.message);
    }
  }

  // GET /api/reportes/ con filtros, búsqueda, ordenamiento y página
  async function cargarReportes() {
    try {
      setCargando(true);

      const parametros = armarParametros({ ...filtros, page: pagina });
      const datos = await peticion(`${API_REPORTES}?${parametros}`);

      setReportes(datos.results);
      setTotal(datos.count);

    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  // Nombre de la categoría a partir de su id
  function nombreCategoria(id) {
    const categoria = categorias.find((c) => c.id === Number(id));

    return categoria ? categoria.nombre : `Categoría ${id}`;
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

  // Envía los filtros combinados al backend
  function aplicarFiltros(e) {
    e.preventDefault();
    setPagina(1);
    setFiltros(filtrosForm);
  }

  // Quita filtros, búsqueda y orden
  function limpiarFiltros() {
    setPagina(1);
    setFiltrosForm(filtrosIniciales);
    setFiltros(filtrosIniciales);
  }

  // Precarga el reporte en el formulario (operador o administrador)
  function editarReporte(reporte) {
    setEditandoId(reporte.id);
    setEstadoOriginal(reporte.estado);

    setFormulario({
      titulo: reporte.titulo,
      descripcion: reporte.descripcion,
      categoria: reporte.categoria,
      distrito: reporte.distrito,
      direccion: reporte.direccion,
      estado: reporte.estado
    });

    setError("");
    setMensaje("");
  }

  // Sale del modo edición
  function cancelarEdicion() {
    setEditandoId(null);
    setEstadoOriginal("");
    setFormulario(inicial);
  }

  // Validaciones previas iguales a las reglas del backend
  function validarFormulario() {
    if (!formulario.titulo.trim()) {
      return "El título es obligatorio.";
    }
    if (formulario.descripcion.trim().length < 10) {
      return "La descripción debe tener al menos 10 caracteres.";
    }
    if (!formulario.categoria) {
      return "Seleccione una categoría.";
    }
    if (!formulario.distrito.trim() || !formulario.direccion.trim()) {
      return "El distrito y la dirección son obligatorios.";
    }
    if (editandoId !== null && ESTADOS_CERRADOS.includes(estadoOriginal)) {
      return "El reporte está cerrado y no se puede modificar.";
    }
    return "";
  }

  // Ciudadano: POST para crear. Operador/admin: PATCH para editar o cambiar estado
  async function guardarReporte(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    const problema = validarFormulario();
    if (problema) {
      setError(problema);
      return;
    }

    setProcesando(true);

    try {
      const editando = editandoId !== null;

      // Datos comunes; el ciudadano lo asigna Django con el token
      const datos = {
        titulo: formulario.titulo,
        descripcion: formulario.descripcion,
        categoria: Number(formulario.categoria),
        distrito: formulario.distrito,
        direccion: formulario.direccion
      };

      // El estado solo se envía al editar
      if (editando) {
        datos.estado = formulario.estado;
      }

      await peticion(editando ? `${API_REPORTES}${editandoId}/` : API_REPORTES, {
        method: editando ? "PATCH" : "POST",
        body: JSON.stringify(datos)
      });

      cancelarEdicion();

      setMensaje(
        editando
          ? "Reporte actualizado correctamente"
          : "Reporte creado correctamente"
      );

      await cargarReportes();

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  // Solo administrador: DELETE /api/reportes/<id>/ (borra también seguimientos y apoyos)
  async function eliminarReporte(id) {
    if (!window.confirm("¿Eliminar reporte? También se eliminan sus seguimientos y apoyos.")) {
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      await peticion(`${API_REPORTES}${id}/`, {
        method: "DELETE"
      });

      if (editandoId === id) {
        cancelarEdicion();
      }

      setMensaje("Reporte eliminado correctamente");

      // Si se borró el último registro de la página, se regresa a la anterior
      if (reportes.length === 1 && pagina > 1) {
        setPagina(pagina - 1);
      } else {
        await cargarReportes();
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  // Al crear solo se ofrecen categorías activas (RN-04)
  const categoriasFormulario = editandoId
    ? categorias
    : categorias.filter((categoria) => categoria.activo);

  // El formulario aparece para crear (ciudadano) o cuando se está editando
  const mostrarFormulario = esCiudadano || editandoId !== null;

  return (
    <div>
      <h2>Reportes</h2>

      <Alertas error={error} mensaje={mensaje} />

      {mostrarFormulario && (
        <FormularioTarjeta
          titulo={editandoId ? `Editar reporte #${editandoId}` : "Crear reporte"}
          onGuardar={guardarReporte}
          onCancelar={cancelarEdicion}
          procesando={procesando}
          editando={editandoId !== null}
        >
          <label className="form-label" htmlFor="titulo">Título</label>
          <input
            id="titulo"
            className="form-control mb-2"
            name="titulo"
            maxLength="100"
            value={formulario.titulo}
            onChange={cambio}
            required
          />

          <label className="form-label" htmlFor="descripcion">Descripción (mínimo 10 caracteres)</label>
          <textarea
            id="descripcion"
            className="form-control mb-2"
            name="descripcion"
            maxLength="500"
            rows="3"
            value={formulario.descripcion}
            onChange={cambio}
            required
          />

          {/* Selector de la relación: categorías consultadas a la API */}
          <label className="form-label" htmlFor="categoria">Categoría</label>
          <select
            id="categoria"
            className="form-select mb-2"
            name="categoria"
            value={formulario.categoria}
            onChange={cambio}
            required
          >
            <option value="">Seleccione categoría</option>

            {categoriasFormulario.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre} (prioridad {categoria.prioridad_base})
              </option>
            ))}
          </select>

          <label className="form-label" htmlFor="distrito">Distrito</label>
          <input
            id="distrito"
            className="form-control mb-2"
            name="distrito"
            maxLength="80"
            value={formulario.distrito}
            onChange={cambio}
            required
          />

          <label className="form-label" htmlFor="direccion">Dirección (otras señas)</label>
          <input
            id="direccion"
            className="form-control mb-2"
            name="direccion"
            maxLength="200"
            value={formulario.direccion}
            onChange={cambio}
            required
          />

          {/* Cambio de estado: solo al editar y solo transiciones válidas */}
          {editandoId !== null && (
            <>
              <label className="form-label" htmlFor="estado">Estado</label>
              <select
                id="estado"
                className="form-select mb-3"
                name="estado"
                value={formulario.estado}
                onChange={cambio}
              >
                <option value={estadoOriginal}>{estadoOriginal} (actual)</option>

                {TRANSICIONES[estadoOriginal].map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </>
          )}

          {/* La prioridad la asigna el backend según la categoría */}
          {editandoId === null && (
            <p className="text-muted small">
              La prioridad se copia automáticamente de la categoría.
            </p>
          )}
        </FormularioTarjeta>
      )}

      {/* Filtros combinables, búsqueda y ordenamiento (todo lo resuelve el backend) */}
      <form className="row g-2 mb-3" onSubmit={aplicarFiltros}>
        <div className="col-sm-6 col-lg-4">
          <input
            className="form-control"
            name="buscar"
            placeholder="Buscar en título, descripción o dirección"
            value={filtrosForm.buscar}
            onChange={cambioFiltro}
          />
        </div>

        <div className="col-sm-6 col-lg-2">
          <select className="form-select" name="estado" value={filtrosForm.estado} onChange={cambioFiltro}>
            <option value="">Todos los estados</option>
            <option value="RECIBIDO">RECIBIDO</option>
            <option value="EN_PROCESO">EN_PROCESO</option>
            <option value="RESUELTO">RESUELTO</option>
            <option value="RECHAZADO">RECHAZADO</option>
          </select>
        </div>

        <div className="col-sm-6 col-lg-2">
          <select className="form-select" name="prioridad" value={filtrosForm.prioridad} onChange={cambioFiltro}>
            <option value="">Todas las prioridades</option>
            <option value="BAJA">BAJA</option>
            <option value="MEDIA">MEDIA</option>
            <option value="ALTA">ALTA</option>
          </select>
        </div>

        <div className="col-sm-6 col-lg-4">
          <select className="form-select" name="categoria" value={filtrosForm.categoria} onChange={cambioFiltro}>
            <option value="">Todas las categorías</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
            ))}
          </select>
        </div>

        <div className="col-sm-6 col-lg-3">
          <select className="form-select" name="institucion" value={filtrosForm.institucion} onChange={cambioFiltro}>
            <option value="">Todas las instituciones</option>
            {instituciones.map((institucion) => (
              <option key={institucion.id} value={institucion.id}>{institucion.siglas}</option>
            ))}
          </select>
        </div>

        <div className="col-sm-6 col-lg-3">
          <input
            className="form-control"
            name="distrito"
            placeholder="Distrito exacto"
            value={filtrosForm.distrito}
            onChange={cambioFiltro}
          />
        </div>

        <div className="col-sm-6 col-lg-3">
          <select className="form-select" name="ordering" value={filtrosForm.ordering} onChange={cambioFiltro}>
            <option value="-fecha_creacion">Más recientes</option>
            <option value="fecha_creacion">Más antiguos</option>
            <option value="titulo">Título A-Z</option>
            <option value="-titulo">Título Z-A</option>
          </select>
        </div>

        <div className="col-sm-6 col-lg-3 d-flex gap-2">
          <button className="btn btn-primary">Filtrar</button>
          <button type="button" className="btn btn-outline-secondary" onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>
      </form>

      <Tabla
        columnas={["#", "Título", "Categoría", "Distrito", "Estado", "Prioridad", "Ciudadano", "Fecha", "Acciones"]}
        cargando={cargando}
        vacio={reportes.length === 0}
      >
        {reportes.map((reporte) => (
          <tr key={reporte.id}>
            <td>{reporte.id}</td>
            <td>{reporte.titulo}</td>
            <td>{nombreCategoria(reporte.categoria)}</td>
            <td>{reporte.distrito}</td>
            <td>
              <span className={`badge bg-${COLORES_ESTADO[reporte.estado]}`}>
                {reporte.estado}
              </span>
            </td>
            <td>{reporte.prioridad}</td>
            <td>{reporte.ciudadano_username}</td>
            <td>{new Date(reporte.fecha_creacion).toLocaleString()}</td>
            <td className="text-nowrap">
              {/* Detalle con seguimientos y apoyos del reporte */}
              <Link to={`/reportes/${reporte.id}`} className="btn btn-info btn-sm me-2">
                Ver
              </Link>

              {puedeEditar && (
                <button
                  className="btn btn-warning btn-sm me-2"
                  onClick={() => editarReporte(reporte)}
                  disabled={procesando}
                >
                  Editar
                </button>
              )}

              {esAdmin && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => eliminarReporte(reporte.id)}
                  disabled={procesando}
                >
                  Eliminar
                </button>
              )}
            </td>
          </tr>
        ))}
      </Tabla>

      <Paginacion pagina={pagina} total={total} onCambiar={setPagina} />
    </div>
  );
}
