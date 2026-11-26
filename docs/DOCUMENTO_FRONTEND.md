# Documento del frontend - Reporte Ciudadano (Proyecto 2)

Aplicación SPA hecha con React (Vite), React Router y Bootstrap 5 que consume la API REST del Proyecto 1. Se mantiene el mismo dominio, los cinco módulos, las reglas de negocio y los tres perfiles: Administrador, Operador y Ciudadano.

## 1. Inventario de endpoints usados

Todos los endpoints responden JSON. Los listados paginados devuelven `count`, `next`, `previous` y `results`, con 5 registros por página.

| Ruta | Método | Autenticación | Permiso | Parámetros | Códigos |
|---|---|---|---|---|---|
| `/api/token/` | POST | No | Público | `username`, `password` | 200, 400 |
| `/api/perfil/` | GET | Token | Autenticado | No aplica | 200, 401 |
| `/api/instituciones/` | GET | No | Público | `activo`, `ordering`, `page` | 200, 400 |
| `/api/instituciones/` | POST | Token | Administrador | `nombre`, `siglas`, `telefono`, `email`, `activo` | 201, 400, 401, 403 |
| `/api/instituciones/<id>/` | GET / PATCH / DELETE | Token para cambios | Administrador para cambios | No aplica | 200, 204, 400, 401, 403, 404, 409 |
| `/api/categorias/` | GET | No | Público | `institucion`, `prioridad`, `activo`, `page` | 200, 400 |
| `/api/categorias/` | POST | Token | Administrador | `nombre`, `descripcion`, `institucion`, `prioridad_base`, `activo` | 201, 400, 401, 403 |
| `/api/categorias/<id>/` | GET / PATCH / DELETE | Token para cambios | Administrador para cambios | No aplica | 200, 204, 400, 401, 403, 404, 409 |
| `/api/reportes/` | GET | Token | Autenticado | `estado`, `prioridad`, `distrito`, `categoria`, `institucion`, `buscar`, `ordering`, `page` | 200, 400, 401 |
| `/api/reportes/` | POST | Token | Ciudadano | `titulo`, `descripcion`, `categoria`, `distrito`, `direccion` | 201, 400, 401, 403 |
| `/api/reportes/<id>/` | PATCH | Token | Operador o administrador | campos del reporte y `estado` | 200, 400, 401, 403, 404 |
| `/api/reportes/<id>/` | DELETE | Token | Administrador | No aplica | 204, 401, 403, 404 |
| `/api/reportes/<id>/historial/` | GET | Token | Autenticado | No aplica | 200, 401, 404 |
| `/api/reportes/estadisticas/` | GET | Token | Administrador | No aplica | 200, 401, 403 |
| `/api/seguimientos/` | GET / POST | Token | GET autenticado, POST operador | `reporte`, `tipo`, `page` / `reporte`, `tipo`, `comentario` | 200, 201, 400, 401, 403 |
| `/api/seguimientos/<id>/` | PATCH / DELETE | Token | PATCH operador, DELETE administrador | `tipo`, `comentario` | 200, 204, 400, 401, 403, 404 |
| `/api/apoyos/` | GET / POST | Token | GET autenticado, POST ciudadano | `reporte` / `reporte` | 200, 201, 400, 401, 403, 409 |
| `/api/apoyos/<id>/` | DELETE | Token | El dueño del apoyo o el administrador | No aplica | 204, 401, 403, 404 |

## 2. Ampliaciones al backend

| Cambio | Archivo | Justificación |
|---|---|---|
| `django-cors-headers` con `CORS_ALLOWED_ORIGINS` para `localhost:5173` y `127.0.0.1:5173` | `requirements.txt`, `settings.py` | Sin CORS el navegador bloquea las solicitudes de React (puerto 5173) a Django (puerto 8000). |
| Campo de solo lectura `ciudadano_username` en `ReporteSerializer` y `ApoyoSerializer` | `reportes/serializers.py`, `apoyos/serializers.py` | La API solo devolvía el id del usuario y no existe un endpoint de usuarios; la interfaz necesita mostrar quién creó el reporte o el apoyo. |
| Campo de solo lectura `operador_username` en `SeguimientoSerializer` | `seguimientos/serializers.py` | Mostrar qué operador registró el avance. |

Los campos agregados son `read_only`, así que no cambian ninguna validación, regla de negocio ni permiso. Las 36 pruebas automatizadas del Proyecto 1 siguen pasando.

## 3. Pantallas y flujos

| Ruta React | Pantalla | Descripción |
|---|---|---|
| `/login` | Login | Usuario y contraseña; obtiene el token real de Django. |
| `/dashboard` | Inicio | Tres indicadores calculados con `count` de la API (reportes totales, en proceso y resueltos), accesos a los cinco módulos y botón de estadísticas generales. |
| `/instituciones` | Instituciones | Tabla con filtro por estado, ordenamiento y paginación; CRUD para el administrador. |
| `/categorias` | Categorías | Tabla con filtros combinables y paginación; CRUD para el administrador con selector de institución. |
| `/reportes` | Reportes | Tabla con búsqueda, filtros combinables, ordenamiento y paginación. El ciudadano crea, el operador o el administrador edita y cambia el estado, y el administrador elimina. |
| `/reportes/:id` | Detalle del reporte | Reporte con su categoría, apoyos y seguimientos (historial). |
| `/seguimientos` | Seguimientos | Filtros por reporte y tipo, con paginación. El operador registra y edita; el administrador elimina. |
| `/apoyos` | Apoyos | Filtro por reporte. El ciudadano apoya y elimina su apoyo; el administrador elimina. |

Flujos entre módulos:

- **Institución → Categoría:** el formulario de categoría tiene un selector con las instituciones consultadas a la API.
- **Categoría → Reporte:** el formulario de reporte tiene un selector con las categorías activas, y la prioridad se copia de la categoría.
- **Seguimiento → Reporte:** registrar el primer seguimiento cambia el reporte de RECIBIDO a EN_PROCESO.
- **Apoyo → Reporte:** con 3 apoyos el reporte sube a prioridad ALTA.
- **Reporte → Historial:** la vista de detalle muestra los seguimientos y el total de apoyos.

## 4. Matriz de pantallas y endpoints

| Pantalla | Acción en la interfaz | Función React | Método y ruta |
|---|---|---|---|
| Login | Iniciar sesión | `iniciarSesionAPI` | POST `/api/token/` |
| Layout | Mostrar usuario y rol | `consultarPerfil` | GET `/api/perfil/` |
| Layout | Cerrar sesión | `salir` → `cerrarSesion` | Ninguna; borra el token local |
| Inicio | Indicadores | `cargarIndicadores` | GET `/api/reportes/`, `/api/reportes/?estado=EN_PROCESO`, `/api/reportes/?estado=RESUELTO` |
| Inicio | Ver estadísticas | `cargarEstadisticas` | GET `/api/reportes/estadisticas/` |
| Instituciones | Listar, filtrar, ordenar, paginar | `cargarInstituciones` | GET `/api/instituciones/?activo=&ordering=&page=` |
| Instituciones | Crear / Editar / Eliminar | `guardarInstitucion` / `eliminarInstitucion` | POST `/api/instituciones/` · PATCH y DELETE `/api/instituciones/<id>/` |
| Categorías | Listar, filtrar, paginar | `cargarCategorias` | GET `/api/categorias/?institucion=&prioridad=&activo=&page=` |
| Categorías | Selector de institución | `cargarInstituciones` → `obtenerTodos` | GET `/api/instituciones/?page=n` |
| Categorías | Crear / Editar / Eliminar | `guardarCategoria` / `eliminarCategoria` | POST `/api/categorias/` · PATCH y DELETE `/api/categorias/<id>/` |
| Reportes | Listar, buscar, filtrar, ordenar, paginar | `cargarReportes` | GET `/api/reportes/?buscar=&estado=&prioridad=&categoria=&institucion=&distrito=&ordering=&page=` |
| Reportes | Crear (ciudadano) | `guardarReporte` | POST `/api/reportes/` |
| Reportes | Editar o cambiar estado (operador o administrador) | `guardarReporte` | PATCH `/api/reportes/<id>/` |
| Reportes | Eliminar (administrador) | `eliminarReporte` | DELETE `/api/reportes/<id>/` |
| Detalle del reporte | Ver historial | `cargarHistorial` | GET `/api/reportes/<id>/historial/` y `/api/categorias/<id>/` |
| Seguimientos | Listar, filtrar, paginar | `cargarSeguimientos` | GET `/api/seguimientos/?reporte=&tipo=&page=` |
| Seguimientos | Registrar / Editar / Eliminar | `guardarSeguimiento` / `eliminarSeguimiento` | POST `/api/seguimientos/` · PATCH y DELETE `/api/seguimientos/<id>/` |
| Apoyos | Listar y filtrar | `cargarApoyos` | GET `/api/apoyos/?reporte=` |
| Apoyos | Apoyar / Eliminar | `apoyarReporte` / `eliminarApoyo` | POST `/api/apoyos/` · DELETE `/api/apoyos/<id>/` |

**CRUD completo** en Instituciones, Categorías, Reportes y Seguimientos.

**Apoyos** no tiene editar (PUT/PATCH), porque un apoyo no tiene datos que cambiar: solo se crea, se consulta y se elimina, igual que en el Proyecto 1.

## 5. Matriz de perfiles y permisos

La columna "Interfaz" indica lo que muestra React. La autorización real siempre la hace Django; esconder un botón no protege nada.

| Acción | Administrador | Operador | Ciudadano | Interfaz |
|---|---|---|---|---|
| Ver instituciones y categorías | Sí | Sí | Sí | Tabla para todos |
| Crear, editar o eliminar instituciones y categorías | Sí | No (403) | No (403) | Formulario y botones solo para el administrador |
| Ver reportes, detalle y seguimientos | Sí | Sí | Sí | Para todos |
| Crear reporte | No (403) | No (403) | Sí | Formulario solo para el ciudadano |
| Editar reporte o cambiar su estado | Sí | Sí | No (403) | Botón Editar para el operador y el administrador |
| Eliminar reporte | Sí | No (403) | No (403) | Botón Eliminar solo para el administrador |
| Registrar o editar seguimiento | Sí | Sí | No (403) | Formulario para el operador y el administrador |
| Eliminar seguimiento | Sí | No (403) | No (403) | Botón solo para el administrador |
| Apoyar reporte | No (403) | No (403) | Sí | Formulario solo para el ciudadano |
| Eliminar apoyo | Sí | No (403) | Solo el suyo | Botón en sus propios apoyos o para el administrador |
| Ver estadísticas | Sí | No (403) | No (403) | El botón se muestra a todos y Django responde 403 a los que no son administradores |
| Cualquier ruta privada sin sesión | No aplica | No aplica | No aplica | Redirige a `/login`; la API responde 401 |

## 6. Autenticación y manejo de errores

- **Login:** `POST /api/token/` devuelve el token, que se guarda en `localStorage` (`services/api.js`). Después se consulta `/api/perfil/` para saber el rol.
- **Token en cada solicitud:** la función `peticion` lo agrega en el encabezado `Authorization: Token <token>`.
- **Estado compartido:** `App.jsx` guarda el token y el perfil y los pasa a las páginas.
- **Rutas protegidas:** `RutaProtegida` redirige al login si no hay token.
- **Logout:** borra el token del navegador y redirige a `/login`. **El token no se revoca en el servidor**, porque el backend no tiene un endpoint para eso; sigue siendo válido en Django.

Mensajes de error que muestra la función `peticion`:

| Caso | Mensaje |
|---|---|
| 400 | `(400) Revise los datos: campo: mensaje del backend` |
| 401 | Cierra la sesión local y muestra `(401) Sesión no válida o expirada`, con un enlace al login |
| 403 | `(403) No tiene permiso para realizar esta acción` |
| 404 | `(404) Reporte no encontrado.` (u otro recurso) |
| 409 | `(409) Conflicto: …` (apoyo repetido o eliminación con registros asociados) |
| Falla de red | `No se pudo conectar con el servidor. Revise que Django esté encendido.` |

- **Confirmación:** toda eliminación pide confirmación con `window.confirm`.
- **Éxito:** se muestra una alerta verde y la tabla se recarga desde la API.
- **Validaciones previas:** el frontend revisa campos obligatorios, descripción de al menos 10 caracteres, comentario de al menos 5, institución inactiva, reporte cerrado y apoyo al propio reporte. Las reglas siempre se vuelven a validar en Django.

## 7. Escenarios de prueba manuales

Ejecutados con Django, MySQL y los datos de `datos_iniciales.json`.

| # | Escenario | Pasos | Resultado esperado | Resultado | Captura |
|---|---|---|---|---|---|
| 1 | Login y logout | admin con una contraseña incorrecta; luego admin / admin123; luego Cerrar sesión | Mensaje "Usuario o contraseña incorrectos."; entra al dashboard con 3 indicadores; al salir vuelve a `/login` y el token se borra de `localStorage` | Cumple | 01, 02 |
| 2 | Navegación | Clic en cada opción del menú | Cambia el módulo sin recargar la página | Cumple | 02 a 08 |
| 3 | CRUD de instituciones | Como admin: crear "Cruz Roja Costarricense", editarla (valores precargados) y eliminarla | POST 201, PATCH 200 y DELETE 204, con mensaje de éxito y tabla actualizada | Cumple | 03 |
| 4 | CRUD de categorías | Como admin: crear "Árbol caído" eligiendo la institución en el selector, editar la prioridad y eliminarla | POST 201, PATCH 200 y DELETE 204 | Cumple | 04 |
| 5 | CRUD de reportes | ciudadano1 crea "Tubo roto frente a la escuela"; operador1 lo edita y lo pasa a EN_PROCESO; admin lo elimina | POST 201 con prioridad copiada de la categoría, PATCH 200 y DELETE 204 | Cumple | 05 |
| 6 | CRUD de seguimientos | operador1 registra una INSPECCION en "Lámparas apagadas" y la edita; admin la elimina | POST 201 y el reporte pasa de RECIBIDO a EN_PROCESO; PATCH 200; DELETE 204 | Cumple | 06 |
| 7 | Apoyos y conflicto | ciudadano2 apoya "No llega agua", lo intenta apoyar otra vez y luego elimina su apoyo | 201; `(409) Conflicto: Ya apoyó este reporte.`; 204 | Cumple | 07 |
| 8 | Búsqueda, filtros y orden | operador1 busca "hueco" en reportes; filtra EN_PROCESO + ALTA ordenado por título; en categorías filtra MOPT + Activas | 2 resultados; 2 resultados ordenados; 2 categorías, todo calculado por el backend | Cumple | No |
| 9 | Paginación | Botón Siguiente en reportes y en categorías | Muestra "Página 2 de 2" con los registros siguientes | Cumple | No |
| 10 | Validación | ciudadano1 crea un reporte con la descripción "corta"; luego lo corrige, en la misma categoría y distrito de un reporte suyo abierto | Mensaje del frontend (mínimo 10 caracteres); luego `(400) Revise los datos: categoria: Ya tiene un reporte abierto…` (RN-05) | Cumple | 08 |
| 11 | Sin autenticación (401) | Sin sesión abrir `/reportes`; con sesión cambiar el token de `localStorage` por "tokenfalso123" y navegar | Redirige a `/login`; `(401) Sesión no válida o expirada…` con enlace al login | Cumple | No |
| 12 | Sin permisos (403) | ciudadano2 pulsa "Ver estadísticas" en Inicio | `(403) No tiene permiso para realizar esta acción.` | Cumple | No |

## 8. Capturas

Están en `docs/capturas/`:

| Archivo | Contenido |
|---|---|
| `01_login.png` | Pantalla de login |
| `02_dashboard.png` | Dashboard con indicadores y accesos a los módulos |
| `03_instituciones.png` | Módulo Instituciones con el formulario de edición precargado |
| `04_categorias.png` | Módulo Categorías con el formulario y el selector de institución |
| `05_reportes.png` | Módulo Reportes con el formulario de creación |
| `06_seguimientos.png` | Módulo Seguimientos |
| `07_apoyos.png` | Módulo Apoyos con el conflicto 409 |
| `08_error_validacion.png` | Error de validación de una regla de negocio (400) |
