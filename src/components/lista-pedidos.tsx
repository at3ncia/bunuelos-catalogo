import { useEffect, useMemo, useState } from "react";
import { Bot, CalendarDays, Check, ChevronDown, Loader2, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { formatCOP } from "@/lib/cart";
import type { EstadoPedido, Pedido } from "@/lib/negocio";
import type { Sede } from "@/lib/sedes";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

type Props = {
  cargar: (dias: number) => Promise<{ ok: boolean; error?: string; pedidos?: Pedido[] }>;
  cambiarEstado: (id: number, estado: EstadoPedido) => Promise<{ ok: boolean; error?: string }>;
  sedes?: Sede[]; // si se pasa, muestra la ciudad de cada pedido
  cargarRango?: (desde: string, hasta: string) => Promise<{ ok: boolean; error?: string; pedidos?: Pedido[] }>; // solo dueño
  borrar?: (id: number) => Promise<{ ok: boolean; error?: string }>; // solo dueño
};

// Fechas en hora de Colombia, formato AAAA-MM-DD
const hoyCol = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const dos = (n: number) => String(n).padStart(2, "0");
const finDeMes = (a: number, m: number) => `${a}-${dos(m)}-${dos(new Date(a, m, 0).getDate())}`;
function atajos() {
  const [a, m] = hoyCol().split("-").map(Number);
  const pa = m === 1 ? a - 1 : a;
  const pm = m === 1 ? 12 : m - 1;
  return [
    { texto: "Este mes", desde: `${a}-${dos(m)}-01`, hasta: hoyCol() },
    { texto: "Mes pasado", desde: `${pa}-${dos(pm)}-01`, hasta: finDeMes(pa, pm) },
    { texto: `Año ${a}`, desde: `${a}-01-01`, hasta: hoyCol() },
    { texto: `Año ${a - 1}`, desde: `${a - 1}-01-01`, hasta: `${a - 1}-12-31` },
  ];
}
const fechaCorta = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

const RANGOS = [
  { dias: 1, texto: "Hoy" },
  { dias: 7, texto: "7 días" },
  { dias: 30, texto: "30 días" },
];

const ESTILO_ESTADO: Record<EstadoPedido, string> = {
  pendiente: "bg-[#FFF1CC] text-[#7A5200]",
  confirmado: "bg-[#DDF5E4] text-[#14652F]",
  cancelado: "bg-muted text-muted-foreground line-through",
};
const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};

// Registro de pedidos con confirmación manual. Se actualiza solo cada 30 s.
export function ListaPedidos({ cargar, cambiarEstado, sedes, cargarRango, borrar }: Props) {
  const [dias, setDias] = useState(1); // 0 = por fechas
  const [desde, setDesde] = useState(() => atajos()[0].desde);
  const [hasta, setHasta] = useState(hoyCol);
  const [porBorrar, setPorBorrar] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<EstadoPedido | "todos">("todos");
  const [soloIA, setSoloIA] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);

  const refrescar = async () => {
    if (dias === 0 && (!desde || !hasta || hasta < desde)) {
      setError('Revisa las fechas: "Hasta" debe ser igual o después de "Desde".');
      return;
    }
    setCargando(true);
    const r = dias === 0 && cargarRango ? await cargarRango(desde, hasta) : await cargar(dias);
    setCargando(false);
    if (r.ok) {
      setPedidos(r.pedidos ?? []);
      setError("");
    } else setError(r.error ?? "No se pudieron cargar los pedidos");
  };

  useEffect(() => {
    refrescar();
    if (dias === 0) return; // por fechas no se actualiza solo
    const t = setInterval(refrescar, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, desde, hasta]);

  const visibles = useMemo(
    () => (pedidos ?? []).filter((p) => (filtro === "todos" || p.estado === filtro) && (!soloIA || p.origen === "ia")),
    [pedidos, filtro, soloIA],
  );
  const conteo = (e: EstadoPedido) => (pedidos ?? []).filter((p) => p.estado === e).length;
  const ventas = (pedidos ?? []).filter((p) => p.estado === "confirmado").reduce((s, p) => s + p.total, 0);

  const cambiar = async (p: Pedido, estado: EstadoPedido) => {
    setOcupado(p.id);
    const r = await cambiarEstado(p.id, estado);
    setOcupado(null);
    if (r.ok) setPedidos((lista) => (lista ?? []).map((x) => (x.id === p.id ? { ...x, estado } : x)));
    else setError(r.error ?? "No se pudo actualizar");
  };

  const eliminar = async (p: Pedido) => {
    if (!borrar) return;
    setOcupado(p.id);
    const r = await borrar(p.id);
    setOcupado(null);
    setPorBorrar(null);
    if (r.ok) setPedidos((lista) => (lista ?? []).filter((x) => x.id !== p.id));
    else setError(r.error ?? "No se pudo borrar");
  };
  const rangos = cargarRango ? [...RANGOS, { dias: 0, texto: "Fechas" }] : RANGOS;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`flex-1 grid ${rangos.length === 4 ? "grid-cols-4" : "grid-cols-3"} gap-1 bg-card border border-border rounded-xl p-1`}>
          {rangos.map((r) => (
            <button
              key={r.dias}
              onClick={() => setDias(r.dias)}
              aria-pressed={dias === r.dias}
              className={`h-9 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1 ${dias === r.dias ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {r.dias === 0 && <CalendarDays className="h-4 w-4 hidden min-[380px]:inline" />}
              {r.texto}
            </button>
          ))}
        </div>
        <button
          onClick={refrescar}
          aria-label="Actualizar"
          className="h-11 w-11 rounded-xl bg-card border border-border flex items-center justify-center text-primary"
        >
          <RefreshCw className={`h-5 w-5 ${cargando ? "animate-spin" : ""}`} />
        </button>
      </div>

      {dias === 0 && (
        <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {atajos().map((a) => {
              const activo = a.desde === desde && a.hasta === hasta;
              return (
                <button
                  key={a.texto}
                  onClick={() => {
                    setDesde(a.desde);
                    setHasta(a.hasta);
                  }}
                  aria-pressed={activo}
                  className={`h-9 px-3 rounded-full text-sm font-semibold border ${activo ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground"}`}
                >
                  {a.texto}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Desde
              <input type="date" value={desde} max={hoyCol()} onChange={(e) => setDesde(e.target.value)} className="mt-1 block w-full h-11 rounded-xl border border-border bg-background px-2 text-sm text-foreground" />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Hasta
              <input type="date" value={hasta} max={hoyCol()} onChange={(e) => setHasta(e.target.value)} className="mt-1 block w-full h-11 rounded-xl border border-border bg-background px-2 text-sm text-foreground" />
            </label>
          </div>
          {desde && hasta && hasta >= desde && (
            <p className="text-xs text-muted-foreground">
              Mostrando del <strong className="text-foreground">{fechaCorta(desde)}</strong> al <strong className="text-foreground">{fechaCorta(hasta)}</strong>
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Resumen valor={conteo("pendiente")} texto="Pendientes" tono="bg-[#FFF1CC] text-[#7A5200]" activo={filtro === "pendiente"} onClick={() => setFiltro(filtro === "pendiente" ? "todos" : "pendiente")} />
        <Resumen valor={conteo("confirmado")} texto="Confirmados" tono="bg-[#DDF5E4] text-[#14652F]" activo={filtro === "confirmado"} onClick={() => setFiltro(filtro === "confirmado" ? "todos" : "confirmado")} />
        <Resumen valor={formatCOP(ventas)} texto="Ventas confirmadas" tono="bg-primary/10 text-primary" activo={false} onClick={() => setFiltro("todos")} />
      </div>

      {(() => {
        const ia = (pedidos ?? []).filter((p) => p.origen === "ia");
        if (!ia.length) return null;
        const porRevisar = ia.filter((p) => p.estado === "pendiente").length;
        return (
          <button
            onClick={() => setSoloIA((v) => !v)}
            aria-pressed={soloIA}
            className={`w-full flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${soloIA ? "border-[#2563EB] bg-[#2563EB]/10" : "border-[#2563EB]/30 bg-card"}`}
          >
            <span className="brillo-ia h-10 w-10 shrink-0 rounded-xl bg-[#2563EB] text-white flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-[#1D4ED8]">
                {ia.length} venta{ia.length === 1 ? "" : "s"} de la IA
              </span>
              <span className="block text-xs text-muted-foreground">
                {porRevisar ? `${porRevisar} por revisar si llegó el pago` : "Todas revisadas"} · {soloIA ? "toca para ver todos" : "toca para ver solo estas"}
              </span>
            </span>
          </button>
        );
      })()}

      {error && <p role="alert" className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</p>}

      {pedidos === null ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : visibles.length === 0 ? (
        <p className="text-center py-10 text-sm text-muted-foreground">
          {pedidos.length ? "No hay pedidos con este filtro." : "Aún no hay pedidos en este periodo."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visibles.map((p) => {
            const abiertoAhora = abierto === p.id;
            const nombre = p.cliente["Nombre completo"] ?? Object.values(p.cliente)[0] ?? "Cliente";
            const telefono = Object.values(p.cliente).find((v) => /^[\d\s+()-]{7,}$/.test(v));
            const ciudad = sedes?.find((s) => s.id === p.sede_id)?.ciudad;
            const hora = new Date(p.creado_en).toLocaleString("es-CO", {
              timeZone: "America/Bogota",
              ...(dias === 1 ? { hour: "numeric", minute: "2-digit" } : dias === 0 ? { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
            });
            return (
              <li key={p.id} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
                <button onClick={() => setAbierto(abiertoAhora ? null : p.id)} className="w-full flex items-center gap-3 p-3 text-left">
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-display font-bold text-primary">#{p.codigo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ESTILO_ESTADO[p.estado]}`}>{NOMBRE_ESTADO[p.estado]}</span>
                      {p.origen === "ia" && (
                        <span className="brillo-ia inline-flex items-center gap-1 rounded-full bg-[#2563EB] px-2 py-0.5 text-xs font-bold text-white" title="Venta hecha por la IA de WhatsApp">
                          <Bot className="h-3.5 w-3.5" /> IA
                        </span>
                      )}
                    </span>
                    <span className="block text-sm truncate">{nombre}</span>
                    <span className="block text-xs text-muted-foreground">
                      {hora}
                      {ciudad ? ` · ${ciudad}` : ""}
                      {p.barrio ? ` · ${p.barrio}` : ""}
                    </span>
                  </span>
                  <span className="font-display font-bold shrink-0">{formatCOP(p.total)}</span>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition ${abiertoAhora ? "rotate-180" : ""}`} />
                </button>
                {abiertoAhora && (
                  <div className="border-t border-border p-3 space-y-3 text-sm">
                    <ul className="space-y-0.5">
                      {p.items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-2">
                          <span>{i.cantidad}× {i.nombre}</span>
                          <span className="text-muted-foreground">{formatCOP(i.precio * i.cantidad)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between gap-2 text-muted-foreground">
                        <span>Domicilio</span>
                        <span>{p.domicilio === null ? "Por confirmar" : formatCOP(p.domicilio)}</span>
                      </li>
                    </ul>
                    <dl className="rounded-xl bg-muted/60 p-3 space-y-1">
                      {Object.entries(p.cliente).map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-xs text-muted-foreground">{k}</dt>
                          <dd className="font-medium break-words">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    {p.origen === "ia" && p.estado === "pendiente" && (
                      <div className="rounded-xl border-2 border-[#2563EB]/40 bg-[#2563EB]/5 p-3 space-y-1">
                        <p className="font-semibold text-[#1D4ED8] flex items-center gap-1.5">
                          <Bot className="h-4 w-4" /> Venta de la IA: revisa que llegó el pago
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.metodo_pago === "link"
                            ? "Pago por link: se confirma solo cuando el cliente paga."
                            : p.metodo_pago === "efectivo"
                              ? "Paga en efectivo al recibir. Confírmalo cuando salga el domicilio."
                              : p.comprobante
                                ? "El cliente envió comprobante. Verifica en Nequi/Bancolombia y toca Confirmar venta."
                                : "Transferencia sin comprobante todavía."}
                        </p>
                        {p.conversacion_url && (
                          <a href={p.conversacion_url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-[#1D4ED8] underline">
                            Ver la conversación
                          </a>
                        )}
                      </div>
                    )}
                    {p.metodo_pago && (
                      <p className="text-xs text-muted-foreground">
                        Pago: {({ efectivo: "Efectivo", transferencia: "Transferencia", link: "Link de pago" } as Record<string, string>)[p.metodo_pago] ?? p.metodo_pago}
                        {p.comprobante ? " · comprobante recibido" : ""}
                      </p>
                    )}
                    {p.confirmado_por && p.estado === "confirmado" && (
                      <p className="text-xs text-muted-foreground">Confirmado por: {p.confirmado_por}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {p.estado !== "confirmado" && (
                        <Accion onClick={() => cambiar(p, "confirmado")} ocupado={ocupado === p.id} clase="bg-[#1F9D4C] text-white">
                          <Check className="h-4 w-4" /> Confirmar venta
                        </Accion>
                      )}
                      {p.estado !== "cancelado" && (
                        <Accion onClick={() => cambiar(p, "cancelado")} ocupado={ocupado === p.id} clase="border-2 border-border text-muted-foreground">
                          <X className="h-4 w-4" /> Cancelar
                        </Accion>
                      )}
                      {p.estado !== "pendiente" && (
                        <Accion onClick={() => cambiar(p, "pendiente")} ocupado={ocupado === p.id} clase="border-2 border-border text-muted-foreground">
                          <RotateCcw className="h-4 w-4" /> Pendiente
                        </Accion>
                      )}
                      {borrar && porBorrar !== p.id && (
                        <Accion onClick={() => setPorBorrar(p.id)} ocupado={false} clase="border-2 border-destructive/40 text-destructive">
                          <Trash2 className="h-4 w-4" /> Borrar
                        </Accion>
                      )}
                      {telefono && (
                        <a
                          href={`https://wa.me/${(() => {
                            const n = telefono.replace(/\D/g, "");
                            return n.length === 10 ? `57${n}` : n;
                          })()}?text=${encodeURIComponent(`Hola ${nombre}, sobre tu pedido #${p.codigo}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-10 px-3 rounded-xl bg-[#25D366] text-[#073B1F] font-semibold inline-flex items-center gap-1.5"
                        >
                          <WhatsAppIcon className="h-4 w-4" /> Escribir al cliente
                        </a>
                      )}
                    </div>
                    {porBorrar === p.id && (
                      <div role="alert" className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-3 space-y-2">
                        <p className="font-semibold text-destructive">¿Borrar el pedido #{p.codigo} para siempre?</p>
                        <p className="text-xs text-muted-foreground">No se puede deshacer y deja de contar en las ventas.</p>
                        <div className="flex gap-2">
                          <Accion onClick={() => eliminar(p)} ocupado={ocupado === p.id} clase="bg-destructive text-destructive-foreground">
                            <Trash2 className="h-4 w-4" /> Sí, borrar
                          </Accion>
                          <Accion onClick={() => setPorBorrar(null)} ocupado={false} clase="border-2 border-border text-muted-foreground">
                            No
                          </Accion>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Resumen({ valor, texto, tono, activo, onClick }: { valor: number | string; texto: string; tono: string; activo: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={activo} className={`rounded-2xl p-3 text-left border-2 ${activo ? "border-primary" : "border-transparent"} ${tono}`}>
      <span className="block font-display font-bold text-lg leading-tight truncate">{valor}</span>
      <span className="block text-xs font-semibold opacity-80">{texto}</span>
    </button>
  );
}

function Accion({ children, onClick, ocupado, clase }: { children: React.ReactNode; onClick: () => void; ocupado: boolean; clase: string }) {
  return (
    <button onClick={onClick} disabled={ocupado} className={`h-10 px-3 rounded-xl font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 ${clase}`}>
      {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
