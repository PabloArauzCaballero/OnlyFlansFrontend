const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_DEFAULT_FOLDER = import.meta.env.VITE_CLOUDINARY_FOLDER || "";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function assertCloudinaryConfig() {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("Falta configurar VITE_CLOUDINARY_CLOUD_NAME.");
  }

  if (!CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Falta configurar VITE_CLOUDINARY_UPLOAD_PRESET.");
  }
}

function validateImageFile(file) {
  if (!file) throw new Error("No se envió ningún archivo.");
  if (!String(file.type || "").startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen válida.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("La imagen excede el límite de 10 MB.");
  }
}

function resolveFolder(folder) {
  const chosen = (folder || CLOUDINARY_DEFAULT_FOLDER || "").trim();
  return chosen || undefined;
}

export async function uploadSingleImage(file, { folder } = {}) {
  assertCloudinaryConfig();
  validateImageFile(file);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const resolvedFolder = resolveFolder(folder);
  if (resolvedFolder) {
    formData.append("folder", resolvedFolder);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error("No se pudo subir la imagen a Cloudinary por un problema de red.");
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const detail = body?.error?.message || "Revisa el upload preset y la configuración de Cloudinary.";
    throw new Error(`Cloudinary rechazó la subida. ${detail}`);
  }

  if (!body?.secure_url) {
    throw new Error("Cloudinary no devolvió una URL usable para la imagen.");
  }

  return {
    url: body.secure_url,
    publicId: body.public_id,
    width: body.width,
    height: body.height,
    format: body.format,
  };
}

export async function uploadMultipleImages(files, { folder } = {}) {
  const list = Array.from(files || []).filter(Boolean);
  if (list.length === 0) return [];

  const uploads = await Promise.all(list.map((file) => uploadSingleImage(file, { folder })));
  return uploads.map((item) => item.url);
}
