
// Tamaño de página definido en el backend (PageNumberPagination page_size = 5)
const TAMANO_PAGINA = 5;

// Botones Anterior / Siguiente usando el total (count) que devuelve la API
export default function Paginacion({ pagina, total, onCambiar }) {
  // Cantidad de páginas según el total de registros
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));

  return (
    <div className="d-flex align-items-center gap-2 mb-4">
      <button
        className="btn btn-outline-secondary btn-sm"
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
      >
        Anterior
      </button>

      <span>
        Página {pagina} de {totalPaginas} ({total} registros)
      </span>

      <button
        className="btn btn-outline-secondary btn-sm"
        disabled={pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}
