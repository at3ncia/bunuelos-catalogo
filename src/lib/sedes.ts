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

export async function listarSedes(): Promise<Sede[]> {
  const { data, error } = await supabase
    .from("sedes_publicas")
    .select("*")
    .eq("activa", true)
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []) as Sede[];
}

// Disponibilidad por sede: { [productoId]: boolean }. Sin fila = disponible.
export async function disponibilidadSede(sedeId: number): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from("sede_productos")
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
