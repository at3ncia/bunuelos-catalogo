// Procesa imágenes subidas desde el admin: las redimensiona/recorta al formato
// correcto y las comprime, para que cualquier foto del celular sirva sin edición.

export type ImageFormat = {
  /** Ancho/alto máximos (modo "contain") o exactos (modo "cover"). */
  width: number;
  height: number;
  /** "cover" recorta al tamaño exacto; "contain" solo reduce manteniendo proporción. */
  fit: "cover" | "contain";
  /** PNG conserva transparencia (logos); JPEG pesa mucho menos (fotos). */
  type: "image/png" | "image/jpeg";
  quality?: number;
};

export const IMAGE_FORMATS = {
  producto: { width: 1000, height: 1000, fit: "contain", type: "image/jpeg", quality: 0.82 },
  logo: { width: 800, height: 400, fit: "contain", type: "image/png" },
  favicon: { width: 512, height: 512, fit: "cover", type: "image/png" },
  compartir: { width: 1200, height: 630, fit: "cover", type: "image/jpeg", quality: 0.85 },
} satisfies Record<string, ImageFormat>;

const MAX_INPUT_BYTES = 15 * 1024 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

export async function processImage(file: File, fmt: ImageFormat): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen");
  if (file.size > MAX_INPUT_BYTES) throw new Error("La imagen es demasiado grande (máx. 15 MB)");

  const img = await loadImage(file);
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;

  let sx = 0,
    sy = 0,
    cw = sw,
    ch = sh,
    dw: number,
    dh: number;
  if (fmt.fit === "cover") {
    // Recorte centrado a la proporción destino
    const target = fmt.width / fmt.height;
    if (sw / sh > target) {
      cw = sh * target;
      sx = (sw - cw) / 2;
    } else {
      ch = sw / target;
      sy = (sh - ch) / 2;
    }
    dw = fmt.width;
    dh = fmt.height;
  } else {
    const scale = Math.min(1, fmt.width / sw, fmt.height / sh);
    dw = Math.round(sw * scale);
    dh = Math.round(sh * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no permite procesar imágenes");
  ctx.imageSmoothingQuality = "high";
  if (fmt.type === "image/jpeg") {
    ctx.fillStyle = "#ffffff"; // JPEG no tiene transparencia
    ctx.fillRect(0, 0, dw, dh);
  }
  ctx.drawImage(img, sx, sy, cw, ch, 0, 0, dw, dh);
  return canvas.toDataURL(fmt.type, fmt.quality);
}
