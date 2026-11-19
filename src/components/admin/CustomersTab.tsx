import { useEffect, useMemo, useState } from "react";
import { listAllOrders, buildCustomers, type CustomerProfile, type CustomerSegment } from "@/lib/orders";
import { formatCOP } from "@/lib/cart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RefreshCw, Search, MessageCircle } from "lucide-react";

const SEG_STYLE: Record<CustomerSegment, string> = {
  vip: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  recurrente: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  nuevo: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  "en riesgo": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  perdido: "bg-muted text-muted-foreground",
};
const fecha = (d: Date) => d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "2-digit" });
const waLink = (tel: string, msg = "") =>
  `https://wa.me/${tel.length === 10 ? "57" + tel : tel}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

export function CustomersTab() {
  const [clientes, setClientes] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<CustomerSegment | "todos">("todos");
  const [sel, setSel] = useState<CustomerProfile | null>(null);

  const cargar = async () => {
    setLoading(true); setError("");
    try { setClientes(buildCustomers(await listAllOrders())); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void cargar(); }, []);

  const filtrados = useMemo(() => clientes.filter((c) =>
    (seg === "todos" || c.segmento === seg) &&
    (!q || `${c.nombre} ${c.telefono} ${c.barrio}`.toLowerCase().includes(q.toLowerCase()))), [clientes, q, seg]);

  const ltv = clientes.reduce((a, c) => a + c.totalGastado, 0);
  const conteo = (s: CustomerSegment) => clientes.filter((c) => c.segmento === s).length;
  const recurrentes = clientes.filter((c) => c.pedidos > 1).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg font-bold">Clientes</h2>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => void cargar()}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        No se pudieron cargar ({error}). Ejecuta las migraciones de <code>supabase/migrations/</code>.</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Clientes", String(clientes.length)],
          ["Valor promedio por cliente", formatCOP(clientes.length ? ltv / clientes.length : 0)],
          ["Tasa de recompra", clientes.length ? `${Math.round((recurrentes / clientes.length) * 100)}%` : "—"],
          ["En riesgo (para reactivar)", String(conteo("en riesgo"))],
        ].map(([k, v]) => (
          <div key={k} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="font-display text-xl font-bold text-primary">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar nombre, teléfono o barrio" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {(["todos", "vip", "recurrente", "nuevo", "en riesgo", "perdido"] as const).map((s) => (
          <button key={s} onClick={() => setSeg(s)}
            className={`px-3 py-1.5 rounded-full text-sm border capitalize transition ${
              seg === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>
            {s}{s !== "todos" && ` (${conteo(s)})`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {!loading && filtrados.length === 0 && !error &&
          <p className="text-center text-muted-foreground py-8">Sin clientes todavía. Se crean solos con cada pedido.</p>}
        {filtrados.map((c) => (
          <button key={c.telefono} onClick={() => setSel(c)}
            className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary transition">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="min-w-0">
                <p className="font-semibold truncate">{c.nombre}</p>
                <p className="text-xs text-muted-foreground">{c.telefono} · {[c.barrio, c.ciudad].filter(Boolean).join(", ") || "Sin barrio"}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${SEG_STYLE[c.segmento]}`}>{c.segmento}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Total</p><p className="font-bold">{formatCOP(c.totalGastado)}</p></div>
              <div><p className="text-xs text-muted-foreground">Ticket prom.</p><p className="font-bold">{formatCOP(c.ticketPromedio)}</p></div>
              <div><p className="text-xs text-muted-foreground">Pedidos</p><p className="font-bold">{c.pedidos}</p></div>
            </div>
            <Sparkline data={c.mensual.map((m) => m.total)} />
          </button>
        ))}
      </div>

      <CustomerDialog c={sel} onClose={() => setSel(null)} />
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-8 mt-3" aria-label="Gasto de los últimos 6 meses">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${Math.max((v / max) * 100, v ? 8 : 3)}%`, opacity: v ? 1 : 0.25 }} />
      ))}
    </div>
  );
}

function CustomerDialog({ c, onClose }: { c: CustomerProfile | null; onClose: () => void }) {
  if (!c) return null;
  const maxMes = Math.max(...c.mensual.map((m) => m.total), 1);
  const reactivar = `Hola ${c.nombre.split(" ")[0]}! Te extrañamos 🧡 ¿Se te antoja ${c.productoFavorito || "algo rico"} hoy?`;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{c.nombre}</DialogTitle>
          <DialogDescription>
            {c.telefono} · {[c.barrio, c.ciudad].filter(Boolean).join(", ")} · <span className="capitalize">{c.segmento}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Valor total (LTV)", formatCOP(c.totalGastado)],
            ["Ticket promedio", formatCOP(c.ticketPromedio)],
            ["Pedidos", String(c.pedidos)],
            ["Compra cada", c.diasEntrePedidos != null ? `${Math.round(c.diasEntrePedidos)} días` : "—"],
            ["Cliente desde", fecha(c.primerPedido)],
            ["Última compra", `hace ${c.diasSinComprar} d`],
            ["Favorito", c.productoFavorito || "—"],
          ].map(([k, v]) => (
            <div key={k} className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">{k}</p><p className="font-bold">{v}</p>
            </div>
          ))}
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">Gasto mensual (últimos 6 meses)</h4>
          <div className="space-y-1">
            {c.mensual.map((m) => (
              <div key={m.mes} className="flex items-center gap-2 text-xs">
                <span className="w-14 text-muted-foreground">{m.mes}</span>
                <div className="flex-1 bg-muted rounded h-3 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(m.total / maxMes) * 100}%` }} />
                </div>
                <span className="w-24 text-right">{formatCOP(m.total)} · {m.pedidos}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">Historial</h4>
          <ul className="space-y-2 text-sm">
            {c.historial.slice(0, 20).map((o) => (
              <li key={o.id} className="border-b border-border pb-2">
                <div className="flex justify-between">
                  <span>{fecha(new Date(o.created_at))}</span><span className="font-semibold">{formatCOP(Number(o.total))}</span>
                </div>
                <p className="text-xs text-muted-foreground">{o.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(", ")}</p>
              </li>
            ))}
          </ul>
        </div>

        <a href={waLink(c.telefono, c.segmento === "en riesgo" || c.segmento === "perdido" ? reactivar : "")}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">
          <MessageCircle className="h-4 w-4" />
          {c.segmento === "en riesgo" || c.segmento === "perdido" ? "Enviar mensaje de reactivación" : "Escribir por WhatsApp"}
        </a>
      </DialogContent>
    </Dialog>
  );
}
