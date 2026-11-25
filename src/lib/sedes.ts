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

// Respaldo por si Supabase no responde: mismos ids y números que la base de datos.
export const SEDES_RESPALDO: Sede[] = [
  { id: 1, nombre: "Cartagena · Terminal", ciudad: "Cartagena", direccion: "Terminal de transporte", whatsapp: "573013416503", activa: true },
  { id: 2, nombre: "Cartagena · Castellana", ciudad: "Cartagena", direccion: "Castellana, frente a estación Trans", whatsapp: "573013416503", activa: true },
  { id: 3, nombre: "Cartagena · Bocagrande", ciudad: "Cartagena", direccion: "Bocagrande, Cra 2 Calle 4", whatsapp: "573226768027", activa: true },
  { id: 4, nombre: "Barranquilla · Centro", ciudad: "Barranquilla", direccion: "Centro, Calle 38 No 38-10", whatsapp: "573106107552", activa: true },
];

// Nombre corto para mostrar: "Cartagena · Terminal" -> "Terminal"
export function nombreCorto(s: Sede) {
  return s.nombre.split("·").pop()!.trim();
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
