import api from "./api.js";

export const ROLES = {
  CREATOR: "CREADOR",
  FOLLOWER: "SEGUIDOR",
};

const ACTIVE_STATUS = "ACTIVO";
const SUPPORT_CODE = "FLAN";
const DEFAULT_FLAN_PRICE = "10.00";

function unwrap(response) {
  const body = response?.data;
  if (!body || typeof body !== "object") return body;
  return body.data ?? body;
}

function rows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  return [];
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeUser(raw = {}) {
  const user = raw.user || raw.usuario || raw;
  const id = user.id_usuario ?? user.idUsuario ?? user.id ?? user.id_persona_usuario;
  const role = user.rol || user.role || "";

  return {
    ...user,
    id,
    id_usuario: id,
    name: user.nombre || user.name || user.nombres || "Usuario",
    nombre: user.nombre || user.name || user.nombres || "Usuario",
    email: user.email || "",
    role,
    rol: role,
    isCreator: role === ROLES.CREATOR,
    isFollower: role === ROLES.FOLLOWER,
  };
}

function normalizeCreator(raw = {}) {
  const id = raw.id_usuario ?? raw.idUsuario ?? raw.creatorId ?? raw.id;
  return {
    ...raw,
    creatorId: id,
    id_usuario: id,
    publicName: raw.nombre_publico || raw.publicName || raw.nombre || "Creador sin nombre",
    bio: raw.biografia || raw.bio || "",
    profileImageUrl: raw.foto_perfil_url || raw.profileImageUrl || raw.imagen_perfil || "",
    bannerImageUrl: raw.banner_url || raw.bannerImageUrl || raw.url_imagen_portada || "",
  };
}

function normalizeFollower(raw = {}) {
  const id = raw.id_usuario ?? raw.idUsuario ?? raw.followerId ?? raw.id;
  return {
    ...raw,
    followerId: id,
    id_usuario: id,
    visibleName: raw.nombre_visible || raw.visibleName || raw.nombre || "Seguidor",
  };
}

function normalizeGoal(raw = {}) {
  if (!raw || Object.keys(raw).length === 0) return null;
  return {
    ...raw,
    goalId: raw.id_meta ?? raw.goalId ?? raw.id,
    title: raw.titulo || raw.title || "",
    description: raw.descripcion || raw.description || "",
  };
}

function normalizeSupportType(raw = {}) {
  return {
    ...raw,
    supportTypeId: raw.id_tipo_apoyo ?? raw.supportTypeId ?? raw.id,
    code: raw.codigo || raw.code || "",
    name: raw.nombre || raw.name || "",
    amountBs: raw.monto_unitario_bs || raw.amountBs || DEFAULT_FLAN_PRICE,
  };
}

function normalizeDonation(raw = {}) {
  const quantity = asNumber(raw.cantidad ?? raw.flanQuantity ?? 0);
  const unitAmount = asNumber(raw.monto_unitario_bs ?? raw.amountUnitBs ?? DEFAULT_FLAN_PRICE);
  const totalAmount = asNumber(raw.monto_total_bs ?? raw.amountBs ?? quantity * unitAmount);

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
    createdAt: raw.fecha_apoyo || raw.fecha_registro || raw.createdAt,
  };
}

function normalizePost(raw = {}, images = [], comments = []) {
  const id = raw.id_publicacion ?? raw.postId ?? raw.id;
  const normalizedImages = images.map((image) => ({
    ...image,
    imageId: image.id_publicacion_imagen ?? image.imageId ?? image.id,
    postId: image.id_publicacion ?? id,
    imageUrl: image.link_imagen || image.imageUrl || "",
    order: image.orden ?? image.order ?? 1,
  }));

  return {
    ...raw,
    postId: id,
    creatorId: raw.id_creador ?? raw.creatorId,
    text: raw.texto || raw.text || "",
    createdAt: raw.fecha_publicacion || raw.fecha_registro || raw.createdAt,
    imageUrl: normalizedImages[0]?.imageUrl || raw.imageUrl || "",
    images: normalizedImages,
    comments: comments.map(normalizeComment),
  };
}

function normalizeComment(raw = {}) {
  return {
    ...raw,
    commentId: raw.id_comentario ?? raw.commentId ?? raw.id,
    postId: raw.id_publicacion ?? raw.postId,
    followerId: raw.id_seguidor ?? raw.followerId,
    content: raw.comentario || raw.content || "",
    createdAt: raw.fecha_comentario || raw.fecha_registro || raw.createdAt,
  };
}

function normalizeFavorite(raw = {}) {
  return {
    ...raw,
    favoriteId: raw.id_favorito ?? raw.favoriteId ?? raw.id,
    followerId: raw.id_seguidor ?? raw.followerId,
    creatorId: raw.id_creador ?? raw.creatorId,
    status: raw.estado_registro || raw.status || ACTIVE_STATUS,
  };
}

async function getCreatorProfile(id) {
  const creator = normalizeCreator(unwrap(await api.get(`/usuarios/perfiles-creadores/${id}`)));
  const [goalsRes, postsRes] = await Promise.allSettled([
    api.get(`/apoyos/metas?id_creador=${encodeURIComponent(id)}&estado_registro=ACTIVO`),
    api.get(`/publicaciones?id_creador=${encodeURIComponent(id)}&estado_registro=ACTIVO`),
  ]);

  const goals = goalsRes.status === "fulfilled" ? rows(unwrap(goalsRes.value)).map(normalizeGoal) : [];
  const rawPosts = postsRes.status === "fulfilled" ? rows(unwrap(postsRes.value)) : [];

  return {
    ...creator,
    goal: goals[0] || null,
    rawPosts,
  };
}

async function enrichPost(post, includeComments = false) {
  const id = post.id_publicacion ?? post.postId;
  const [imagesRes, commentsRes] = await Promise.allSettled([
    api.get(`/publicaciones/imagenes?id_publicacion=${encodeURIComponent(id)}&estado_registro=ACTIVO`),
    includeComments ? api.get(`/publicaciones/comentarios?id_publicacion=${encodeURIComponent(id)}&estado_registro=ACTIVO`) : Promise.resolve({ data: { data: [] } }),
  ]);

  const images = imagesRes.status === "fulfilled" ? rows(unwrap(imagesRes.value)) : [];
  const comments = commentsRes.status === "fulfilled" ? rows(unwrap(commentsRes.value)) : [];
  return normalizePost(post, images, comments);
}

async function listPostsByCreator(id, includeComments = false) {
  const payload = unwrap(await api.get(`/publicaciones?id_creador=${encodeURIComponent(id)}&estado_registro=ACTIVO`));
  const rawPosts = rows(payload);
  return Promise.all(rawPosts.map((post) => enrichPost(post, includeComments)));
}

async function listDonations(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const payload = unwrap(await api.get(`/apoyos${suffix}`));
  return rows(payload).map(normalizeDonation);
}

async function listFavorites(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const payload = unwrap(await api.get(`/usuarios/creadores-favoritos${suffix}`));
  return rows(payload).map(normalizeFavorite).filter((favorite) => favorite.status !== "INACTIVO" && favorite.status !== "ELIMINADO");
}

async function getFlanSupportType() {
  const payload = unwrap(await api.get(`/apoyos/tipos?codigo=${SUPPORT_CODE}&estado_registro=ACTIVO`));
  const type = rows(payload).map(normalizeSupportType).find((item) => item.code === SUPPORT_CODE) || rows(payload).map(normalizeSupportType)[0];
  return type || null;
}

function summarizeDonations(donations) {
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
    return { user, token, refreshToken, session: data.session || data.sesion || null };
  },

  async register(payload) {
    const role = payload.role || ROLES.FOLLOWER;
    const userBody = {
      nombre: payload.name,
      email: payload.email,
      password: payload.password,
      rol: role,
      url_imagen_portada: payload.coverUrl || undefined,
      imagen_perfil: payload.profileUrl || undefined,
    };

    if (role === ROLES.CREATOR) {
      await api.post("/auth/registro/creador", {
        usuario: userBody,
        perfil_creador: {
          nombre_publico: payload.publicName || payload.name,
          biografia: payload.bio || "",
          foto_perfil_url: payload.profileUrl || undefined,
          banner_url: payload.coverUrl || undefined,
        },
      });
    } else {
      await api.post("/auth/registro/seguidor", {
        usuario: userBody,
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
      // El cierre local debe ejecutarse igual si el token expiró o el backend no responde.
    }
  },
};

export const onlyflansApi = {
  unwrap,
  rows,
  normalizeUser,
  normalizeCreator,
  summarizeDonations,

  creators: {
    async list({ publicName = "" } = {}) {
      const query = new URLSearchParams({ estado_registro: ACTIVE_STATUS });
      if (publicName) query.set("nombre_publico", publicName);
      const payload = unwrap(await api.get(`/usuarios/perfiles-creadores?${query.toString()}`));
      return rows(payload).map(normalizeCreator);
    },
    getProfile: getCreatorProfile,
    listPosts: listPostsByCreator,
    async updateProfile(id, payload) {
      return normalizeCreator(unwrap(await api.put(`/usuarios/perfiles-creadores/${id}`, payload)));
    },
  },

  followers: {
    async getProfile(id) {
      return normalizeFollower(unwrap(await api.get(`/usuarios/perfiles-seguidores/${id}`)));
    },
  },

  goals: {
    async save(currentGoal, creatorId, payload) {
      const body = {
        id_creador: creatorId,
        titulo: payload.title,
        descripcion: payload.description,
        estado_registro: ACTIVE_STATUS,
      };
      if (currentGoal?.goalId) return normalizeGoal(unwrap(await api.put(`/apoyos/metas/${currentGoal.goalId}`, body)));
      return normalizeGoal(unwrap(await api.post("/apoyos/metas", body)));
    },
    async deactivate(goal) {
      if (!goal?.goalId) return null;
      return normalizeGoal(unwrap(await api.put(`/apoyos/metas/${goal.goalId}`, { estado_registro: "INACTIVO" })));
    },
  },

  posts: {
    async create({ creatorId, text, imageUrl }) {
      if (imageUrl) {
        return normalizePost(unwrap(await api.post("/publicaciones/con-imagenes", {
          id_creador: creatorId,
          texto: text,
          imagenes: [{ link_imagen: imageUrl, orden: 1 }],
        })));
      }
      return normalizePost(unwrap(await api.post("/publicaciones", { id_creador: creatorId, texto: text })));
    },
    async update(id, payload) {
      return normalizePost(unwrap(await api.put(`/publicaciones/${id}`, payload)));
    },
    async deactivate(post) {
      if (!post?.postId) return null;
      return normalizePost(unwrap(await api.put(`/publicaciones/${post.postId}`, { estado_registro: "INACTIVO" })));
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
    async add({ followerId, creatorId }) {
      return normalizeFavorite(unwrap(await api.post("/usuarios/creadores-favoritos", {
        id_seguidor: followerId,
        id_creador: creatorId,
      })));
    },
    async deactivate(favorite) {
      if (!favorite?.favoriteId) return null;
      return normalizeFavorite(unwrap(await api.put(`/usuarios/creadores-favoritos/${favorite.favoriteId}`, { estado_registro: "INACTIVO" })));
    },
  },

  donations: {
    list: listDonations,
    async create({ followerId, creatorId, quantity, message = "" }) {
      const supportType = await getFlanSupportType();
      if (!supportType?.supportTypeId) {
        throw new Error("No existe un tipo de apoyo activo con código FLAN. Primero créalo o siémbralo desde el backend.");
      }

      return normalizeDonation(unwrap(await api.post("/apoyos", {
        id_seguidor: followerId,
        id_creador: creatorId,
        id_tipo_apoyo: supportType.supportTypeId,
        cantidad: Number(quantity),
        monto_unitario_bs: supportType.amountBs || DEFAULT_FLAN_PRICE,
        mensaje: message || null,
        estado_pago: "SIMULADO_APROBADO",
      })));
    },
    summarize: summarizeDonations,
  },
};
