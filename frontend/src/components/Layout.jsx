
import Menu from "./Menu";

// Estructura común de las pantallas privadas: menú arriba y contenido del módulo abajo
export default function Layout({ perfil, onSalir, children }) {
  return (
    <>
      <Menu perfil={perfil} onSalir={onSalir} />

      {/* Área principal: aquí se muestra la página de la ruta actual */}
      <main className="container mt-4 mb-5">
        {children}
      </main>
    </>
  );
}
