# Documentación de rutas - OnlyFlans API

Este documento describe las rutas disponibles del backend **OnlyFlans**, agrupadas por módulo. Está pensado para documentación técnica del proyecto, pruebas con Postman y conexión desde frontend.

## 1. Convenciones generales

### URL base

En desarrollo, la URL base suele ser:

```txt
http://localhost:3000
```

Todas las rutas principales están montadas bajo `/api`, excepto el health check.

### Formato estándar de respuesta exitosa

Para operaciones CRUD, la respuesta general tiene esta forma:

```json
{
  "success": true,
  "message": "Registro creado correctamente.",
  "data": {}
}
```

Para listados, la respuesta agrega paginación:

```json
{
  "success": true,
  "message": "Registros listados correctamente.",
  "data": {
    "count": 10,
    "rows": [],
    "limit": 20,
    "offset": 0
  },
  "pagination": {
    "count": 10,
    "limit": 20,
    "offset": 0
  }
}
```

### Formato estándar de error por validación Zod

Cuando el `body`, `params` o `query` no cumple el schema de Zod, el middleware responde antes de llegar al controller:

```json
{
  "success": false,
  "message": "Datos inválidos.",
  "errors": {
    "formErrors": [],
    "fieldErrors": {}
  }
}
```

También puede devolver:

```json
{
  "success": false,
  "message": "Parámetros inválidos.",
  "errors": {}
}
```

```json
{
  "success": false,
  "message": "Query inválida.",
  "errors": {}
}
```

### Códigos HTTP comunes

| Código | Uso |
|---:|---|
| `200` | Consulta, listado, actualización o cierre de sesión correcto. |
| `201` | Registro creado correctamente. |
| `400` | Error de validación Zod o restricción de integridad básica. |
| `401` | Token ausente, inválido, expirado o sesión cerrada. |
| `404` | Registro no encontrado o ruta inexistente. |
| `409` | Conflicto por clave única o clave foránea. |
| `500` | Error interno del servidor. |

### Query params comunes para listados

La mayoría de rutas `GET /` acepta:

| Query param | Tipo | Descripción |
|---|---|---|
| `limit` | number | Cantidad máxima de registros. Máximo `100`. Por defecto `20`. |
| `offset` | number | Salto de registros. Por defecto `0`. |
| `search` | string | Búsqueda textual sobre campos string/text disponibles en el modelo. |
| `orderBy` | string | Campo por el cual ordenar. Si no existe, se usa la primary key. |
| `orderDir` | `ASC` / `DESC` | Dirección del ordenamiento. Por defecto `DESC`. |
| `estado_registro` | `ACTIVO` / `INACTIVO` / `ELIMINADO` | Filtro por estado lógico. |

### Campos de auditoría

Estos campos existen en las tablas y pueden aparecer en las respuestas:

```txt
fecha_registro
fecha_actualizacion
version
estado_registro
```

En general, **no deberían enviarse desde frontend** salvo casos administrativos muy controlados. El service global limpia varios campos protegidos antes de crear o actualizar.

### Autenticación

El login genera cookies HTTP-only:

```txt
access_token
refresh_token
```

También se puede enviar el token de acceso mediante header:

```txt
Authorization: Bearer <access_token>
```

Actualmente requieren autenticación:

```txt
POST /api/auth/logout
GET  /api/auth/me
```

Las rutas de sesión y logs **no están expuestas**. Son procesos internos del backend.

---

# 2. Health check

## GET `/health`

Verifica que el servidor Express esté funcionando.

### Body esperado

No recibe body.

### Respuesta exitosa `200`

```json
{
  "ok": true,
  "message": "Servidor funcionando correctamente"
}
```

---

# 3. Módulo Auth

Base path:

```txt
/api/auth
```

Este módulo maneja registro, login, sesión interna, logout y usuario autenticado.

Importante: no existe ruta directa para crear una sesión. La sesión se crea automáticamente al hacer login.

---

## POST `/api/auth/registro/creador`

Registra un usuario con rol `CREADOR` y crea su perfil de creador en una misma operación transaccional.

### Body esperado

```json
{
  "usuario": {
    "nombre": "Juan Pérez",
    "email": "juan.creador@example.com",
    "password": "Password123",
    "rol": "CREADOR",
    "url_imagen_portada": "https://example.com/portada.jpg",
    "imagen_perfil": "https://example.com/perfil.jpg"
  },
  "perfil_creador": {
    "nombre_publico": "Juan Creator",
    "biografia": "Creador de contenido gastronómico.",
    "foto_perfil_url": "https://example.com/foto.jpg",
    "banner_url": "https://example.com/banner.jpg"
  }
}
```

### Campos obligatorios

| Campo | Tipo | Obligatorio |
|---|---|---|
| `usuario.nombre` | string máx. 120 | Sí |
| `usuario.email` | email | Sí |
| `usuario.password` | string mín. 8, máx. 100 | Sí |
| `usuario.rol` | `CREADOR` | Opcional, por defecto `CREADOR` |
| `perfil_creador.nombre_publico` | string máx. 120 | Sí |

### Campos opcionales

```txt
usuario.url_imagen_portada
usuario.imagen_perfil
perfil_creador.biografia
perfil_creador.foto_perfil_url
perfil_creador.banner_url
```

### Respuesta exitosa `201`

```json
{
  "success": true,
  "message": "Creador registrado correctamente.",
  "data": {
    "usuario": {
      "id_usuario": 1,
      "nombre": "Juan Pérez",
      "email": "juan.creador@example.com",
      "rol": "CREADOR"
    },
    "perfil_creador": {
      "id_usuario": 1,
      "nombre_publico": "Juan Creator",
      "biografia": "Creador de contenido gastronómico."
    }
  }
}
```

### Errores frecuentes

| Código | Motivo |
|---:|---|
| `400` | Email inválido, contraseña menor a 8 caracteres o campos obligatorios faltantes. |
| `409` | Ya existe un usuario con ese email. |
| `500` | Error al crear usuario/perfil en transacción. |

---

## POST `/api/auth/registro/seguidor`

Registra un usuario con rol `SEGUIDOR` y crea su perfil de seguidor en una misma operación transaccional.

### Body esperado

```json
{
  "usuario": {
    "nombre": "María Gómez",
    "email": "maria.seguidora@example.com",
    "password": "Password123",
    "rol": "SEGUIDOR",
    "url_imagen_portada": "https://example.com/portada.jpg",
    "imagen_perfil": "https://example.com/perfil.jpg"
  },
  "perfil_seguidor": {
    "nombre_visible": "María"
  }
}
```

### Campos obligatorios

| Campo | Tipo | Obligatorio |
|---|---|---|
| `usuario.nombre` | string máx. 120 | Sí |
| `usuario.email` | email | Sí |
| `usuario.password` | string mín. 8, máx. 100 | Sí |
| `usuario.rol` | `SEGUIDOR` | Opcional, por defecto `SEGUIDOR` |
| `perfil_seguidor.nombre_visible` | string máx. 120 | Sí |

### Respuesta exitosa `201`

```json
{
  "success": true,
  "message": "Seguidor registrado correctamente.",
  "data": {
    "usuario": {
      "id_usuario": 2,
      "nombre": "María Gómez",
      "email": "maria.seguidora@example.com",
      "rol": "SEGUIDOR"
    },
    "perfil_seguidor": {
      "id_usuario": 2,
      "nombre_visible": "María"
    }
  }
}
```

---

## POST `/api/auth/login`

Autentica al usuario, crea una sesión interna en `sesion_usuario` y devuelve cookies HTTP-only.

### Body esperado

```json
{
  "email": "juan.creador@example.com",
  "password": "Password123"
}
```

### Respuesta exitosa `200`

Además de responder JSON, el backend setea cookies `access_token` y `refresh_token`.

```json
{
  "success": true,
  "message": "Login realizado correctamente.",
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "user": {
      "id_usuario": 1,
      "nombre": "Juan Pérez",
      "email": "juan.creador@example.com",
      "rol": "CREADOR"
    },
    "session": {
      "id_sesion": 10,
      "id_usuario": 1,
      "fecha_inicio": "2026-05-23T14:00:00.000Z"
    }
  }
}
```

### Errores frecuentes

| Código | Motivo |
|---:|---|
| `400` | Email o password inválidos según Zod. |
| `401` | Credenciales incorrectas. |
| `500` | Error al crear sesión o generar tokens. |

---

## POST `/api/auth/logout`

Cierra la sesión actual. Requiere token válido y sesión abierta.

### Autenticación requerida

Cookie `access_token` o header:

```txt
Authorization: Bearer <access_token>
```

### Body esperado

No requiere body.

### Respuesta exitosa `200`

El backend cierra la sesión en base de datos y limpia cookies.

```json
{
  "success": true,
  "message": "Sesión cerrada correctamente.",
  "data": {
    "id_sesion": 10,
    "fecha_cierre": "2026-05-23T14:30:00.000Z"
  }
}
```

### Errores frecuentes

| Código | Motivo |
|---:|---|
| `401` | Token ausente, inválido, expirado o sesión cerrada. |
| `500` | Error interno al cerrar sesión. |

---

## GET `/api/auth/me`

Obtiene información del usuario autenticado y valida que la sesión siga activa.

### Autenticación requerida

Cookie `access_token` o header:

```txt
Authorization: Bearer <access_token>
```

### Respuesta exitosa `200`

```json
{
  "success": true,
  "message": "Usuario autenticado obtenido correctamente.",
  "data": {
    "id_usuario": 1,
    "nombre": "Juan Pérez",
    "email": "juan.creador@example.com",
    "rol": "CREADOR",
    "id_sesion": 10
  }
}
```

---

# 4. Módulo Usuarios

Base path:

```txt
/api/usuarios
```

Este módulo permite consultar y actualizar usuarios/perfiles. La creación directa de usuarios y perfiles no está expuesta por router. Para crear usuarios se debe usar:

```txt
POST /api/auth/registro/creador
POST /api/auth/registro/seguidor
```

---

## GET `/api/usuarios`

Lista usuarios.

### Query params

Acepta los query params comunes y además:

| Query param | Tipo | Descripción |
|---|---|---|
| `rol` | `CREADOR` / `SEGUIDOR` | Filtra por rol. |
| `email` | string | Filtra por email. |
| `nombre` | string | Filtra por nombre. |

### Respuesta exitosa `200`

```json
{
  "success": true,
  "message": "Registros listados correctamente.",
  "data": {
    "count": 1,
    "rows": [
      {
        "id_usuario": 1,
        "nombre": "Juan Pérez",
        "email": "juan.creador@example.com",
        "rol": "CREADOR",
        "ultimo_login": null,
        "url_imagen_portada": null,
        "imagen_perfil": null,
        "estado_registro": "ACTIVO"
      }
    ],
    "limit": 20,
    "offset": 0
  },
  "pagination": {
    "count": 1,
    "limit": 20,
    "offset": 0
  }
}
```

---

## GET `/api/usuarios/:id_usuario`

Obtiene un usuario por ID.

### Params

| Param | Tipo |
|---|---|
| `id_usuario` | number entero positivo |

### Respuesta exitosa `200`

```json
{
  "success": true,
  "message": "Registro obtenido correctamente.",
  "data": {
    "id_usuario": 1,
    "nombre": "Juan Pérez",
    "email": "juan.creador@example.com",
    "rol": "CREADOR",
    "estado_registro": "ACTIVO"
  }
}
```

### Si no existe `404`

```json
{
  "success": false,
  "statusCode": 404,
  "message": "No se encontró el registro de usuario."
}
```

---

## PUT `/api/usuarios/:id_usuario`

Actualiza datos del usuario.

### Body esperado

Debe enviarse al menos un campo.

```json
{
  "nombre": "Juan Actualizado",
  "email": "juan.nuevo@example.com",
  "rol": "CREADOR",
  "ultimo_login": "2026-05-23T14:00:00.000Z",
  "url_imagen_portada": "https://example.com/portada.jpg",
  "imagen_perfil": "https://example.com/perfil.jpg",
  "estado_registro": "ACTIVO"
}
```

### Respuesta exitosa `200`

```json
{
  "success": true,
  "message": "Registro actualizado correctamente.",
  "data": {
    "id_usuario": 1,
    "nombre": "Juan Actualizado",
    "email": "juan.nuevo@example.com",
    "rol": "CREADOR"
  }
}
```

---

## GET `/api/usuarios/perfiles-creadores`

Lista perfiles de creadores.

### Query params específicos

| Query param | Tipo |
|---|---|
| `nombre_publico` | string |

### Respuesta exitosa `200`

```json
{
  "success": true,
  "message": "Registros listados correctamente.",
  "data": {
    "count": 1,
    "rows": [
      {
        "id_usuario": 1,
        "nombre_publico": "Juan Creator",
        "biografia": "Creador de contenido.",
        "foto_perfil_url": null,
        "banner_url": null,
        "estado_registro": "ACTIVO"
      }
    ],
    "limit": 20,
    "offset": 0
  }
}
```

---

## GET `/api/usuarios/perfiles-creadores/:id_usuario`

Obtiene el perfil creador por `id_usuario`.

### Params

| Param | Tipo |
|---|---|
| `id_usuario` | number entero positivo |

### Respuesta exitosa `200`

```json
{
  "success": true,
  "message": "Registro obtenido correctamente.",
  "data": {
    "id_usuario": 1,
    "nombre_publico": "Juan Creator",
    "biografia": "Creador de contenido."
  }
}
```

---

## PUT `/api/usuarios/perfiles-creadores/:id_usuario`

Actualiza el perfil de creador. No permite cambiar `id_usuario` desde body.

### Body esperado

```json
{
  "nombre_publico": "Nuevo Nombre Público",
  "biografia": "Nueva biografía.",
  "foto_perfil_url": "https://example.com/foto.jpg",
  "banner_url": "https://example.com/banner.jpg",
  "estado_registro": "ACTIVO"
}
```

### Respuesta exitosa `200`

```json
{
  "success": true,
  "message": "Registro actualizado correctamente.",
  "data": {
    "id_usuario": 1,
    "nombre_publico": "Nuevo Nombre Público",
    "biografia": "Nueva biografía."
  }
}
```

---

## GET `/api/usuarios/perfiles-seguidores`

Lista perfiles de seguidores.

### Query params específicos

| Query param | Tipo |
|---|---|
| `nombre_visible` | string |

### Respuesta exitosa `200`

```json
{
  "success": true,
  "message": "Registros listados correctamente.",
  "data": {
    "count": 1,
    "rows": [
      {
        "id_usuario": 2,
        "nombre_visible": "María",
        "estado_registro": "ACTIVO"
      }
    ],
    "limit": 20,
    "offset": 0
  }
}
```

---

## GET `/api/usuarios/perfiles-seguidores/:id_usuario`

Obtiene el perfil seguidor por `id_usuario`.

### Respuesta exitosa `200`

```json
{
  "success": true,
  "message": "Registro obtenido correctamente.",
  "data": {
    "id_usuario": 2,
    "nombre_visible": "María"
  }
}
```

---

## PUT `/api/usuarios/perfiles-seguidores/:id_usuario`

Actualiza el perfil de seguidor. No permite cambiar `id_usuario` desde body.

### Body esperado

```json
{
  "nombre_visible": "María G.",
  "estado_registro": "ACTIVO"
}
```

### Respuesta exitosa `200`

```json
{
  "success": true,
  "message": "Registro actualizado correctamente.",
  "data": {
    "id_usuario": 2,
    "nombre_visible": "María G."
  }
}
```

---

## POST `/api/usuarios/creadores-favoritos`

Marca un creador como favorito para un seguidor.

### Body esperado

```json
{
  "id_seguidor": 2,
  "id_creador": 1,
  "fecha_favorito": "2026-05-23T14:00:00.000Z"
}
```

### Reglas

- `id_seguidor` debe existir en `perfil_seguidor`.
- `id_creador` debe existir en `perfil_creador`.
- `id_seguidor` no debería ser igual a `id_creador`.
- La combinación `id_seguidor + id_creador` debe ser única.

### Respuesta exitosa `201`

```json
{
  "success": true,
  "message": "Registro creado correctamente.",
  "data": {
    "id_favorito": 1,
    "id_seguidor": 2,
    "id_creador": 1,
    "fecha_favorito": "2026-05-23T14:00:00.000Z"
  }
}
```

---

## GET `/api/usuarios/creadores-favoritos`

Lista favoritos.

### Query params específicos

| Query param | Tipo |
|---|---|
| `id_seguidor` | number |
| `id_creador` | number |

---

## GET `/api/usuarios/creadores-favoritos/:id_favorito`

Obtiene un favorito por ID.

---

## PUT `/api/usuarios/creadores-favoritos/:id_favorito`

Actualiza un favorito.

### Body esperado

```json
{
  "id_seguidor": 2,
  "id_creador": 1,
  "fecha_favorito": "2026-05-23T14:00:00.000Z",
  "estado_registro": "ACTIVO"
}
```

---

## POST `/api/usuarios/creadores-seguidos`

Registra que un seguidor sigue a un creador.

### Body esperado

```json
{
  "id_seguidor": 2,
  "id_creador": 1,
  "fecha_seguimiento": "2026-05-23T14:00:00.000Z"
}
```

### Reglas

- `id_seguidor` debe existir en `perfil_seguidor`.
- `id_creador` debe existir en `perfil_creador`.
- `id_seguidor` no debería ser igual a `id_creador`.
- La combinación `id_seguidor + id_creador` debería ser única según el DDL.

### Respuesta exitosa `201`

```json
{
  "success": true,
  "message": "Registro creado correctamente.",
  "data": {
    "id_seguimiento": 1,
    "id_seguidor": 2,
    "id_creador": 1,
    "fecha_seguimiento": "2026-05-23T14:00:00.000Z"
  }
}
```

---

## GET `/api/usuarios/creadores-seguidos`

Lista seguimientos.

### Query params específicos

| Query param | Tipo |
|---|---|
| `id_seguidor` | number |
| `id_creador` | number |

---

## GET `/api/usuarios/creadores-seguidos/:id_seguimiento`

Obtiene un seguimiento por ID.

---

## PUT `/api/usuarios/creadores-seguidos/:id_seguimiento`

Actualiza un seguimiento.

### Body esperado

```json
{
  "id_seguidor": 2,
  "id_creador": 1,
  "fecha_seguimiento": "2026-05-23T14:00:00.000Z",
  "estado_registro": "ACTIVO"
}
```

---

# 5. Módulo Apoyos

Base path:

```txt
/api/apoyos
```

Este módulo maneja tipos de apoyo, metas de apoyo y apoyos/donaciones.

---

## POST `/api/apoyos/tipos`

Crea un tipo de apoyo.

### Body esperado

```json
{
  "codigo": "FLAN",
  "nombre": "Flan",
  "descripcion": "Apoyo simbólico equivalente a un flan.",
  "monto_unitario_bs": "10.00"
}
```

### Campos

| Campo | Tipo | Obligatorio |
|---|---|---|
| `codigo` | string máx. 40 | Sí |
| `nombre` | string máx. 100 | Sí |
| `descripcion` | string/text/null | No |
| `monto_unitario_bs` | decimal positivo | Sí |

### Respuesta exitosa `201`

```json
{
  "success": true,
  "message": "Registro creado correctamente.",
  "data": {
    "id_tipo_apoyo": 1,
    "codigo": "FLAN",
    "nombre": "Flan",
    "descripcion": "Apoyo simbólico equivalente a un flan.",
    "monto_unitario_bs": "10.00"
  }
}
```

---

## GET `/api/apoyos/tipos`

Lista tipos de apoyo.

### Query params específicos

| Query param | Tipo |
|---|---|
| `codigo` | string |
| `nombre` | string |

---

## GET `/api/apoyos/tipos/:id_tipo_apoyo`

Obtiene un tipo de apoyo por ID.

---

## PUT `/api/apoyos/tipos/:id_tipo_apoyo`

Actualiza un tipo de apoyo.

### Body esperado

```json
{
  "codigo": "FLAN",
  "nombre": "Flan premium",
  "descripcion": "Nueva descripción.",
  "monto_unitario_bs": "12.00",
  "estado_registro": "ACTIVO"
}
```

---

## POST `/api/apoyos/metas`

Crea una meta de apoyo asociada a un creador.

### Body esperado

```json
{
  "id_creador": 1,
  "titulo": "Comprar nueva cámara",
  "descripcion": "Meta para mejorar la calidad del contenido."
}
```

### Campos

| Campo | Tipo | Obligatorio |
|---|---|---|
| `id_creador` | number | Sí |
| `titulo` | string máx. 160 | Sí |
| `descripcion` | text | Sí |

### Respuesta exitosa `201`

```json
{
  "success": true,
  "message": "Registro creado correctamente.",
  "data": {
    "id_meta": 1,
    "id_creador": 1,
    "titulo": "Comprar nueva cámara",
    "descripcion": "Meta para mejorar la calidad del contenido."
  }
}
```

---

## GET `/api/apoyos/metas`

Lista metas de apoyo.

### Query params específicos

| Query param | Tipo |
|---|---|
| `id_creador` | number |
| `titulo` | string |

---

## GET `/api/apoyos/metas/:id_meta`

Obtiene una meta por ID.

---

## PUT `/api/apoyos/metas/:id_meta`

Actualiza una meta.

### Body esperado

```json
{
  "id_creador": 1,
  "titulo": "Meta actualizada",
  "descripcion": "Descripción actualizada.",
  "estado_registro": "ACTIVO"
}
```

---

## POST `/api/apoyos`

Crea un apoyo/donación de un seguidor hacia un creador.

### Body esperado

```json
{
  "id_seguidor": 2,
  "id_creador": 1,
  "id_tipo_apoyo": 1,
  "cantidad": 3,
  "monto_unitario_bs": "10.00",
  "mensaje": "Me gusta mucho tu contenido.",
  "estado_pago": "SIMULADO_APROBADO",
  "fecha_apoyo": "2026-05-23T14:00:00.000Z"
}
```

### Campos

| Campo | Tipo | Obligatorio |
|---|---|---|
| `id_seguidor` | number | Sí |
| `id_creador` | number | Sí |
| `id_tipo_apoyo` | number | Sí |
| `cantidad` | number entero positivo | Sí |
| `monto_unitario_bs` | decimal positivo | Sí |
| `mensaje` | text/null | No |
| `estado_pago` | `PENDIENTE` / `SIMULADO_APROBADO` / `ANULADO` | No |
| `fecha_apoyo` | datetime | No |

### Notas

- `monto_total_bs` no se envía desde frontend.
- PostgreSQL lo calcula automáticamente como `cantidad * monto_unitario_bs`.

### Respuesta exitosa `201`

```json
{
  "success": true,
  "message": "Registro creado correctamente.",
  "data": {
    "id_apoyo": 1,
    "id_seguidor": 2,
    "id_creador": 1,
    "id_tipo_apoyo": 1,
    "cantidad": 3,
    "monto_unitario_bs": "10.00",
    "monto_total_bs": "30.00",
    "mensaje": "Me gusta mucho tu contenido.",
    "estado_pago": "SIMULADO_APROBADO"
  }
}
```

---

## GET `/api/apoyos`

Lista apoyos.

### Query params específicos

| Query param | Tipo |
|---|---|
| `id_seguidor` | number |
| `id_creador` | number |
| `id_tipo_apoyo` | number |
| `estado_pago` | `PENDIENTE` / `SIMULADO_APROBADO` / `ANULADO` |

---

## GET `/api/apoyos/:id_apoyo`

Obtiene un apoyo por ID.

---

## PUT `/api/apoyos/:id_apoyo`

Actualiza un apoyo.

### Body esperado

```json
{
  "cantidad": 5,
  "monto_unitario_bs": "10.00",
  "mensaje": "Mensaje actualizado.",
  "estado_pago": "SIMULADO_APROBADO",
  "estado_registro": "ACTIVO"
}
```

---

# 6. Módulo Publicaciones

Base path:

```txt
/api/publicaciones
```

Este módulo maneja publicaciones, imágenes de publicaciones y comentarios.

---

## POST `/api/publicaciones`

Crea una publicación solo de texto.

Para publicaciones con imágenes, usar:

```txt
POST /api/publicaciones/con-imagenes
```

### Body esperado

```json
{
  "id_creador": 1,
  "texto": "Primera publicación de prueba.",
  "fecha_publicacion": "2026-05-23T14:00:00.000Z"
}
```

### Campos

| Campo | Tipo | Obligatorio |
|---|---|---|
| `id_creador` | number | Sí |
| `texto` | text no vacío | Sí |
| `fecha_publicacion` | datetime | No |

### Respuesta exitosa `201`

```json
{
  "success": true,
  "message": "Registro creado correctamente.",
  "data": {
    "id_publicacion": 1,
    "id_creador": 1,
    "texto": "Primera publicación de prueba.",
    "fecha_publicacion": "2026-05-23T14:00:00.000Z"
  }
}
```

---

## POST `/api/publicaciones/con-imagenes`

Crea una publicación y sus imágenes en una sola transacción.

### Body esperado

```json
{
  "id_creador": 1,
  "texto": "Publicación con imágenes.",
  "fecha_publicacion": "2026-05-23T14:00:00.000Z",
  "imagenes": [
    {
      "link_imagen": "https://example.com/img1.jpg",
      "orden": 1
    },
    {
      "link_imagen": "https://example.com/img2.jpg",
      "orden": 2
    }
  ]
}
```

### Campos

| Campo | Tipo | Obligatorio |
|---|---|---|
| `id_creador` | number | Sí |
| `texto` | text no vacío/null | No |
| `fecha_publicacion` | datetime | No |
| `imagenes` | array | Sí, mínimo 1 imagen |
| `imagenes[].link_imagen` | string no vacío | Sí |
| `imagenes[].orden` | number entero positivo | No |

### Reglas

- Debe enviarse al menos una imagen.
- Si se envía `orden`, no puede repetirse dentro del array.
- Si no se envía `orden`, el service asigna el orden por posición: `1`, `2`, `3`, etc.
- Si falla la creación de alguna imagen, se revierte también la publicación.

### Respuesta exitosa `201`

```json
{
  "success": true,
  "message": "Publicación creada con imágenes correctamente.",
  "data": {
    "id_publicacion": 1,
    "id_creador": 1,
    "texto": "Publicación con imágenes.",
    "fecha_publicacion": "2026-05-23T14:00:00.000Z",
    "imagenes": [
      {
        "id_publicacion_imagen": 1,
        "id_publicacion": 1,
        "link_imagen": "https://example.com/img1.jpg",
        "orden": 1
      },
      {
        "id_publicacion_imagen": 2,
        "id_publicacion": 1,
        "link_imagen": "https://example.com/img2.jpg",
        "orden": 2
      }
    ]
  }
}
```

---

## GET `/api/publicaciones`

Lista publicaciones.

### Query params específicos

| Query param | Tipo |
|---|---|
| `id_creador` | number |

---

## GET `/api/publicaciones/:id_publicacion`

Obtiene una publicación por ID.

---

## PUT `/api/publicaciones/:id_publicacion`

Actualiza una publicación.

### Body esperado

```json
{
  "id_creador": 1,
  "texto": "Texto actualizado.",
  "fecha_publicacion": "2026-05-23T14:00:00.000Z",
  "estado_registro": "ACTIVO"
}
```

---

## POST `/api/publicaciones/imagenes`

Crea una imagen asociada a una publicación existente.

### Body esperado

```json
{
  "id_publicacion": 1,
  "link_imagen": "https://example.com/img1.jpg",
  "orden": 1
}
```

### Campos

| Campo | Tipo | Obligatorio |
|---|---|---|
| `id_publicacion` | number | Sí |
| `link_imagen` | string no vacío | Sí |
| `orden` | number entero positivo | No |

### Respuesta exitosa `201`

```json
{
  "success": true,
  "message": "Registro creado correctamente.",
  "data": {
    "id_publicacion_imagen": 1,
    "id_publicacion": 1,
    "link_imagen": "https://example.com/img1.jpg",
    "orden": 1
  }
}
```

---

## GET `/api/publicaciones/imagenes`

Lista imágenes de publicaciones.

### Query params específicos

| Query param | Tipo |
|---|---|
| `id_publicacion` | number |
| `orden` | number entero positivo |

---

## GET `/api/publicaciones/imagenes/:id_publicacion_imagen`

Obtiene una imagen de publicación por ID.

---

## PUT `/api/publicaciones/imagenes/:id_publicacion_imagen`

Actualiza una imagen de publicación.

### Body esperado

```json
{
  "id_publicacion": 1,
  "link_imagen": "https://example.com/img-actualizada.jpg",
  "orden": 2,
  "estado_registro": "ACTIVO"
}
```

---

## POST `/api/publicaciones/comentarios`

Crea un comentario en una publicación.

### Body esperado

```json
{
  "id_publicacion": 1,
  "id_seguidor": 2,
  "comentario": "Excelente publicación.",
  "fecha_comentario": "2026-05-23T14:00:00.000Z"
}
```

### Campos

| Campo | Tipo | Obligatorio |
|---|---|---|
| `id_publicacion` | number | Sí |
| `id_seguidor` | number | Sí |
| `comentario` | text no vacío | Sí |
| `fecha_comentario` | datetime | No |

### Respuesta exitosa `201`

```json
{
  "success": true,
  "message": "Registro creado correctamente.",
  "data": {
    "id_comentario": 1,
    "id_publicacion": 1,
    "id_seguidor": 2,
    "comentario": "Excelente publicación.",
    "fecha_comentario": "2026-05-23T14:00:00.000Z"
  }
}
```

---

## GET `/api/publicaciones/comentarios`

Lista comentarios.

### Query params específicos

| Query param | Tipo |
|---|---|
| `id_publicacion` | number |
| `id_seguidor` | number |

---

## GET `/api/publicaciones/comentarios/:id_comentario`

Obtiene un comentario por ID.

---

## PUT `/api/publicaciones/comentarios/:id_comentario`

Actualiza un comentario.

### Body esperado

```json
{
  "id_publicacion": 1,
  "id_seguidor": 2,
  "comentario": "Comentario actualizado.",
  "fecha_comentario": "2026-05-23T14:00:00.000Z",
  "estado_registro": "ACTIVO"
}
```

---

# 7. Rutas internas no expuestas

Estas entidades existen en el backend, pero no deben tener rutas públicas directas:

| Entidad | Motivo |
|---|---|
| `sesion_usuario` | La sesión se crea al hacer login y se cierra al hacer logout. No debe manipularse desde frontend. |
| `logs` | Los logs se crean desde `actionLog.middleware.js` usando el service interno de logs. No deberían exponerse como CRUD público. |

---

# 8. Flujo de ejecución de una request

## Flujo general CRUD

```txt
Cliente / Postman / Frontend
  ↓
app.js
  ↓
pino-http, helmet, compression, cors, rateLimit, cookieParser, bodyParser
  ↓
actionLog.middleware.js
  ↓
src/modules/index.js
  ↓
Módulo correspondiente: auth, usuarios, apoyos o publicaciones
  ↓
router del módulo
  ↓
validateParams / validateQuery / validateBody con Zod
  ↓
controller
  ↓
service específico o createCrudService
  ↓
repository específico o createCrudRepository
  ↓
modelo Sequelize
  ↓
PostgreSQL / Neon
  ↓
respuesta JSON normalizada
```

## Flujo especial de login

```txt
POST /api/auth/login
  ↓
validateBody(loginSchema)
  ↓
AuthController.login
  ↓
AuthService.login
  ↓
AuthRepository busca usuario por email
  ↓
passwordHash.verifyPassword
  ↓
SesionUsuarioRepository crea sesión
  ↓
JWT genera accessToken y refreshToken
  ↓
Controller setea cookies HTTP-only
  ↓
Devuelve user + session + tokens
```

## Flujo especial de publicación con imágenes

```txt
POST /api/publicaciones/con-imagenes
  ↓
validateBody(createWithImagesSchema)
  ↓
PublicacionController.createWithImages
  ↓
PublicacionService.createWithImages
  ↓
PublicacionRepository.createWithImages
  ↓
sequelize.transaction
  ↓
INSERT publicacion
  ↓
BULK INSERT publicacion_imagen
  ↓
commit si todo sale bien / rollback si algo falla
```

---

# 9. Recomendaciones para pruebas en Postman

Orden recomendado:

1. `GET /health`
2. `POST /api/auth/registro/creador`
3. `POST /api/auth/registro/seguidor`
4. `POST /api/auth/login`
5. `GET /api/auth/me`
6. `POST /api/apoyos/tipos`
7. `POST /api/apoyos/metas`
8. `POST /api/publicaciones`
9. `POST /api/publicaciones/con-imagenes`
10. `POST /api/publicaciones/comentarios`
11. `POST /api/usuarios/creadores-seguidos`
12. `POST /api/usuarios/creadores-favoritos`
13. `POST /api/apoyos`
14. Probar listados `GET /` de cada módulo.
15. Probar `PUT /:id` de cada entidad.
16. `POST /api/auth/logout`

