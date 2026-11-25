import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, RefreshCw, RotateCcw, X } from "lucide-react";
import { formatCOP } from "@/lib/cart";
import type { EstadoPedido, Pedido } from "@/lib/negocio";
import type { Sede } from "@/lib/sedes";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

type Props = {
  cargar: (dias: number) => Promise<{ ok: boolean; error?: string; pedidos?: Pedido[] }>;
  cambiarEstado: (id: number, estado: EstadoPedido) => Promise<{ ok: boolean; error?: string }>;
  sedes?: Sede[]; // si se pasa, muestra la ciudad de cada pedido
};

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
export function ListaPedidos({ cargar, cambiarEstado, sedes }: Props) {
  const [dias, setDias] = useState(1);
  const [filtro, setFiltro] = useState<EstadoPedido | "todos">("todos");
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);

  const refrescar = async () => {
    setCargando(true);
    const r = await cargar(dias);
    setCargando(false);
    if (r.ok) {
      setPedidos(r.pedidos ?? []);
      setError("");
    } else setError(r.error ?? "No se pudieron cargar los pedidos");
  };

  useEffect(() => {
    refrescar();
    const t = setInterval(refrescar, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias]);

  const visibles = useMemo(
    () => (pedidos ?? []).filter((p) => filtro === "todos" || p.estado === filtro),
    [pedidos, filtro],
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-3 gap-1 bg-card border border-border rounded-xl p-1">
          {RANGOS.map((r) => (
            <button
              key={r.dias}
              onClick={() => setDias(r.dias)}
              aria-pressed={dias === r.dias}
              className={`h-9 rounded-lg text-sm font-semibold ${dias === r.dias ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
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

      <div className="grid grid-cols-3 gap-2">
        <Resumen valor={conteo("pendiente")} texto="Pendientes" tono="bg-[#FFF1CC] text-[#7A5200]" activo={filtro === "pendiente"} onClick={() => setFiltro(filtro === "pendiente" ? "todos" : "pendiente")} />
        <Resumen valor={conteo("confirmado")} texto="Confirmados" tono="bg-[#DDF5E4] text-[#14652F]" activo={filtro === "confirmado"} onClick={() => setFiltro(filtro === "confirmado" ? "todos" : "confirmado")} />
        <Resumen valor={formatCOP(ventas)} texto="Ventas confirmadas" tono="bg-primary/10 text-primary" activo={false} onClick={() => setFiltro("todos")} />
      </div>

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
              ...(dias === 1 ? { hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
            });
            return (
              <li key={p.id} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
                <button onClick={() => setAbierto(abiertoAhora ? null : p.id)} className="w-full flex items-center gap-3 p-3 text-left">
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-display font-bold text-primary">#{p.codigo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ESTILO_ESTADO[p.estado]}`}>{NOMBRE_ESTADO[p.estado]}</span>
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
