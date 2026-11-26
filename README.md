# Reporte ciudadano

API REST hecha con Django y Django REST Framework para que los ciudadanos reporten problemas de su comunidad, como falta de luz, daños en carreteras o problemas de agua, y las instituciones les den seguimiento. Usa MySQL, autenticación por token y permisos. Se prueba con Postman y, desde el Proyecto 2, con la interfaz web en React de la carpeta `frontend`.

## Requisito

- Python 3.12 o superior
- MySQL y MySQL Workbench
- Postman
- Node.js (versión LTS) y npm (Proyecto 2)

## Instalacion

En la carpeta donde está `manage.py`:

```
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env
```

## Creacion de la base de datos

En MySQL Workbench:

```sql
CREATE DATABASE reporteciudadano_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'reporteciudadano_user'@'localhost' IDENTIFIED BY 'su_clave';
GRANT ALL PRIVILEGES ON reporteciudadano_db.* TO 'reporteciudadano_user'@'localhost';
FLUSH PRIVILEGES;
```

Luego, en el archivo `.env`, escribir en `DB_PASSWORD` la misma clave usada en MySQL.

# Migraciobes

```
python manage.py migrate
python manage.py loaddata datos_iniciales.json
```

`loaddata` carga datos de prueba: instituciones, categorías, reportes, los grupos Ciudadanos y Operadores, y los usuarios de prueba.

## Superusuario

Los datos de prueba ya incluyen el superusuario `admin` con contraseña `admin123`. Si no se cargan los datos, se crea con:

```
python manage.py createsuperuser
```

Otros usuarios de prueba: `operador1` (Operador2026!) y `ciudadano1`, `ciudadano2`, `ciudadano3` (Ciudadano2026!).

## Ejecucion

```
python manage.py runserver
```

El token se obtiene con `POST /api/token/` enviando usuario y contraseña, y se usa en el header `Authorization: Token <valor>`.

La colección de Postman está en la carpeta `postman` y el documento técnico, con los endpoints, en la carpeta `docs`.

## Pruebas

```
python manage.py test --settings=reporteciudadano_backend.test_settings
```

## Limitaciones

- No permite subir fotos en los reportes.
- La ubicación se escribe como texto, sin mapa.
- No envía notificaciones al ciudadano cuando cambia el estado de su reporte.
- El token no se revoca en el servidor: al cerrar sesión en React solo se borra del navegador (`localStorage`); el backend no tiene endpoint de logout.

# Proyecto 2: Frontend React

Aplicación SPA hecha con React (Vite), React Router y Bootstrap 5 en la carpeta `frontend`. Consume esta misma API.

## Ejecucion del frontend

Con Django ya ejecutándose (`python manage.py runserver`), en otra terminal:

```
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Abrir `http://localhost:5173`. El `.env` del frontend solo tiene la URL base de la API:

```
VITE_API_URL=http://127.0.0.1:8000
```

## Configuracion CORS

React (puerto 5173) y Django (puerto 8000) están en orígenes distintos. Para el Proyecto 2 se agregó `django-cors-headers` (en `requirements.txt`) y en `settings.py`: `'corsheaders'` en `INSTALLED_APPS`, `CorsMiddleware` antes de `CommonMiddleware` y:

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
```

## Usuarios de prueba (ficticios)

| Usuario | Contraseña | Perfil |
|---|---|---|
| admin | admin123 | Administrador |
| operador1 | Operador2026! | Operador |
| ciudadano1, ciudadano2, ciudadano3 | Ciudadano2026! | Ciudadano |

## Documentacion del frontend

En `docs/DOCUMENTO_FRONTEND.md` están el inventario de endpoints, los ajustes al backend, la matriz de pantallas y endpoints, la matriz de perfiles y los escenarios de prueba manuales. Las capturas están en `docs/capturas`.
