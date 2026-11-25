// Subir fotos de productos desde cualquier dispositivo (ver sql/008_fotos.sql).
// La foto se comprime en el navegador antes de subirse: ~100 KB en vez de varios MB.
import { supabase } from "./supabase";

const LADO_MAXIMO = 1000; // px; suficiente para tarjetas y la vista ampliada
const CALIDAD = 0.82;

async function cargarImagen(archivo: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("No se pudo leer la imagen. Prueba con una foto JPG o PNG.");
  } finally {
    // se libera después de dibujarla (ver comprimirImagen)
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

// Reduce a máximo 1000 px y convierte a WebP (o JPEG si el navegador no soporta WebP)
export async function comprimirImagen(archivo: File): Promise<Blob> {
  if (!archivo.type.startsWith("image/")) throw new Error("El archivo no es una imagen");
  const img = await cargarImagen(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
  const ancho = Math.round(img.naturalWidth * escala);
  const alto = Math.round(img.naturalHeight * escala);
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no permite procesar imágenes");
  ctx.fillStyle = "#ffffff"; // fondo blanco para PNG con transparencia
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(img, 0, 0, ancho, alto);
  const aBlob = (tipo: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, CALIDAD));
  const webp = await aBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await aBlob("image/jpeg");
  if (!jpeg) throw new Error("No se pudo comprimir la imagen");
  return jpeg;
}

export type ResultadoFoto = { ok: true; url: string } | { ok: false; error: string };

export async function subirFoto(claveAdmin: string, productoId: string, archivo: File): Promise<ResultadoFoto> {
  try {
    const blob = await comprimirImagen(archivo);
    const { data: permiso, error: errPermiso } = await supabase.rpc("admin_permiso_subida", { p_clave: claveAdmin });
    if (errPermiso) {
      return {
        ok: false,
        error: /does not exist|could not find/i.test(errPermiso.message)
          ? "Falta ejecutar sql/008_fotos.sql en Supabase"
          : errPermiso.message,
      };
    }
    if (!permiso?.ok) return { ok: false, error: permiso?.error ?? "Sin permiso para subir" };

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const ruta = `${permiso.token}/${productoId || "producto"}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("productos")
      .upload(ruta, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
    if (error) return { ok: false, error: `No se pudo subir: ${error.message}` };
    const { data } = supabase.storage.from("productos").getPublicUrl(ruta);
    return { ok: true, url: data.publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo subir la foto" };
  }
}
