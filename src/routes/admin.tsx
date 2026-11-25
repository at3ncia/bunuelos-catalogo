import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Camera,
  Check,
  ExternalLink,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  Search,
  Settings2,
  Store,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { AZUL_MARCA, FONDO_MANCHAS, LOGO_OSCURO_URL } from "@/lib/brand";
import { formatCOP } from "@/lib/cart";
import { slug, uid, type Category, type Product } from "@/lib/storage";
import {
  etiquetaDias,
  etiquetaFranjas,
  ICONOS_ENLACE,
  NOMBRES_DIA,
  urlEnlace,
  type Ajustes,
  type Enlace,
  type Franja,
  type ReglaHorario,
} from "@/lib/ajustes";
import { etiquetaSede, type PuntoPedido, type Sede } from "@/lib/sedes";
import {
  borrarCategoria,
  borrarProducto,
  cambiarClaveAdmin,
  cargarDatosPanel,
  guardarAjustes,
  guardarCategoria,
  guardarProducto,
  guardarPunto,
  restablecerClaveSede,
  verificarAdmin,
  type DatosPanel,
  type Resultado,
} from "@/lib/admin";
import { colorCategoria, FotoProducto } from "@/components/foto-producto";
import { subirFoto } from "@/lib/fotos";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel del negocio — Los Buñuelos" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

// La sesión del dueño dura mientras la pestaña esté abierta
const CLAVE_SESION = "sesionAdmin";

type Pestana = "productos" | "categorias" | "whatsapp" | "ajustes" | "seguridad";
type Aviso = { tipo: "ok" | "err"; texto: string } | null;

const INPUT =
  "w-full h-11 rounded-xl border-2 border-border bg-background px-3 text-base outline-none focus:border-primary transition";

function AdminPage() {
  const [clave, setClave] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(CLAVE_SESION);
    } catch {
      return null;
    }
  });

  const entrar = (c: string) => {
    try {
      sessionStorage.setItem(CLAVE_SESION, c);
    } catch {
      /* sin almacenamiento: se pedirá de nuevo al recargar */
    }
    setClave(c);
  };
  const salir = () => {
    try {
      sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      /* nada */
    }
    setClave(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header
        className="text-white pt-4 pb-12"
        style={{ backgroundColor: AZUL_MARCA, backgroundImage: FONDO_MANCHAS, backgroundSize: "340px 340px" }}
      >
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Catálogo
            </Link>
            {clave && (
              <button
                onClick={salir}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm font-semibold transition"
              >
                <LogOut className="h-4 w-4" /> Salir
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-col items-center text-center">
            <img src={LOGO_OSCURO_URL} alt="Los Buñuelos Los Originales" className="w-52 h-auto drop-shadow-lg" />
            <h1 className="mt-3 font-display text-2xl font-bold">Panel del negocio</h1>
            <p className="text-sm text-white/75">Menú, precios, WhatsApp, horarios y claves</p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 -mt-6 pb-36 relative">
        {clave ? <Panel clave={clave} onClaveCambiada={entrar} onSalir={salir} /> : <Login onOk={entrar} />}
      </main>
    </div>
  );
}

/* ── Ingreso ───────────────────────────────────────────────────────────── */

function Login({ onOk }: { onOk: (clave: string) => void }) {
  const [clave, setClave] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    const r = await verificarAdmin(clave);
    setCargando(false);
    if (r.ok) onOk(clave);
    else setError(r.error ?? "No se pudo ingresar");
  };

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-2xl shadow-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <KeyRound className="h-5 w-5" />
        </span>
        <h2 className="font-display text-lg font-bold text-primary">Contraseña del dueño</h2>
      </div>
      <div className="relative">
        <input
          type={ver ? "text" : "password"}
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          autoComplete="current-password"
          className={`${INPUT} h-12 pr-12`}
          placeholder="Contraseña"
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
        >
          {ver ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 text-destructive text-sm font-medium px-3 py-2">{error}</p>}
      <button
        type="submit"
        disabled={!clave || cargando}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {cargando && <Loader2 className="h-5 w-5 animate-spin" />} Ingresar
      </button>
      <p className="text-xs text-muted-foreground">
        ¿Eres encargado de una sede? Entra por{" "}
        <Link to="/sede" className="text-primary font-semibold underline">
          Gestión de disponibilidad
        </Link>
        .
      </p>
    </form>
  );
}

/* ── Panel ─────────────────────────────────────────────────────────────── */

function Panel({
  clave,
  onClaveCambiada,
  onSalir,
}: {
  clave: string;
  onClaveCambiada: (c: string) => void;
  onSalir: () => void;
}) {
  const [pestana, setPestana] = useState<Pestana>("productos");
  const [datos, setDatos] = useState<DatosPanel | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);

  const cargar = () =>
    cargarDatosPanel()
      .then((d) => {
        setDatos(d);
        setErrorCarga("");
      })
      .catch((e) => setErrorCarga(e.message));

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  // Ejecuta una acción, avisa el resultado y recarga los datos
  const ejecutar = async (accion: Promise<Resultado>, textoOk: string) => {
    const r = await accion;
    if (r.ok) {
      setAviso({ tipo: "ok", texto: textoOk });
      await cargar();
    } else {
      setAviso({ tipo: "err", texto: r.error ?? "No se pudo guardar" });
      if (/contraseña incorrecta/i.test(r.error ?? "")) onSalir();
    }
    return r.ok;
  };

  const pestanas: [Pestana, string, typeof Store][] = [
    ["productos", "Productos", Store],
    ["categorias", "Categorías", Tag],
    ["whatsapp", "Links", Store],
    ["ajustes", "Ajustes", Settings2],
    ["seguridad", "Claves", KeyRound],
  ];

  return (
    <div className="space-y-4">
      <nav className="bg-card border border-border rounded-2xl shadow-card p-1.5 grid grid-cols-5 gap-1">
        {pestanas.map(([id, texto, Icono]) => (
          <button
            key={id}
            onClick={() => setPestana(id)}
            aria-pressed={pestana === id}
            className={`px-1 py-2 rounded-xl text-[11px] sm:text-sm font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 transition ${
              pestana === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {id === "whatsapp" ? <WhatsAppIcon className="h-5 w-5" /> : <Icono className="h-5 w-5" />}
            {texto}
          </button>
        ))}
      </nav>

      {errorCarga && (
        <p role="alert" className="rounded-xl bg-destructive/10 text-destructive text-sm font-medium px-4 py-3">
          {errorCarga}
        </p>
      )}

      {!datos ? (
        !errorCarga && (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )
      ) : pestana === "productos" ? (
        <PestanaProductos datos={datos} clave={clave} ejecutar={ejecutar} />
      ) : pestana === "categorias" ? (
        <PestanaCategorias datos={datos} clave={clave} ejecutar={ejecutar} />
      ) : pestana === "whatsapp" ? (
        <PestanaWhatsApp datos={datos} clave={clave} ejecutar={ejecutar} />
      ) : pestana === "ajustes" ? (
        <PestanaAjustes datos={datos} clave={clave} ejecutar={ejecutar} />
      ) : (
        <PestanaSeguridad datos={datos} clave={clave} ejecutar={ejecutar} onClaveCambiada={onClaveCambiada} />
      )}

      {aviso && (
        <div
          role="status"
          className={`fixed bottom-[4.5rem] left-4 right-4 mx-auto max-w-md z-50 rounded-2xl px-4 py-3 shadow-card font-semibold text-sm flex items-center gap-2 ${
            aviso.tipo === "ok" ? "bg-primary text-primary-foreground" : "bg-destructive text-white"
          }`}
        >
          {aviso.tipo === "ok" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          {aviso.texto}
        </div>
      )}
    </div>
  );
}

type PropsPestana = {
  datos: DatosPanel;
  clave: string;
  ejecutar: (accion: Promise<Resultado>, textoOk: string) => Promise<boolean>;
};

/* ── Productos ─────────────────────────────────────────────────────────── */

const PRODUCTO_NUEVO = (categoriaId: string): Product => ({
  id: "",
  nombre: "",
  descripcion: "",
  precio: 0,
  categoriaId,
  foto: "",
  disponible: true,
  dias: null,
  orden: 0,
});

function PestanaProductos({ datos, clave, ejecutar }: PropsPestana) {
  const [buscar, setBuscar] = useState("");
  const [editando, setEditando] = useState<Product | null>(null);

  const grupos = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    const filtrados = datos.productos.filter((p) => !q || p.nombre.toLowerCase().includes(q));
    return [...datos.categorias, { id: "", nombre: "Sin categoría", color: "", orden: 999 }]
      .map((c) => ({
        ...c,
        items: filtrados.filter((p) =>
          c.id ? p.categoriaId === c.id : !datos.categorias.some((k) => k.id === p.categoriaId),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [datos, buscar]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder={`Buscar entre ${datos.productos.length} productos`}
            className={`${INPUT} pl-9 bg-card`}
          />
        </div>
        <button
          onClick={() => setEditando(PRODUCTO_NUEVO(datos.categorias[0]?.id ?? ""))}
          className="shrink-0 h-11 rounded-xl bg-[#D9731B] text-white font-bold px-4 inline-flex items-center gap-1.5 shadow-card"
        >
          <Plus className="h-5 w-5" /> Nuevo
        </button>
      </div>

      {grupos.map((g) => (
        <section key={g.id || "sin"} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <h2 className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/70 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colorCategoria(datos.categorias, g.id) }} />
            {g.nombre} · {g.items.length}
          </h2>
          <ul className="divide-y divide-border">
            {g.items.map((p) => (
              <li key={p.id}>
                <button onClick={() => setEditando(p)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition">
                  <span className="h-11 w-11 rounded-lg overflow-hidden shrink-0">
                    <FotoProducto product={p} color={colorCategoria(datos.categorias, p.categoriaId)} conNombre={false} mascota="w-3/4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block font-semibold truncate ${p.disponible ? "" : "text-muted-foreground line-through"}`}>
                      {p.nombre}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {!p.disponible && <Etiqueta tono="gris">Oculto</Etiqueta>}
                      {p.dias && <Etiqueta tono="naranja">Solo {etiquetaDias(p.dias).toLowerCase()}</Etiqueta>}
                      {p.foto ? <Etiqueta tono="azul">Con foto</Etiqueta> : null}
                    </span>
                  </span>
                  <span className="font-display font-bold text-primary shrink-0">{formatCOP(p.precio)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <EditorProducto
        producto={editando}
        clave={clave}
        categorias={datos.categorias}
        onCerrar={() => setEditando(null)}
        onGuardar={async (p) => {
          const id = p.id || `${slug(p.nombre) || "producto"}-${uid().slice(0, 4)}`;
          const ok = await ejecutar(guardarProducto(clave, { ...p, id }), `"${p.nombre}" guardado`);
          if (ok) setEditando(null);
        }}
        onBorrar={async (p) => {
          const ok = await ejecutar(borrarProducto(clave, p.id), `"${p.nombre}" borrado`);
          if (ok) setEditando(null);
        }}
      />
    </div>
  );
}

function Etiqueta({ children, tono }: { children: React.ReactNode; tono: "gris" | "naranja" | "azul" }) {
  const c = {
    gris: "bg-muted text-muted-foreground",
    naranja: "bg-[#FBE3CC] text-[#9A4708]",
    azul: "bg-primary/10 text-primary",
  }[tono];
  return <span className={`rounded-full px-2 py-0.5 font-semibold ${c}`}>{children}</span>;
}

function EditorProducto({
  producto,
  clave,
  categorias,
  onCerrar,
  onGuardar,
  onBorrar,
}: {
  producto: Product | null;
  clave: string;
  categorias: Category[];
  onCerrar: () => void;
  onGuardar: (p: Product) => Promise<void>;
  onBorrar: (p: Product) => Promise<void>;
}) {
  const [p, setP] = useState<Product | null>(producto);
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  useEffect(() => {
    setP(producto);
    setConfirmarBorrar(false);
  }, [producto]);

  if (!p) return null;
  const cambiar = (c: Partial<Product>) => setP({ ...p, ...c });
  const soloAlgunosDias = !!p.dias;

  return (
    <Dialog open={!!producto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-7rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{p.id ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>Los cambios se ven en el catálogo al guardar.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setGuardando(true);
            await onGuardar(p);
            setGuardando(false);
          }}
          className="space-y-4"
        >
          <Campo etiqueta="Nombre">
            <input className={INPUT} value={p.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} required maxLength={80} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Precio">
              <input
                className={INPUT}
                inputMode="numeric"
                value={p.precio ? p.precio.toLocaleString("es-CO") : ""}
                onChange={(e) => cambiar({ precio: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                placeholder="8.000"
              />
            </Campo>
            <Campo etiqueta="Categoría">
              <select className={INPUT} value={p.categoriaId} onChange={(e) => cambiar({ categoriaId: e.target.value })}>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo etiqueta="Descripción" ayuda="Opcional. En los combos, qué incluye.">
            <textarea
              className={`${INPUT} h-auto py-2`}
              rows={2}
              value={p.descripcion}
              onChange={(e) => cambiar({ descripcion: e.target.value })}
              maxLength={300}
            />
          </Campo>
          <SelectorFoto
            producto={p}
            clave={clave}
            color={colorCategoria(categorias, p.categoriaId)}
            onCambiar={(foto) => cambiar({ foto })}
          />

          <Interruptor
            activo={p.disponible}
            onCambiar={(v) => cambiar({ disponible: v })}
            titulo="Visible en el menú"
            detalle="Apágalo para ocultarlo en todas las sedes (por ejemplo, un producto de temporada)."
          />
          <Interruptor
            activo={soloAlgunosDias}
            onCambiar={(v) => cambiar({ dias: v ? [2] : null })}
            titulo="Solo ciertos días"
            detalle="Para promociones como el Martes 2x1: aparece solo esos días."
          />
          {soloAlgunosDias && (
            <SelectorDias dias={p.dias ?? []} onCambiar={(dias) => cambiar({ dias: dias.length ? dias : null })} />
          )}

          <div className="flex items-center gap-2 pt-2">
            {p.id &&
              (confirmarBorrar ? (
                <button
                  type="button"
                  onClick={() => onBorrar(p)}
                  className="h-12 rounded-xl bg-destructive text-white font-bold px-4"
                >
                  Sí, borrar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmarBorrar(true)}
                  aria-label="Borrar producto"
                  className="h-12 w-12 rounded-xl border-2 border-border text-destructive flex items-center justify-center"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              ))}
            <button
              type="submit"
              disabled={guardando || !p.nombre.trim() || !p.categoriaId}
              className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {guardando && <Loader2 className="h-5 w-5 animate-spin" />} Guardar
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SelectorFoto({
  producto,
  clave,
  color,
  onCambiar,
}: {
  producto: Product;
  clave: string;
  color: string;
  onCambiar: (url: string) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [verEnlace, setVerEnlace] = useState(false);

  const elegir = async (archivo: File | undefined) => {
    if (!archivo) return;
    setSubiendo(true);
    setError("");
    const r = await subirFoto(clave, producto.id || slug(producto.nombre), archivo);
    setSubiendo(false);
    if (r.ok) onCambiar(r.url);
    else setError(r.error);
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold">Foto</span>
      <div className="flex items-center gap-3">
        <div className="relative h-24 w-32 shrink-0 rounded-xl overflow-hidden border border-border">
          <FotoProducto product={producto} color={color} mascota="w-1/2" />
          {subiendo && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          {/* accept=image/*: en el celular ofrece tomar foto o elegir de la galería */}
          <label
            className={`flex h-11 items-center justify-center gap-2 rounded-xl bg-[#D9731B] text-white font-bold cursor-pointer ${
              subiendo ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <Camera className="h-5 w-5" />
            {subiendo ? "Subiendo…" : producto.foto ? "Cambiar foto" : "Subir foto"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                elegir(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {producto.foto && !subiendo && (
            <button
              type="button"
              onClick={() => onCambiar("")}
              className="w-full h-9 rounded-xl border-2 border-border text-sm font-semibold text-muted-foreground"
            >
              Quitar foto
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Desde el celular puedes tomarla o elegirla de la galería. Se ajusta sola para que cargue rápido. Sin foto se
        muestra la mascota.
      </p>
      <button type="button" onClick={() => setVerEnlace((v) => !v)} className="text-xs font-semibold text-primary">
        {verEnlace ? "Ocultar" : "¿Tienes la foto en internet? Pega el enlace"}
      </button>
      {verEnlace && (
        <input className={INPUT} value={producto.foto} onChange={(e) => onCambiar(e.target.value.trim())} placeholder="https://…" />
      )}
    </div>
  );
}

/* ── Categorías ────────────────────────────────────────────────────────── */

function PestanaCategorias({ datos, clave, ejecutar }: PropsPestana) {
  const [nueva, setNueva] = useState("");
  const cats = datos.categorias;

  const mover = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    // Reasigna el orden de todas para que quede limpio (0, 1, 2…)
    const nuevas = [...cats];
    [nuevas[i], nuevas[j]] = [nuevas[j], nuevas[i]];
    for (let k = 0; k < nuevas.length; k++) {
      if (nuevas[k].orden !== k) await guardarCategoria(clave, { ...nuevas[k], orden: k });
    }
    await ejecutar(Promise.resolve({ ok: true }), "Orden actualizado");
  };

  return (
    <div className="space-y-4">
      <Tarjeta>
        <p className="text-sm text-muted-foreground">
          El orden y el color de cada categoría se usan en el catálogo (secciones y tarjetas sin foto).
        </p>
      </Tarjeta>
      <ul className="space-y-2">
        {cats.map((c, i) => (
          <FilaCategoria
            key={c.id}
            categoria={c}
            color={colorCategoria(cats, c.id)}
            productos={datos.productos.filter((p) => p.categoriaId === c.id).length}
            primera={i === 0}
            ultima={i === cats.length - 1}
            onMover={(dir) => mover(i, dir)}
            onGuardar={(cambios) => ejecutar(guardarCategoria(clave, { ...c, ...cambios }), "Categoría guardada")}
            onBorrar={() => ejecutar(borrarCategoria(clave, c.id), "Categoría borrada")}
          />
        ))}
      </ul>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const nombre = nueva.trim();
          if (!nombre) return;
          const ok = await ejecutar(
            guardarCategoria(clave, { id: slug(nombre) || uid(), nombre, color: "", orden: cats.length }),
            "Categoría creada",
          );
          if (ok) setNueva("");
        }}
        className="flex gap-2"
      >
        <input className={`${INPUT} bg-card`} value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva categoría" />
        <button type="submit" disabled={!nueva.trim()} className="shrink-0 h-11 rounded-xl bg-[#D9731B] text-white font-bold px-4 disabled:opacity-40">
          Crear
        </button>
      </form>
    </div>
  );
}

function FilaCategoria({
  categoria,
  color,
  productos,
  primera,
  ultima,
  onMover,
  onGuardar,
  onBorrar,
}: {
  categoria: Category;
  color: string;
  productos: number;
  primera: boolean;
  ultima: boolean;
  onMover: (dir: -1 | 1) => void;
  onGuardar: (c: Partial<Category>) => void;
  onBorrar: () => void;
}) {
  const [nombre, setNombre] = useState(categoria.nombre);
  const [colorLocal, setColorLocal] = useState(color);
  useEffect(() => setNombre(categoria.nombre), [categoria.nombre]);
  useEffect(() => setColorLocal(color), [color]);
  return (
    <li className="bg-card border border-border rounded-2xl shadow-card p-3 flex items-center gap-2">
      <label className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border-2 border-border cursor-pointer" title="Cambiar color">
        <span className="absolute inset-0" style={{ backgroundColor: colorLocal }} />
        <input
          type="color"
          value={colorLocal}
          onChange={(e) => setColorLocal(e.target.value)}
          onBlur={() => colorLocal !== color && onGuardar({ color: colorLocal })}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label={`Color de ${categoria.nombre}`}
        />
      </label>
      <input
        className="flex-1 min-w-0 h-10 rounded-lg bg-transparent px-2 font-semibold outline-none focus:bg-muted"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onBlur={() => nombre.trim() && nombre !== categoria.nombre && onGuardar({ nombre: nombre.trim() })}
        aria-label="Nombre de la categoría"
      />
      <span className="text-xs text-muted-foreground shrink-0">{productos} prod.</span>
      <button onClick={() => onMover(-1)} disabled={primera} aria-label="Subir" className="p-2 rounded-lg hover:bg-muted disabled:opacity-25">
        <ArrowUp className="h-4 w-4" />
      </button>
      <button onClick={() => onMover(1)} disabled={ultima} aria-label="Bajar" className="p-2 rounded-lg hover:bg-muted disabled:opacity-25">
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        onClick={onBorrar}
        disabled={productos > 0}
        title={productos > 0 ? "Mueve o borra primero sus productos" : "Borrar"}
        aria-label="Borrar categoría"
        className="p-2 rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-25"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

/* ── WhatsApp (puntos de pedido) ───────────────────────────────────────── */

function PestanaWhatsApp({ datos, clave, ejecutar }: PropsPestana) {
  const [nuevo, setNuevo] = useState<PuntoPedido | null>(null);
  return (
    <div className="space-y-4">
      <EditorPaginaLinks datos={datos} clave={clave} ejecutar={ejecutar} />
      <Tarjeta titulo="Puntos de pedido (WhatsApp)" icono={<WhatsAppIcon className="h-4 w-4" />}>
        <p className="text-sm text-muted-foreground">
          Cada punto recibe los pedidos de su ciudad por WhatsApp y aparece como botón en <strong>/links</strong>. Si una
          ciudad tiene varios puntos, el cliente elige el más cercano.
        </p>
      </Tarjeta>
      {[...datos.puntos, ...(nuevo ? [nuevo] : [])].map((p) => (
        <EditorPunto
          key={p.id}
          punto={p}
          sedes={datos.sedes}
          esNuevo={p === nuevo}
          onGuardar={async (cambios) => {
            const ok = await ejecutar(guardarPunto(clave, cambios), `"${cambios.nombre}" guardado`);
            if (ok && p === nuevo) setNuevo(null);
          }}
          onCancelar={p === nuevo ? () => setNuevo(null) : undefined}
        />
      ))}
      {!nuevo && (
        <button
          onClick={() =>
            setNuevo({
              id: `punto-${uid().slice(0, 6)}`,
              sede_id: datos.sedes[0]?.id ?? 1,
              nombre: "",
              detalle: "",
              whatsapp: "57",
              orden: datos.puntos.length,
              activo: true,
              mensaje: "Hola! Quiero ordenar",
              etiqueta_enlace: "",
              en_enlaces: true,
            })
          }
          className="w-full h-12 rounded-xl border-2 border-dashed border-border text-muted-foreground font-semibold inline-flex items-center justify-center gap-2 hover:border-primary hover:text-primary"
        >
          <Plus className="h-5 w-5" /> Agregar punto de pedido
        </button>
      )}
    </div>
  );
}

function EditorPunto({
  punto,
  sedes,
  esNuevo,
  onGuardar,
  onCancelar,
}: {
  punto: PuntoPedido;
  sedes: Sede[];
  esNuevo: boolean;
  onGuardar: (p: PuntoPedido) => Promise<void>;
  onCancelar?: () => void;
}) {
  const [p, setP] = useState(punto);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => setP(punto), [punto]);
  const cambiar = (c: Partial<PuntoPedido>) => setP({ ...p, ...c });
  const sinCambios = JSON.stringify(p) === JSON.stringify(punto) && !esNuevo;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        await onGuardar(p);
        setGuardando(false);
      }}
      className="bg-card border border-border rounded-2xl shadow-card p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <WhatsAppIcon className="h-5 w-5 text-[#1FA855]" />
        <h3 className="font-display font-bold text-primary flex-1">{p.nombre || "Nuevo punto"}</h3>
        {p.activo === false && <Etiqueta tono="gris">Inactivo</Etiqueta>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Nombre">
          <input className={INPUT} value={p.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} required placeholder="Bocagrande" />
        </Campo>
        <Campo etiqueta="Ciudad">
          <select className={INPUT} value={p.sede_id} onChange={(e) => cambiar({ sede_id: Number(e.target.value) })}>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {etiquetaSede(s)}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo etiqueta="WhatsApp" ayuda="Con indicativo, sin espacios: 573001234567">
        <input
          className={INPUT}
          inputMode="tel"
          value={p.whatsapp}
          onChange={(e) => cambiar({ whatsapp: e.target.value.replace(/[^\d]/g, "") })}
          required
        />
      </Campo>
      <Campo etiqueta="Detalle" ayuda="Se muestra al cliente al elegir el punto.">
        <input className={INPUT} value={p.detalle} onChange={(e) => cambiar({ detalle: e.target.value })} placeholder="Bocagrande, Cra 2 Calle 4" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Texto del botón en /links">
          <input className={INPUT} value={p.etiqueta_enlace} onChange={(e) => cambiar({ etiqueta_enlace: e.target.value })} placeholder={p.nombre} />
        </Campo>
        <Campo etiqueta="Mensaje inicial">
          <input className={INPUT} value={p.mensaje} onChange={(e) => cambiar({ mensaje: e.target.value })} />
        </Campo>
      </div>
      <Interruptor activo={p.en_enlaces} onCambiar={(v) => cambiar({ en_enlaces: v })} titulo="Mostrar en /links" />
      <Interruptor
        activo={p.activo !== false}
        onCambiar={(v) => cambiar({ activo: v })}
        titulo="Recibe pedidos"
        detalle="Apágalo si el punto cierra; deja de aparecer en el catálogo y en /links."
      />
      <div className="flex gap-2">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="h-11 rounded-xl border-2 border-border px-4 font-semibold">
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={guardando || sinCambios}
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {guardando && <Loader2 className="h-5 w-5 animate-spin" />} {sinCambios ? "Sin cambios" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

/* ── Página /links ─────────────────────────────────────────────────────── */

const ENLACE_NUEVO = (): Enlace => ({
  id: uid().slice(0, 6),
  texto: "",
  url: "",
  icono: "ubicacion",
  estilo: "blanco",
  activo: true,
});

function EditorPaginaLinks({ datos, clave, ejecutar }: PropsPestana) {
  const base = datos.ajustes;
  const [bio, setBio] = useState(base.bio);
  const [botonMenu, setBotonMenu] = useState(base.boton_menu);
  const [mostrarMenu, setMostrarMenu] = useState(base.mostrar_boton_menu);
  const [enlaces, setEnlaces] = useState<Enlace[]>(base.enlaces);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    setBio(base.bio);
    setBotonMenu(base.boton_menu);
    setMostrarMenu(base.mostrar_boton_menu);
    setEnlaces(base.enlaces);
  }, [base]);

  const final: Ajustes = { ...base, bio, boton_menu: botonMenu, mostrar_boton_menu: mostrarMenu, enlaces };
  const sinCambios = JSON.stringify(final) === JSON.stringify(base);
  const cambiarEnlace = (i: number, c: Partial<Enlace> | null) => {
    const lista = [...enlaces];
    if (c) lista[i] = { ...lista[i], ...c };
    else lista.splice(i, 1);
    setEnlaces(lista);
  };
  const mover = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= enlaces.length) return;
    const lista = [...enlaces];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    setEnlaces(lista);
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        await ejecutar(guardarAjustes(clave, final), "Página /links guardada");
        setGuardando(false);
      }}
      className="bg-card border border-border rounded-2xl shadow-card p-4 space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-bold text-primary">Página /links</h2>
        <a
          href="/links"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          Ver <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <Campo etiqueta="Texto bajo el logo" ayuda="Opcional. Por ejemplo: + de 10 años en el mercado 🧡">
        <textarea className={`${INPUT} h-auto py-2`} rows={2} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} />
      </Campo>

      <Interruptor
        activo={mostrarMenu}
        onCambiar={setMostrarMenu}
        titulo="Botón dorado del menú"
        detalle="Lleva al catálogo y pide la ciudad. Tiene el destello cada 4 segundos."
      />
      {mostrarMenu && (
        <Campo etiqueta="Texto del botón dorado">
          <input className={INPUT} value={botonMenu} onChange={(e) => setBotonMenu(e.target.value)} maxLength={40} />
        </Campo>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold">Botones extra</p>
        <p className="text-xs text-muted-foreground">
          Aparecen después de los botones de WhatsApp: ubicación en Maps, TikTok, Rappi, una promo…
        </p>
        {enlaces.map((e, i) => (
          <div key={e.id} className={`rounded-xl border border-border p-3 space-y-2 ${e.activo ? "" : "opacity-60"}`}>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={`${INPUT} h-10`}
                value={e.texto}
                onChange={(ev) => cambiarEnlace(i, { texto: ev.target.value })}
                placeholder="Texto del botón"
                aria-label="Texto del botón"
              />
              <select
                className={`${INPUT} h-10`}
                value={e.icono}
                onChange={(ev) => cambiarEnlace(i, { icono: ev.target.value as Enlace["icono"] })}
                aria-label="Ícono"
              >
                {ICONOS_ENLACE.map((ic) => (
                  <option key={ic.id} value={ic.id}>
                    {ic.nombre}
                  </option>
                ))}
              </select>
            </div>
            <input
              className={`${INPUT} h-10`}
              value={e.url}
              onChange={(ev) => cambiarEnlace(i, { url: ev.target.value })}
              placeholder={e.icono === "telefono" || e.icono === "whatsapp" ? "3001234567" : "maps.app.goo.gl/…"}
              aria-label="Enlace"
            />
            {e.url && <p className="text-xs text-muted-foreground truncate">Abre: {urlEnlace(e)}</p>}
            <div className="flex items-center gap-1">
              {(["blanco", "naranja", "dorado"] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => cambiarEnlace(i, { estilo: est })}
                  aria-pressed={e.estilo === est}
                  className={`h-8 px-3 rounded-full text-xs font-semibold border-2 ${
                    e.estilo === est ? "border-primary" : "border-transparent"
                  } ${est === "blanco" ? "bg-white text-[#122a6b] shadow-soft" : est === "naranja" ? "bg-[#D9731B] text-white" : "btn-dorado"}`}
                >
                  {est[0].toUpperCase() + est.slice(1)}
                </button>
              ))}
              <span className="flex-1" />
              <button type="button" onClick={() => cambiarEnlace(i, { activo: !e.activo })} className="h-8 px-2 rounded-lg text-xs font-semibold hover:bg-muted">
                {e.activo ? "Ocultar" : "Mostrar"}
              </button>
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir" className="p-1.5 disabled:opacity-25">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => mover(i, 1)} disabled={i === enlaces.length - 1} aria-label="Bajar" className="p-1.5 disabled:opacity-25">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => cambiarEnlace(i, null)} aria-label="Quitar" className="p-1.5 text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setEnlaces([...enlaces, ENLACE_NUEVO()])}
          className="w-full h-10 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground font-semibold hover:border-primary hover:text-primary"
        >
          + Agregar botón
        </button>
      </div>

      <button
        type="submit"
        disabled={guardando || sinCambios}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {guardando && <Loader2 className="h-5 w-5 animate-spin" />} {sinCambios ? "Sin cambios" : "Guardar página /links"}
      </button>
    </form>
  );
}

/* ── Ajustes generales ─────────────────────────────────────────────────── */

function PestanaAjustes({ datos, clave, ejecutar }: PropsPestana) {
  const [a, setA] = useState<Ajustes>(datos.ajustes);
  const [pagos, setPagos] = useState(datos.ajustes.medios_pago.join(", "));
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    setA(datos.ajustes);
    setPagos(datos.ajustes.medios_pago.join(", "));
  }, [datos.ajustes]);
  const cambiar = (c: Partial<Ajustes>) => setA({ ...a, ...c });
  const mediosPago = pagos.split(",").map((x) => x.trim()).filter(Boolean);
  const final: Ajustes = { ...a, medios_pago: mediosPago };
  const sinCambios = JSON.stringify(final) === JSON.stringify(datos.ajustes);

  const cambiarRegla = (i: number, r: ReglaHorario | null) => {
    const reglas = [...a.horario_domicilios];
    if (r) reglas[i] = r;
    else reglas.splice(i, 1);
    cambiar({ horario_domicilios: reglas });
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        await ejecutar(guardarAjustes(clave, final), "Ajustes guardados");
        setGuardando(false);
      }}
      className="space-y-4"
    >
      <Tarjeta titulo="Portada del catálogo">
        <Campo etiqueta="Título">
          <input className={INPUT} value={a.titulo} onChange={(e) => cambiar({ titulo: e.target.value })} maxLength={80} />
        </Campo>
        <Campo etiqueta="Subtítulo">
          <input className={INPUT} value={a.subtitulo} onChange={(e) => cambiar({ subtitulo: e.target.value })} maxLength={140} />
        </Campo>
        <Campo etiqueta="Instagram (sin @)" ayuda="Aparece en el pie del catálogo y en /links.">
          <input className={INPUT} value={a.instagram} onChange={(e) => cambiar({ instagram: e.target.value.replace(/^@/, "").trim() })} />
        </Campo>
      </Tarjeta>

      <Tarjeta titulo="Medios de pago" icono={<Tag className="h-4 w-4" />}>
        <p className="text-xs text-muted-foreground">Separados por coma. El primero queda seleccionado por defecto.</p>
        <input className={INPUT} value={pagos} onChange={(e) => setPagos(e.target.value)} />
      </Tarjeta>

      <Tarjeta titulo="Horario de domicilios" icono={<Clock className="h-4 w-4" />}>
        <p className="text-xs text-muted-foreground">
          Fuera de este horario el catálogo avisa solo que los domicilios están cerrados y cuándo abren. Los festivos de
          Colombia se calculan automáticamente y usan el horario del domingo.
        </p>
        {a.horario_domicilios.map((r, i) => (
          <EditorRegla key={i} regla={r} onCambiar={(nr) => cambiarRegla(i, nr)} />
        ))}
        <button
          type="button"
          onClick={() => cambiar({ horario_domicilios: [...a.horario_domicilios, { dias: [], franjas: [["08:00", "17:00"]] }] })}
          className="w-full h-10 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground font-semibold"
        >
          + Agregar días con otro horario
        </button>
      </Tarjeta>

      <Tarjeta titulo="Reinicio diario de agotados" icono={<Clock className="h-4 w-4" />}>
        <p className="text-xs text-muted-foreground">
          A esta hora (Colombia) todo lo marcado como "Se acabó hoy" vuelve a estar disponible. Ponla antes de abrir.
        </p>
        <select className={INPUT} value={a.hora_reinicio} onChange={(e) => cambiar({ hora_reinicio: Number(e.target.value) })}>
          {Array.from({ length: 12 }, (_, h) => (
            <option key={h} value={h}>
              {h === 0 ? "12:00 a. m. (medianoche)" : `${h}:00 a. m.`}
            </option>
          ))}
        </select>
      </Tarjeta>

      <div className="sticky bottom-[4.5rem] z-10">
        <button
          type="submit"
          disabled={guardando || sinCambios || mediosPago.length === 0}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-card disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {guardando && <Loader2 className="h-5 w-5 animate-spin" />} {sinCambios ? "Sin cambios" : "Guardar ajustes"}
        </button>
      </div>
    </form>
  );
}

function EditorRegla({ regla, onCambiar }: { regla: ReglaHorario; onCambiar: (r: ReglaHorario | null) => void }) {
  const cambiarFranja = (i: number, f: Franja | null) => {
    const franjas = [...regla.franjas];
    if (f) franjas[i] = f;
    else franjas.splice(i, 1);
    onCambiar({ ...regla, franjas });
  };
  return (
    <div className="rounded-xl border border-border p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">
          {regla.dias.length ? etiquetaDias(regla.dias) : "Elige los días"}
          {regla.franjas.length ? ` · ${etiquetaFranjas(regla.franjas)}` : " · Cerrado"}
        </p>
        <button type="button" onClick={() => onCambiar(null)} aria-label="Quitar" className="p-1.5 text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <SelectorDias dias={regla.dias} onCambiar={(dias) => onCambiar({ ...regla, dias })} />
      {regla.franjas.map(([desde, hasta], i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="time" className={`${INPUT} h-10`} value={desde} onChange={(e) => cambiarFranja(i, [e.target.value, hasta])} />
          <span className="text-muted-foreground">a</span>
          <input type="time" className={`${INPUT} h-10`} value={hasta} onChange={(e) => cambiarFranja(i, [desde, e.target.value])} />
          <button type="button" onClick={() => cambiarFranja(i, null)} aria-label="Quitar franja" className="p-2 text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onCambiar({ ...regla, franjas: [...regla.franjas, ["14:00", "19:00"]] })}
        className="text-sm font-semibold text-primary"
      >
        + Agregar franja (por ejemplo, después del almuerzo)
      </button>
    </div>
  );
}

/* ── Claves ────────────────────────────────────────────────────────────── */

function PestanaSeguridad({
  datos,
  clave,
  ejecutar,
  onClaveCambiada,
}: PropsPestana & { onClaveCambiada: (c: string) => void }) {
  const [sedeId, setSedeId] = useState<number>(datos.sedes[0]?.id ?? 0);
  const [claveSede, setClaveSede] = useState("");
  const [nuevaAdmin, setNuevaAdmin] = useState("");

  return (
    <div className="space-y-4">
      <Tarjeta titulo="Restablecer la clave de una ciudad o sede" icono={<KeyRound className="h-4 w-4" />}>
        <p className="text-xs text-muted-foreground">
          Úsalo cuando cambie el personal o alguien olvide la clave. No necesitas saber la anterior. Los equipos que
          tenían la sesión guardada tendrán que ingresar con la nueva.
        </p>
        <select className={INPUT} value={sedeId} onChange={(e) => setSedeId(Number(e.target.value))}>
          {datos.sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {etiquetaSede(s)}
            </option>
          ))}
        </select>
        <ClaveNueva valor={claveSede} onCambiar={setClaveSede} />
        <button
          disabled={!reglasClave(claveSede).every((r) => r.ok)}
          onClick={async () => {
            const ok = await ejecutar(restablecerClaveSede(clave, sedeId, claveSede), "Clave de la sede actualizada");
            if (ok) setClaveSede("");
          }}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40"
        >
          Restablecer clave
        </button>
      </Tarjeta>

      <Tarjeta titulo="Tu contraseña de dueño" icono={<KeyRound className="h-4 w-4" />}>
        <ClaveNueva valor={nuevaAdmin} onCambiar={setNuevaAdmin} />
        <button
          disabled={!reglasClave(nuevaAdmin).every((r) => r.ok)}
          onClick={async () => {
            const ok = await ejecutar(cambiarClaveAdmin(clave, nuevaAdmin), "Contraseña actualizada");
            if (ok) {
              onClaveCambiada(nuevaAdmin);
              setNuevaAdmin("");
            }
          }}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40"
        >
          Cambiar mi contraseña
        </button>
      </Tarjeta>
    </div>
  );
}

function reglasClave(v: string) {
  return [
    { ok: v.length >= 8, texto: "8 caracteres o más" },
    { ok: /[A-Z]/.test(v), texto: "Una mayúscula" },
    { ok: /[0-9]/.test(v), texto: "Un número" },
    { ok: v.length > 0 && /^[A-Za-z0-9]+$/.test(v), texto: "Solo letras y números" },
  ];
}

function ClaveNueva({ valor, onCambiar }: { valor: string; onCambiar: (v: string) => void }) {
  return (
    <>
      <input
        className={INPUT}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="Nueva contraseña"
        autoComplete="new-password"
      />
      <ul className="grid grid-cols-2 gap-1.5">
        {reglasClave(valor).map((r) => (
          <li key={r.texto} className={`flex items-center gap-1.5 text-xs ${r.ok ? "text-primary font-semibold" : "text-muted-foreground"}`}>
            <Check className={`h-3.5 w-3.5 ${r.ok ? "" : "opacity-30"}`} /> {r.texto}
          </li>
        ))}
      </ul>
    </>
  );
}

/* ── Piezas comunes ────────────────────────────────────────────────────── */

function Tarjeta({ titulo, icono, children }: { titulo?: string; icono?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl shadow-card p-4 space-y-3">
      {titulo && (
        <h2 className="font-display font-bold text-primary flex items-center gap-2">
          {icono}
          {titulo}
        </h2>
      )}
      {children}
    </section>
  );
}

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{etiqueta}</span>
      {children}
      {ayuda && <span className="block text-xs text-muted-foreground">{ayuda}</span>}
    </label>
  );
}

function Interruptor({
  activo,
  onCambiar,
  titulo,
  detalle,
}: {
  activo: boolean;
  onCambiar: (v: boolean) => void;
  titulo: string;
  detalle?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onCambiar(!activo)}
      className="w-full flex items-center gap-3 text-left rounded-xl border border-border p-3 hover:bg-muted/50"
    >
      <span className="flex-1">
        <span className="block font-semibold text-sm">{titulo}</span>
        {detalle && <span className="block text-xs text-muted-foreground">{detalle}</span>}
      </span>
      <span className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition ${activo ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <span className={`block h-5 w-5 rounded-full bg-white shadow transition ${activo ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function SelectorDias({ dias, onCambiar }: { dias: number[]; onCambiar: (d: number[]) => void }) {
  const orden = [1, 2, 3, 4, 5, 6, 0]; // lunes primero
  return (
    <div className="flex flex-wrap gap-1.5">
      {orden.map((d) => {
        const activo = dias.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiar(activo ? dias.filter((x) => x !== d) : [...dias, d].sort())}
            className={`h-9 min-w-11 px-2 rounded-full text-sm font-semibold border-2 transition ${
              activo ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
            }`}
          >
            {NOMBRES_DIA[d].slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}
