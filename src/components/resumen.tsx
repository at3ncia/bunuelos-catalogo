import { useEffect, useState } from "react";
import { Bot, Loader2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { formatCOP } from "@/lib/cart";
import { leerMetricas, type Metricas } from "@/lib/negocio";
import type { Sede } from "@/lib/sedes";
import { periodoInicial, SelectorPeriodo, type Periodo } from "@/components/periodo";

// /admin → Resumen: pocos números que sirven para decidir, comparados con el periodo anterior,
// y gráficas que aguantan cualquier periodo (1 día a 10 años) y periodos sin ventas.

const AZUL = "#0E47D6";
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]; // la semana empieza el lunes
const HORAS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 a. m. a 10 p. m.

const pesos = (n: number) => formatCOP(Math.round(n));
const compacto = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)} M` : n >= 1000 ? `$${Math.round(n / 1000)} mil` : `$${n}`;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

export function Resumen({ clave, sedes }: { clave: string; sedes: Sede[] }) {
  const [periodo, setPeriodo] = useState<Periodo>(periodoInicial);
  const [sede, setSede] = useState<number | null>(null);
  const [m, setM] = useState<Metricas | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    if (periodo.hasta < periodo.desde) return;
    setCargando(true);
    const r = await leerMetricas(clave, periodo.desde, periodo.hasta, sede);
    setCargando(false);
    if (r.ok) {
      setM(r as unknown as Metricas);
      setError("");
    } else setError(r.error ?? "No se pudieron cargar las métricas");
  };
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo.desde, periodo.hasta, sede]);

  const r = m?.resumen;
  const ticket = r && r.confirmados ? r.ventas / r.confirmados : 0;
  const ticketAnt = r && r.confirmados_ant ? r.ventas_ant / r.confirmados_ant : 0;
  const tasa = r ? pct(r.confirmados, r.pedidos) : null;
  const tasaAnt = r ? pct(r.confirmados_ant, r.pedidos_ant) : null;
  const recompra = m?.recompra ? pct(m.recompra.volvieron, m.recompra.base) : null;

  return (
    <div className="space-y-4">
      <SelectorPeriodo valor={periodo} onCambiar={setPeriodo} />
      {sedes.length > 1 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-1.5 overflow-x-auto">
            {[{ id: null as number | null, ciudad: "Todas las sedes" }, ...sedes].map((s) => (
              <button
                key={s.id ?? "todas"}
                onClick={() => setSede(s.id)}
                aria-pressed={sede === s.id}
                className={`h-9 shrink-0 rounded-full border-2 px-3 text-sm font-semibold whitespace-nowrap ${sede === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
              >
                {s.ciudad}
              </button>
            ))}
          </div>
          <button onClick={cargar} aria-label="Actualizar" className="h-10 w-10 shrink-0 rounded-xl bg-card border border-border flex items-center justify-center text-primary">
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
          </button>
        </div>
      )}

      {error && <p role="alert" className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</p>}

      {!m || !r ? (
        !error && (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )
      ) : (
        <div className={`space-y-4 transition-opacity ${cargando ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            <Kpi titulo="Ventas confirmadas" valor={pesos(r.ventas)} actual={r.ventas} anterior={r.ventas_ant} destacado />
            <Kpi titulo="Pedidos confirmados" valor={String(r.confirmados)} actual={r.confirmados} anterior={r.confirmados_ant} />
            <Kpi titulo="Ticket promedio" valor={ticket ? pesos(ticket) : "—"} actual={ticket} anterior={ticketAnt} />
            <Kpi
              titulo="Tasa de confirmación"
              valor={tasa === null ? "—" : `${tasa} %`}
              actual={tasa ?? 0}
              anterior={tasaAnt ?? 0}
              puntos
              ayuda={`${r.confirmados} de ${r.pedidos} pedidos enviados`}
            />
            <Kpi
              titulo="Clientes que vuelven"
              valor={recompra === null ? "—" : `${recompra} %`}
              ayuda={m.recompra?.base ? `${m.recompra.volvieron} de ${m.recompra.base} del periodo anterior` : "Aún no hay periodo anterior para comparar"}
            />
            <Kpi
              titulo="Ventas de la IA"
              valor={pesos(r.ventas_ia)}
              ayuda={`${r.confirmados_ia} pedido${r.confirmados_ia === 1 ? "" : "s"}${r.ia_por_revisar ? ` · ${r.ia_por_revisar} por revisar` : ""}`}
              icono={<Bot className="h-4 w-4 text-[#2563EB]" />}
            />
          </div>

          <Grafica titulo="Ventas confirmadas" detalle={m.paso === "day" ? "Por día" : m.paso === "week" ? "Por semana" : "Por mes"}>
            <Barras serie={m.serie} paso={m.paso} />
          </Grafica>

          <div className="grid lg:grid-cols-2 gap-4">
            <Grafica titulo="Días y horas con más pedidos" detalle="Más oscuro = más pedidos confirmados">
              <MapaCalor datos={m.calor} />
            </Grafica>
            <Grafica titulo="Más vendidos" detalle="Unidades vendidas">
              <BarrasH filas={m.productos.map((p) => ({ nombre: p.nombre, valor: p.cantidad, texto: `${p.cantidad} · ${compacto(p.ventas)}` }))} vacio="Sin ventas en este periodo" />
              {m.productos_menos.length > 0 && m.productos.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Los que menos se venden</p>
                  <ul className="text-sm space-y-1">
                    {m.productos_menos.map((p) => (
                      <li key={p.nombre} className="flex justify-between gap-2">
                        <span className="truncate">{p.nombre}</span>
                        <span className="shrink-0 text-muted-foreground">{p.cantidad} und.</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Grafica>
            <Grafica titulo="Barrios con más pedidos" detalle="Pedidos confirmados">
              <BarrasH filas={m.barrios.map((b) => ({ nombre: b.barrio, valor: b.pedidos, texto: `${b.pedidos} · ${compacto(b.ventas)}` }))} vacio="Aún no hay pedidos con barrio" />
            </Grafica>
            <Grafica titulo="Clientes" detalle="Con pedidos confirmados en el periodo">
              <div className="grid grid-cols-2 gap-2">
                <Numero valor={m.clientes?.nuevos ?? 0} texto="Nuevos" />
                <Numero valor={Math.max(0, (m.clientes?.total ?? 0) - (m.clientes?.nuevos ?? 0))} texto="Repiten" />
              </div>
              {sede === null && m.sedes.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Ventas por sede</p>
                  <BarrasH
                    filas={m.sedes.map((s) => ({
                      nombre: sedes.find((x) => x.id === s.sede_id)?.ciudad ?? "Sin sede",
                      valor: s.ventas,
                      texto: `${compacto(s.ventas)} · ${s.pedidos} ped.`,
                    }))}
                    vacio=""
                  />
                </div>
              )}
            </Grafica>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Solo cuentan los pedidos marcados como <strong>Confirmado</strong>. Si un encargado no confirma, la venta no aparece aquí.
          </p>
        </div>
      )}
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  actual,
  anterior,
  ayuda,
  destacado = false,
  puntos = false,
  icono,
}: {
  titulo: string;
  valor: string;
  actual?: number;
  anterior?: number;
  ayuda?: string;
  destacado?: boolean;
  puntos?: boolean; // la diferencia es en puntos porcentuales
  icono?: React.ReactNode;
}) {
  let cambio: React.ReactNode = null;
  if (actual !== undefined && anterior !== undefined) {
    if (anterior > 0 || (puntos && actual > 0)) {
      const d = puntos ? Math.round(actual - anterior) : Math.round(((actual - anterior) / anterior) * 100);
      const sube = d >= 0;
      cambio = (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${d === 0 ? "text-muted-foreground" : sube ? "text-[#14652F]" : "text-[#B42318]"}`}>
          {d !== 0 && (sube ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />)}
          {d === 0 ? "Igual" : `${sube ? "+" : ""}${d}${puntos ? " pts" : " %"}`} vs. anterior
        </span>
      );
    } else if (actual > 0) cambio = <span className="text-xs font-semibold text-muted-foreground">Sin datos antes</span>;
  }
  return (
    <div className={`rounded-2xl border p-3 ${destacado ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border shadow-card"}`}>
      <p className={`text-xs font-semibold flex items-center gap-1 ${destacado ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {icono}
        {titulo}
      </p>
      <p className="font-display font-bold text-xl leading-tight mt-1 truncate">{valor}</p>
      <div className={destacado ? "[&_span]:!text-primary-foreground/90" : ""}>{cambio}</div>
      {ayuda && <p className={`text-xs mt-0.5 ${destacado ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{ayuda}</p>}
    </div>
  );
}

function Grafica({ titulo, detalle, children }: { titulo: string; detalle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl shadow-card p-4 min-w-0">
      <h3 className="font-display font-bold text-primary leading-tight">{titulo}</h3>
      {detalle && <p className="text-xs text-muted-foreground mb-3">{detalle}</p>}
      {children}
    </section>
  );
}

function Numero({ valor, texto }: { valor: number; texto: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="font-display font-bold text-2xl leading-none">{valor}</p>
      <p className="text-xs text-muted-foreground mt-1">{texto}</p>
    </div>
  );
}

// Barras verticales de la serie. Cualquier cantidad de barras: se reparten el ancho,
// las etiquetas se espacian solas y tocar una barra muestra su valor.
function Barras({ serie, paso }: { serie: Metricas["serie"]; paso: Metricas["paso"] }) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(0, ...serie.map((s) => s.ventas));
  const total = serie.reduce((a, s) => a + s.ventas, 0);
  const etiqueta = (f: string, larga = false) => {
    const d = new Date(`${f}T12:00:00`);
    if (paso === "month") return d.toLocaleDateString("es-CO", { month: "short", ...(larga ? { year: "numeric" } : { year: "2-digit" }) });
    if (paso === "week") return `${larga ? "Semana del " : ""}${d.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`;
    return d.toLocaleDateString("es-CO", larga ? { weekday: "long", day: "numeric", month: "short" } : { day: "numeric", month: "short" });
  };
  const cadaCuanto = Math.max(1, Math.ceil(serie.length / 6)); // máximo ~6 etiquetas
  const elegido = sel !== null ? serie[sel] : null;
  if (!serie.length) return <p className="text-sm text-muted-foreground">Sin datos.</p>;
  return (
    <div>
      <p className="text-sm min-h-5 mb-2" aria-live="polite">
        {elegido ? (
          <>
            <strong>{etiqueta(elegido.fecha, true)}:</strong> {pesos(elegido.ventas)} · {elegido.pedidos} pedido{elegido.pedidos === 1 ? "" : "s"}
          </>
        ) : (
          <span className="text-muted-foreground">Toca una barra para ver el valor</span>
        )}
      </p>
      <div className="relative h-44">
        <span className="absolute left-0 top-0 text-[11px] text-muted-foreground">{max ? compacto(max) : ""}</span>
        <div className="absolute inset-x-0 top-4 bottom-0 border-b border-border flex items-end gap-[2px]" role="list">
          {serie.map((s, i) => {
            const alto = max ? (s.ventas / max) * 100 : 0;
            return (
              <button
                key={s.fecha}
                type="button"
                role="listitem"
                onClick={() => setSel(sel === i ? null : i)}
                onMouseEnter={() => setSel(i)}
                aria-label={`${etiqueta(s.fecha, true)}: ${pesos(s.ventas)}`}
                className="group relative flex-1 min-w-0 h-full flex items-end"
              >
                <span
                  className="block w-full rounded-t-[4px] transition-colors"
                  style={{
                    height: s.ventas ? `max(${alto}%, 3px)` : "0px",
                    backgroundColor: sel === i ? "#0A2E8A" : AZUL,
                    opacity: sel === null || sel === i ? 1 : 0.55,
                  }}
                />
              </button>
            );
          })}
        </div>
        {total === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Sin ventas confirmadas en este periodo</p>
        )}
      </div>
      <div className="flex mt-1">
        {serie.map((s, i) => (
          <span key={s.fecha} className="flex-1 min-w-0 text-[10px] text-muted-foreground text-center overflow-visible whitespace-nowrap">
            {i % cadaCuanto === 0 ? etiqueta(s.fecha) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function BarrasH({ filas, vacio }: { filas: { nombre: string; valor: number; texto: string }[]; vacio: string }) {
  const max = Math.max(0, ...filas.map((f) => f.valor));
  if (!filas.length || !max) return vacio ? <p className="text-sm text-muted-foreground py-4 text-center">{vacio}</p> : null;
  return (
    <ul className="space-y-2">
      {filas.map((f) => (
        <li key={f.nombre} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="truncate">{f.nombre}</span>
            <span className="shrink-0 text-muted-foreground">{f.texto}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (f.valor / max) * 100)}%`, backgroundColor: AZUL }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MapaCalor({ datos }: { datos: Metricas["calor"] }) {
  const [sel, setSel] = useState<string | null>(null);
  const valor = (d: number, h: number) => datos.find((x) => x.dia === d && x.hora === h)?.pedidos ?? 0;
  const max = Math.max(0, ...datos.map((x) => x.pedidos));
  const hora = (h: number) => (h === 12 ? "12 m." : h < 12 ? `${h} a. m.` : `${h - 12} p. m.`);
  const [d, h] = sel ? sel.split("-").map(Number) : [null, null];
  if (!max) return <p className="text-sm text-muted-foreground py-4 text-center">Sin pedidos confirmados en este periodo</p>;
  return (
    <div>
      <p className="text-sm min-h-5 mb-2" aria-live="polite">
        {sel !== null && d !== null && h !== null ? (
          <>
            <strong>
              {DIAS[d]} {hora(h)}:
            </strong>{" "}
            {valor(d, h)} pedido{valor(d, h) === 1 ? "" : "s"}
          </>
        ) : (
          <span className="text-muted-foreground">Toca un cuadro para ver el valor</span>
        )}
      </p>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `2rem repeat(${HORAS.length}, minmax(0, 1fr))` }}>
        {ORDEN_DIAS.map((dia) => (
          <div key={dia} className="contents">
            <span className="text-[10px] text-muted-foreground self-center">{DIAS[dia]}</span>
            {HORAS.map((hh) => {
              const v = valor(dia, hh);
              const id = `${dia}-${hh}`;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSel(sel === id ? null : id)}
                  onMouseEnter={() => setSel(id)}
                  aria-label={`${DIAS[dia]} ${hora(hh)}: ${v} pedidos`}
                  className={`aspect-square rounded-[3px] ${sel === id ? "ring-2 ring-foreground" : ""}`}
                  style={{ backgroundColor: v ? AZUL : "var(--muted)", opacity: v ? 0.18 + 0.82 * (v / max) : 1 }}
                />
              );
            })}
          </div>
        ))}
        <span />
        {HORAS.map((hh) => (
          <span key={hh} className="text-[9px] text-muted-foreground text-center">
            {hh % 3 === 0 ? (hh === 12 ? "12" : hh > 12 ? hh - 12 : hh) : ""}
          </span>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground text-right">Horas: 6, 9, 12 (m.), 3, 6, 9 (p. m.)</p>
    </div>
  );
}
