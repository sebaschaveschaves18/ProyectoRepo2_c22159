// URL base de la API: se toma del .env (VITE_API_URL) y si no existe usa la local
export const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Nombre con el que se guarda el token en el navegador
const TOKEN_KEY = "reporteciudadano_token";

// Guarda el token después del login
export function guardarToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Devuelve el token guardado (o null si no hay sesión)
export function obtenerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Cierra la sesión local: borra el token del navegador
// (el token NO se revoca en Django, sigue existiendo en la tabla authtoken)
export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
}

// Login: envía usuario y contraseña a /api/token/ y devuelve el token
export async function iniciarSesionAPI(username, password) {
  let respuesta;

  try {
    respuesta = await fetch(`${API_URL}/api/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });
  } catch {
    // fetch falla cuando Django está apagado o no hay red
    throw new Error("No se pudo conectar con el servidor.");
  }

  // Django responde 400 si las credenciales son incorrectas
  if (!respuesta.ok) {
    throw new Error("Usuario o contraseña incorrectos.");
  }

  const datos = await respuesta.json();

  if (!datos.token) {
    throw new Error("El backend no devolvió un token.");
  }

  return datos.token;
}

// Convierte el JSON de error de Django en un texto entendible
// ej: {"descripcion": ["Mínimo 10 caracteres"]} -> "descripcion: Mínimo 10 caracteres"
function textoError(datos) {
  if (!datos) return "";
  if (typeof datos === "string") return datos;
  if (datos.detail) return datos.detail;
  if (datos.error) return datos.error;

  return Object.entries(datos)
    .map(([campo, mensajes]) =>
      `${campo}: ${Array.isArray(mensajes) ? mensajes.join(" ") : mensajes}`
    )
    .join(" | ");
}

// Función central para todas las llamadas HTTP a la API:
// arma la URL, agrega el token y traduce los códigos de error
export async function peticion(ruta, opciones = {}) {
  const token = obtenerToken();

  const headers = {
    "Content-Type": "application/json"
  };

  // Si hay sesión se envía el encabezado Authorization: Token <token>
  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  let respuesta;

  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers
    });
  } catch {
    // Error de red: Django apagado, URL incorrecta o CORS
    throw new Error(
      "No se pudo conectar con el servidor. Revise que Django esté encendido."
    );
  }

  // 204: se eliminó correctamente y no hay cuerpo
  if (respuesta.status === 204) {
    return null;
  }

  // Se intenta leer el JSON (algunas respuestas pueden no traerlo)
  const datos = await respuesta.json().catch(() => null);

  // 200 o 201: todo bien
  if (respuesta.ok) {
    return datos;
  }

  // 401: no hay token válido -> se cierra la sesión local
  if (respuesta.status === 401) {
    cerrarSesion();
    throw new Error(
      "(401) Sesión no válida o expirada. Inicie sesión nuevamente."
    );
  }

  // 403: autenticado pero sin permiso para la operación
  if (respuesta.status === 403) {
    throw new Error(
      `(403) No tiene permiso para realizar esta acción. ${textoError(datos)}`
    );
  }

  // 404: el registro no existe
  if (respuesta.status === 404) {
    throw new Error(`(404) ${textoError(datos) || "Recurso no encontrado."}`);
  }

  // 409: conflicto con datos existentes (duplicado o registros asociados)
  if (respuesta.status === 409) {
    throw new Error(`(409) Conflicto: ${textoError(datos)}`);
  }

  // 400: el backend rechazó los datos por una regla de negocio
  if (respuesta.status === 400) {
    throw new Error(`(400) Revise los datos: ${textoError(datos)}`);
  }

  // Cualquier otro error (500, etc.)
  throw new Error(`Error HTTP ${respuesta.status}`);
}

// Arma los parámetros de consulta (?estado=...&page=...) sin incluir los vacíos
export function armarParametros(objeto) {
  const parametros = new URLSearchParams();

  Object.entries(objeto).forEach(([clave, valor]) => {
    if (valor !== "" && valor !== null && valor !== undefined) {
      parametros.append(clave, valor);
    }
  });

  return parametros.toString();
}

// Recorre todas las páginas de un listado paginado y junta los resultados
// (se usa para llenar los selectores de relaciones)
export async function obtenerTodos(ruta) {
  let todos = [];
  let pagina = 1;
  let continuar = true;

  while (continuar) {
    const separador = ruta.includes("?") ? "&" : "?";
    const datos = await peticion(`${ruta}${separador}page=${pagina}`);

    // Si la API devuelve un arreglo no está paginada
    if (Array.isArray(datos)) {
      return datos;
    }

    todos = [...todos, ...datos.results];
    continuar = Boolean(datos.next);
    pagina++;
  }

  return todos;
}

// Consulta los datos y el rol del usuario autenticado
export async function consultarPerfil() {
  return peticion("/api/perfil/");
}
