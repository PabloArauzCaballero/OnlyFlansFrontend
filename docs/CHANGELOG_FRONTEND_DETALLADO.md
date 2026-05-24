# Changelog detallado del frontend OnlyFlans

Este documento describe de forma clara y técnica los cambios realizados en el frontend. La intención es que cualquier persona que reciba el proyecto pueda entender qué se ajustó, por qué se hizo y qué archivos fueron modificados.

---

## 1. Objetivo general de los cambios

El objetivo fue mejorar el frontend en tres dimensiones:

1. **Coherencia con el backend documentado:** el frontend anterior usaba rutas y roles que no coincidían con la documentación de rutas del backend.
2. **Claridad de flujo:** se reorganizó la integración para que las vistas no dependan directamente de detalles complejos de la API.
3. **Presentación profesional:** se aplicó una estrategia visual minimalista, cálida y consistente para que el proyecto tenga mejor presencia.

---

## 2. Problemas detectados antes del ajuste

### 2.1. Rutas frontend no alineadas con backend

El frontend anterior llamaba endpoints como:

```txt
/auth/register
/creator/dashboard
/creator/profile
/creator/posts
/feed
/favorites
/donations
/posts/:postId/comments
```

Pero la documentación de backend define rutas agrupadas bajo módulos como:

```txt
/api/auth/registro/creador
/api/auth/registro/seguidor
/api/auth/login
/api/auth/me
/api/usuarios/perfiles-creadores
/api/usuarios/creadores-favoritos
/api/apoyos
/api/apoyos/metas
/api/publicaciones
/api/publicaciones/con-imagenes
/api/publicaciones/comentarios
```

Por eso se modificó la integración para consumir los módulos reales documentados.

### 2.2. Roles inconsistentes

El frontend anterior usaba:

```txt
CREATOR
FOLLOWER
```

El backend documentado usa:

```txt
CREADOR
SEGUIDOR
```

Se ajustó todo el frontend para trabajar con los roles `CREADOR` y `SEGUIDOR`.

### 2.3. Subida de archivos no documentada

El frontend anterior usaba `FormData` para subir imágenes. Sin embargo, las rutas documentadas del backend trabajan con URLs:

```txt
foto_perfil_url
banner_url
link_imagen
```

Se reemplazaron los inputs de archivo por inputs de URL para que el frontend respete el contrato actual del backend.

### 2.4. Vistas acopladas a endpoints inexistentes

Las vistas anteriores dependían de endpoints de alto nivel como `/creator/dashboard` o `/feed`. Como esos endpoints no aparecen en la documentación de rutas, se reconstruyó el flujo desde endpoints CRUD reales.

---

## 3. Cambios principales realizados

### 3.1. Nueva capa de dominio `onlyflansApi.js`

Se agregó:

```txt
src/services/onlyflansApi.js
```

Este archivo centraliza la comunicación de dominio con el backend.

Hace lo siguiente:

- Define roles oficiales.
- Normaliza usuarios, creadores, seguidores, metas, apoyos, favoritos, publicaciones y comentarios.
- Extrae `rows` de respuestas paginadas.
- Convierte nombres del backend a nombres cómodos para React.
- Agrupa métodos por dominio:
  - `authApi`
  - `onlyflansApi.creators`
  - `onlyflansApi.followers`
  - `onlyflansApi.goals`
  - `onlyflansApi.posts`
  - `onlyflansApi.favorites`
  - `onlyflansApi.donations`

Ejemplo de conversión:

```txt
id_usuario       → id / creatorId / followerId
nombre_publico   → publicName
biografia        → bio
foto_perfil_url  → profileImageUrl
banner_url       → bannerImageUrl
id_apoyo         → donationId
cantidad         → flanQuantity
monto_total_bs   → amountBs
```

Beneficio: las páginas React ya no tienen que saber cómo viene exactamente cada respuesta del backend.

---

## 4. Cambios por archivo

## 4.1. `src/services/api.js`

### Antes

- Usaba `http://localhost:4000/api` como URL por defecto.
- Guardaba token con clave `onlyflans_token`.
- No tenía `withCredentials`.

### Ahora

- Usa `http://localhost:3000/api` como URL por defecto, coherente con la documentación.
- Activa `withCredentials: true` para soportar cookies HTTP-only.
- Usa `onlyflans_access_token` como clave de access token.
- Agrega Authorization Bearer si existe token local.
- Normaliza errores del backend.

### Motivo

El backend documentado setea cookies HTTP-only al iniciar sesión y también permite token por header. El frontend ahora soporta ambos.

---

## 4.2. `src/services/onlyflansApi.js`

### Cambio

Archivo nuevo.

### Qué resuelve

- Evita repetir lógica HTTP en cada vista.
- Evita que los componentes se llenen de detalles del backend.
- Permite adaptar nombres de campos backend a nombres más claros en frontend.
- Permite trabajar con respuestas estándar `{ success, message, data }` y listados `{ count, rows }`.

### Métodos relevantes

| Método | Qué hace |
|---|---|
| `authApi.login` | Llama `/auth/login`, normaliza usuario y tokens. |
| `authApi.register` | Decide si registrar creador o seguidor y luego hace login automático. |
| `authApi.me` | Valida sesión con `/auth/me`. |
| `authApi.logout` | Llama `/auth/logout`. |
| `onlyflansApi.creators.list` | Lista creadores desde `/usuarios/perfiles-creadores`. |
| `onlyflansApi.creators.getProfile` | Obtiene perfil de creador y su meta. |
| `onlyflansApi.creators.listPosts` | Lista publicaciones y opcionalmente comentarios. |
| `onlyflansApi.goals.save` | Crea o actualiza meta. |
| `onlyflansApi.posts.create` | Crea publicación simple o con imagen. |
| `onlyflansApi.posts.comment` | Crea comentario. |
| `onlyflansApi.favorites.list` | Lista favoritos del seguidor. |
| `onlyflansApi.favorites.add` | Crea favorito. |
| `onlyflansApi.favorites.deactivate` | Desactiva favorito con `estado_registro: INACTIVO`. |
| `onlyflansApi.donations.create` | Crea apoyo usando tipo de apoyo `FLAN`. |
| `onlyflansApi.donations.summarize` | Calcula total de flanes, total Bs. y cantidad de apoyos. |

---

## 4.3. `src/state/AuthContext.jsx`

### Antes

- Guardaba usuario y token directamente desde `/auth/register` y `/auth/login`.
- Esperaba que registro devuelva una sesión completa.
- No validaba sesión con `/auth/me` al recargar.

### Ahora

- Guarda sesión con claves claras:
  - `onlyflans_user`
  - `onlyflans_access_token`
  - `onlyflans_refresh_token`
- El registro crea usuario/perfil y luego ejecuta login automático.
- Al recargar la página valida la sesión con `/auth/me`.
- Si la sesión ya no es válida, limpia localStorage.
- Expone `isBootstrapping` para evitar redirecciones bruscas mientras valida sesión.

### Beneficio

La app queda más estable ante recargas, tokens expirados o sesiones inválidas.

---

## 4.4. `src/routes/AppRouter.jsx`

### Cambios

- Se cambiaron los roles protegidos:

```txt
CREATOR  → CREADOR
FOLLOWER → SEGUIDOR
```

### Rutas protegidas actuales

```txt
/creator/dashboard  → requiere CREADOR
/follower/dashboard → requiere SEGUIDOR
```

---

## 4.5. `src/routes/ProtectedRoute.jsx`

### Antes

- Si no había sesión, redirigía inmediatamente.

### Ahora

- Primero revisa `isBootstrapping`.
- Muestra una tarjeta de “Validando sesión...” mientras `AuthContext` verifica `/auth/me`.
- Solo redirige si la sesión realmente no existe.

### Beneficio

Evita que el usuario autenticado sea enviado a login por un instante al recargar la página.

---

## 4.6. `src/routes/RoleRoute.jsx`

### Cambio

Se mantiene la lógica, pero ahora trabaja con roles oficiales del backend:

```txt
CREADOR
SEGUIDOR
```

---

## 4.7. `src/components/Layout.jsx`

### Antes

- Mostraba navegación con roles `CREATOR/FOLLOWER`.
- Logout era solo local.

### Ahora

- Usa roles `CREADOR/SEGUIDOR`.
- Muestra navegación según rol real.
- Agrega marca visual más profesional con `brand-mark`.
- Muestra estado “Validando sesión...” durante bootstrap.
- Ejecuta logout contra backend y luego limpia sesión local.

### Resultado

La barra superior queda más clara, moderna y consistente.

---

## 4.8. `src/components/Status.jsx`

### Cambio

No necesitó cambio funcional profundo.

### Uso actual

Se mantiene como componente compartido para:

- Errores.
- Mensajes de éxito.
- Estados vacíos.

---

## 4.9. `src/pages/Home.jsx`

### Antes

- Landing sencilla enfocada en compra de flanes.

### Ahora

- Landing más profesional.
- Explica mejor la plataforma.
- Muestra accesos según sesión y rol.
- Incluye panel lateral con métricas simples.

### Objetivo UI

Dar mejor primera impresión sin saturar la pantalla.

---

## 4.10. `src/pages/Login.jsx`

### Cambios

- Usa roles oficiales para redirigir.
- Elimina datos demo que podían confundir si no existían en backend.
- Mejora texto de ayuda.
- Mantiene manejo de loading y errores.

### Flujo actual

```txt
Formulario
  ↓
AuthContext.login
  ↓
POST /api/auth/login
  ↓
Redirige según rol
```

---

## 4.11. `src/pages/Register.jsx`

### Antes

- Enviaba un body genérico a `/auth/register`.
- Usaba roles `CREATOR/FOLLOWER`.

### Ahora

- Permite seleccionar rol `CREADOR` o `SEGUIDOR`.
- Si es creador, muestra campos de perfil público.
- Si es seguidor, muestra nombre visible.
- Arma el payload correcto para:
  - `/api/auth/registro/creador`
  - `/api/auth/registro/seguidor`
- Luego ejecuta login automático.

### Beneficio

El registro ahora respeta la regla del backend: no crear usuario suelto sin perfil correspondiente.

---

## 4.12. `src/pages/Creators.jsx`

### Antes

- Llamaba `/creators`.

### Ahora

- Llama `/api/usuarios/perfiles-creadores` mediante `onlyflansApi.creators.list`.
- Usa query `nombre_publico` para búsqueda.
- Mejora las tarjetas visuales con banner, avatar, descripción y CTA.
- Agrega estado vacío claro.

### Beneficio

La vista queda alineada con el módulo Usuarios del backend.

---

## 4.13. `src/pages/CreatorPublicProfile.jsx`

### Antes

- Llamaba `/creators/:creatorId`, `/favorites`, `/donations`, `/posts/:id/comments`.
- Dependía de endpoints no documentados.

### Ahora

Usa endpoints documentados:

```txt
GET  /api/usuarios/perfiles-creadores/:id_usuario
GET  /api/apoyos/metas?id_creador=...
GET  /api/usuarios/creadores-favoritos?id_seguidor=...&id_creador=...
POST /api/usuarios/creadores-favoritos
PUT  /api/usuarios/creadores-favoritos/:id_favorito
GET  /api/apoyos?id_seguidor=...&id_creador=...
POST /api/apoyos
GET  /api/publicaciones?id_creador=...
POST /api/publicaciones/comentarios
```

### Reglas aplicadas

- Usuario no autenticado: ve perfil y CTA para iniciar sesión.
- Seguidor sin apoyo: puede donar y marcar favorito, pero no ve publicaciones.
- Seguidor con apoyo: ve publicaciones y puede comentar.
- Creador autenticado: puede ver perfil, pero no acciones de seguidor.

---

## 4.14. `src/pages/CreatorDashboard.jsx`

### Antes

- Dependía de `/creator/dashboard`, `/creator/profile`, `/creator/goal`, `/creator/posts`.
- Usaba subida de imágenes con `FormData`.

### Ahora

Usa endpoints documentados:

```txt
GET /api/usuarios/perfiles-creadores/:id_usuario
PUT /api/usuarios/perfiles-creadores/:id_usuario
GET /api/apoyos/metas?id_creador=...
POST /api/apoyos/metas
PUT /api/apoyos/metas/:id_meta
POST /api/publicaciones
POST /api/publicaciones/con-imagenes
PUT /api/publicaciones/:id_publicacion
GET /api/publicaciones/comentarios?id_publicacion=...
GET /api/apoyos?id_creador=...
```

### Cambios de UI

- Formulario de perfil público con URLs de imagen.
- Formulario de meta.
- Formulario de publicación con URL opcional de imagen.
- Reporte de ingresos calculado desde apoyos.
- Listado de publicaciones con comentarios recibidos.

### Decisión importante

La eliminación se maneja como desactivación lógica usando:

```json
{ "estado_registro": "INACTIVO" }
```

---

## 4.15. `src/pages/FollowerDashboard.jsx`

### Antes

- Dependía de `/feed`, `/favorites`, `/follower/donations`.

### Ahora

Construye el panel usando endpoints documentados:

```txt
GET /api/usuarios/creadores-favoritos?id_seguidor=...
GET /api/apoyos?id_seguidor=...
GET /api/usuarios/perfiles-creadores/:id_usuario
GET /api/publicaciones?id_creador=...
PUT /api/usuarios/creadores-favoritos/:id_favorito
```

### Qué hace ahora

- Obtiene favoritos reales.
- Obtiene apoyos reales.
- Construye feed con publicaciones de creadores apoyados.
- Calcula historial y totales en frontend.
- Filtra por fecha y nombre de creador de forma local.

---

## 4.16. `src/styles.css`

### Antes

- Ya existía una base visual cálida.

### Ahora

Se reforzó la identidad visual:

- Variables CSS para colores, bordes, sombras y radios.
- Topbar sticky con blur.
- Marca visual `OF`.
- Cards más limpias y profesionales.
- Botones tipo pill.
- Layout hero más moderno.
- Grillas responsivas.
- Tarjetas de creador con banner y avatar.
- Estados de error, éxito y vacío más claros.
- Mejor foco visual en inputs.
- Mejor experiencia en pantallas pequeñas.

---

## 5. Estrategia UI aplicada

La estrategia seleccionada fue **minimalismo cálido profesional**.

### Por qué esta estrategia

OnlyFlans tiene una idea lúdica y cercana, pero el proyecto necesita verse serio para evaluación académica o presentación técnica. Por eso se evitó una UI demasiado infantil o saturada.

### Criterios aplicados

| Criterio | Aplicación |
|---|---|
| Profesional | Espaciado generoso, cards limpias y jerarquía clara. |
| Minimalista | Pocas clases visuales, sin exceso de colores. |
| Armónico | Paleta cálida relacionada con flan/caramelo. |
| Comprensible | Cada vista explica qué hace. |
| Escalable | Servicios separados de las vistas. |
| Responsive | Grillas adaptables y navegación flexible. |

---

## 6. Cambios en documentación

### 6.1. `README.md`

Se creó un README detallado que explica:

- Stack.
- Instalación.
- Estructura.
- Flujo de información.
- Rutas React.
- Autenticación.
- Servicios.
- Vista por vista.
- Estrategia UI.
- Mapeo frontend-backend.
- Checklist de pruebas.
- Qué hace cada archivo.

### 6.2. `docs/CHANGELOG_FRONTEND_DETALLADO.md`

Este documento describe todos los cambios técnicos y visuales realizados.

### 6.3. `docs/BACKEND_ROUTES_REFERENCE.md`

Se añadió una copia del documento de rutas del backend como referencia interna del frontend.

---

## 7. Validación realizada

Se instaló dependencias y se ejecutó:

```bash
npm run build
```

Resultado:

```txt
Vite compiló correctamente el proyecto de producción.
```

Esto valida que los archivos modificados no tienen errores de sintaxis o imports rotos.

---

## 8. Supuestos técnicos importantes

### 8.1. Tipo de apoyo FLAN

Para crear una donación, debe existir un tipo de apoyo activo con:

```txt
codigo = FLAN
```

Si no existe, el frontend mostrará un error instructivo.

### 8.2. Filtros por fecha

El backend documentado de `/api/apoyos` no muestra filtros por fecha. Por eso el frontend filtra historial y reportes localmente después de recibir los apoyos.

### 8.3. Desactivación lógica

Como no hay rutas `DELETE` documentadas para varios recursos, se usa `estado_registro: INACTIVO`.

### 8.4. Imágenes

El frontend espera URLs de imagen, no archivos binarios.

---

## 9. Archivos modificados o creados

### Creados

```txt
src/services/onlyflansApi.js
docs/BACKEND_ROUTES_REFERENCE.md
docs/CHANGELOG_FRONTEND_DETALLADO.md
README.md
```

### Modificados

```txt
src/services/api.js
src/state/AuthContext.jsx
src/components/Layout.jsx
src/routes/AppRouter.jsx
src/routes/ProtectedRoute.jsx
src/routes/RoleRoute.jsx
src/pages/Home.jsx
src/pages/Login.jsx
src/pages/Register.jsx
src/pages/Creators.jsx
src/pages/CreatorPublicProfile.jsx
src/pages/CreatorDashboard.jsx
src/pages/FollowerDashboard.jsx
src/styles.css
```

---

## 10. Resultado final

El frontend queda con:

- Flujo de rutas más claro.
- Separación correcta por rol.
- Integración basada en módulos reales del backend.
- Documentación suficiente para guiar a otro desarrollador.
- UI más profesional, minimalista y coherente.
- Build de producción funcionando.
