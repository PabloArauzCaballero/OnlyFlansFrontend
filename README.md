# OnlyFlans Frontend

Frontend web de **OnlyFlans**, construido con **React + Vite + React Router + Axios** y ajustado contra el backend real entregado en `OnlyFlansBackend`.

El enfoque de esta versión es claro: **no se modificó el backend**. El frontend consume las rutas reales expuestas por Express bajo `/api` y normaliza las respuestas para que las vistas trabajen con nombres cómodos en React.

---

## 1. Stack

| Tecnología | Uso |
|---|---|
| React | Componentes, vistas y estado local. |
| Vite | Servidor de desarrollo y build de producción. |
| React Router DOM | Rutas públicas, privadas y por rol. |
| Axios | Cliente HTTP centralizado con `withCredentials`. |
| CSS propio | UI minimalista, responsiva y sin framework visual externo. |
| LocalStorage + Cookies | Compatibilidad con tokens del body y cookies HTTP-only del backend. |

---

## 2. Instalación con Yarn

> El proyecto está preparado para Yarn. No mezcles `npm install` con `yarn install` para evitar lockfiles inconsistentes.

```bash
yarn install
```

---

## 3. Variables de entorno

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Contenido esperado:

```env
VITE_API_URL=http://localhost:3000/api
```

El backend entregado usa por defecto:

```txt
PORT=3000
Base API: http://localhost:3000/api
Health:   http://localhost:3000/health
```

---

## 4. Levantar el frontend

```bash
yarn dev
```

Por defecto Vite levanta en:

```txt
http://localhost:5173
```

Asegúrate de que el backend permita este origen en `CORS_ORIGINS`:

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 5. Build de producción

```bash
yarn build
```

Previsualizar build:

```bash
yarn preview
```

---

## 6. Rutas reales del backend usadas por el frontend

Esta versión se basa en el backend real, no en los docs antiguos.

### Auth

| Acción | Método | Ruta |
|---|---:|---|
| Registro creador | POST | `/api/auth/registro/creador` |
| Registro seguidor | POST | `/api/auth/registro/seguidor` |
| Login | POST | `/api/auth/login` |
| Logout | POST | `/api/auth/logout` |
| Usuario actual | GET | `/api/auth/me` |

### Usuarios

| Acción | Método | Ruta |
|---|---:|---|
| Listar creadores | GET | `/api/usuarios/perfiles-creadores` |
| Ver perfil creador | GET | `/api/usuarios/perfiles-creadores/:id_usuario` |
| Actualizar perfil creador | PUT | `/api/usuarios/perfiles-creadores/:id_usuario` |
| Ver perfil seguidor | GET | `/api/usuarios/perfiles-seguidores/:id_usuario` |
| Actualizar perfil seguidor | PUT | `/api/usuarios/perfiles-seguidores/:id_usuario` |
| Favoritos | GET/POST/PUT | `/api/usuarios/creadores-favoritos` |
| Seguidos | GET/POST/PUT | `/api/usuarios/creadores-seguidos` |

### Publicaciones

| Acción | Método | Ruta |
|---|---:|---|
| Crear publicación texto | POST | `/api/publicaciones` |
| Crear publicación con imágenes | POST | `/api/publicaciones/con-imagenes` |
| Listar publicaciones | GET | `/api/publicaciones` |
| Actualizar/desactivar publicación | PUT | `/api/publicaciones/:id_publicacion` |
| Imágenes | GET/POST/PUT | `/api/publicaciones/imagenes` |
| Comentarios | GET/POST/PUT | `/api/publicaciones/comentarios` |

### Apoyos

| Acción | Método | Ruta |
|---|---:|---|
| Apoyar/donar | POST | `/api/apoyos` |
| Listar apoyos | GET | `/api/apoyos` |
| Metas de apoyo | GET/POST/PUT | `/api/apoyos/metas` |
| Tipos de apoyo | GET/POST/PUT | `/api/apoyos/tipos` |

---

## 7. Flujo de autenticación

El backend devuelve tokens y además setea cookies HTTP-only. Por eso el frontend trabaja así:

```txt
Login.jsx / Register.jsx
  ↓
AuthContext.login() o AuthContext.register()
  ↓
authApi en onlyflansApi.js
  ↓
POST /api/auth/login o rutas de registro
  ↓
Se guarda usuario en localStorage
  ↓
Si el backend devuelve accessToken, se guarda para Authorization Bearer
  ↓
Axios también manda cookies por withCredentials: true
```

Al recargar la página, `AuthContext` consulta:

```txt
GET /api/auth/me
```

Esto evita depender únicamente de localStorage y permite que la sesión funcione con cookies HTTP-only.

---

## 8. Estructura del frontend

```txt
src/
├── components/
│   ├── Layout.jsx
│   └── Status.jsx
├── pages/
│   ├── CreatorDashboard.jsx
│   ├── CreatorPublicProfile.jsx
│   ├── Creators.jsx
│   ├── FollowerDashboard.jsx
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── NotFound.jsx
│   └── Register.jsx
├── routes/
│   ├── AppRouter.jsx
│   ├── ProtectedRoute.jsx
│   └── RoleRoute.jsx
├── services/
│   ├── api.js
│   └── onlyflansApi.js
├── state/
│   └── AuthContext.jsx
├── main.jsx
└── styles.css
```

---

## 9. Vistas incluidas

| Ruta frontend | Vista | Acceso | Objetivo |
|---|---|---|---|
| `/` | Home | Público | Landing y explicación rápida. |
| `/login` | Login | Público | Inicio de sesión contra `/api/auth/login`. |
| `/register` | Register | Público | Registro separado por creador/seguidor. |
| `/creators` | Creators | Público | Lista pública de creadores activos. |
| `/creators/:creatorId` | CreatorPublicProfile | Público con acciones de seguidor | Perfil público, apoyo, favoritos, seguidos y comentarios. |
| `/creator/dashboard` | CreatorDashboard | Privado `CREADOR` | Perfil, meta, publicaciones, comentarios e ingresos. |
| `/follower/dashboard` | FollowerDashboard | Privado `SEGUIDOR` | Feed desbloqueado, favoritos, seguidos e historial. |

---

## 10. Decisiones importantes

### 10.1. No se usa `/api/auth/register`

Los docs antiguos mencionan esa ruta, pero el backend real no la expone. Por eso el frontend usa:

```txt
POST /api/auth/registro/creador
POST /api/auth/registro/seguidor
```

### 10.2. No se usan DELETE

El backend no expone rutas `DELETE`. Para desactivar registros se usa:

```json
{
  "estado_registro": "INACTIVO"
}
```

y se envía con `PUT`.

### 10.3. Búsqueda de creadores

Para evitar búsquedas exactas rígidas por `nombre_publico`, el frontend usa el query genérico:

```txt
GET /api/usuarios/perfiles-creadores?search=texto
```

Ese query lo soporta el repositorio CRUD del backend y busca sobre campos string/text.

### 10.4. Tipo de apoyo FLAN

Para donar, el frontend busca primero:

```txt
GET /api/apoyos/tipos?codigo=FLAN&estado_registro=ACTIVO
```

Si no existe, se muestra un error claro porque el backend necesita el catálogo `tipo_apoyo` cargado por DDL/seed.

---

## 11. Archivos clave

### `src/services/api.js`

Cliente Axios centralizado. Define:

- `baseURL` desde `VITE_API_URL`.
- `withCredentials: true` para cookies.
- Header `Authorization: Bearer <token>` si existe token local.
- Normalización de errores del backend, incluyendo errores de Zod.

### `src/services/onlyflansApi.js`

Capa de dominio. Aquí viven las funciones que hablan con el backend:

- `authApi.login`
- `authApi.register`
- `onlyflansApi.creators.list`
- `onlyflansApi.posts.create`
- `onlyflansApi.donations.create`
- `onlyflansApi.favorites.add`
- `onlyflansApi.follows.add`

También normaliza respuestas como:

```txt
id_usuario → creatorId / followerId
nombre_publico → publicName
biografia → bio
fecha_publicacion → createdAt
```

### `src/state/AuthContext.jsx`

Estado global de sesión. Expone:

- `user`
- `isAuthenticated`
- `isBootstrapping`
- `login`
- `register`
- `logout`
- `refreshMe`

### `src/routes/RoleRoute.jsx`

Protege rutas por rol:

- `CREADOR` entra a `/creator/dashboard`.
- `SEGUIDOR` entra a `/follower/dashboard`.

---

## 12. Recomendación para probar

1. Levanta el backend.
2. Verifica `GET http://localhost:3000/health`.
3. Levanta el frontend con `yarn dev`.
4. Registra un creador.
5. Registra un seguidor.
6. Con el creador crea meta y publicación.
7. Con el seguidor entra al perfil del creador y registra apoyo.
8. Verifica que se desbloqueen las publicaciones.

