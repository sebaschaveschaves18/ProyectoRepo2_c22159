
// Tarjeta con formulario reutilizable: título, campos (children) y botones Guardar/Cancelar
export default function FormularioTarjeta({
  titulo,
  onGuardar,
  onCancelar,
  procesando,
  editando,
  children
}) {
  return (
    <div className="card p-3 mb-4">
      <h4>{titulo}</h4>

      <form onSubmit={onGuardar}>
        {/* Campos propios de cada módulo */}
        {children}

        <button
          className="btn btn-primary"
          disabled={procesando}
        >
          {procesando
            ? "Procesando..."
            : editando
              ? "Actualizar"
              : "Guardar"}
        </button>

        {/* Cancelar solo aparece cuando se está editando */}
        {editando && (
          <button
            type="button"
            className="btn btn-secondary ms-2"
            onClick={onCancelar}
          >
            Cancelar
          </button>
        )}
      </form>
    </div>
  );
}
