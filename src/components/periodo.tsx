import { useState } from "react";
import { CalendarDays } from "lucide-react";

// Selector de periodo para métricas: atajos que se recalculan solos con la fecha de hoy
// (nunca quedan desactualizados) + rango propio. Fechas en hora de Colombia (AAAA-MM-DD).

export type Periodo = { id: string; desde: string; hasta: string; texto: string };

const hoyCol = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const dos = (n: number) => String(n).padStart(2, "0");
const sumarDias = (f: string, d: number) => {
  const x = new Date(`${f}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};
const finDeMes = (a: number, m: number) => `${a}-${dos(m)}-${dos(new Date(Date.UTC(a, m, 0)).getUTCDate())}`;
export const fechaCorta = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

export function atajosPeriodo(): Periodo[] {
  const hoy = hoyCol();
  const [a, m] = hoy.split("-").map(Number);
  const pa = m === 1 ? a - 1 : a;
  const pm = m === 1 ? 12 : m - 1;
  return [
    { id: "hoy", texto: "Hoy", desde: hoy, hasta: hoy },
    { id: "7", texto: "7 días", desde: sumarDias(hoy, -6), hasta: hoy },
    { id: "30", texto: "30 días", desde: sumarDias(hoy, -29), hasta: hoy },
    { id: "mes", texto: "Este mes", desde: `${a}-${dos(m)}-01`, hasta: hoy },
    { id: "mes-ant", texto: "Mes pasado", desde: `${pa}-${dos(pm)}-01`, hasta: finDeMes(pa, pm) },
    { id: "anio", texto: `Año ${a}`, desde: `${a}-01-01`, hasta: hoy },
    { id: "anio-ant", texto: `Año ${a - 1}`, desde: `${a - 1}-01-01`, hasta: `${a - 1}-12-31` },
    { id: "12m", texto: "Últimos 12 meses", desde: sumarDias(hoy, -364), hasta: hoy },
  ];
}

export function periodoInicial(): Periodo {
  return atajosPeriodo()[2];
}

export function SelectorPeriodo({ valor, onCambiar }: { valor: Periodo; onCambiar: (p: Periodo) => void }) {
  const [propio, setPropio] = useState(valor.id === "propio");
  const atajos = atajosPeriodo();
  const hoy = hoyCol();
  const invalido = valor.hasta < valor.desde;
  return (
    <div className="bg-card border border-border rounded-2xl shadow-card p-3 space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
        {atajos.map((a) => {
          const activo = !propio && valor.id === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setPropio(false);
                onCambiar(a);
              }}
              aria-pressed={activo}
              className={`h-9 shrink-0 rounded-full border-2 px-3 text-sm font-semibold whitespace-nowrap ${activo ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
            >
              {a.texto}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setPropio(true);
            onCambiar({ ...valor, id: "propio", texto: "Fechas" });
          }}
          aria-pressed={propio}
          className={`h-9 shrink-0 rounded-full border-2 px-3 text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1 ${propio ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
        >
          <CalendarDays className="h-4 w-4" /> Fechas
        </button>
      </div>
      {propio && (
        <div className="grid grid-cols-2 gap-2">
          {(["desde", "hasta"] as const).map((k) => (
            <label key={k} className="text-xs font-semibold text-muted-foreground">
              {k === "desde" ? "Desde" : "Hasta"}
              <input
                type="date"
                value={valor[k]}
                min="2020-01-01"
                max={hoy}
                onChange={(e) => e.target.value && onCambiar({ ...valor, [k]: e.target.value })}
                className="mt-1 block w-full h-11 rounded-xl border border-border bg-background px-2 text-sm text-foreground"
              />
            </label>
          ))}
        </div>
      )}
      <p className={`text-xs ${invalido ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
        {invalido ? (
          'Revisa las fechas: "Hasta" debe ser igual o después de "Desde".'
        ) : (
          <>
            Del <strong className="text-foreground">{fechaCorta(valor.desde)}</strong> al{" "}
            <strong className="text-foreground">{fechaCorta(valor.hasta)}</strong> · comparado con el periodo anterior
          </>
        )}
      </p>
    </div>
  );
}
