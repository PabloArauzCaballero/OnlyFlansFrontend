# OnlyFlans Frontend

Frontend web de **OnlyFlans**, construido con **React + Vite + React Router + Axios**. El objetivo del proyecto es ofrecer una interfaz clara para dos tipos de usuarios:

- **Creador:** gestiona su perfil público, meta de apoyo, publicaciones y reporte de apoyos recibidos.
- **Seguidor:** explora creadores, registra apoyos simbólicos, marca favoritos, desbloquea publicaciones y consulta su historial.

Este README está escrito para que cualquier persona pueda entender el flujo del frontend sin tener que leer todo el código primero.

---

## 1. Stack utilizado

| Tecnología | Uso dentro del frontend |
|---|---|
| React | Construcción de componentes, vistas y estado local. |
| Vite | Servidor de desarrollo y build de producción. |
| React Router DOM | Definición de rutas públicas, privadas y por rol. |
| Axios | Comunicación HTTP con el backend. |
| CSS propio | Sistema visual minimalista, responsivo y sin dependencia de framework UI. |
| LocalStorage | Persistencia local del usuario autenticado y tokens para compatibilidad con Authorization Bearer. |

---

## 2. Instalación y ejecución

### 2.1. Instalar dependencias

```bash
npm install
```

### 2.2. Configurar variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Contenido esperado:

```env
VITE_API_URL=http://localhost:3000/api
```

> Si tu backend corre en otro puerto, cambia esa URL.

### 2.3. Ejecutar en desarrollo

```bash
npm run dev
```

### 2.4. Generar build de producción

```bash
npm run build
```

### 2.5. Previsualizar build

```bash
npm run preview
```

---

## 3. Estructura general del proyecto

```txt
frontend/
├── docs/
│   ├── BACKEND_ROUTES_REFERENCE.md
│   └── CHANGELOG_FRONTEND_DETALLADO.md
├── public/
│   ├── .gitkeep
│   └── _redirects
├── src/
│   ├── components/
│   │   ├── Layout.jsx
│   │   └── Status.jsx
│   ├── pages/
│   │   ├── CreatorDashboard.jsx
│   │   ├── CreatorPublicProfile.jsx
│   │   ├── Creators.jsx
│   │   ├── FollowerDashboard.jsx
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── NotFound.jsx
│   │   └── Register.jsx
│   ├── routes/
│   │   ├── AppRouter.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── RoleRoute.jsx
│   ├── services/
│   │   ├── api.js
│   │   └── onlyflansApi.js
│   ├── state/
│   │   └── AuthContext.jsx
│   ├── main.jsx
│   └── styles.css
├── .env.example
├── index.html
├── netlify.toml
├── package.json
├── package-lock.json
└── vite.config.js
```

---

## 4. Flujo general de información

El flujo principal de una vista React hacia el backend es:

```txt
Usuario interactúa con una vista
  ↓
Componente de page en src/pages
  ↓
Hook local useState/useEffect
  ↓
Servicio de dominio onlyflansApi.js
  ↓
Cliente Axios api.js
  ↓
Backend Express bajo /api
  ↓
Respuesta JSON normalizada
  ↓
onlyflansApi transforma datos a nombres cómodos para React
  ↓
La vista actualiza estado local
  ↓
React renderiza UI actualizada
```

Ejemplo simple con listado de creadores:

```txt
/creators
  ↓
Creators.jsx ejecuta load()
  ↓
onlyflansApi.creators.list({ publicName })
  ↓
GET /api/usuarios/perfiles-creadores?nombre_publico=...
  ↓
Respuesta backend con { success, message, data: { count, rows } }
  ↓
onlyflansApi extrae rows y normaliza cada creador
  ↓
Creators.jsx muestra tarjetas profesionales de creadores
```

---

## 5. Flujo de rutas en React

Las rutas se definen en `src/routes/AppRouter.jsx`.

| Ruta | Vista | Acceso | Objetivo |
|---|---|---|---|
| `/` | `Home.jsx` | Público | Landing inicial del proyecto. |
| `/login` | `Login.jsx` | Público | Inicio de sesión. |
| `/register` | `Register.jsx` | Público | Registro separado por rol. |
| `/creators` | `Creators.jsx` | Público | Explorar perfiles de creadores. |
| `/creators/:creatorId` | `CreatorPublicProfile.jsx` | Público con acciones privadas | Ver perfil público; seguidores autenticados pueden donar, comentar y marcar favorito. |
| `/creator/dashboard` | `CreatorDashboard.jsx` | Privado + rol `CREADOR` | Panel de administración del creador. |
| `/follower/dashboard` | `FollowerDashboard.jsx` | Privado + rol `SEGUIDOR` | Feed, favoritos e historial del seguidor. |
| `/dashboard` | `Navigate` | Redirección | Evita una ruta genérica ambigua. |
| `*` | `NotFound.jsx` | Público | Pantalla de ruta no encontrada. |

---

## 6. Protección de rutas

### 6.1. `ProtectedRoute.jsx`

Protege rutas que requieren sesión.

Funcionamiento:

1. Consulta `isBootstrapping` desde `AuthContext`.
2. Si todavía se valida la sesión, muestra una tarjeta de carga.
3. Si no hay sesión válida, redirige a `/login`.
4. Si hay sesión, renderiza la vista hija.

Se usa en:

```jsx
<Route
  path="creator/dashboard"
  element={
    <ProtectedRoute>
      <RoleRoute role="CREADOR">
        <CreatorDashboard />
      </RoleRoute>
    </ProtectedRoute>
  }
/>
```

### 6.2. `RoleRoute.jsx`

Protege rutas según rol.

Reglas:

- Si no existe usuario, redirige a `/login`.
- Si el usuario no tiene el rol requerido, redirige a `/`.
- Si el rol coincide, permite entrar.

Roles usados:

```js
CREADOR
SEGUIDOR
```

Estos roles coinciden con el contrato de rutas del backend.

---

## 7. Flujo de autenticación

La autenticación se centraliza en `src/state/AuthContext.jsx`.

### 7.1. Inicio de sesión

```txt
Login.jsx
  ↓
useAuth().login(form)
  ↓
authApi.login(payload)
  ↓
POST /api/auth/login
  ↓
Backend crea sesión interna y devuelve tokens + usuario
  ↓
AuthContext guarda user/token en estado y localStorage
  ↓
React redirige según rol
```

Redirección posterior al login:

| Rol | Destino |
|---|---|
| `CREADOR` | `/creator/dashboard` |
| `SEGUIDOR` | `/follower/dashboard` |

### 7.2. Registro

El formulario de registro permite seleccionar rol.

Si el usuario elige **Creador**:

```txt
Register.jsx
  ↓
authApi.register(payload)
  ↓
POST /api/auth/registro/creador
  ↓
Se crea usuario + perfil_creador
  ↓
Luego se ejecuta login automático
```

Si el usuario elige **Seguidor**:

```txt
Register.jsx
  ↓
authApi.register(payload)
  ↓
POST /api/auth/registro/seguidor
  ↓
Se crea usuario + perfil_seguidor
  ↓
Luego se ejecuta login automático
```

### 7.3. Validación al recargar página

Cuando el usuario recarga el navegador:

```txt
AuthProvider monta
  ↓
Lee token y usuario desde localStorage
  ↓
Llama GET /api/auth/me
  ↓
Si el backend confirma la sesión, conserva el usuario
  ↓
Si falla, limpia localStorage y cierra sesión local
```

### 7.4. Logout

```txt
Layout.jsx
  ↓
Botón Salir
  ↓
useAuth().logout()
  ↓
POST /api/auth/logout
  ↓
Se limpia sesión local aunque el backend responda error por token expirado
  ↓
Redirección a /
```

---

## 8. Cliente HTTP y capa de servicios

### 8.1. `src/services/api.js`

Este archivo crea la instancia base de Axios.

Responsabilidades:

- Define `baseURL` usando `VITE_API_URL`.
- Activa `withCredentials: true` para trabajar con cookies HTTP-only.
- Lee `onlyflans_access_token` de localStorage.
- Si existe token, agrega `Authorization: Bearer <token>`.
- Normaliza errores para que las vistas reciban mensajes simples.

Por qué usa cookies y Authorization:

- El backend documentado crea cookies HTTP-only en login.
- También permite enviar el token por header Authorization.
- El frontend soporta ambos mecanismos para mayor compatibilidad durante desarrollo y pruebas.

### 8.2. `src/services/onlyflansApi.js`

Este es el archivo más importante de integración.

Responsabilidades:

- Define roles oficiales `CREADOR` y `SEGUIDOR`.
- Traduce nombres del backend a nombres cómodos para React.
- Extrae `rows` cuando el backend responde listados paginados.
- Centraliza endpoints de auth, usuarios, perfiles, apoyos, favoritos, publicaciones y comentarios.
- Evita que las vistas conozcan todos los detalles del contrato del backend.

Ejemplo de normalización:

```js
nombre_publico → publicName
biografia → bio
foto_perfil_url → profileImageUrl
banner_url → bannerImageUrl
id_usuario → creatorId / followerId según contexto
```

Esto permite que los componentes React sean más fáciles de leer.

---

## 9. Flujo de cada vista

### 9.1. `Home.jsx`

Vista pública principal.

Qué hace:

- Presenta el proyecto.
- Explica la idea de apoyar con flanes.
- Muestra llamados a la acción según estado de sesión.

Comportamiento por usuario:

| Estado | Botón principal adicional |
|---|---|
| No autenticado | Crear cuenta |
| Creador | Ir al panel de creador |
| Seguidor | Ir al feed |

### 9.2. `Login.jsx`

Vista pública de inicio de sesión.

Qué hace:

- Captura email y contraseña.
- Llama `login(form)` desde `AuthContext`.
- Muestra errores si el backend rechaza credenciales.
- Redirige según rol.

Flujo:

```txt
Formulario submit
  ↓
AuthContext.login
  ↓
POST /auth/login
  ↓
Guardar sesión
  ↓
Navigate a dashboard por rol
```

### 9.3. `Register.jsx`

Vista pública de registro.

Qué hace:

- Permite crear cuenta como `CREADOR` o `SEGUIDOR`.
- Muestra campos adicionales si el rol es creador.
- Envía el body correcto según el rol.
- Hace login automático después de registrar.

Campos comunes:

- Nombre
- Email
- Contraseña
- Rol

Campos de creador:

- Nombre público
- Biografía
- URL foto de perfil
- URL banner

Campos de seguidor:

- Nombre visible

### 9.4. `Creators.jsx`

Vista pública de exploración.

Qué hace:

- Lista perfiles de creadores desde `/api/usuarios/perfiles-creadores`.
- Permite buscar por `nombre_publico`.
- Muestra cada creador como tarjeta visual.
- Enlaza a `/creators/:creatorId`.

Flujo:

```txt
useEffect inicial
  ↓
onlyflansApi.creators.list()
  ↓
GET /usuarios/perfiles-creadores
  ↓
Render de CreatorCard
```

### 9.5. `CreatorPublicProfile.jsx`

Vista pública del perfil de un creador.

Qué hace:

- Carga perfil público del creador.
- Carga meta de apoyo activa.
- Si el usuario es seguidor, consulta si ya lo tiene en favoritos.
- Si el usuario es seguidor, consulta si ya donó al creador.
- Si ya donó, muestra publicaciones.
- Permite registrar apoyo.
- Permite marcar/desactivar favorito.
- Permite comentar publicaciones desbloqueadas.

Regla de UI:

```txt
Seguidor sin apoyo → ve perfil, meta, botón donar, pero no publicaciones.
Seguidor con apoyo → ve perfil, meta, publicaciones y caja de comentario.
Usuario no autenticado → ve perfil y llamada a iniciar sesión.
Creador autenticado → ve perfil público, pero no acciones de seguidor.
```

Endpoints principales:

| Acción | Endpoint |
|---|---|
| Obtener perfil | `GET /api/usuarios/perfiles-creadores/:id_usuario` |
| Obtener meta | `GET /api/apoyos/metas?id_creador=...` |
| Consultar favoritos | `GET /api/usuarios/creadores-favoritos?id_seguidor=...&id_creador=...` |
| Crear favorito | `POST /api/usuarios/creadores-favoritos` |
| Desactivar favorito | `PUT /api/usuarios/creadores-favoritos/:id_favorito` |
| Consultar apoyos | `GET /api/apoyos?id_seguidor=...&id_creador=...` |
| Crear apoyo | `POST /api/apoyos` |
| Listar publicaciones | `GET /api/publicaciones?id_creador=...` |
| Comentar | `POST /api/publicaciones/comentarios` |

### 9.6. `CreatorDashboard.jsx`

Vista privada para rol `CREADOR`.

Qué hace:

- Carga el perfil del creador autenticado.
- Permite actualizar nombre público, biografía, foto y banner por URL.
- Permite crear o actualizar meta de apoyo.
- Permite desactivar meta.
- Permite crear publicaciones de texto o publicaciones con URL de imagen.
- Permite desactivar publicaciones.
- Carga comentarios recibidos por publicación.
- Calcula reporte de apoyos recibidos.

Flujo de carga:

```txt
CreatorDashboard monta
  ↓
getProfile(user.id)
  ↓
listPosts(user.id, includeComments=true)
  ↓
donations.list({ id_creador: user.id })
  ↓
Renderiza formularios + reporte + publicaciones
```

Notas importantes:

- No se usan uploads de archivo directos porque el backend documentado trabaja con campos URL (`foto_perfil_url`, `banner_url`, `link_imagen`).
- La desactivación se realiza con `PUT` y `estado_registro: INACTIVO`, porque el documento de rutas no expone `DELETE` para estos recursos.
- El reporte se calcula en frontend usando los apoyos devueltos por `/api/apoyos`.

### 9.7. `FollowerDashboard.jsx`

Vista privada para rol `SEGUIDOR`.

Qué hace:

- Carga favoritos del seguidor.
- Carga apoyos realizados por el seguidor.
- Construye un feed con publicaciones de creadores apoyados.
- Muestra historial de apoyos con filtros locales por fecha y nombre de creador.
- Permite quitar favoritos mediante desactivación lógica.

Flujo de carga:

```txt
FollowerDashboard monta
  ↓
favorites.list({ id_seguidor: user.id })
  ↓
donations.list({ id_seguidor: user.id })
  ↓
Por cada creador apoyado: getProfile + listPosts
  ↓
Render feed, favoritos e historial
```

### 9.8. `NotFound.jsx`

Vista de fallback.

Qué hace:

- Muestra mensaje de ruta no encontrada.
- Ofrece botón para volver al inicio.

---

## 10. Componentes compartidos

### 10.1. `Layout.jsx`

Estructura común de la app.

Responsabilidades:

- Renderiza topbar sticky.
- Muestra marca OnlyFlans.
- Muestra navegación pública.
- Muestra navegación privada según rol.
- Ejecuta logout.
- Renderiza `<Outlet />` para que React Router inserte la vista activa.

### 10.2. `Status.jsx`

Componentes simples de estado visual.

| Componente | Uso |
|---|---|
| `ErrorMessage` | Mostrar errores de backend, validación o comunicación. |
| `SuccessMessage` | Mostrar confirmaciones luego de crear, actualizar o desactivar. |
| `EmptyState` | Mostrar estados vacíos profesionales cuando no hay datos. |

---

## 11. Estrategia UI aplicada

La estrategia visual prioriza que el proyecto se vea **profesional, minimalista y armonioso**.

### 11.1. Decisiones visuales

- Fondo cálido y suave, evitando blanco plano agresivo.
- Cards con bordes redondeados, sombras sutiles y buena separación.
- Topbar sticky con blur para sensación moderna.
- Botones tipo pill para una interfaz amigable.
- Jerarquía tipográfica fuerte en títulos y ligera en textos secundarios.
- Colores tierra/naranja relacionados con la identidad de “flan”, sin saturar la pantalla.
- Grillas responsivas para tarjetas y formularios.
- Estados vacíos visibles para evitar pantallas confusas.
- Badges para estados como favorito o contenido desbloqueado.

### 11.2. Principios de UX usados

| Principio | Aplicación |
|---|---|
| Claridad | Cada vista tiene título, subtítulo y acción principal. |
| Separación por rol | Creador y seguidor tienen paneles diferentes. |
| Feedback inmediato | Errores y éxitos se muestran con `Status.jsx`. |
| Minimalismo | No se agregaron componentes innecesarios. |
| Consistencia | Formularios, cards, botones y listas usan clases compartidas. |
| Responsive | El layout se adapta a pantallas pequeñas con media queries. |

---

## 12. Mapeo frontend ↔ backend

El frontend fue alineado con los módulos documentados del backend:

| Módulo backend | Uso en frontend |
|---|---|
| Auth | Login, registro por rol, logout, validación `/me`. |
| Usuarios | Perfiles de creadores, perfiles de seguidores, favoritos. |
| Apoyos | Tipos de apoyo, metas y donaciones. |
| Publicaciones | Crear publicaciones, listar publicaciones, imágenes y comentarios. |

---

## 13. Consideraciones importantes

### 13.1. Tipo de apoyo `FLAN`

Para registrar una donación, el frontend busca un tipo de apoyo activo con código:

```txt
FLAN
```

Si no existe, muestra este error:

```txt
No existe un tipo de apoyo activo con código FLAN. Primero créalo o siémbralo desde el backend.
```

Antes de probar donaciones, asegúrate de crear ese tipo de apoyo:

```http
POST /api/apoyos/tipos
```

Con body similar a:

```json
{
  "codigo": "FLAN",
  "nombre": "Flan",
  "descripcion": "Apoyo simbólico equivalente a un flan.",
  "monto_unitario_bs": "10.00"
}
```

### 13.2. Desactivación en vez de eliminación

Como la documentación de rutas no expone `DELETE` para favoritos, metas o publicaciones, el frontend usa:

```json
{
  "estado_registro": "INACTIVO"
}
```

Esto respeta el enfoque de auditoría y baja lógica.

### 13.3. Imágenes por URL

La documentación del backend usa campos de URL:

- `foto_perfil_url`
- `banner_url`
- `link_imagen`

Por eso el frontend usa inputs de texto para URLs de imágenes, no `input type="file"` para subir archivos binarios.

---

## 14. Checklist recomendado para probar

1. Levantar backend.
2. Verificar que `.env` tenga `VITE_API_URL=http://localhost:3000/api` o el puerto correcto.
3. Crear tipo de apoyo `FLAN` desde backend/Postman.
4. Registrar un creador desde `/register`.
5. Iniciar sesión como creador.
6. Completar perfil, meta y crear publicación.
7. Cerrar sesión.
8. Registrar un seguidor desde `/register`.
9. Explorar creadores desde `/creators`.
10. Entrar al perfil del creador.
11. Marcar favorito.
12. Donar flanes.
13. Confirmar que se desbloquean publicaciones.
14. Comentar una publicación.
15. Volver al panel de creador y verificar comentario/reporte.

---

## 15. Detalle de cada archivo del frontend

### Archivos raíz

| Archivo | Qué hace |
|---|---|
| `.env.example` | Ejemplo de variable `VITE_API_URL` para conectar con el backend. |
| `index.html` | Documento HTML base donde Vite monta React en `#root`. |
| `netlify.toml` | Configuración de despliegue para Netlify. Redirige rutas SPA al `index.html`. |
| `package.json` | Define scripts y dependencias del frontend. |
| `package-lock.json` | Bloquea versiones instaladas de dependencias. |
| `vite.config.js` | Configuración de Vite y plugin React. |

### Carpeta `public/`

| Archivo | Qué hace |
|---|---|
| `public/_redirects` | Permite que rutas como `/creator/dashboard` funcionen al recargar en hosting SPA. |
| `public/.gitkeep` | Mantiene la carpeta versionada aunque esté vacía. |

### Carpeta `src/`

| Archivo | Qué hace |
|---|---|
| `src/main.jsx` | Punto de entrada React. Monta `BrowserRouter`, `AuthProvider` y `AppRouter`. |
| `src/styles.css` | Sistema visual completo: layout, cards, formularios, botones, grillas, responsive y estados. |
| `src/.gitkeep` | Marcador de carpeta. No afecta ejecución. |

### Carpeta `src/components/`

| Archivo | Qué hace |
|---|---|
| `Layout.jsx` | Shell principal. Contiene topbar, navegación por rol, logout y `<Outlet />`. |
| `Status.jsx` | Componentes reutilizables para errores, éxitos y estados vacíos. |

### Carpeta `src/pages/`

| Archivo | Qué hace |
|---|---|
| `Home.jsx` | Landing pública con propuesta de valor y accesos según sesión. |
| `Login.jsx` | Formulario de inicio de sesión y redirección por rol. |
| `Register.jsx` | Formulario de registro por rol; arma payload distinto para creador y seguidor. |
| `Creators.jsx` | Listado público de creadores con búsqueda por nombre público. |
| `CreatorPublicProfile.jsx` | Perfil público del creador; permite donar, favoritos y comentarios a seguidores. |
| `CreatorDashboard.jsx` | Panel privado del creador; gestiona perfil, meta, publicaciones y reporte. |
| `FollowerDashboard.jsx` | Panel privado del seguidor; muestra feed, favoritos e historial. |
| `NotFound.jsx` | Página de fallback para rutas no definidas. |

### Carpeta `src/routes/`

| Archivo | Qué hace |
|---|---|
| `AppRouter.jsx` | Declara todas las rutas de la SPA. |
| `ProtectedRoute.jsx` | Bloquea rutas sin sesión válida. |
| `RoleRoute.jsx` | Bloquea rutas cuando el rol no coincide. |

### Carpeta `src/services/`

| Archivo | Qué hace |
|---|---|
| `api.js` | Cliente Axios base, cookies, Authorization Bearer y manejo común de errores. |
| `onlyflansApi.js` | Capa de dominio. Centraliza endpoints, normalización y operaciones de negocio del frontend. |

### Carpeta `src/state/`

| Archivo | Qué hace |
|---|---|
| `AuthContext.jsx` | Estado global de autenticación, login, registro, logout y validación de sesión. |

### Carpeta `docs/`

| Archivo | Qué hace |
|---|---|
| `BACKEND_ROUTES_REFERENCE.md` | Copia de referencia de las rutas del backend usadas para alinear el frontend. |
| `CHANGELOG_FRONTEND_DETALLADO.md` | Documento detallado con todos los cambios realizados en el frontend. |

---

## 16. Estado actual de validación

Se ejecutó build de producción correctamente con:

```bash
npm run build
```

Resultado: Vite compiló la aplicación sin errores de sintaxis.

---

## 17. Próximas mejoras recomendadas

1. Agregar paginación real en listados grandes.
2. Agregar skeleton loaders en vez de textos simples de carga.
3. Crear un módulo de hooks (`useCreators`, `useDonations`) si el proyecto crece.
4. Implementar subida real de archivos si el backend incorpora storage.
5. Agregar tests de integración para rutas protegidas y login.
6. Reemplazar filtros locales por filtros backend cuando el backend exponga parámetros de fecha.
