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
};

/** Registra el pedido. Nunca bloquea el envío por WhatsApp si falla. */
export async function createOrder(input: {
  nombre: string; telefono: string; direccion: string; pago: string; items: CartItem[]; total: number;
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
