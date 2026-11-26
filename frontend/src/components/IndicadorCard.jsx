
// Tarjeta de un indicador del dashboard (título y valor obtenido de la API)
export default function IndicadorCard({ titulo, valor, color }) {
  return (
    <div className="col-12 col-md-4">
      <div className={`card h-100 shadow-sm border-${color}`}>
        <div className="card-body text-center">
          <p className="card-text mb-1">{titulo}</p>
          <h3 className={`text-${color}`}>{valor}</h3>
        </div>
      </div>
    </div>
  );
}
