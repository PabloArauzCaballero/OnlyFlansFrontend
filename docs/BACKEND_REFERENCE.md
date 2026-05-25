@ -1,65 +0,0 @@
# Backend routes reference used by this frontend

This document reflects the real Express routers found in the delivered backend. Older product docs mention routes such as `/api/auth/register`, `/api/creator/profile`, `/api/favorites` or `/api/donations`; those are not the routes consumed by this frontend.

## API base

```txt
VITE_API_URL=http://localhost:3000/api
```

## Auth

| Method | Route | Frontend use |
|---|---|---|
| POST | `/auth/registro/creador` | Creator registration form. |
| POST | `/auth/registro/seguidor` | Follower registration form. |
| POST | `/auth/login` | Login form. |
| POST | `/auth/logout` | Logout button. |
| GET | `/auth/me` | Session bootstrap after reload. |

## Usuarios

| Method | Route | Frontend use |
|---|---|---|
| GET | `/usuarios/perfiles-creadores` | Creator search/list. |
| GET | `/usuarios/perfiles-creadores/:id_usuario` | Public creator profile and creator dashboard. |
| PUT | `/usuarios/perfiles-creadores/:id_usuario` | Creator profile edit. |
| GET | `/usuarios/perfiles-seguidores/:id_usuario` | Follower profile lookup. |
| PUT | `/usuarios/perfiles-seguidores/:id_usuario` | Future follower profile edit. |
| GET | `/usuarios/creadores-favoritos` | Favorite status and follower dashboard. |
| POST | `/usuarios/creadores-favoritos` | Mark favorite. |
| PUT | `/usuarios/creadores-favoritos/:id_favorito` | Reactivate/deactivate favorite. |
| GET | `/usuarios/creadores-seguidos` | Follow status and follower dashboard. |
| POST | `/usuarios/creadores-seguidos` | Follow creator. |
| PUT | `/usuarios/creadores-seguidos/:id_seguimiento` | Reactivate/deactivate follow. |

## Publicaciones

| Method | Route | Frontend use |
|---|---|---|
| GET | `/publicaciones` | Creator posts and follower feed. |
| POST | `/publicaciones` | Text-only post. |
| POST | `/publicaciones/con-imagenes` | Post with one or more image URLs. |
| PUT | `/publicaciones/:id_publicacion` | Deactivate post with `estado_registro=INACTIVO`. |
| GET | `/publicaciones/imagenes` | Load post images. |
| GET | `/publicaciones/comentarios` | Creator dashboard comments. |
| POST | `/publicaciones/comentarios` | Follower comments. |

## Apoyos

| Method | Route | Frontend use |
|---|---|---|
| GET | `/apoyos` | Donation history and creator income report. |
| POST | `/apoyos` | Register symbolic support. |
| GET | `/apoyos/metas` | Public/creator goal lookup. |
| POST | `/apoyos/metas` | Create goal. |
| PUT | `/apoyos/metas/:id_meta` | Update/deactivate goal. |
| GET | `/apoyos/tipos` | Find active `FLAN` support type before donating. |

## Notes

- The frontend does not call `DELETE` because the backend does not expose delete routes.
- Deactivation is done with `PUT` and `estado_registro: "INACTIVO"`.
- Lists use `limit`, `offset`, `search`, `orderBy`, `orderDir` and domain-specific filters supported by backend schemas.
- Session requests send both credentials/cookies and bearer token when available.