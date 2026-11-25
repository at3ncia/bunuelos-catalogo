// Acceso a sedes: todas las escrituras pasan por funciones de Postgres (ver sql/001_sedes.sql).
import { supabase } from "./supabase";

export type Sede = {
  id: number;
  nombre: string;
  ciudad: string;
  direccion: string;
  whatsapp: string;
  activa: boolean;
};

type RpcResult = { ok: boolean; error?: string; id?: number; nombre?: string; ciudad?: string };

// Respaldo por si Supabase no responde. Hoy se opera por ciudad (ver sql/005_por_ciudad.sql);
// los ids coinciden con la base de datos.
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

export async function listarSedes(): Promise<Sede[]> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Tiempo de espera agotado")), 6000),
  );
  const { data, error } = await Promise.race([
    supabase.from("sedes_publicas").select("*").eq("activa", true).order("id"),
    timeout,
  ]);
  if (error) throw new Error(error.message);
  return (data ?? []) as Sede[];
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
