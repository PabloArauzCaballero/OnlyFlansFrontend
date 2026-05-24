# Changelog frontend detallado

## Objetivo

Ajustar el frontend para que consuma el backend real sin modificarlo. El backend Express es la fuente de verdad para rutas, payloads, roles y estados.

## Cambios principales

### 1. Rutas corregidas

Se reemplazó la lógica basada en documentación antigua por rutas reales:

- Registro creador: `POST /api/auth/registro/creador`.
- Registro seguidor: `POST /api/auth/registro/seguidor`.
- Perfil creador: `/api/usuarios/perfiles-creadores`.
- Publicaciones: `/api/publicaciones`.
- Apoyos: `/api/apoyos`.
- Favoritos: `/api/usuarios/creadores-favoritos`.
- Seguidos: `/api/usuarios/creadores-seguidos`.

### 2. Autenticación más robusta

`AuthContext` ahora valida la sesión al recargar usando `GET /api/auth/me`. Esto permite trabajar con cookies HTTP-only del backend y también con el token devuelto en el body.

### 3. Cliente Axios centralizado

`src/services/api.js` ahora:

- Usa `VITE_API_URL`.
- Envía `withCredentials: true`.
- Agrega `Authorization: Bearer <token>` si existe access token local.
- Normaliza errores del backend, incluyendo errores de validación de Zod.
- Agrega `X-Request-Id` para trazabilidad con logs del backend.

### 4. Capa de dominio

`src/services/onlyflansApi.js` concentra todo el contrato con el backend y normaliza campos:

- `id_usuario` → `creatorId`, `followerId`.
- `nombre_publico` → `publicName`.
- `biografia` → `bio`.
- `fecha_publicacion` / `fecha_apoyo` → `createdAt`.
- `estado_registro` → `status`.

### 5. Favoritos y seguidos con reactivación

Como la base tiene restricciones únicas por `id_seguidor + id_creador`, el frontend no intenta crear duplicados. Primero busca el registro existente y, si está inactivo, lo reactiva con `PUT`.

### 6. Publicaciones con múltiples imágenes

El formulario de creador permite ingresar varias URLs, una por línea. Si hay imágenes, se usa:

```txt
POST /api/publicaciones/con-imagenes
```

Si no hay imágenes, se usa:

```txt
POST /api/publicaciones
```

### 7. Desactivaciones sin DELETE

El backend no expone `DELETE`. Por eso el frontend usa:

```json
{ "estado_registro": "INACTIVO" }
```

con `PUT` para publicaciones, metas, favoritos y seguidos.

### 8. UI minimalista y profesional

Se renovó `styles.css` con:

- Topbar sticky.
- Cards limpias.
- Estados vacíos claros.
- Paneles por rol.
- Grillas responsivas.
- Botones y formularios consistentes.
- Diseño cálido y minimalista alineado con OnlyFlans.

### 9. Build validado

Se ejecutó build de producción correctamente con Vite:

```bash
npm run build
```

El proyecto queda listo para ejecutarse con Yarn:

```bash
yarn install
yarn dev
yarn build
```
