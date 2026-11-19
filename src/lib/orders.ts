import { supabase } from "./supabase";
import type { CartItem } from "./cart";

// Cada pedido del catálogo es una SOLICITUD = un deal.
// pendiente → ganado (pagó / venta confirmada) | perdido.
// Al cerrar, Supabase envía el deal completo al webhook de Apex (ver migración 20261121).
export type DealStatus = "pendiente" | "ganado" | "perdido";

export type OrderItem = { producto_id: string; nombre: string; precio: number; cantidad: number };

export type Order = {
  id: string;
  created_at: string;
  cliente_id: string | null;
  cliente_nombre: string;
  cliente_telefono: string;
  direccion: string;
  medio_pago: string;
  items: OrderItem[];
  total: number;          // productos (lo que ve el cliente)
  domicilio: number;      // interno
  estado: DealStatus;
  ciudad: string | null;
  barrio: string | null;
  zona_id: string | null;
  motivo_perdida: string | null;
  cerrado_at: string | null;
  apex_request_id: number | null;
  apex_enviado_at: string | null;
};

export type Nota = { id: string; cliente_id: string; pedido_id: string | null; texto: string; created_at: string };

// ─── Público (catálogo) ──────────────────────────────────────────────────────

/** Registra la solicitud. Nunca bloquea el envío por WhatsApp si falla. */
export async function createOrder(input: {
  nombre: string; telefono: string; direccion: string; pago: string; items: CartItem[]; total: number;
  ciudad: string; barrio: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from("pedidos").insert({
      cliente_nombre: input.nombre,
      cliente_telefono: input.telefono,
      direccion: input.direccion,
      medio_pago: input.pago,
      items: input.items.map((i) => ({
        producto_id: i.product.id, nombre: i.product.nombre, precio: i.product.precio, cantidad: i.cantidad,
      })),
      total: input.total,
      ciudad: input.ciudad,
      barrio: input.barrio,
    });
    if (error) console.warn("[Solicitudes] No se pudo registrar:", error.message);
  } catch (err) {
    console.warn("[Solicitudes] Excepción al registrar:", err);
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function listAllOrders(): Promise<Order[]> {
  const out: Order[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("pedidos").select("*").order("created_at", { ascending: false }).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Order[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function setDealStatus(id: string, estado: DealStatus, motivo?: string) {
  const { error } = await supabase
    .from("pedidos")
    .update({ estado, motivo_perdida: estado === "perdido" ? motivo?.trim() || null : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setDomicilio(id: string, domicilio: number) {
  const { error } = await supabase.from("pedidos").update({ domicilio: Math.max(0, domicilio) }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function resendToApex(id: string) {
  const { error } = await supabase.rpc("apex_reenviar", { p_id: id });
  if (error) throw new Error(error.message);
}

/** Código HTTP de cada envío a Apex (null = aún en curso). */
export async function apexStatus(ids: number[]): Promise<Map<number, { code: number | null; error: string | null }>> {
  const m = new Map<number, { code: number | null; error: string | null }>();
  if (!ids.length) return m;
  const { data } = await supabase.rpc("apex_estado", { p_ids: ids });
  for (const r of (data ?? []) as { id: number; status_code: number | null; error: string | null }[])
    m.set(r.id, { code: r.status_code, error: r.error });
  return m;
}

export async function listNotas(clienteId: string): Promise<Nota[]> {
  const { data, error } = await supabase
    .from("notas_cliente").select("*").eq("cliente_id", clienteId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Nota[];
}

export async function addNota(clienteId: string, texto: string, pedidoId?: string) {
  const { error } = await supabase
    .from("notas_cliente").insert({ cliente_id: clienteId, pedido_id: pedidoId ?? null, texto: texto.trim() });
  if (error) throw new Error(error.message);
}

export async function deleteNota(id: string) {
  const { error } = await supabase.from("notas_cliente").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export const telKey = (t: string) => t.replace(/\D/g, "");

// ─── Métricas ────────────────────────────────────────────────────────────────

export function computeStats(orders: Order[]) {
  const ganados = orders.filter((o) => o.estado === "ganado");
  const cerrados = orders.filter((o) => o.estado !== "pendiente").length;
  const ventas = ganados.reduce((a, o) => a + Number(o.total), 0);
  const domicilios = ganados.reduce((a, o) => a + Number(o.domicilio ?? 0), 0);
  return {
    pendientes: orders.filter((o) => o.estado === "pendiente").length,
    ganados: ganados.length,
    ventas,
    domicilios,
    ticketPromedio: ganados.length ? ventas / ganados.length : 0,
    tasaCierre: cerrados ? ganados.length / cerrados : 0,
  };
}

export type CustomerSegment = "nuevo" | "recurrente" | "vip" | "en riesgo" | "perdido";

export type CustomerProfile = {
  clienteId: string | null;
  telefono: string;
  nombre: string;
  ciudad: string;
  barrio: string;
  solicitudes: number;
  ganados: number;
  perdidos: number;
  totalGastado: number;          // LTV: solo ventas ganadas, sin domicilio
  ticketPromedio: number;
  primerPedido: Date;
  ultimoPedido: Date | null;     // última compra ganada
  diasEntrePedidos: number | null;
  diasSinComprar: number | null;
  segmento: CustomerSegment;
  productoFavorito: string;
  mensual: { mes: string; total: number; pedidos: number }[]; // últimos 6 meses
  historial: Order[];
};

const DAY = 864e5;

export function buildCustomers(orders: Order[], now = new Date()): CustomerProfile[] {
  const groups = new Map<string, Order[]>();
  for (const o of orders) {
    const k = telKey(o.cliente_telefono);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(o);
  }
  const meses = [...Array(6)].map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  return [...groups.entries()].map(([tel, todos]) => {
    todos.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    const os = todos.filter((o) => o.estado === "ganado");
    const total = os.reduce((a, o) => a + Number(o.total), 0);
    const first = new Date(todos[0].created_at);
    const last = os.length ? new Date(os[os.length - 1].created_at) : null;
    const freq = os.length > 1 ? (+last! - +new Date(os[0].created_at)) / DAY / (os.length - 1) : null;
    const sin = last ? Math.floor((+now - +last) / DAY) : null;
    const fav = new Map<string, number>();
    os.forEach((o) => o.items.forEach((i) => fav.set(i.nombre, (fav.get(i.nombre) ?? 0) + i.cantidad)));
    const mensual = meses.map((mes) => {
      const delMes = os.filter((o) => o.created_at.slice(0, 7) === mes);
      return { mes, total: delMes.reduce((a, o) => a + Number(o.total), 0), pedidos: delMes.length };
    });
    const esperado = freq ? Math.max(freq * 2, 14) : 30;
    const segmento: CustomerSegment =
      sin == null ? "nuevo"
      : sin > 90 ? "perdido"
      : sin > esperado ? "en riesgo"
      : os.length >= 5 ? "vip"
      : os.length >= 2 ? "recurrente" : "nuevo";
    const ult = todos[todos.length - 1];
    return {
      clienteId: todos.find((o) => o.cliente_id)?.cliente_id ?? null,
      telefono: tel,
      nombre: ult.cliente_nombre,
      ciudad: ult.ciudad ?? "",
      barrio: ult.barrio ?? "",
      solicitudes: todos.length,
      ganados: os.length,
      perdidos: todos.filter((o) => o.estado === "perdido").length,
      totalGastado: total,
      ticketPromedio: os.length ? total / os.length : 0,
      primerPedido: first,
      ultimoPedido: last,
      diasEntrePedidos: freq,
      diasSinComprar: sin,
      segmento,
      productoFavorito: [...fav.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
      mensual,
      historial: [...todos].reverse(),
    };
  }).sort((a, b) => b.totalGastado - a.totalGastado);
}
