// Acceso a sedes: todas las escrituras pasan por funciones de Postgres (ver sql/001_sedes.sql).
import { supabase } from "./supabase";
import { conTiempoLimite, guardarCopia, leerCopia } from "./storage";

export type Sede = {
  id: number;
  nombre: string;
  ciudad: string;
  direccion: string;
  whatsapp: string;
  activa: boolean;
};

type RpcResult = { ok: boolean; error?: string; id?: number; nombre?: string; ciudad?: string };

// Último recurso si Supabase no responde y el navegador nunca cargó los datos.
// Normalmente se usa la última copia buena (ver cargarConRespaldo); los ids coinciden con la base de datos.
export const SEDES_RESPALDO: Sede[] = [
  { id: 1, nombre: "Cartagena", ciudad: "Cartagena", direccion: "Terminal · Castellana · Bocagrande", whatsapp: "573013416503", activa: true },
  { id: 4, nombre: "Barranquilla", ciudad: "Barranquilla", direccion: "Centro, Calle 38 No 38-10", whatsapp: "573106107552", activa: true },
];

// Nombre corto para mostrar: "Cartagena · Terminal" -> "Terminal"
export function nombreCorto(s: Sede) {
  return s.nombre.split("·").pop()!.trim();
}

// Etiqueta completa sin repetir: "Terminal, Cartagena" o solo "Cartagena"
export function etiquetaSede(s: Sede) {
  const corto = nombreCorto(s);
  return corto === s.ciudad ? s.ciudad : `${corto}, ${s.ciudad}`;
}

// true cuando hay una sola sede por ciudad: se elige la ciudad, no la sede
export function esPorCiudad(sedes: Sede[]) {
  return new Set(sedes.map((s) => s.ciudad)).size === sedes.length;
}

// Datos frescos -> última copia buena -> respaldo. Nunca lanza error.
export async function cargarConRespaldo<T>(
  clave: string,
  consulta: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  respaldo: T[],
): Promise<T[]> {
  try {
    const { data, error } = await conTiempoLimite(consulta, 6000);
    if (error) throw new Error(error.message);
    const lista = (data ?? []) as T[];
    if (lista.length) {
      guardarCopia(clave, lista);
      return lista;
    }
  } catch (e) {
    console.warn(`[Supabase] ${clave}: usando la última copia`, e);
  }
  const copia = leerCopia<T[]>(clave);
  return copia?.length ? copia : respaldo;
}

export function listarSedes(): Promise<Sede[]> {
  return cargarConRespaldo(
    "bunuelos_sedes_v1",
    supabase.from("sedes_publicas").select("*").eq("activa", true).order("id"),
    SEDES_RESPALDO,
  );
}

// Disponibilidad efectiva por sede (los agotados de días anteriores ya cuentan como disponibles).
// { [productoId]: boolean }. Sin fila = disponible.
export async function disponibilidadSede(sedeId: number): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from("sede_disponibilidad")
    .select("producto_id, disponible")
    .eq("sede_id", sedeId);
  if (error) throw new Error(error.message);
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) map[row.producto_id as string] = row.disponible as boolean;
  return map;
}

export async function loginSede(sedeId: number, clave: string): Promise<RpcResult> {
  const { data, error } = await supabase.rpc("login_sede", { p_sede: sedeId, p_clave: clave });
  if (error) return { ok: false, error: error.message };
  return data as RpcResult;
}

export async function setDisponibilidad(
  sedeId: number,
  clave: string,
  productoId: string,
  disponible: boolean,
): Promise<RpcResult> {
  const { data, error } = await supabase.rpc("set_disponibilidad", {
    p_sede: sedeId,
    p_clave: clave,
    p_producto: productoId,
    p_disponible: disponible,
  });
  if (error) return { ok: false, error: error.message };
  return data as RpcResult;
}

export async function cambiarClaveSede(
  sedeId: number,
  actual: string,
  nueva: string,
): Promise<RpcResult> {
  const { data, error } = await supabase.rpc("cambiar_clave_sede", {
    p_sede: sedeId,
    p_actual: actual,
    p_nueva: nueva,
  });
  // Errores de validación de la nueva clave llegan como error de Postgres
  if (error) return { ok: false, error: error.message };
  return data as RpcResult;
}

// ── Puntos de pedido: a qué WhatsApp llega el pedido dentro de una ciudad ──

export type PuntoPedido = {
  id: string;
  sede_id: number;
  nombre: string;
  detalle: string;
  whatsapp: string;
  orden: number;
  activo?: boolean;
  mensaje: string; // mensaje inicial del botón en /links
  etiqueta_enlace: string; // texto del botón en /links ("" = usa el nombre)
  en_enlaces: boolean; // si aparece en /links
};

export const PUNTOS_RESPALDO: PuntoPedido[] = [
  { id: "ctg-terminal-castellana", sede_id: 1, nombre: "Terminal · Castellana", detalle: "Terminal de transporte y Castellana", whatsapp: "573013416503", orden: 0, mensaje: "Hola! Quiero ordenar", etiqueta_enlace: "Terminal - Castellana Cartagena", en_enlaces: true },
  { id: "ctg-bocagrande", sede_id: 1, nombre: "Bocagrande", detalle: "Bocagrande, Cra 2 Calle 4", whatsapp: "573226768027", orden: 1, mensaje: "Hola! Estoy interesad@ en:", etiqueta_enlace: "Bocagrande", en_enlaces: true },
  { id: "baq-centro", sede_id: 4, nombre: "Centro", detalle: "Centro, Calle 38 No 38-10", whatsapp: "573106107552", orden: 0, mensaje: "Hola! Quisiera ordenar:", etiqueta_enlace: "Barranquilla", en_enlaces: true },
];

export async function listarPuntos(): Promise<PuntoPedido[]> {
  const lista = await cargarConRespaldo<PuntoPedido>(
    "bunuelos_puntos_v1",
    supabase.from("puntos_pedido").select("*").order("orden"),
    PUNTOS_RESPALDO,
  );
  // Tolera filas de antes de sql/007 (sin mensaje ni etiqueta)
  return lista.map((p) => ({
    ...p,
    mensaje: p.mensaje ?? "Hola! Quiero ordenar",
    etiqueta_enlace: p.etiqueta_enlace ?? "",
    en_enlaces: p.en_enlaces ?? true,
  }));
}
