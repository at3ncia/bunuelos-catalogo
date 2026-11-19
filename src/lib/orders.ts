import { supabase } from "./supabase";
import type { CartItem } from "./cart";

export type OrderStatus = "nuevo" | "entregado" | "cancelado";

export type OrderItem = { producto_id: string; nombre: string; precio: number; cantidad: number };

export type Order = {
  id: string;
  created_at: string;
  cliente_nombre: string;
  cliente_telefono: string;
  direccion: string;
  medio_pago: string;
  items: OrderItem[];
  total: number;
  estado: OrderStatus;
  ciudad?: string | null;
  barrio?: string | null;
  zona_id?: string | null;
  domicilio?: number | null;
};

/** Registra el pedido. Nunca bloquea el envío por WhatsApp si falla. */
export async function createOrder(input: {
  nombre: string; telefono: string; direccion: string; pago: string; items: CartItem[]; total: number;
  ciudad: string; barrio: string; zonaId: string | null; domicilio: number;
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
      zona_id: input.zonaId,
      domicilio: input.domicilio,
    });
    if (error) console.warn("[Pedidos] No se pudo registrar:", error.message);
  } catch (err) {
    console.warn("[Pedidos] Excepción al registrar:", err);
  }
}

export async function listOrders(desde?: Date): Promise<Order[]> {
  let q = supabase.from("pedidos").select("*").order("created_at", { ascending: false }).limit(500);
  if (desde) q = q.gte("created_at", desde.toISOString());
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}

export async function setOrderStatus(id: string, estado: OrderStatus) {
  const { error } = await supabase.from("pedidos").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
}

export function computeStats(orders: Order[]) {
  const validos = orders.filter((o) => o.estado !== "cancelado");
  const ventas = validos.reduce((a, o) => a + Number(o.total), 0);
  const prod = new Map<string, { nombre: string; cantidad: number; ingresos: number }>();
  const clientes = new Map<string, number>();
  for (const o of validos) {
    for (const i of o.items) {
      const p = prod.get(i.producto_id) ?? { nombre: i.nombre, cantidad: 0, ingresos: 0 };
      p.cantidad += i.cantidad;
      p.ingresos += i.precio * i.cantidad;
      prod.set(i.producto_id, p);
    }
    const tel = o.cliente_telefono.replace(/\D/g, "");
    clientes.set(tel, (clientes.get(tel) ?? 0) + 1);
  }
  return {
    pedidos: validos.length,
    ventas,
    ticketPromedio: validos.length ? ventas / validos.length : 0,
    topProductos: [...prod.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5),
    clientesUnicos: clientes.size,
    clientesRecurrentes: [...clientes.values()].filter((n) => n > 1).length,
  };
}

// ─── Perfiles de cliente ─────────────────────────────────────────────────────

export type CustomerSegment = "nuevo" | "recurrente" | "vip" | "en riesgo" | "perdido";

export type CustomerProfile = {
  telefono: string;
  nombre: string;
  ciudad: string;
  barrio: string;
  pedidos: number;
  totalGastado: number;       // valor histórico (LTV) sin domicilios
  ticketPromedio: number;
  primerPedido: Date;
  ultimoPedido: Date;
  diasEntrePedidos: number | null; // frecuencia media
  diasSinComprar: number;
  segmento: CustomerSegment;
  productoFavorito: string;
  mensual: { mes: string; total: number; pedidos: number }[]; // últimos 6 meses
  historial: Order[];
};

const DAY = 864e5;
export const telKey = (t: string) => t.replace(/\D/g, "");

export async function listAllOrders(): Promise<Order[]> {
  const out: Order[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("pedidos").select("*").order("created_at", { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Order[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function buildCustomers(orders: Order[], now = new Date()): CustomerProfile[] {
  const groups = new Map<string, Order[]>();
  for (const o of orders) {
    if (o.estado === "cancelado") continue;
    const k = telKey(o.cliente_telefono);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(o);
  }
  const meses = [...Array(6)].map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  return [...groups.entries()].map(([tel, os]) => {
    os.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    const productos = (o: Order) => Number(o.total) - Number(o.domicilio ?? 0);
    const total = os.reduce((a, o) => a + productos(o), 0);
    const first = new Date(os[0].created_at);
    const last = new Date(os[os.length - 1].created_at);
    const freq = os.length > 1 ? (+last - +first) / DAY / (os.length - 1) : null;
    const sin = Math.floor((+now - +last) / DAY);
    const fav = new Map<string, number>();
    os.forEach((o) => o.items.forEach((i) => fav.set(i.nombre, (fav.get(i.nombre) ?? 0) + i.cantidad)));
    const mensual = meses.map((mes) => {
      const delMes = os.filter((o) => o.created_at.slice(0, 7) === mes);
      return { mes, total: delMes.reduce((a, o) => a + productos(o), 0), pedidos: delMes.length };
    });
    // Segmentación simple tipo RFM
    const esperado = freq ? Math.max(freq * 2, 14) : 30;
    let segmento: CustomerSegment =
      sin > 90 ? "perdido" : sin > esperado ? "en riesgo" : os.length >= 5 ? "vip" : os.length >= 2 ? "recurrente" : "nuevo";
    if (segmento === "vip" && sin > esperado) segmento = "en riesgo";
    const ult = os[os.length - 1];
    return {
      telefono: tel,
      nombre: ult.cliente_nombre,
      ciudad: ult.ciudad ?? "",
      barrio: ult.barrio ?? "",
      pedidos: os.length,
      totalGastado: total,
      ticketPromedio: total / os.length,
      primerPedido: first,
      ultimoPedido: last,
      diasEntrePedidos: freq,
      diasSinComprar: sin,
      segmento,
      productoFavorito: [...fav.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
      mensual,
      historial: [...os].reverse(),
    };
  }).sort((a, b) => b.totalGastado - a.totalGastado);
}
