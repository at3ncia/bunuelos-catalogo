// Barrios con precio de domicilio, pop-ups de promociones y pedidos
// (ver sql/009_pedidos_promos_domicilios.sql).
import { supabase } from "./supabase";
import { cargarConRespaldo } from "./sedes";
import { ahoraColombia } from "./ajustes";

export type Barrio = { id: string; sede_id: number; nombre: string; precio: number | null; activo: boolean };

export type Promo = {
  id: string;
  titulo: string;
  imagen: string;
  producto_id: string | null;
  boton_texto: string;
  dias: number[] | null;
  desde: string | null; // "2026-12-01"
  hasta: string | null;
  activo: boolean;
  orden: number;
  frecuencia?: FrecuenciaPromo; // falta si no se ha ejecutado sql/012 → "dia"
  hora_desde?: string | null; // "HH:MM" hora de Colombia; null = todo el día
  hora_hasta?: string | null;
};
export type FrecuenciaPromo = "visita" | "dia" | "una_vez";

export type ItemPedido = { id: string; nombre: string; precio: number; cantidad: number };
export type EstadoPedido = "pendiente" | "confirmado" | "cancelado";
export type Pedido = {
  id: number;
  codigo: string;
  sede_id: number | null;
  punto_id: string | null;
  cliente: Record<string, string>;
  items: ItemPedido[];
  subtotal: number;
  domicilio: number | null;
  total: number;
  barrio: string | null;
  estado: EstadoPedido;
  confirmado_por: string | null;
  pago_proveedor: string | null;
  creado_en: string;
};

// ── Lectura pública (con respaldo de la última carga buena) ─────────────────

// Barrios para el cliente: solo nombres, sin precio de domicilio (sql/010).
// Si aún no existe la vista, se lee la tabla sin la columna de precio.
export async function listarBarrios(): Promise<Barrio[]> {
  const vista = await supabase.from("barrios_publicos").select("id, sede_id, nombre").order("nombre");
  const consulta = vista.error
    ? supabase.from("barrios").select("id, sede_id, nombre").eq("activo", true).order("nombre")
    : Promise.resolve(vista);
  const lista = await cargarConRespaldo<Barrio>("bunuelos_barrios_v2", consulta, []);
  return lista
    .map((b) => ({ ...b, precio: null, activo: true }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function listarPromos(): Promise<Promo[]> {
  return cargarConRespaldo<Promo>("bunuelos_promos_v1", supabase.from("promos").select("*").order("orden"), []);
}

// "2026-11-24" en hora de Colombia
export function fechaColombia(base = new Date()) {
  const h = ahoraColombia(base);
  return `${h.anio}-${String(h.mes + 1).padStart(2, "0")}-${String(h.dia).padStart(2, "0")}`;
}

// ¿Esta promo se muestra hoy? (activa, día de la semana y rango de fechas)
export function promoVigente(p: Promo, base = new Date()) {
  if (!p.activo || !p.imagen) return false;
  const hoy = fechaColombia(base);
  if (p.desde && hoy < p.desde) return false;
  if (p.hasta && hoy > p.hasta) return false;
  if (p.dias && p.dias.length && !p.dias.includes(ahoraColombia(base).diaSemana)) return false;
  return true;
}

// ¿Está dentro de su franja de horas? (sin franja = todo el día; admite franjas que pasan la medianoche)
export function promoEnHorario(p: Promo, base = new Date()) {
  if (!p.hora_desde || !p.hora_hasta) return true;
  const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const ahora = ahoraColombia(base).minutos;
  const d = m(p.hora_desde);
  const h = m(p.hora_hasta);
  return d <= h ? ahora >= d && ahora < h : ahora >= d || ahora < h;
}

// ── Pedidos ─────────────────────────────────────────────────────────────────

export type DatosPedido = {
  sede_id: number | null;
  punto_id: string | null;
  cliente: Record<string, string>;
  items: { id: string; cantidad: number }[];
  barrio_id: string | null;
  barrio_texto: string | null;
};

// Registra el pedido; si falla o tarda, el pedido igual sale por WhatsApp (sin código)
export async function registrarPedido(d: DatosPedido): Promise<{ codigo: string } | null> {
  try {
    const r = await Promise.race([
      supabase.rpc("registrar_pedido", { p: d }),
      new Promise<null>((res) => setTimeout(() => res(null), 4000)),
    ]);
    if (!r || r.error || !r.data?.ok) return null;
    return { codigo: r.data.codigo as string };
  } catch {
    return null;
  }
}

type RespuestaPedidos = { ok: boolean; error?: string; pedidos?: Pedido[] };

export async function listarPedidosAdmin(clave: string, dias: number): Promise<RespuestaPedidos> {
  const { data, error } = await supabase.rpc("admin_listar_pedidos", { p_clave: clave, p_dias: dias });
  if (error) return { ok: false, error: traducir(error.message) };
  return data as RespuestaPedidos;
}

export async function listarPedidosRango(clave: string, desde: string, hasta: string): Promise<RespuestaPedidos> {
  const { data, error } = await supabase.rpc("admin_listar_pedidos_rango", { p_clave: clave, p_desde: desde, p_hasta: hasta });
  if (error) return { ok: false, error: traducir(error.message, "011_pedidos_borrar_y_fechas") };
  return data as RespuestaPedidos;
}

export async function listarPedidosRangoSede(sedeId: number, clave: string, desde: string, hasta: string): Promise<RespuestaPedidos> {
  const { data, error } = await supabase.rpc("sede_listar_pedidos_rango", { p_sede: sedeId, p_clave: clave, p_desde: desde, p_hasta: hasta });
  if (error) return { ok: false, error: traducir(error.message, "014_pedidos_fechas_sede") };
  return data as RespuestaPedidos;
}

export async function borrarPedido(clave: string, id: number): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("admin_borrar_pedido", { p_clave: clave, p_id: id });
  if (error) return { ok: false, error: traducir(error.message, "011_pedidos_borrar_y_fechas") };
  return data as { ok: boolean; error?: string };
}

export async function listarPedidosSede(sedeId: number, clave: string, dias: number): Promise<RespuestaPedidos> {
  const { data, error } = await supabase.rpc("sede_listar_pedidos", { p_sede: sedeId, p_clave: clave, p_dias: dias });
  if (error) return { ok: false, error: traducir(error.message) };
  return data as RespuestaPedidos;
}

export async function cambiarEstadoPedido(
  quien: { admin: string } | { sede: number; clave: string },
  id: number,
  estado: EstadoPedido,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } =
    "admin" in quien
      ? await supabase.rpc("admin_estado_pedido", { p_clave: quien.admin, p_id: id, p_estado: estado })
      : await supabase.rpc("sede_estado_pedido", { p_sede: quien.sede, p_clave: quien.clave, p_id: id, p_estado: estado });
  if (error) return { ok: false, error: traducir(error.message) };
  return data as { ok: boolean; error?: string };
}

function traducir(msg: string, archivo = "009_pedidos_promos_domicilios") {
  return /does not exist|could not find/i.test(msg) ? `Falta ejecutar sql/${archivo}.sql en Supabase` : msg;
}

// ── Panel del dueño ─────────────────────────────────────────────────────────

async function rpcAdmin<T = unknown>(nombre: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) return { ok: false, error: traducir(error.message) } as { ok: false; error: string };
  return data as { ok: boolean; error?: string } & T;
}

export const listarBarriosAdmin = (clave: string) => rpcAdmin<{ barrios?: Barrio[] }>("admin_listar_barrios", { p_clave: clave });
export const guardarBarrios = (clave: string, lista: Barrio[]) => rpcAdmin("admin_guardar_barrios", { p_clave: clave, lista });
export const borrarBarrio = (clave: string, id: string) => rpcAdmin("admin_borrar_barrio", { p_clave: clave, p_id: id });
export const listarPromosAdmin = (clave: string) => rpcAdmin<{ promos?: Promo[] }>("admin_listar_promos", { p_clave: clave });
export const guardarPromo = (clave: string, p: Promo) => rpcAdmin("admin_guardar_promo", { p_clave: clave, p });
export const borrarPromo = (clave: string, id: string) => rpcAdmin("admin_borrar_promo", { p_clave: clave, p_id: id });
