
// Tabla Bootstrap reutilizable con estado de carga y estado vacío
export default function Tabla({ columnas, cargando, vacio, children }) {
  // Estado de carga: mientras llega la respuesta de la API
  if (cargando) {
    return (
      <div className="text-center my-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  // Estado vacío: la API respondió sin registros
  if (vacio) {
    return (
      <div className="alert alert-secondary">
        No hay registros para mostrar.
      </div>
    );
  }

  return (
    // table-responsive: permite desplazar la tabla en pantallas pequeñas
    <div className="table-responsive">
      <table className="table table-striped table-bordered align-middle">
        <thead>
          <tr>
            {columnas.map((columna) => (
              <th key={columna}>{columna}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}
