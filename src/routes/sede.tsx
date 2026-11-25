import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LogOut, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/storage";
import {
  listarSedes,
  disponibilidadSede,
  loginSede,
  setDisponibilidad,
  cambiarClaveSede,
  type Sede,
} from "@/lib/sedes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/sede")({
  head: () => ({
    meta: [
      { title: "Sede — Los Buñuelos" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SedePage,
});

type Sesion = { sede: Sede; clave: string };

function SedePage() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    listarSedes()
      .then(setSedes)
      .catch((e) => setErrorCarga(e.message));
  }, []);

  if (errorCarga) {
    return <Pantalla><p className="text-destructive text-sm">No se pudieron cargar las sedes: {errorCarga}</p></Pantalla>;
  }

  if (!sesion) {
    return <Pantalla><LoginSede sedes={sedes} onOk={(sede, clave) => setSesion({ sede, clave })} /></Pantalla>;
  }

  return (
    <Panel
      sesion={sesion}
      onClave={(clave) => setSesion({ ...sesion, clave })}
      onSalir={() => setSesion(null)}
    />
  );
}

function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>
        {children}
      </div>
    </div>
  );
}

function LoginSede({ sedes, onOk }: { sedes: Sede[]; onOk: (s: Sede, clave: string) => void }) {
  const [sedeId, setSedeId] = useState<number | null>(null);
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sedeId) return setError("Elige tu sede");
    setCargando(true);
    setError("");
    const r = await loginSede(sedeId, clave);
    setCargando(false);
    if (!r.ok) return setError(r.error ?? "No se pudo ingresar");
    const sede = sedes.find((s) => s.id === sedeId);
    if (sede) onOk(sede, clave);
  };

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-2xl shadow-card p-6 space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold text-primary">Gestión de sede</h1>
        <p className="text-sm text-muted-foreground">Elige tu sede e ingresa su contraseña.</p>
      </div>

      <div className="grid gap-2">
        {sedes.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={() => setSedeId(s.id)}
            className={`text-left rounded-xl border p-3 transition ${
              sedeId === s.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            }`}
          >
            <div className="font-semibold">{s.nombre}</div>
            <div className="text-xs text-muted-foreground">{s.direccion}</div>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="clave">Contraseña</Label>
        <Input id="clave" type="password" autoComplete="off" value={clave} onChange={(e) => setClave(e.target.value)} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={cargando || !sedeId || !clave}>
        {cargando ? "Verificando…" : "Ingresar"}
      </Button>
    </form>
  );
}

function Panel({
  sesion,
  onClave,
  onSalir,
}: {
  sesion: Sesion;
  onClave: (c: string) => void;
  onSalir: () => void;
}) {
  const { sede, clave } = sesion;
  const [productos, setProductos] = useState<Product[]>([]);
  const [disp, setDisp] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: prods }, d] = await Promise.all([
        supabase.from("productos").select("*").order("nombre"),
        disponibilidadSede(sede.id),
      ]);
      setProductos(
        (prods ?? []).map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion ?? "",
          precio: p.precio,
          categoriaId: p.categoria_id,
          foto: p.foto ?? "",
          disponible: p.disponible,
        })),
      );
      setDisp(d);
    })();
  }, [sede.id]);

  const estaDisponible = (id: string) => (id in disp ? disp[id] : true);

  const cambiar = async (id: string, valor: boolean) => {
    setMsg("");
    setDisp((d) => ({ ...d, [id]: valor }));
    const r = await setDisponibilidad(sede.id, clave, id, valor);
    if (!r.ok) {
      setDisp((d) => ({ ...d, [id]: !valor }));
      setMsg(r.error ?? "No se pudo guardar");
    }
  };

  const activos = useMemo(() => productos.filter((p) => estaDisponible(p.id)).length, [productos, disp]);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-primary">{sede.nombre}</h1>
            <p className="text-sm text-muted-foreground">
              {activos} de {productos.length} productos disponibles
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onSalir}>
            <LogOut className="h-4 w-4 mr-1" /> Salir
          </Button>
        </div>

        {msg && <p className="text-sm text-destructive">{msg}</p>}

        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {productos.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.nombre}</div>
                <div className="text-xs text-muted-foreground">${p.precio.toLocaleString("es-CO")}</div>
              </div>
              <Switch checked={estaDisponible(p.id)} onCheckedChange={(v) => cambiar(p.id, v)} />
            </div>
          ))}
          {productos.length === 0 && <p className="p-4 text-sm text-muted-foreground">No hay productos.</p>}
        </div>

        <CambiarClave
          sedeId={sede.id}
          clave={clave}
          abierto={mostrarClave}
          onToggle={() => setMostrarClave((v) => !v)}
          onCambiada={onClave}
        />
      </div>
    </div>
  );
}

function CambiarClave({
  sedeId,
  clave,
  abierto,
  onToggle,
  onCambiada,
}: {
  sedeId: number;
  clave: string;
  abierto: boolean;
  onToggle: () => void;
  onCambiada: (nueva: string) => void;
}) {
  const [nueva, setNueva] = useState("");
  const [repite, setRepite] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nueva !== repite) return setMsg({ tipo: "err", texto: "Las contraseñas nuevas no coinciden" });
    const r = await cambiarClaveSede(sedeId, clave, nueva);
    if (!r.ok) return setMsg({ tipo: "err", texto: r.error ?? "No se pudo cambiar" });
    onCambiada(nueva);
    setNueva("");
    setRepite("");
    setMsg({ tipo: "ok", texto: "Contraseña actualizada" });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <button onClick={onToggle} className="flex items-center gap-2 font-semibold text-sm">
        <KeyRound className="h-4 w-4" /> Cambiar contraseña de la sede
      </button>
      {abierto && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Mínimo 8 caracteres, solo letras y números, con al menos una mayúscula y un número.
          </p>
          <Input type="password" placeholder="Nueva contraseña" value={nueva} onChange={(e) => setNueva(e.target.value)} />
          <Input type="password" placeholder="Repite la nueva" value={repite} onChange={(e) => setRepite(e.target.value)} />
          {msg && <p className={`text-sm ${msg.tipo === "ok" ? "text-primary" : "text-destructive"}`}>{msg.texto}</p>}
          <Button type="submit" disabled={!nueva || !repite}>Guardar contraseña</Button>
        </form>
      )}
    </div>
  );
}
