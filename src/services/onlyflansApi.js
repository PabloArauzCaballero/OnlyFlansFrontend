import api from "./api.js";

export const ROLES = {
  CREATOR: "CREADOR",
  FOLLOWER: "SEGUIDOR",
};

export const RECORD_STATUS = {
  ACTIVE: "ACTIVO",
  INACTIVE: "INACTIVO",
  DELETED: "ELIMINADO",
};

export const PAYMENT_STATUS = {
  PENDING: "PENDIENTE",
  APPROVED: "SIMULADO_APROBADO",
  CANCELED: "ANULADO",
};

const SUPPORT_CODE = "FLAN";
const DEFAULT_FLAN_PRICE = "10.00";

function cleanPayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== "")
  );
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
}

export function unwrap(response) {
  const body = response?.data;
  if (!body || typeof body !== "object") return body;
  return body.data ?? body;
}

export function rows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  return [];
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeUser(raw = {}) {
  const user = raw.user || raw.usuario || raw;
  const id = user.id_usuario ?? user.idUsuario ?? user.id ?? user.sub;
  const role = user.rol || user.role || "";

  return {
    ...user,
    id,
    id_usuario: id,
    name: user.nombre || user.name || "Usuario",
    nombre: user.nombre || user.name || "Usuario",
    email: user.email || "",
    role,
    rol: role,
    coverUrl: user.url_imagen_portada || user.coverUrl || "",
    profileUrl: user.imagen_perfil || user.profileUrl || "",
    isCreator: role === ROLES.CREATOR,
    isFollower: role === ROLES.FOLLOWER,
  };
}

export function normalizeCreator(raw = {}) {
  const id = raw.id_usuario ?? raw.idUsuario ?? raw.creatorId ?? raw.id;
  const publicName = raw.nombre_publico || raw.publicName || raw.nombre || `Creador #${id || ""}`.trim();

  return {
    ...raw,
    id,
    creatorId: id,
    id_usuario: id,
    publicName,
    nombre_publico: raw.nombre_publico || publicName,
    bio: raw.biografia || raw.bio || "",
    biografia: raw.biografia || raw.bio || "",
    profileImageUrl: raw.foto_perfil_url || raw.profileImageUrl || raw.imagen_perfil || "",
    bannerImageUrl: raw.banner_url || raw.bannerImageUrl || raw.url_imagen_portada || "",
    status: raw.estado_registro || RECORD_STATUS.ACTIVE,
  };
}

export function normalizeFollower(raw = {}) {
  const id = raw.id_usuario ?? raw.idUsuario ?? raw.followerId ?? raw.id;

  return {
    ...raw,
    id,
    followerId: id,
    id_usuario: id,
    visibleName: raw.nombre_visible || raw.visibleName || raw.nombre || `Seguidor #${id || ""}`.trim(),
    status: raw.estado_registro || RECORD_STATUS.ACTIVE,
  };
}

export function normalizeGoal(raw = {}) {
  if (!raw || Object.keys(raw).length === 0) return null;

  return {
    ...raw,
    goalId: raw.id_meta ?? raw.goalId ?? raw.id,
    creatorId: raw.id_creador ?? raw.creatorId,
    title: raw.titulo || raw.title || "",
    description: raw.descripcion || raw.description || "",
    status: raw.estado_registro || RECORD_STATUS.ACTIVE,
  };
}

export function normalizeSupportType(raw = {}) {
  return {
    ...raw,
    supportTypeId: raw.id_tipo_apoyo ?? raw.supportTypeId ?? raw.id,
    code: raw.codigo || raw.code || "",
    name: raw.nombre || raw.name || "",
    description: raw.descripcion || raw.description || "",
    amountBs: raw.monto_unitario_bs || raw.amountBs || DEFAULT_FLAN_PRICE,
    status: raw.estado_registro || RECORD_STATUS.ACTIVE,
  };
}
export function normalizeDonation(raw = {}) {
  const quantity = asNumber(raw.cantidad ?? raw.flanQuantity, 0);
  const unitAmount = asNumber(raw.monto_unitario_bs ?? raw.amountUnitBs, asNumber(DEFAULT_FLAN_PRICE));
  const totalAmount = asNumber(raw.monto_total_bs ?? raw.amountBs, quantity * unitAmount);

  return {
    ...raw,
    donationId: raw.id_apoyo ?? raw.donationId ?? raw.id,
    followerId: raw.id_seguidor ?? raw.followerId,
    creatorId: raw.id_creador ?? raw.creatorId,
    supportTypeId: raw.id_tipo_apoyo ?? raw.supportTypeId,
    flanQuantity: quantity,
    amountUnitBs: unitAmount.toFixed(2),
    amountBs: totalAmount.toFixed(2),
    message: raw.mensaje || raw.message || "",
    paymentStatus: raw.estado_pago || raw.paymentStatus || "",
    status: raw.estado_registro || RECORD_STATUS.ACTIVE,
    createdAt: normalizeDate(raw.fecha_apoyo || raw.fecha_registro || raw.createdAt),
  };
}

export function normalizeComment(raw = {}) {
  return {
    ...raw,
    commentId: raw.id_comentario ?? raw.commentId ?? raw.id,
    postId: raw.id_publicacion ?? raw.postId,
    followerId: raw.id_seguidor ?? raw.followerId,
    content: raw.comentario || raw.content || "",
    status: raw.estado_registro || RECORD_STATUS.ACTIVE,
    createdAt: normalizeDate(raw.fecha_comentario || raw.fecha_registro || raw.createdAt),
  };
}

export function normalizePost(raw = {}, images = [], comments = []) {
  const id = raw.id_publicacion ?? raw.postId ?? raw.id;
  const normalizedImages = images
    .map((image) => ({
      ...image,
      imageId: image.id_publicacion_imagen ?? image.imageId ?? image.id,
      postId: image.id_publicacion ?? id,
      imageUrl: image.link_imagen || image.imageUrl || "",
      order: image.orden ?? image.order ?? 1,
      status: image.estado_registro || RECORD_STATUS.ACTIVE,
    }))
    .sort((a, b) => asNumber(a.order, 1) - asNumber(b.order, 1));

  return {
    ...raw,
    postId: id,
    id_publicacion: id,
    creatorId: raw.id_creador ?? raw.creatorId,
    text: raw.texto || raw.text || "",
    status: raw.estado_registro || RECORD_STATUS.ACTIVE,
    createdAt: normalizeDate(raw.fecha_publicacion || raw.fecha_registro || raw.createdAt),
    imageUrl: normalizedImages[0]?.imageUrl || raw.imageUrl || "",
    images: normalizedImages,
    comments: comments.map(normalizeComment),
  };
}

function normalizeFavorite(raw = {}) {
  return {
    ...raw,
    favoriteId: raw.id_favorito ?? raw.favoriteId ?? raw.id,
    followerId: raw.id_seguidor ?? raw.followerId,
    creatorId: raw.id_creador ?? raw.creatorId,
    status: raw.estado_registro || RECORD_STATUS.ACTIVE,
  };
}

function normalizeFollow(raw = {}) {
  return {
    ...raw,
    followId: raw.id_seguimiento ?? raw.followId ?? raw.id,
    followerId: raw.id_seguidor ?? raw.followerId,
    creatorId: raw.id_creador ?? raw.creatorId,
    status: raw.estado_registro || RECORD_STATUS.ACTIVE,
  };
}

async function listResource(path, params = {}) {
  const payload = unwrap(await api.get(`${path}${buildQuery(params)}`));
  return rows(payload);
}

async function listGoals(params = {}) {
  return (await listResource("/apoyos/metas", params)).map(normalizeGoal);
}

async function listPosts(params = {}, includeComments = false) {
  const rawPosts = await listResource("/publicaciones", params);
  return Promise.all(rawPosts.map((post) => enrichPost(post, includeComments)));
}

async function enrichPost(post, includeComments = false) {
  const id = post.id_publicacion ?? post.postId;
  const [imagesRes, commentsRes] = await Promise.allSettled([
    listResource("/publicaciones/imagenes", { id_publicacion: id, estado_registro: RECORD_STATUS.ACTIVE, limit: 100, orderBy: "orden", orderDir: "ASC" }),
    includeComments
      ? listResource("/publicaciones/comentarios", { id_publicacion: id, estado_registro: RECORD_STATUS.ACTIVE, limit: 100 })
      : Promise.resolve([]),
  ]);

  const images = imagesRes.status === "fulfilled" ? imagesRes.value : [];
  const comments = commentsRes.status === "fulfilled" ? commentsRes.value : [];
  return normalizePost(post, images, comments);
}

async function getCreatorProfile(id) {
  const creator = normalizeCreator(unwrap(await api.get(`/usuarios/perfiles-creadores/${id}`)));
  const goals = await listGoals({ id_creador: id, estado_registro: RECORD_STATUS.ACTIVE, limit: 1 });
  return { ...creator, goal: goals[0] || null };
}

async function listFavorites(params = {}, { activeOnly = true } = {}) {
  const rowsData = await listResource("/usuarios/creadores-favoritos", params);
  const normalized = rowsData.map(normalizeFavorite);
  return activeOnly ? normalized.filter((item) => item.status === RECORD_STATUS.ACTIVE) : normalized;
}

async function listFollows(params = {}, { activeOnly = true } = {}) {
  const rowsData = await listResource("/usuarios/creadores-seguidos", params);
  const normalized = rowsData.map(normalizeFollow);
  return activeOnly ? normalized.filter((item) => item.status === RECORD_STATUS.ACTIVE) : normalized;
}

async function upsertFavorite({ followerId, creatorId }) {
  const existing = (await listFavorites({ id_seguidor: followerId, id_creador: creatorId, limit: 1 }, { activeOnly: false }))[0];

  if (existing?.favoriteId) {
    return normalizeFavorite(unwrap(await api.put(`/usuarios/creadores-favoritos/${existing.favoriteId}`, { estado_registro: RECORD_STATUS.ACTIVE })));
  }

  return normalizeFavorite(unwrap(await api.post("/usuarios/creadores-favoritos", {
    id_seguidor: followerId,
    id_creador: creatorId,
  })));
}

async function upsertFollow({ followerId, creatorId }) {
  const existing = (await listFollows({ id_seguidor: followerId, id_creador: creatorId, limit: 1 }, { activeOnly: false }))[0];

  if (existing?.followId) {
    return normalizeFollow(unwrap(await api.put(`/usuarios/creadores-seguidos/${existing.followId}`, { estado_registro: RECORD_STATUS.ACTIVE })));
  }

  return normalizeFollow(unwrap(await api.post("/usuarios/creadores-seguidos", {
    id_seguidor: followerId,
    id_creador: creatorId,
  })));
}

async function getFlanSupportType() {
  const exactMatches = (await listResource("/apoyos/tipos", { codigo: SUPPORT_CODE, estado_registro: RECORD_STATUS.ACTIVE, limit: 1 }))
    .map(normalizeSupportType);

  return exactMatches.find((item) => item.code === SUPPORT_CODE) || exactMatches[0] || null;
}

function summarizeDonations(donations = []) {
  const totalFlans = donations.reduce((sum, item) => sum + asNumber(item.flanQuantity), 0);
  const totalBs = donations.reduce((sum, item) => sum + asNumber(item.amountBs), 0);

  return {
    totalFlans,
    totalBs: totalBs.toFixed(2),
    donationCount: donations.length,
  };
}

export const authApi = {
  async login(payload) {
    const data = unwrap(await api.post("/auth/login", payload));
    const token = data.accessToken || data.token || data.access_token || null;
    const refreshToken = data.refreshToken || data.refresh_token || null;
    const user = normalizeUser(data.user || data.usuario || data);

    return {
      user,
      token,
      refreshToken,
      session: data.session || data.sesion || null,
    };
  },

  async register(payload) {
    const role = payload.role || ROLES.FOLLOWER;
    const usuario = cleanPayload({
      nombre: payload.name,
      email: payload.email,
      password: payload.password,
      rol: role,
      url_imagen_portada: payload.coverUrl,
      imagen_perfil: payload.profileUrl,
    });

    if (role === ROLES.CREATOR) {
      await api.post("/auth/registro/creador", {
        usuario,
        perfil_creador: cleanPayload({
          nombre_publico: payload.publicName || payload.name,
          biografia: payload.bio,
          foto_perfil_url: payload.profileUrl,
          banner_url: payload.coverUrl,
        }),
      });
    } else {
      await api.post("/auth/registro/seguidor", {
        usuario,
        perfil_seguidor: {
          nombre_visible: payload.visibleName || payload.name,
        },
      });
    }

    return this.login({ email: payload.email, password: payload.password });
  },

  async me() {
    return normalizeUser(unwrap(await api.get("/auth/me")));
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // Aunque el backend devuelva 401 por expiración, el frontend debe limpiar sesión local.
    }
  },
};

export const onlyflansApi = {
  unwrap,
  rows,
  buildQuery,
  cleanPayload,
  normalizeUser,
  normalizeCreator,
  normalizeDonation,
  normalizePost,
  summarizeDonations,

  creators: {
    async list({ search = "", limit = 100, offset = 0 } = {}) {
      const params = { estado_registro: RECORD_STATUS.ACTIVE, limit, offset };
      if (search) params.search = search;
      return (await listResource("/usuarios/perfiles-creadores", params)).map(normalizeCreator);
    },
    getProfile: getCreatorProfile,
    async listPosts(id, includeComments = false) {
      return listPosts({ id_creador: id, estado_registro: RECORD_STATUS.ACTIVE, limit: 100 }, includeComments);
    },
    async updateProfile(id, payload) {
      return normalizeCreator(unwrap(await api.put(`/usuarios/perfiles-creadores/${id}`, cleanPayload(payload))));
    },
  },

  followers: {
    async getProfile(id) {
      return normalizeFollower(unwrap(await api.get(`/usuarios/perfiles-seguidores/${id}`)));
    },
    async updateProfile(id, payload) {
      return normalizeFollower(unwrap(await api.put(`/usuarios/perfiles-seguidores/${id}`, cleanPayload(payload))));
    },
  },

  goals: {
    list: listGoals,
    async save(currentGoal, creatorId, payload) {
      const body = cleanPayload({
        id_creador: creatorId,
        titulo: payload.title,
        descripcion: payload.description,
        estado_registro: RECORD_STATUS.ACTIVE,
      });

      if (currentGoal?.goalId) {
        return normalizeGoal(unwrap(await api.put(`/apoyos/metas/${currentGoal.goalId}`, body)));
      }

      return normalizeGoal(unwrap(await api.post("/apoyos/metas", body)));
    },
    async deactivate(goal) {
      if (!goal?.goalId) return null;
      return normalizeGoal(unwrap(await api.put(`/apoyos/metas/${goal.goalId}`, { estado_registro: RECORD_STATUS.INACTIVE })));
    },
  },

  posts: {
    async create({ creatorId, text, imageUrls = [] }) {
      const images = imageUrls
        .map((url) => String(url || "").trim())
        .filter(Boolean)
        .map((url, index) => ({ link_imagen: url, orden: index + 1 }));

      if (images.length > 0) {
        return normalizePost(unwrap(await api.post("/publicaciones/con-imagenes", {
          id_creador: creatorId,
          texto: text || undefined,
          imagenes: images,
        })));
      }

      return normalizePost(unwrap(await api.post("/publicaciones", {
        id_creador: creatorId,
        texto: text,
      })));
    },
    async update(id, payload) {
      return normalizePost(unwrap(await api.put(`/publicaciones/${id}`, cleanPayload(payload))));
    },
    async deactivate(post) {
      if (!post?.postId) return null;
      return normalizePost(unwrap(await api.put(`/publicaciones/${post.postId}`, { estado_registro: RECORD_STATUS.INACTIVE })));
    },
    async comment({ postId, followerId, content }) {
      return normalizeComment(unwrap(await api.post("/publicaciones/comentarios", {
        id_publicacion: postId,
        id_seguidor: followerId,
        comentario: content,
      })));
    },
  },

  favorites: {
    list: listFavorites,
    add: upsertFavorite,
    async deactivate(favorite) {
      if (!favorite?.favoriteId) return null;
      return normalizeFavorite(unwrap(await api.put(`/usuarios/creadores-favoritos/${favorite.favoriteId}`, { estado_registro: RECORD_STATUS.INACTIVE })));
    },
  },

  follows: {
    list: listFollows,
    add: upsertFollow,
    async deactivate(follow) {
      if (!follow?.followId) return null;
      return normalizeFollow(unwrap(await api.put(`/usuarios/creadores-seguidos/${follow.followId}`, { estado_registro: RECORD_STATUS.INACTIVE })));
    },
  },

  supportTypes: {
    async list(params = {}) {
      return (await listResource("/apoyos/tipos", params)).map(normalizeSupportType);
    },
    getFlan: getFlanSupportType,
  },

  donations: {
    async list(params = {}) {
      return (await listResource("/apoyos", params)).map(normalizeDonation);
    },
    async create({ followerId, creatorId, quantity, message = "" }) {
      const supportType = await getFlanSupportType();

      if (!supportType?.supportTypeId) {
        throw new Error("No existe un tipo de apoyo activo con código FLAN. Revisa que el DDL/seed del backend haya cargado el catálogo tipo_apoyo.");
      }

      return normalizeDonation(unwrap(await api.post("/apoyos", cleanPayload({
        id_seguidor: followerId,
        id_creador: creatorId,
        id_tipo_apoyo: supportType.supportTypeId,
        cantidad: Number(quantity),
        monto_unitario_bs: supportType.amountBs || DEFAULT_FLAN_PRICE,
        mensaje: message || null,
        estado_pago: PAYMENT_STATUS.APPROVED,
      }))));
    },
    summarize: summarizeDonations,
  },
};
