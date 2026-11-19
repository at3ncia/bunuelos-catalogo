import { useState } from "react";
import { useZonas, CIUDADES, SEDES, DEFAULT_ZONAS, type Ciudad, type Zona } from "@/lib/delivery";
import { formatCOP } from "@/lib/cart";
import { uid } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, MapPin, RotateCcw } from "lucide-react";

const parseBarrios = (t: string) =>
  [...new Set(t.split(/[\n,]/).map((b) => b.trim()).filter(Boolean))];

export function DeliveryTab() {
  const { zonas, update } = useZonas();
  const [ciudad, setCiudad] = useState<Ciudad>("Barranquilla");
  const visibles = zonas.filter((z) => z.ciudad === ciudad).sort((a, b) => a.orden - b.orden);

  const patch = (id: string, p: Partial<Zona>) =>
    update((zs) => zs.map((z) => (z.id === id ? { ...z, ...p } : z)));

  const agregar = () =>
    update((zs) => [
      ...zs,
      { id: `${ciudad.slice(0, 3).toLowerCase()}-${uid()}`, ciudad, nombre: "Nueva zona", precio: 0,
        barrios: [], activo: true, orden: visibles.length + 1 },
    ]);

  // Barrios repetidos en varias zonas de la misma ciudad
  const vistos = new Map<string, string>();
  const duplicados = new Set<string>();
  visibles.forEach((z) => z.barrios.forEach((b) => {
    const k = b.toLowerCase();
    if (vistos.has(k) && vistos.get(k) !== z.id) duplicados.add(b);
    vistos.set(k, z.id);
  }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Domicilios por zonas</h2>
        <p className="text-sm text-muted-foreground">
          Agrupa barrios y asigna un precio a cada grupo. El cliente elige su barrio en el pedido y el domicilio se suma solo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CIUDADES.map((c) => (
          <button key={c} onClick={() => setCiudad(c)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              ciudad === c ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {c} <span className="opacity-70">({zonas.filter((z) => z.ciudad === c).length})</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-muted/50 p-3 text-sm flex gap-2">
        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <div>
          <strong>Sede(s) de referencia: </strong>
          {(SEDES.filter((s) => s.ciudad === ciudad).length
            ? SEDES.filter((s) => s.ciudad === ciudad)
            : SEDES.filter((s) => s.ciudad === "Barranquilla")
          ).map((s) => `${s.nombre} — ${s.direccion}`).join(" · ")}
          {ciudad === "Soledad" && " (Soledad se despacha desde Barranquilla)"}
        </div>
      </div>

      {duplicados.size > 0 && (
        <p className="text-sm text-amber-600">
          Barrios en más de una zona (se cobra la primera): {[...duplicados].join(", ")}
        </p>
      )}

      <div className="space-y-4">
        {visibles.map((z) => (
          <div key={z.id} className={`bg-card border border-border rounded-2xl p-4 space-y-3 ${z.activo ? "" : "opacity-60"}`}>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
              <div>
                <Label>Nombre de la zona</Label>
                <Input value={z.nombre} onChange={(e) => patch(z.id, { nombre: e.target.value })} />
              </div>
              <div>
                <Label>Precio domicilio</Label>
                <Input type="number" min={0} step={500} value={z.precio}
                  onChange={(e) => patch(z.id, { precio: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
              <div className="flex items-center gap-3 pb-2">
                <Switch checked={z.activo} onCheckedChange={(v) => patch(z.id, { activo: v })} />
                <Button variant="ghost" size="icon" aria-label="Eliminar zona"
                  onClick={() => confirm(`¿Eliminar "${z.nombre}"?`) && update((zs) => zs.filter((x) => x.id !== z.id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Barrios ({z.barrios.length}) — separados por coma o por línea</Label>
              <BarriosEditor value={z.barrios} onChange={(b) => patch(z.id, { barrios: b })} />
            </div>
            <p className="text-xs text-muted-foreground">{formatCOP(z.precio)} · {z.barrios.length} barrios</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={agregar}><Plus className="h-4 w-4 mr-1" /> Agregar zona en {ciudad}</Button>
        <Button variant="ghost" onClick={() => {
          if (confirm(`¿Restaurar las zonas sugeridas de ${ciudad}? Se pierden tus cambios en esta ciudad.`))
            update((zs) => [...zs.filter((z) => z.ciudad !== ciudad), ...DEFAULT_ZONAS.filter((z) => z.ciudad === ciudad)]);
        }}>
          <RotateCcw className="h-4 w-4 mr-1" /> Restaurar sugeridas
        </Button>
      </div>
    </div>
  );
}

// Edita como texto y guarda al salir del campo, para no reescribir en cada tecla.
function BarriosEditor({ value, onChange }: { value: string[]; onChange: (b: string[]) => void }) {
  const [text, setText] = useState(value.join(", "));
  return (
    <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)}
      onBlur={() => { const b = parseBarrios(text); setText(b.join(", ")); onChange(b); }} />
  );
}
