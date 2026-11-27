import { useEffect, useMemo, useState } from "react";
import { Bot, Loader2, Search, Trash2, X } from "lucide-react";
import { formatCOP } from "@/lib/cart";
import { borrarCliente, listarClientes, pedidosDeCliente, type Cliente, type Pedido } from "@/lib/negocio";
import type { Sede } from "@/lib/sedes";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// /admin → Clientes: un cliente = un teléfono. Fichas para encontrar a quién escribirle
// y un toque para abrir WhatsApp con el mensaje listo (sin APIs, gratis).

type Segmento = "todos" | "nuevos" | "frecuentes" | "dormidos" | "top";
const DIA = 864e5;
const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const diasDesde = (f: string) => Math.floor((Date.now() - new Date(f).getTime()) / DIA);
const haceTexto = (f: string) => {
  const d = diasDesde(f);
  return d <= 0 ? "hoy" : d === 1 ? "ayer" : d < 30 ? `hace ${d} días` : d < 60 ? "hace 1 mes" : d < 365 ? `hace ${Math.round(d / 30)} meses` : d < 730 ? "hace 1 año" : `hace ${Math.round(d / 365)} años`;
};
const primerNombre = (n: string) => (n.trim().split(/\s+/)[0] || "").replace(/^./, (c) => c.toUpperCase());

const SEGMENTOS: { id: Segmento; texto: string; ayuda: string; prueba: (c: Cliente, topMin: number) => boolean }[] = [
  { id: "todos", texto: "Todos", ayuda: "", prueba: () => true },
  { id: "dormidos", texto: "Dormidos", ayuda: "Compraban y llevan más de 30 días sin pedir", prueba: (c) => c.compras >= 1 && diasDesde(c.ultimo) > 30 },
  { id: "frecuentes", texto: "Frecuentes", ayuda: "3 compras o más", prueba: (c) => c.compras >= 3 },
  { id: "nuevos", texto: "Nuevos", ayuda: "Una sola compra", prueba: (c) => c.compras === 1 },
  { id: "top", texto: "Top", ayuda: "Los que más han gastado", prueba: (c, topMin) => c.gastado > 0 && c.gastado >= topMin },
];

// Mensaje sugerido según el cliente (se puede editar antes de enviar)
function mensajeSugerido(c: Cliente) {
  const n = primerNombre(c.nombre) || "";
  const hola = n ? `¡Hola ${n}!` : "¡Hola!";
  if (c.compras >= 1 && diasDesde(c.ultimo) > 30)
    return `${hola} Hace rato no te vemos por Los Buñuelos 🧡 ${c.favorito ? `¿Se te antoja un ${c.favorito.toLowerCase()}? ` : ""}Te los llevamos calienticos.`;
  if (c.compras >= 3) return `${hola} Gracias por ser de nuestros clientes más fieles 🧡 ¿Te provoca algo hoy?`;
  return `${hola} Gracias por tu pedido en Los Buñuelos 🧡 ¿Cómo te pareció?`;
}
const waUrl = (tel: string, texto: string) => `https://wa.me/${tel.length === 10 ? `57${tel}` : tel}?text=${encodeURIComponent(texto)}`;

export function Clientes({ clave, sedes }: { clave: string; sedes: Sede[] }) {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [error, setError] = useState("");
  const [buscar, setBuscar] = useState("");
  const [seg, setSeg] = useState<Segmento>("todos");
  const [soloPromos, setSoloPromos] = useState(false);
  const [abierto, setAbierto] = useState<Cliente | null>(null);

  const cargar = async () => {
    const r = await listarClientes(clave);
    if (r.ok) setClientes(r.clientes ?? []);
    else setError(r.error ?? "No se pudieron cargar los clientes");
  };
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Top" = el 10 % que más gasta (mínimo 1 cliente)
  const topMin = useMemo(() => {
    const g = (clientes ?? []).map((c) => c.gastado).filter((x) => x > 0).sort((a, b) => b - a);
    return g.length ? g[Math.max(0, Math.ceil(g.length * 0.1) - 1)] : Infinity;
  }, [clientes]);
  const conteo = (s: Segmento) => (clientes ?? []).filter((c) => SEGMENTOS.find((x) => x.id === s)!.prueba(c, topMin)).length;
  const q = sinTildes(buscar.trim());
  const qDig = buscar.replace(/\D/g, "");
  const visibles = useMemo(() => {
    const prueba = SEGMENTOS.find((x) => x.id === seg)!.prueba;
    const lista = (clientes ?? []).filter(
      (c) =>
        prueba(c, topMin) &&
        (!soloPromos || c.acepta_promos) &&
        (!q || sinTildes(c.nombre).includes(q) || (qDig.length >= 3 && c.telefono.includes(qDig))),
    );
    if (seg === "top") return [...lista].sort((a, b) => b.gastado - a.gastado);
    if (seg === "dormidos") return [...lista].sort((a, b) => b.gastado - a.gastado);
    return lista;
  }, [clientes, seg, soloPromos, q, qDig, topMin]);
  const ayuda = SEGMENTOS.find((x) => x.id === seg)!.ayuda;

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-2xl shadow-card p-3 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Busca por nombre o teléfono"
            aria-label="Buscar cliente"
            className="w-full h-11 rounded-xl bg-muted pl-10 pr-10 text-base outline-none focus:ring-2 focus:ring-primary/40"
          />
          {buscar && (
            <button onClick={() => setBuscar("")} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          {SEGMENTOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSeg(s.id)}
              aria-pressed={seg === s.id}
              className={`h-9 shrink-0 rounded-full border-2 px-3 text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${seg === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
            >
              {s.texto}
              {clientes && <span className={`text-xs ${seg === s.id ? "opacity-80" : "text-muted-foreground"}`}>{conteo(s.id)}</span>}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soloPromos} onChange={(e) => setSoloPromos(e.target.checked)} className="h-5 w-5 accent-[#0E47D6]" />
          Solo los que aceptaron recibir promociones
        </label>
        {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
      </div>

      {error && <p role="alert" className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</p>}

      {clientes === null ? (
        !error && (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )
      ) : visibles.length === 0 ? (
        <p className="text-center py-10 text-sm text-muted-foreground">
          {clientes.length ? "Ningún cliente con este filtro." : "Aún no hay clientes. Aparecen solos con cada pedido."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visibles.slice(0, 300).map((c) => (
            <li key={c.telefono}>
              <div className="bg-card border border-border rounded-2xl shadow-card p-3 flex items-center gap-3">
                <button onClick={() => setAbierto(c)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                  <span className="h-11 w-11 shrink-0 rounded-full bg-primary/10 text-primary font-display font-bold flex items-center justify-center">
                    {(primerNombre(c.nombre) || "?")[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="font-semibold truncate">{c.nombre || "Sin nombre"}</span>
                      {c.via_ia && <Bot className="h-4 w-4 shrink-0 text-[#2563EB]" aria-label="Ha comprado con la IA" />}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {c.compras} compra{c.compras === 1 ? "" : "s"} · {formatCOP(c.gastado)} · {haceTexto(c.ultimo)}
                    </span>
                  </span>
                </button>
                <a
                  href={waUrl(c.telefono, mensajeSugerido(c))}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Escribir a ${c.nombre} por WhatsApp`}
                  className="h-11 w-11 shrink-0 rounded-xl bg-[#25D366] text-[#073B1F] flex items-center justify-center"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                </a>
              </div>
            </li>
          ))}
          {visibles.length > 300 && <li className="text-center text-xs text-muted-foreground">Mostrando 300 de {visibles.length}. Usa el buscador para encontrar a alguien.</li>}
        </ul>
      )}

      <FichaCliente
        cliente={abierto}
        clave={clave}
        sedes={sedes}
        onCerrar={() => setAbierto(null)}
        onBorrado={() => {
          setAbierto(null);
          cargar();
        }}
      />
    </div>
  );
}

function FichaCliente({
  cliente,
  clave,
  sedes,
  onCerrar,
  onBorrado,
}: {
  cliente: Cliente | null;
  clave: string;
  sedes: Sede[];
  onCerrar: () => void;
  onBorrado: () => void;
}) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setPedidos(null);
    setConfirmarBorrar(false);
    setError("");
    if (!cliente) return;
    setMensaje(mensajeSugerido(cliente));
    pedidosDeCliente(clave, cliente.telefono).then((r) => (r.ok ? setPedidos(r.pedidos ?? []) : setError(r.error ?? "")));
  }, [cliente, clave]);
  if (!cliente) return null;
  const c = cliente;
  const promedio = c.compras ? c.gastado / c.compras : 0;
  const cadaCuanto = c.compras >= 2 ? Math.round((new Date(c.ultimo).getTime() - new Date(c.primero).getTime()) / DIA / (c.compras - 1)) : null;
  const tel = c.telefono.length === 10 ? `${c.telefono.slice(0, 3)} ${c.telefono.slice(3, 6)} ${c.telefono.slice(6)}` : c.telefono;

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-7rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{c.nombre || "Cliente"}</DialogTitle>
          <DialogDescription>
            {tel}
            {c.barrio ? ` · ${c.barrio}` : ""}
            {c.sede_id ? ` · ${sedes.find((s) => s.id === c.sede_id)?.ciudad ?? ""}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["Compras", String(c.compras)],
            ["Total gastado", formatCOP(c.gastado)],
            ["Promedio por pedido", promedio ? formatCOP(Math.round(promedio)) : "—"],
            ["Pide cada", cadaCuanto !== null ? `${cadaCuanto} día${cadaCuanto === 1 ? "" : "s"}` : "—"],
            ["Favorito", c.favorito ?? "—"],
            ["Último pedido", haceTexto(c.ultimo)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-muted/60 p-2.5">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="font-semibold truncate">{v}</p>
            </div>
          ))}
        </div>
        <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${c.acepta_promos ? "bg-[#DDF5E4] text-[#14652F]" : "bg-[#FFF1CC] text-[#7A5200]"}`}>
          {c.acepta_promos ? "✓ Aceptó recibir promociones" : "No ha aceptado promociones: escríbele solo sobre sus pedidos."}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Mensaje por WhatsApp</p>
          <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={3} maxLength={500} className="w-full rounded-xl border-2 border-border bg-background p-3 text-sm" />
          <a
            href={waUrl(c.telefono, mensaje)}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 w-full rounded-xl bg-[#25D366] text-[#073B1F] font-bold inline-flex items-center justify-center gap-2"
          >
            <WhatsAppIcon className="h-5 w-5" /> Abrir WhatsApp con este mensaje
          </a>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Pedidos</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {pedidos === null ? (
            !error && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <ul className="space-y-1.5">
              {pedidos.map((p) => (
                <li key={p.id} className="rounded-xl border border-border p-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">#{p.codigo}</span>
                    {p.origen === "ia" && <Bot className="h-4 w-4 text-[#2563EB]" aria-label="Venta de la IA" />}
                    <span className="flex-1" />
                    <span className="font-semibold">{formatCOP(p.total)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.creado_en).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    {p.estado === "confirmado" ? "Confirmado" : p.estado === "cancelado" ? "Cancelado" : "Pendiente"} ·{" "}
                    {p.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {confirmarBorrar ? (
          <div role="alert" className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-3 space-y-2">
            <p className="font-semibold text-destructive">¿Borrar los datos de {c.nombre || "este cliente"}?</p>
            <p className="text-xs text-muted-foreground">
              Se borran su nombre, teléfono y dirección de todos sus pedidos (para cuando un cliente lo pide, Ley 1581). Las ventas siguen
              contando, sin sus datos. No se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarBorrar(false)} className="h-10 px-3 rounded-xl border-2 border-border font-semibold text-muted-foreground">
                No
              </button>
              <button
                disabled={borrando}
                onClick={async () => {
                  setBorrando(true);
                  const r = await borrarCliente(clave, c.telefono);
                  setBorrando(false);
                  if (r.ok) onBorrado();
                  else setError(r.error ?? "No se pudo borrar");
                }}
                className="h-10 px-3 rounded-xl bg-destructive text-white font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {borrando && <Loader2 className="h-4 w-4 animate-spin" />} Sí, borrar sus datos
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmarBorrar(true)} className="h-10 px-3 rounded-xl border-2 border-border text-destructive font-semibold inline-flex items-center gap-1.5 justify-self-start">
            <Trash2 className="h-4 w-4" /> Borrar datos del cliente
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

