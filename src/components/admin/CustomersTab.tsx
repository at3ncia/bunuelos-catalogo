import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listAllOrders, buildCustomers, computeStats, setDealStatus, setDomicilio, resendToApex, apexStatus,
  listNotas, addNota, deleteNota, telKey,
  type CustomerProfile, type CustomerSegment, type DealStatus, type Order, type Nota,
} from "@/lib/orders";
import { useZonas, zonaDePedido } from "@/lib/delivery";
import { formatCOP } from "@/lib/cart";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RefreshCw, Search, Trophy, XCircle, Undo2, StickyNote, Send, Trash2 } from "lucide-react";

const SEG_STYLE: Record<CustomerSegment, string> = {
  vip: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  recurrente: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  nuevo: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  "en riesgo": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  perdido: "bg-muted text-muted-foreground",
};
const ESTADO_STYLE: Record<DealStatus, string> = {
  pendiente: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  ganado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  perdido: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};
const fecha = (d: Date | string) =>
  new Date(d).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const fechaCorta = (d: Date) => d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "2-digit" });

type Apex = Map<number, { code: number | null; error: string | null }>;

export function CustomersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [apex, setApex] = useState<Apex>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vista, setVista] = useState<"solicitudes" | "clientes">("solicitudes");
  const [estado, setEstado] = useState<DealStatus | "todas">("pendiente");
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<CustomerSegment | "todos">("todos");
  const [perfilTel, setPerfilTel] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const os = await listAllOrders();
      setOrders(os);
      setApex(await apexStatus(os.map((o) => o.apex_request_id).filter((x): x is number => x != null).slice(0, 500)));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const patchLocal = (id: string, p: Partial<Order>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...p } : o)));

  const cambiarEstado = async (o: Order, nuevo: DealStatus, motivo?: string) => {
    patchLocal(o.id, { estado: nuevo, motivo_perdida: motivo ?? null });
    try {
      await setDealStatus(o.id, nuevo, motivo);
      // El webhook sale desde Supabase; refrescamos para ver el estado del envío a Apex.
      setTimeout(() => void cargar(), 2500);
    } catch (e) { alert(`No se pudo actualizar: ${e instanceof Error ? e.message : e}`); void cargar(); }
  };

  const clientes = useMemo(() => buildCustomers(orders), [orders]);
  const stats = computeStats(orders);
  const ql = q.toLowerCase();
  const match = (txt: string) => !q || txt.toLowerCase().includes(ql);

  const solicitudes = orders.filter((o) =>
    (estado === "todas" || o.estado === estado) &&
    match(`${o.cliente_nombre} ${o.cliente_telefono} ${o.barrio ?? ""} ${o.ciudad ?? ""}`));
  const perfiles = clientes.filter((c) =>
    (seg === "todos" || c.segmento === seg) && match(`${c.nombre} ${c.telefono} ${c.barrio}`));
  const perfil = perfilTel ? clientes.find((c) => c.telefono === perfilTel) ?? null : null;
  const conteo = (s: DealStatus) => orders.filter((o) => o.estado === s).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        {(["solicitudes", "clientes"] as const).map((v) => (
          <button key={v} onClick={() => setVista(v)}
            className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition ${
              vista === v ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {v === "solicitudes" ? `Solicitudes (${stats.pendientes} pendientes)` : `Clientes (${clientes.length})`}
          </button>
        ))}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => void cargar()}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          No se pudieron cargar ({error}). Revisa que ejecutaste las migraciones de <code>supabase/migrations/</code>.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Ventas ganadas", formatCOP(stats.ventas)],
          ["Ticket promedio", formatCOP(stats.ticketPromedio)],
          ["Tasa de cierre", stats.ganados || conteo("perdido") ? `${Math.round(stats.tasaCierre * 100)}%` : "—"],
          ["Domicilios cobrados", formatCOP(stats.domicilios)],
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
        {vista === "solicitudes"
          ? (["pendiente", "ganado", "perdido", "todas"] as const).map((s) => (
              <Chip key={s} active={estado === s} onClick={() => setEstado(s)}>
                {s}{s !== "todas" && ` (${conteo(s)})`}
              </Chip>))
          : (["todos", "vip", "recurrente", "nuevo", "en riesgo", "perdido"] as const).map((s) => (
              <Chip key={s} active={seg === s} onClick={() => setSeg(s)}>
                {s}{s !== "todos" && ` (${clientes.filter((c) => c.segmento === s).length})`}
              </Chip>))}
      </div>

      {vista === "solicitudes" ? (
        <div className="space-y-3">
          {!loading && solicitudes.length === 0 && !error &&
            <p className="text-center text-muted-foreground py-8">No hay solicitudes {estado !== "todas" ? estado + "s" : ""}.</p>}
          {solicitudes.map((o) => (
            <DealCard key={o.id} o={o} apex={o.apex_request_id != null ? apex.get(o.apex_request_id) : undefined}
              cliente={clientes.find((c) => c.telefono === telKey(o.cliente_telefono))}
              onEstado={(e, m) => void cambiarEstado(o, e, m)}
              onDomicilio={(d) => { patchLocal(o.id, { domicilio: d }); void setDomicilio(o.id, d).catch(() => void cargar()); }}
              onReenviar={async () => {
                try { await resendToApex(o.id); setTimeout(() => void cargar(), 2500); }
                catch (e) { alert(e instanceof Error ? e.message : String(e)); }
              }}
              onPerfil={() => setPerfilTel(telKey(o.cliente_telefono))} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {!loading && perfiles.length === 0 && !error &&
            <p className="text-center text-muted-foreground py-8">Sin clientes todavía. Se crean solos con cada solicitud.</p>}
          {perfiles.map((c) => (
            <button key={c.telefono} onClick={() => setPerfilTel(c.telefono)}
              className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary transition">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">{c.telefono} · {[c.barrio, c.ciudad].filter(Boolean).join(", ") || "Sin barrio"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${SEG_STYLE[c.segmento]}`}>{c.segmento}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <Metric k="Valor total" v={formatCOP(c.totalGastado)} />
                <Metric k="Ticket prom." v={formatCOP(c.ticketPromedio)} />
                <Metric k="Ganados / solicitudes" v={`${c.ganados} / ${c.solicitudes}`} />
              </div>
              <Sparkline data={c.mensual.map((m) => m.total)} />
            </button>
          ))}
        </div>
      )}

      <CustomerDialog c={perfil} onClose={() => setPerfilTel(null)} />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border capitalize transition ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>
      {children}
    </button>
  );
}

const Metric = ({ k, v }: { k: string; v: string }) => (
  <div><p className="text-xs text-muted-foreground">{k}</p><p className="font-bold">{v}</p></div>
);

function DealCard({ o, apex, cliente, onEstado, onDomicilio, onReenviar, onPerfil }: {
  o: Order;
  apex?: { code: number | null; error: string | null };
  cliente?: CustomerProfile;
  onEstado: (e: DealStatus, motivo?: string) => void;
  onDomicilio: (d: number) => void;
  onReenviar: () => void;
  onPerfil: () => void;
}) {
  const { zonas } = useZonas();
  const zona = zonaDePedido(zonas, o);
  const [dom, setDom] = useState(String(o.domicilio ?? 0));
  const [motivo, setMotivo] = useState<string | null>(null);
  useEffect(() => setDom(String(o.domicilio ?? 0)), [o.domicilio]);
  const abierto = o.estado === "pendiente";

  return (
    <div className={`bg-card border border-border rounded-2xl p-4 ${o.estado === "perdido" ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start gap-2 justify-between">
        <button onClick={onPerfil} className="text-left min-w-0">
          <p className="font-semibold hover:text-primary">{o.cliente_nombre}</p>
          <p className="text-xs text-muted-foreground">
            {o.cliente_telefono} · {fecha(o.created_at)} · {o.medio_pago}
            {cliente && cliente.ganados > 0 && ` · ${cliente.ganados} compra${cliente.ganados > 1 ? "s" : ""} previas`}
          </p>
        </button>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ESTADO_STYLE[o.estado]}`}>{o.estado}</span>
      </div>

      <ul className="text-sm mt-2 text-muted-foreground">
        {o.items.map((i) => <li key={i.producto_id}>{i.cantidad}x {i.nombre} — {formatCOP(i.precio * i.cantidad)}</li>)}
      </ul>
      <p className="text-sm mt-1">📍 {[o.barrio, o.ciudad].filter(Boolean).join(", ")} — {o.direccion}</p>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm bg-muted/50 rounded-xl p-3 items-end">
        <Metric k="Productos" v={formatCOP(Number(o.total))} />
        <div>
          <p className="text-xs text-muted-foreground">
            Domicilio interno {zona ? `· ${zona.nombre}` : o.barrio ? "· barrio sin zona" : ""}
          </p>
          <Input type="number" min={0} step={500} value={dom} disabled={!abierto} className="h-8 mt-0.5"
            onChange={(e) => setDom(e.target.value)}
            onBlur={() => { const n = Math.max(0, Number(dom) || 0); if (n !== Number(o.domicilio)) onDomicilio(n); }} />
        </div>
        <Metric k="Total con domicilio" v={formatCOP(Number(o.total) + (Number(dom) || 0))} />
      </div>

      {o.estado === "perdido" && o.motivo_perdida && <p className="text-xs mt-2 text-muted-foreground">Motivo: {o.motivo_perdida}</p>}

      {motivo !== null ? (
        <div className="mt-3 flex gap-2">
          <Input autoFocus placeholder="Motivo (opcional): no respondió, muy caro…" value={motivo}
            onChange={(e) => setMotivo(e.target.value)} maxLength={200} />
          <Button variant="destructive" onClick={() => { onEstado("perdido", motivo); setMotivo(null); }}>Confirmar</Button>
          <Button variant="ghost" onClick={() => setMotivo(null)}>Cancelar</Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          {abierto ? (
            <>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onEstado("ganado")}>
                <Trophy className="h-4 w-4 mr-1" /> Ganado (pagó)
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => setMotivo("")}>
                <XCircle className="h-4 w-4 mr-1" /> Perdido
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => confirm("¿Reabrir esta solicitud como pendiente?") && onEstado("pendiente")}>
              <Undo2 className="h-4 w-4 mr-1" /> Reabrir
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onPerfil}><StickyNote className="h-4 w-4 mr-1" /> Notas y perfil</Button>
          <div className="flex-1" />
          {!abierto && <ApexBadge o={o} apex={apex} onReenviar={onReenviar} />}
        </div>
      )}
    </div>
  );
}

function ApexBadge({ o, apex, onReenviar }: { o: Order; apex?: { code: number | null; error: string | null }; onReenviar: () => void }) {
  if (o.apex_request_id == null)
    return <button onClick={onReenviar} className="text-xs text-muted-foreground underline">No enviado a Apex · enviar</button>;
  const ok = apex?.code != null && apex.code >= 200 && apex.code < 300;
  const fallo = apex && (apex.error || (apex.code != null && !ok));
  return (
    <span className="text-xs flex items-center gap-2">
      <span className={ok ? "text-emerald-600" : fallo ? "text-destructive" : "text-muted-foreground"}>
        {ok ? "✓ En Apex" : fallo ? `✗ Apex falló (${apex?.code ?? apex?.error})` : "Enviando a Apex…"}
      </span>
      {(fallo || ok) && <button onClick={onReenviar} className="underline text-muted-foreground"><Send className="h-3 w-3 inline" /> reenviar</button>}
    </span>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-8 mt-3" aria-label="Ventas ganadas de los últimos 6 meses">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${Math.max((v / max) * 100, v ? 8 : 3)}%`, opacity: v ? 1 : 0.25 }} />
      ))}
    </div>
  );
}

function CustomerDialog({ c, onClose }: { c: CustomerProfile | null; onClose: () => void }) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);

  const cargarNotas = useCallback(async () => {
    if (!c?.clienteId) return setNotas([]);
    try { setNotas(await listNotas(c.clienteId)); } catch { setNotas([]); }
  }, [c?.clienteId]);
  useEffect(() => { void cargarNotas(); }, [cargarNotas]);

  if (!c) return null;
  const maxMes = Math.max(...c.mensual.map((m) => m.total), 1);
  const ultimaSolicitud = c.historial[0];

  const guardar = async () => {
    if (!texto.trim() || !c.clienteId) return;
    setBusy(true);
    try { await addNota(c.clienteId, texto, ultimaSolicitud?.id); setTexto(""); await cargarNotas(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

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
            ["Ganados / perdidos", `${c.ganados} / ${c.perdidos}`],
            ["Compra cada", c.diasEntrePedidos != null ? `${Math.round(c.diasEntrePedidos)} días` : "—"],
            ["Cliente desde", fechaCorta(c.primerPedido)],
            ["Última compra", c.diasSinComprar != null ? `hace ${c.diasSinComprar} d` : "—"],
            ["Favorito", c.productoFavorito || "—"],
            ["Solicitudes", String(c.solicitudes)],
          ].map(([k, v]) => (
            <div key={k} className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">{k}</p><p className="font-bold">{v}</p>
            </div>
          ))}
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">Notas del cliente</h4>
          {c.clienteId ? (
            <>
              <Textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000}
                placeholder="Ej: prefiere pagar por Nequi, portería del conjunto…" />
              <Button size="sm" className="mt-2" disabled={busy || !texto.trim()} onClick={() => void guardar()}>
                Guardar nota
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1">Las notas viajan a Apex con cada deal ganado o perdido.</p>
              <ul className="mt-3 space-y-2">
                {notas.map((n) => (
                  <li key={n.id} className="text-sm bg-muted/50 rounded-lg p-2 flex gap-2">
                    <div className="flex-1 whitespace-pre-wrap">
                      <p className="text-[11px] text-muted-foreground">{fecha(n.created_at)}</p>{n.texto}
                    </div>
                    <button aria-label="Borrar nota" onClick={async () => {
                      if (confirm("¿Borrar nota?")) { await deleteNota(n.id).catch(() => {}); void cargarNotas(); }
                    }}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="text-sm text-muted-foreground">Ejecuta la migración de clientes para poder guardar notas.</p>}
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">Ventas ganadas por mes (últimos 6)</h4>
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
          <h4 className="font-semibold text-sm mb-2">Historial de solicitudes</h4>
          <ul className="space-y-2 text-sm">
            {c.historial.slice(0, 30).map((o) => (
              <li key={o.id} className="border-b border-border pb-2">
                <div className="flex justify-between gap-2">
                  <span>{fecha(o.created_at)}</span>
                  <span className={`px-2 rounded-full text-xs capitalize ${ESTADO_STYLE[o.estado]}`}>{o.estado}</span>
                  <span className="font-semibold">{formatCOP(Number(o.total))}</span>
                </div>
                <p className="text-xs text-muted-foreground">{o.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(", ")}</p>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
