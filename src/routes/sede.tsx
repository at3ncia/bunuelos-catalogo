import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { filaAProducto, filaACategoria, type Category, type Product } from "@/lib/storage";
import { formatCOP } from "@/lib/cart";
import {
  listarSedes,
  disponibilidadSede,
  loginSede,
  setDisponibilidad,
  cambiarClaveSede,
  nombreCorto,
  etiquetaSede,
  esPorCiudad,
  SEDES_RESPALDO,
  type Sede,
} from "@/lib/sedes";
import { LOGO_OSCURO_URL, FONDO_MANCHAS, AZUL_MARCA } from "@/lib/brand";
import { ListaPedidos } from "@/components/lista-pedidos";
import { cambiarEstadoPedido, listarPedidosRangoSede, listarPedidosSede } from "@/lib/negocio";
import { colorCategoria, FotoProducto } from "@/components/foto-producto";

export const Route = createFileRoute("/sede")({
  head: () => ({
    meta: [
      { title: "Gestión de sede — Los Buñuelos" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SedePage,
});

type Sesion = { sede: Sede; clave: string };

// La sesión queda guardada en el equipo de la sede para que el personal
// no tenga que escribir la contraseña cada día. "Salir" la borra.
const CLAVE_SESION = "sesionSede";

function leerSesionGuardada(): { sedeId: number; clave: string } | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_SESION) ?? "null");
    return v && typeof v.sedeId === "number" && typeof v.clave === "string" ? v : null;
  } catch {
    return null;
  }
}

function guardarSesion(s: Sesion | null) {
  try {
    if (s) localStorage.setItem(CLAVE_SESION, JSON.stringify({ sedeId: s.sede.id, clave: s.clave }));
    else localStorage.removeItem(CLAVE_SESION);
  } catch {
    /* sin almacenamiento: se pedirá la contraseña la próxima vez */
  }
}

function SedePage() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sesion, setSesionEstado] = useState<Sesion | null>(null);
  const [restaurando, setRestaurando] = useState(() => leerSesionGuardada() !== null);

  const setSesion = (s: Sesion | null) => {
    setSesionEstado(s);
    guardarSesion(s);
  };

  useEffect(() => {
    listarSedes()
      .then((l) => setSedes(l.length ? l : SEDES_RESPALDO))
      .catch(() => setSedes(SEDES_RESPALDO));
  }, []);

  // Reingreso automático con la sesión guardada (se verifica la contraseña)
  useEffect(() => {
    const guardada = leerSesionGuardada();
    if (!guardada || sedes.length === 0) return;
    const sede = sedes.find((x) => x.id === guardada.sedeId);
    if (!sede) {
      setSesion(null);
      setRestaurando(false);
      return;
    }
    loginSede(sede.id, guardada.clave).then((r) => {
      if (r.ok) setSesionEstado({ sede, clave: guardada.clave });
      else guardarSesion(null);
      setRestaurando(false);
    });
  }, [sedes]);

  return (
    <div className="min-h-screen bg-background">
      <BandaMarca
        sesion={sesion}
        onSalir={() => setSesion(null)}
      />
      <main className="max-w-2xl mx-auto px-4 -mt-6 pb-24 relative">
        {restaurando ? (
          <Tarjeta className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Ingresando…
          </Tarjeta>
        ) : sesion ? (
          <Panel sesion={sesion} onClave={(clave) => setSesion({ ...sesion, clave })} />
        ) : (
          <LoginSede sedes={sedes} onOk={(sede, clave) => setSesion({ sede, clave })} />
        )}
      </main>
    </div>
  );
}

/* ── Banda superior: misma identidad que /links ─────────────────────────── */

function BandaMarca({ sesion, onSalir }: { sesion: Sesion | null; onSalir: () => void }) {
  return (
    <header
      className="text-white pt-4 pb-12"
      style={{ backgroundColor: AZUL_MARCA, backgroundImage: FONDO_MANCHAS, backgroundSize: "340px 340px" }}
    >
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Catálogo
          </Link>
          {sesion && (
            <button
              onClick={onSalir}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm font-semibold transition"
            >
              <LogOut className="h-4 w-4" /> Salir
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col items-center text-center">
          <img src={LOGO_OSCURO_URL} alt="Los Buñuelos Los Originales" className="w-56 h-auto drop-shadow-lg" />
          {sesion ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-widest text-white/70">Gestionando</p>
              <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-1.5">
                <MapPin className="h-5 w-5 text-[#F3B15A]" />
                {etiquetaSede(sesion.sede)}
              </h1>
            </div>
          ) : (
            <h1 className="mt-3 font-display text-2xl font-bold">Gestión de disponibilidad</h1>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── Login: paso 1 sede, paso 2 contraseña ──────────────────────────────── */

function LoginSede({ sedes, onOk }: { sedes: Sede[]; onOk: (s: Sede, clave: string) => void }) {
  const [sedeId, setSedeId] = useState<number | null>(null);
  const [clave, setClave] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const ciudades = Array.from(new Set(sedes.map((s) => s.ciudad)));
  const porCiudad = esPorCiudad(sedes);
  const elegida = sedes.find((s) => s.id === sedeId) ?? null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elegida) return;
    setCargando(true);
    setError("");
    const r = await loginSede(elegida.id, clave);
    setCargando(false);
    if (!r.ok) return setError(r.error ?? "No se pudo ingresar");
    onOk(elegida, clave);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Tarjeta>
        <Paso n={1} titulo={porCiudad ? "Elige tu ciudad" : "Elige tu sede"} />
        {sedes.length === 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
          </div>
        )}
        <div className={`mt-4 ${porCiudad ? "space-y-2" : "space-y-5"}`}>
          {ciudades.map((ciudad) => (
            <div key={ciudad}>
              {!porCiudad && (
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{ciudad}</p>
              )}
              <div className="grid gap-2">
                {sedes
                  .filter((s) => s.ciudad === ciudad)
                  .map((s) => {
                    const activa = s.id === sedeId;
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => {
                          setSedeId(s.id);
                          setError("");
                        }}
                        aria-pressed={activa}
                        className={`w-full text-left rounded-xl border-2 p-3 flex items-center gap-3 transition ${
                          activa ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <span
                          className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center ${
                            activa ? "bg-primary text-primary-foreground" : "bg-secondary/15 text-secondary"
                          }`}
                        >
                          {activa ? <Check className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold">{nombreCorto(s)}</span>
                          <span className="block text-xs text-muted-foreground">{s.direccion}</span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta className={elegida ? "" : "opacity-50"}>
        <Paso n={2} titulo={porCiudad ? "Contraseña" : "Contraseña de la sede"} />
        <div className="mt-4 relative">
          <input
            type={ver ? "text" : "password"}
            autoComplete="off"
            disabled={!elegida}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder={elegida ? `Contraseña de ${nombreCorto(elegida)}` : porCiudad ? "Primero elige tu ciudad" : "Primero elige una sede"}
            className="w-full h-12 rounded-xl border-2 border-border bg-background px-4 pr-12 text-base outline-none focus:border-primary transition disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            disabled={!elegida}
            aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary"
          >
            {ver ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando || !elegida || !clave}
          className="mt-4 w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-card transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {cargando && <Loader2 className="h-5 w-5 animate-spin" />}
          {cargando ? "Verificando…" : "Ingresar"}
        </button>
      </Tarjeta>
      <p className="text-center text-xs text-muted-foreground">
        ¿Eres el dueño?{" "}
        <Link to="/admin" className="font-semibold text-primary underline">
          Panel del negocio
        </Link>
      </p>
    </form>
  );
}

/* ── Panel: disponibilidad por sede ─────────────────────────────────────── */

type Filtro = "todos" | "disponibles" | "agotados";
type Estado = "guardando" | "ok" | "error";

function Panel({ sesion, onClave }: { sesion: Sesion; onClave: (c: string) => void }) {
  const [vista, setVista] = useState<"disponibilidad" | "pedidos">("disponibilidad");
  const { sede, clave } = sesion;
  const [productos, setProductos] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [disp, setDisp] = useState<Record<string, boolean>>({});
  const [estado, setEstado] = useState<Record<string, Estado>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [cat, setCat] = useState<string | null>(null); // categoría elegida (null = todas)

  useEffect(() => {
    (async () => {
      try {
        const [prods, cats, d] = await Promise.all([
          supabase.from("productos").select("*").order("orden").order("nombre"),
          supabase.from("categorias").select("*").order("orden"),
          disponibilidadSede(sede.id),
        ]);
        setProductos((prods.data ?? []).map(filaAProducto));
        setCategorias((cats.data ?? []).map(filaACategoria));
        setDisp(d);
      } catch (e: any) {
        setError(e?.message ?? "No se pudo cargar el menú");
      } finally {
        setCargando(false);
      }
    })();
  }, [sede.id]);

  const estaDisponible = (id: string) => (id in disp ? disp[id] : true);
  const totalDisp = productos.filter((p) => estaDisponible(p.id)).length;
  const totalAgot = productos.length - totalDisp;

  const visibles = useMemo(() => {
    const q = sinTildes(buscar.trim());
    return productos.filter((p) => {
      const d = estaDisponible(p.id);
      if (filtro === "disponibles" && !d) return false;
      if (filtro === "agotados" && d) return false;
      if (cat && p.categoriaId !== cat) return false;
      return !q || sinTildes(p.nombre).includes(q);
    });
  }, [productos, disp, buscar, filtro, cat]);
  // Categorías con productos, y cuántos agotados tiene cada una
  const chips = categorias
    .map((c) => ({ ...c, total: productos.filter((p) => p.categoriaId === c.id).length, agotados: productos.filter((p) => p.categoriaId === c.id && !estaDisponible(p.id)).length }))
    .filter((c) => c.total > 0);

  const grupos = useMemo(() => {
    const orden = [...categorias, { id: "__otros", nombre: "Otros" }];
    return orden
      .map((c) => ({
        ...c,
        items: visibles.filter((p) =>
          c.id === "__otros" ? !categorias.some((k) => k.id === p.categoriaId) : p.categoriaId === c.id,
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [visibles, categorias]);

  const cambiar = async (id: string, valor: boolean) => {
    setDisp((d) => ({ ...d, [id]: valor }));
    setEstado((e) => ({ ...e, [id]: "guardando" }));
    const r = await setDisponibilidad(sede.id, clave, id, valor);
    if (!r.ok) {
      setDisp((d) => ({ ...d, [id]: !valor }));
      setEstado((e) => ({ ...e, [id]: "error" }));
      setError(r.error ?? "No se pudo guardar el cambio");
      return;
    }
    setEstado((e) => ({ ...e, [id]: "ok" }));
    setTimeout(() => setEstado((e) => (e[id] === "ok" ? { ...e, [id]: undefined as never } : e)), 1800);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 bg-card border border-border rounded-2xl shadow-card p-1.5">
        {(["disponibilidad", "pedidos"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            aria-pressed={vista === v}
            className={`h-11 rounded-xl font-semibold ${vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {v === "disponibilidad" ? "Disponibilidad" : "Pedidos"}
          </button>
        ))}
      </div>

      {vista === "pedidos" ? (
        <ListaPedidos
          cargar={(dias) => listarPedidosSede(sede.id, clave, dias)}
          cambiarEstado={(id, estado) => cambiarEstadoPedido({ sede: sede.id, clave }, id, estado)}
          cargarRango={(desde, hasta) => listarPedidosRangoSede(sede.id, clave, desde, hasta)}
        />
      ) : (
      <>
      {/* Resumen: dos números grandes, colores distintos */}
      <div className="grid grid-cols-2 gap-3">
        <Resumen
          valor={totalDisp}
          etiqueta="Hay"
          activo={filtro === "disponibles"}
          onClick={() => setFiltro((f) => (f === "disponibles" ? "todos" : "disponibles"))}
          tono="disponible"
        />
        <Resumen
          valor={totalAgot}
          etiqueta="No hay"
          activo={filtro === "agotados"}
          onClick={() => setFiltro((f) => (f === "agotados" ? "todos" : "agotados"))}
          tono="agotado"
        />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium px-4 py-3">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <p className="rounded-xl bg-primary/10 text-primary text-sm px-4 py-3">
        <strong>Apaga el interruptor cuando algo se acabe.</strong> Todo vuelve a estar disponible solo cada mañana, antes de abrir.
      </p>

      <Tarjeta sinPadding className="overflow-hidden">
        {/* Buscador con lupa + categorías como fichas (con agotados en rojo) */}
        <div className="p-3 border-b border-border space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Busca el producto"
              aria-label="Buscar producto"
              className="w-full h-11 rounded-xl bg-muted pl-10 pr-10 text-base outline-none focus:ring-2 focus:ring-primary/40"
            />
            {buscar && (
              <button onClick={() => setBuscar("")} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-black/5">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
            {[{ id: null as string | null, nombre: "Todas", agotados: totalAgot, total: productos.length }, ...chips].map((c) => {
              const activo = cat === c.id;
              return (
                <button
                  key={c.id ?? "todas"}
                  onClick={() => setCat(c.id)}
                  aria-pressed={activo}
                  className={`h-9 shrink-0 rounded-full border-2 px-3 text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition ${
                    activo ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                  }`}
                >
                  {c.id && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorCategoria(categorias, c.id) }} />}
                  {c.nombre}
                  {c.agotados > 0 && (
                    <span className="h-5 min-w-5 px-1 rounded-full bg-[#D92D20] text-white text-[11px] font-bold inline-flex items-center justify-center" aria-label={`${c.agotados} sin existencias`}>
                      {c.agotados}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {(filtro !== "todos" || cat || buscar) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex-1">
                Mostrando {visibles.length} de {productos.length}
                {filtro !== "todos" && <> · solo <strong>{filtro === "disponibles" ? "Hay" : "No hay"}</strong></>}
              </span>
              <button
                onClick={() => {
                  setFiltro("todos");
                  setCat(null);
                  setBuscar("");
                }}
                className="h-8 rounded-lg bg-primary/10 text-primary px-3 font-semibold inline-flex items-center gap-1"
              >
                Ver todo <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {cargando ? (
          <div className="p-10 flex justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : grupos.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {productos.length === 0 ? "Aún no hay productos en el menú." : "Ningún producto coincide."}
          </p>
        ) : (
          grupos.map((g) => (
            <section key={g.id}>
              <h2 className="sticky top-0 z-10 bg-muted/95 backdrop-blur px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {g.nombre}
              </h2>
              <ul className="divide-y divide-border">
                {g.items.map((p) => (
                  <FilaProducto
                    key={p.id}
                    producto={p}
                    color={colorCategoria(categorias, p.categoriaId)}
                    disponible={estaDisponible(p.id)}
                    estado={estado[p.id]}
                    onCambiar={(v) => cambiar(p.id, v)}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </Tarjeta>

      <CambiarClave sedeId={sede.id} clave={clave} onCambiada={onClave} />
      </>
      )}
    </div>
  );
}

// Búsqueda sin importar tildes ni mayúsculas ("bunuelo" encuentra "Buñuelo")
const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Resumen({
  valor,
  etiqueta,
  activo,
  onClick,
  tono,
}: {
  valor: number;
  etiqueta: string;
  activo: boolean;
  onClick: () => void;
  tono: "disponible" | "agotado";
}) {
  const color =
    tono === "disponible"
      ? activo
        ? "bg-[#1F8A3B] text-white border-[#1F8A3B]"
        : "bg-card text-[#1F8A3B] border-border"
      : activo
        ? "bg-[#D92D20] text-white border-[#D92D20]"
        : "bg-card text-[#D92D20] border-border";
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-2xl border-2 shadow-card p-4 text-left transition hover:-translate-y-0.5 ${color}`}
    >
      <span className="block font-display text-3xl font-bold leading-none">{valor}</span>
      <span className={`block mt-1 text-sm font-semibold ${activo ? "opacity-90" : "text-muted-foreground"}`}>
        {etiqueta}
      </span>
    </button>
  );
}

function FilaProducto({
  producto,
  color,
  disponible,
  estado,
  onCambiar,
}: {
  producto: Product;
  color: string;
  disponible: boolean;
  estado?: Estado;
  onCambiar: (v: boolean) => void;
}) {
  // Interruptor estilo iPhone: verde = hay, rojo = no hay. Toda la fila es tocable.
  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={disponible}
        onClick={() => onCambiar(!disponible)}
        disabled={estado === "guardando"}
        aria-label={`${producto.nombre}: ${disponible ? "hay" : "no hay"}`}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
          disponible ? "bg-card hover:bg-muted/40" : "bg-[#FFF1F0] hover:bg-[#FFE6E4]"
        }`}
      >
        <span className={`h-12 w-12 shrink-0 rounded-xl overflow-hidden ${disponible ? "" : "grayscale opacity-60"}`}>
          <FotoProducto product={producto} color={color} conNombre={false} mascota="w-3/4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block font-semibold text-base leading-tight line-clamp-2 ${disponible ? "text-foreground" : "text-[#9F1F17]"}`}>
            {producto.nombre}
          </span>
          <span className="block text-xs text-muted-foreground">{formatCOP(producto.precio)}</span>
        </span>
        <span className={`shrink-0 w-16 text-right text-sm font-bold ${disponible ? "text-[#1F8A3B]" : "text-[#D92D20]"}`}>
          {estado === "guardando" ? (
            <Loader2 className="inline h-4 w-4 animate-spin" aria-label="Guardando" />
          ) : estado === "ok" ? (
            <Check className="inline h-4 w-4 mr-0.5" aria-label="Guardado" />
          ) : null}
          {disponible ? "Hay" : "No hay"}
        </span>
        <span
          aria-hidden
          className={`relative shrink-0 h-[31px] w-[51px] rounded-full transition-colors duration-200 ${
            disponible ? "bg-[#34C759]" : "bg-[#FF3B30]"
          }`}
        >
          <span
            className={`absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-transform duration-200 ${
              disponible ? "translate-x-[20px]" : "translate-x-0"
            }`}
          />
        </span>
      </button>
    </li>
  );
}

/* ── Cambio de contraseña con reglas visibles ───────────────────────────── */

function CambiarClave({
  sedeId,
  clave,
  onCambiada,
}: {
  sedeId: number;
  clave: string;
  onCambiada: (nueva: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nueva, setNueva] = useState("");
  const [repite, setRepite] = useState("");
  const [ver, setVer] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const reglas = [
    { ok: nueva.length >= 8, texto: "Mínimo 8 caracteres" },
    { ok: /[A-Z]/.test(nueva), texto: "Al menos una mayúscula" },
    { ok: /[0-9]/.test(nueva), texto: "Al menos un número" },
    { ok: nueva.length > 0 && /^[A-Za-z0-9]+$/.test(nueva), texto: "Solo letras y números" },
    { ok: nueva.length > 0 && nueva === repite, texto: "Las dos coinciden" },
  ];
  const valida = reglas.every((r) => r.ok);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valida) return;
    setGuardando(true);
    const r = await cambiarClaveSede(sedeId, clave, nueva);
    setGuardando(false);
    if (!r.ok) return setMsg({ tipo: "err", texto: r.error ?? "No se pudo cambiar" });
    onCambiada(nueva);
    setNueva("");
    setRepite("");
    setMsg({ tipo: "ok", texto: "Contraseña actualizada. Úsala la próxima vez que ingreses." });
  };

  return (
    <Tarjeta>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-3 text-left"
      >
        <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <KeyRound className="h-5 w-5" />
        </span>
        <span className="flex-1 font-semibold">Cambiar contraseña de la sede</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {[
            { v: nueva, set: setNueva, ph: "Nueva contraseña" },
            { v: repite, set: setRepite, ph: "Repite la nueva contraseña" },
          ].map((f) => (
            <input
              key={f.ph}
              type={ver ? "text" : "password"}
              value={f.v}
              onChange={(e) => {
                f.set(e.target.value);
                setMsg(null);
              }}
              placeholder={f.ph}
              autoComplete="new-password"
              className="w-full h-12 rounded-xl border-2 border-border bg-background px-4 text-base outline-none focus:border-primary transition"
            />
          ))}
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar
          </label>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {reglas.map((r) => (
              <li key={r.texto} className={`flex items-center gap-2 text-sm ${r.ok ? "text-primary font-medium" : "text-muted-foreground"}`}>
                <span
                  className={`h-4 w-4 rounded-full flex items-center justify-center ${
                    r.ok ? "bg-primary text-primary-foreground" : "border border-border"
                  }`}
                >
                  {r.ok && <Check className="h-3 w-3" />}
                </span>
                {r.texto}
              </li>
            ))}
          </ul>

          {msg && (
            <p
              role="status"
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                msg.tipo === "ok" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}
            >
              {msg.texto}
            </p>
          )}

          <button
            type="submit"
            disabled={!valida || guardando}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {guardando && <Loader2 className="h-5 w-5 animate-spin" />}
            Guardar contraseña
          </button>
        </form>
      )}
    </Tarjeta>
  );
}

/* ── Piezas comunes ─────────────────────────────────────────────────────── */

function Tarjeta({
  children,
  className = "",
  sinPadding = false,
}: {
  children: React.ReactNode;
  className?: string;
  sinPadding?: boolean;
}) {
  return (
    <div className={`bg-card border border-border rounded-2xl shadow-card transition ${sinPadding ? "" : "p-5"} ${className}`}>
      {children}
    </div>
  );
}

function Paso({ n, titulo }: { n: number; titulo: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-7 w-7 rounded-full bg-secondary text-secondary-foreground text-sm font-bold flex items-center justify-center">
        {n}
      </span>
      <h2 className="font-display text-lg font-bold text-primary">{titulo}</h2>
    </div>
  );
}
