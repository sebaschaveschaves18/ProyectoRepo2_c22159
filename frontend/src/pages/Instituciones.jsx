
import { useEffect, useState } from "react";
import Alertas from "../components/Alertas";
import FormularioTarjeta from "../components/FormularioTarjeta";
import Paginacion from "../components/Paginacion";
import Tabla from "../components/Tabla";
import { armarParametros, peticion } from "../services/api";

// Ruta del módulo en la API
const API_INSTITUCIONES = "/api/instituciones/";

// Valores vacíos del formulario
const inicial = {
  nombre: "",
  siglas: "",
  telefono: "",
  email: "",
  activo: true
};

// Filtros vacíos (?activo= y ?ordering=)
const filtrosIniciales = {
  activo: "",
  ordering: ""
};

// Módulo 1: Instituciones (CRUD completo, solo el administrador modifica)
export default function Instituciones({ perfil }) {
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

  // Se vuelve a consultar cuando cambia la página o los filtros aplicados
  useEffect(() => {
    cargarInstituciones();
  }, [pagina, filtros]);

  // GET /api/instituciones/?activo=&ordering=&page=
  async function cargarInstituciones() {
    try {
      setCargando(true);

      const parametros = armarParametros({ ...filtros, page: pagina });
      const datos = await peticion(`${API_INSTITUCIONES}?${parametros}`);

      setInstituciones(datos.results);
      setTotal(datos.count);

    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
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

  // Aplica los filtros en el backend y vuelve a la página 1
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

  // Carga la institución seleccionada en el formulario para editarla
  function editarInstitucion(institucion) {
    setEditandoId(institucion.id);

    setFormulario({
      nombre: institucion.nombre,
      siglas: institucion.siglas,
      telefono: institucion.telefono,
      email: institucion.email || "",
      activo: institucion.activo
    });

    setError("");
    setMensaje("");
  }

  // Sale del modo edición y limpia el formulario
  function cancelarEdicion() {
    setEditandoId(null);
    setFormulario(inicial);
  }

  // Crea (POST) o actualiza (PATCH) según si se está editando
  async function guardarInstitucion(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    // Validación previa (el backend vuelve a validar)
    if (!formulario.nombre.trim() || !formulario.siglas.trim() || !formulario.telefono.trim()) {
      setError("Nombre, siglas y teléfono son obligatorios.");
      return;
    }

    setProcesando(true);

    try {
      const editando = editandoId !== null;

      const url = editando
        ? `${API_INSTITUCIONES}${editandoId}/`
        : API_INSTITUCIONES;

      await peticion(url, {
        method: editando ? "PATCH" : "POST",
        body: JSON.stringify(formulario)
      });

      cancelarEdicion();

      setMensaje(
        editando
          ? "Institución actualizada correctamente"
          : "Institución creada correctamente"
      );

      // Se refresca la tabla con los datos de la base de datos
      await cargarInstituciones();

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  // DELETE /api/instituciones/<id>/ (409 si tiene categorías asociadas)
  async function eliminarInstitucion(id) {
    if (!window.confirm("¿Eliminar institución?")) {
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      await peticion(`${API_INSTITUCIONES}${id}/`, {
        method: "DELETE"
      });

      if (editandoId === id) {
        cancelarEdicion();
      }

      setMensaje("Institución eliminada correctamente");

      // Si se borró el último registro de la página, se regresa a la anterior
      if (instituciones.length === 1 && pagina > 1) {
        setPagina(pagina - 1);
      } else {
        await cargarInstituciones();
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div>
      <h2>Instituciones</h2>

      <Alertas error={error} mensaje={mensaje} />

      {/* Formulario visible solo para el administrador */}
      {esAdmin ? (
        <FormularioTarjeta
          titulo={editandoId ? "Editar institución" : "Crear institución"}
          onGuardar={guardarInstitucion}
          onCancelar={cancelarEdicion}
          procesando={procesando}
          editando={editandoId !== null}
        >
          <label className="form-label" htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            className="form-control mb-2"
            name="nombre"
            maxLength="100"
            value={formulario.nombre}
            onChange={cambio}
            required
          />

          <label className="form-label" htmlFor="siglas">Siglas</label>
          <input
            id="siglas"
            className="form-control mb-2"
            name="siglas"
            maxLength="15"
            value={formulario.siglas}
            onChange={cambio}
            required
          />

          <label className="form-label" htmlFor="telefono">Teléfono</label>
          <input
            id="telefono"
            type="tel"
            className="form-control mb-2"
            name="telefono"
            maxLength="20"
            value={formulario.telefono}
            onChange={cambio}
            required
          />

          <label className="form-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="form-control mb-2"
            name="email"
            value={formulario.email}
            onChange={cambio}
          />

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
          Solo el administrador puede crear, editar o eliminar instituciones.
        </div>
      )}

      {/* Filtro por estado y ordenamiento (los aplica el backend) */}
      <form className="row g-2 mb-3" onSubmit={aplicarFiltros}>
        <div className="col-sm-4">
          <select
            className="form-select"
            name="activo"
            value={filtrosForm.activo}
            onChange={cambioFiltro}
          >
            <option value="">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </div>

        <div className="col-sm-4">
          <select
            className="form-select"
            name="ordering"
            value={filtrosForm.ordering}
            onChange={cambioFiltro}
          >
            <option value="">Orden por id</option>
            <option value="nombre">Nombre A-Z</option>
            <option value="-nombre">Nombre Z-A</option>
          </select>
        </div>

        <div className="col-sm-4 d-flex gap-2">
          <button className="btn btn-primary">Filtrar</button>
          <button type="button" className="btn btn-outline-secondary" onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>
      </form>

      <Tabla
        columnas={["Siglas", "Nombre", "Teléfono", "Email", "Activa", "Acciones"]}
        cargando={cargando}
        vacio={instituciones.length === 0}
      >
        {instituciones.map((institucion) => (
          <tr key={institucion.id}>
            <td>{institucion.siglas}</td>
            <td>{institucion.nombre}</td>
            <td>{institucion.telefono}</td>
            <td>{institucion.email || "Sin indicar"}</td>
            <td>{institucion.activo ? "Sí" : "No"}</td>
            <td className="text-nowrap">
              {esAdmin ? (
                <>
                  <button
                    className="btn btn-warning btn-sm me-2"
                    onClick={() => editarInstitucion(institucion)}
                    disabled={procesando}
                  >
                    Editar
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => eliminarInstitucion(institucion.id)}
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
