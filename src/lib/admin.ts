// Panel del negocio: cada escritura pasa por una función de Postgres que
// verifica la contraseña del dueño (ver sql/007_panel_negocio.sql).
import { supabase } from "./supabase";
import { normalizarAjustes, type Ajustes } from "./ajustes";
import { filaACategoria, filaAProducto, type Category, type Product } from "./storage";
import type { PuntoPedido, Sede } from "./sedes";

export type Resultado = { ok: boolean; error?: string };

async function rpc(nombre: string, args: Record<string, unknown>): Promise<Resultado> {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) return { ok: false, error: traducirError(error.message) };
  return (data ?? { ok: false, error: "Respuesta vacía" }) as Resultado;
}

function traducirError(msg: string) {
  if (/could not find the function|does not exist/i.test(msg)) {
    return "Falta ejecutar sql/007_panel_negocio.sql en Supabase";
  }
  return msg;
}

export const verificarAdmin = (clave: string) => rpc("admin_verificar", { p_clave: clave });
export const cambiarClaveAdmin = (clave: string, nueva: string) =>
  rpc("admin_cambiar_clave", { p_clave: clave, p_nueva: nueva });
export const restablecerClaveSede = (clave: string, sedeId: number, nueva: string) =>
  rpc("admin_restablecer_clave_sede", { p_clave: clave, p_sede: sedeId, p_nueva: nueva });

export const guardarProducto = (clave: string, p: Product) =>
  rpc("admin_guardar_producto", {
    p_clave: clave,
    p: {
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: Math.round(p.precio),
      categoria_id: p.categoriaId,
      foto: p.foto,
      disponible: p.disponible,
      dias: p.dias && p.dias.length && p.dias.length < 7 ? p.dias : null,
      orden: p.orden,
    },
  });
export const borrarProducto = (clave: string, id: string) => rpc("admin_borrar_producto", { p_clave: clave, p_id: id });

export const guardarCategoria = (clave: string, c: Category & { orden: number }) =>
  rpc("admin_guardar_categoria", { p_clave: clave, c });
export const borrarCategoria = (clave: string, id: string) => rpc("admin_borrar_categoria", { p_clave: clave, p_id: id });

export const guardarPunto = (clave: string, p: PuntoPedido) => rpc("admin_guardar_punto", { p_clave: clave, p });

export const reiniciarAgotados = (clave: string, sedeId: number) =>
  rpc("admin_reiniciar_agotados", { p_clave: clave, p_sede: sedeId });
// Agotados que cuentan hoy, por sede (vista pública de disponibilidad)
export async function contarAgotados(): Promise<Record<number, number> | null> {
  const { data, error } = await supabase.from("sede_disponibilidad").select("sede_id").eq("disponible", false);
  if (error) return null;
  const c: Record<number, number> = {};
  for (const f of data as { sede_id: number }[]) c[f.sede_id] = (c[f.sede_id] ?? 0) + 1;
  return c;
}
export const guardarAjustes = (clave: string, a: Ajustes) => rpc("admin_guardar_ajustes", { p_clave: clave, a });

// ── Lectura de todo lo editable ─────────────────────────────────────────────

export type DatosPanel = {
  productos: Product[];
  categorias: (Category & { orden: number })[];
  puntos: PuntoPedido[];
  sedes: Sede[];
  ajustes: Ajustes;
};

export async function cargarDatosPanel(): Promise<DatosPanel> {
  const [prods, cats, puntos, sedes, config] = await Promise.all([
    supabase.from("productos").select("*").order("orden").order("nombre"),
    supabase.from("categorias").select("*").order("orden"),
    supabase.from("puntos_pedido").select("*").order("orden"),
    supabase.from("sedes_publicas").select("*").eq("activa", true).order("id"),
    supabase.from("config_publica").select("ajustes").eq("id", 1).maybeSingle(),
  ]);
  const error = prods.error || cats.error || puntos.error || sedes.error || config.error;
  if (error) throw new Error(traducirError(error.message));
  return {
    productos: (prods.data ?? []).map(filaAProducto),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categorias: (cats.data ?? []).map((c: any) => ({ ...filaACategoria(c), orden: Number(c.orden) || 0 })),
    puntos: (puntos.data ?? []) as PuntoPedido[],
    sedes: (sedes.data ?? []) as Sede[],
    ajustes: normalizarAjustes(config.data?.ajustes),
  };
}
