
import { useEffect, useState } from "react";
import Alertas from "../components/Alertas";
import FormularioTarjeta from "../components/FormularioTarjeta";
import Paginacion from "../components/Paginacion";
import Tabla from "../components/Tabla";
import { armarParametros, obtenerTodos, peticion } from "../services/api";

// Rutas de la API que usa este módulo
const API_CATEGORIAS = "/api/categorias/";
const API_INSTITUCIONES = "/api/instituciones/";

// Valores vacíos del formulario
const inicial = {
  nombre: "",
  descripcion: "",
  institucion: "",
  prioridad_base: "MEDIA",
  activo: true
};

// Filtros combinables del backend: ?institucion=&prioridad=&activo=
const filtrosIniciales = {
  institucion: "",
  prioridad: "",
  activo: ""
};

// Módulo 2: Categorías (CRUD completo, relación con Institución)
export default function Categorias({ perfil }) {
  const [categorias, setCategorias] = useState([]);
  const [instituciones, setInstituciones] = useState([]);
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

  // Solo el administrador ve las acciones de crear, editar y eliminar
  const esAdmin = perfil?.rol === "Administrador";

  // Las instituciones se cargan una vez para el selector y los filtros
  useEffect(() => {
    cargarInstituciones();
  }, []);

  // El listado se recarga al cambiar la página o los filtros
  useEffect(() => {
    cargarCategorias();
  }, [pagina, filtros]);

  // Trae todas las instituciones (todas las páginas) para el selector
  async function cargarInstituciones() {
    try {
      setInstituciones(await obtenerTodos(API_INSTITUCIONES));
    } catch (err) {
      setError(err.message);
    }
  }

  // GET /api/categorias/?institucion=&prioridad=&activo=&page=
  async function cargarCategorias() {
    try {
      setCargando(true);

      const parametros = armarParametros({ ...filtros, page: pagina });
      const datos = await peticion(`${API_CATEGORIAS}?${parametros}`);

      setCategorias(datos.results);
      setTotal(datos.count);

    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  // Muestra las siglas de la institución a partir de su id
  function nombreInstitucion(id) {
    const institucion = instituciones.find((i) => i.id === Number(id));

    return institucion ? institucion.siglas : `Institución ${id}`;
  }

  // Actualiza el campo del formulario que cambió
  function cambio(e) {
    const { name, value, checked, type } = e.target;

    setFormulario({
      ...formulario,
      [name]: type === "checkbox" ? checked : value
    });
  }

  // Actualiza el campo de filtro que cambió
  function cambioFiltro(e) {
    setFiltrosForm({
      ...filtrosForm,
      [e.target.name]: e.target.value
    });
  }

  // Aplica los filtros combinados en el backend
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

  // Precarga la categoría en el formulario
  function editarCategoria(categoria) {
    setEditandoId(categoria.id);

    setFormulario({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || "",
      institucion: categoria.institucion,
      prioridad_base: categoria.prioridad_base,
      activo: categoria.activo
    });

    setError("");
    setMensaje("");
  }

  // Sale del modo edición
  function cancelarEdicion() {
    setEditandoId(null);
    setFormulario(inicial);
  }

  // POST (crear) o PATCH (editar) de la categoría
  async function guardarCategoria(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    // Validación previa: nombre y institución obligatorios
    if (!formulario.nombre.trim() || !formulario.institucion) {
      setError("El nombre y la institución son obligatorios.");
      return;
    }

    // Validación previa de RN-02: la institución debe estar activa
    const institucion = instituciones.find((i) => i.id === Number(formulario.institucion));
    if (institucion && !institucion.activo) {
      setError("No se puede asignar una institución inactiva.");
      return;
    }

    setProcesando(true);

    try {
      const editando = editandoId !== null;

      const url = editando
        ? `${API_CATEGORIAS}${editandoId}/`
        : API_CATEGORIAS;

      await peticion(url, {
        method: editando ? "PATCH" : "POST",
        body: JSON.stringify({
          ...formulario,
          institucion: Number(formulario.institucion)
        })
      });

      cancelarEdicion();

      setMensaje(
        editando
          ? "Categoría actualizada correctamente"
          : "Categoría creada correctamente"
      );

      await cargarCategorias();

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  // DELETE /api/categorias/<id>/ (409 si tiene reportes asociados)
  async function eliminarCategoria(id) {
    if (!window.confirm("¿Eliminar categoría?")) {
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      await peticion(`${API_CATEGORIAS}${id}/`, {
        method: "DELETE"
      });

      if (editandoId === id) {
        cancelarEdicion();
      }

      setMensaje("Categoría eliminada correctamente");

      // Si se borró el último registro de la página, se regresa a la anterior
      if (categorias.length === 1 && pagina > 1) {
        setPagina(pagina - 1);
      } else {
        await cargarCategorias();
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div>
      <h2>Categorías</h2>

      <Alertas error={error} mensaje={mensaje} />

      {esAdmin ? (
        <FormularioTarjeta
          titulo={editandoId ? "Editar categoría" : "Crear categoría"}
          onGuardar={guardarCategoria}
          onCancelar={cancelarEdicion}
          procesando={procesando}
          editando={editandoId !== null}
        >
          <label className="form-label" htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            className="form-control mb-2"
            name="nombre"
            maxLength="60"
            value={formulario.nombre}
            onChange={cambio}
            required
          />

          <label className="form-label" htmlFor="descripcion">Descripción</label>
          <input
            id="descripcion"
            className="form-control mb-2"
            name="descripcion"
            maxLength="200"
            value={formulario.descripcion}
            onChange={cambio}
          />

          {/* Selector de la relación: instituciones consultadas a la API */}
          <label className="form-label" htmlFor="institucion">Institución</label>
          <select
            id="institucion"
            className="form-select mb-2"
            name="institucion"
            value={formulario.institucion}
            onChange={cambio}
            required
          >
            <option value="">Seleccione institución</option>

            {instituciones.map((institucion) => (
              <option key={institucion.id} value={institucion.id}>
                {institucion.siglas} - {institucion.nombre}
                {!institucion.activo && " (inactiva)"}
              </option>
            ))}
          </select>

          <label className="form-label" htmlFor="prioridad_base">Prioridad base</label>
          <select
            id="prioridad_base"
            className="form-select mb-2"
            name="prioridad_base"
            value={formulario.prioridad_base}
            onChange={cambio}
          >
            <option value="BAJA">BAJA</option>
            <option value="MEDIA">MEDIA</option>
            <option value="ALTA">ALTA</option>
          </select>

          <div className="form-check mb-3">
            <input
              id="activo"
              type="checkbox"
              className="form-check-input"
              name="activo"
              checked={formulario.activo}
              onChange={cambio}
            />
            <label className="form-check-label" htmlFor="activo">
              Activa
            </label>
          </div>
        </FormularioTarjeta>
      ) : (
        <div className="alert alert-info">
          Solo el administrador puede crear, editar o eliminar categorías.
        </div>
      )}

      {/* Filtros combinables: institución + prioridad + estado */}
      <form className="row g-2 mb-3" onSubmit={aplicarFiltros}>
        <div className="col-sm-3">
          <select
            className="form-select"
            name="institucion"
            value={filtrosForm.institucion}
            onChange={cambioFiltro}
          >
            <option value="">Todas las instituciones</option>
            {instituciones.map((institucion) => (
              <option key={institucion.id} value={institucion.id}>
                {institucion.siglas}
              </option>
            ))}
          </select>
        </div>

        <div className="col-sm-3">
          <select
            className="form-select"
            name="prioridad"
            value={filtrosForm.prioridad}
            onChange={cambioFiltro}
          >
            <option value="">Todas las prioridades</option>
            <option value="BAJA">BAJA</option>
            <option value="MEDIA">MEDIA</option>
            <option value="ALTA">ALTA</option>
          </select>
        </div>

        <div className="col-sm-3">
          <select
            className="form-select"
            name="activo"
            value={filtrosForm.activo}
            onChange={cambioFiltro}
          >
            <option value="">Activas e inactivas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
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
        columnas={["Nombre", "Descripción", "Institución", "Prioridad base", "Activa", "Acciones"]}
        cargando={cargando}
        vacio={categorias.length === 0}
      >
        {categorias.map((categoria) => (
          <tr key={categoria.id}>
            <td>{categoria.nombre}</td>
            <td>{categoria.descripcion || "Sin descripción"}</td>
            <td>{nombreInstitucion(categoria.institucion)}</td>
            <td>{categoria.prioridad_base}</td>
            <td>{categoria.activo ? "Sí" : "No"}</td>
            <td className="text-nowrap">
              {esAdmin ? (
                <>
                  <button
                    className="btn btn-warning btn-sm me-2"
                    onClick={() => editarCategoria(categoria)}
                    disabled={procesando}
                  >
                    Editar
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => eliminarCategoria(categoria.id)}
                    disabled={procesando}
                  >
                    Eliminar
                  </button>
                </>
              ) : (
                "Solo consulta"
              )}
            </td>
          </tr>
        ))}
      </Tabla>

      <Paginacion pagina={pagina} total={total} onCambiar={setPagina} />
    </div>
  );
}
