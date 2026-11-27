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
  Bike,
  ClipboardList,
  Megaphone,
  Package,
  Pause,
  Pencil,
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
  TIPOS_CAMPO,
  urlEnlace,
  type Ajustes,
  type CampoPedido,
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
import { ListaPedidos } from "@/components/lista-pedidos";
import {
  borrarBarrio,
  borrarPromo,
  cambiarEstadoPedido,
  guardarBarrios,
  guardarPromo,
  listarBarriosAdmin,
  listarPedidosAdmin,
  listarPedidosRango,
  borrarPedido,
  listarPromosAdmin,
  promoVigente,
  type Barrio,
  type Promo,
  type FrecuenciaPromo,
} from "@/lib/negocio";
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

type Pestana = "pedidos" | "productos" | "promos" | "domicilios" | "categorias" | "whatsapp" | "ajustes" | "seguridad";
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
  const [pestana, setPestana] = useState<Pestana>("pedidos");
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
    ["pedidos", "Pedidos", ClipboardList],
    ["productos", "Productos", Store],
    ["promos", "Promos", Megaphone],
    ["domicilios", "Domicilios", Bike],
    ["categorias", "Categorías", Tag],
    ["whatsapp", "Links", Store],
    ["ajustes", "Ajustes", Settings2],
    ["seguridad", "Claves", KeyRound],
  ];

  return (
    <div className="space-y-4">
      <nav className="bg-card border border-border rounded-2xl shadow-card p-1.5 grid grid-cols-4 gap-1">
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
      ) : pestana === "pedidos" ? (
        <ListaPedidos
          sedes={datos.sedes}
          cargar={(dias) => listarPedidosAdmin(clave, dias)}
          cambiarEstado={(id, estado) => cambiarEstadoPedido({ admin: clave }, id, estado)}
          cargarRango={(desde, hasta) => listarPedidosRango(clave, desde, hasta)}
          borrar={(id) => borrarPedido(clave, id)}
        />
      ) : pestana === "promos" ? (
        <PestanaPromos datos={datos} clave={clave} ejecutar={ejecutar} />
      ) : pestana === "domicilios" ? (
        <PestanaDomicilios datos={datos} clave={clave} ejecutar={ejecutar} />
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

/* ── Promos (pop-up 3:4 programado) ──────────────────────────────────────── */

const PROMO_NUEVA = (): Promo => ({
  id: `promo-${uid().slice(0, 6)}`,
  titulo: "",
  imagen: "",
  producto_id: null,
  boton_texto: "Lo quiero",
  dias: null,
  desde: null,
  hasta: null,
  activo: true,
  orden: 0,
  frecuencia: "dia",
  hora_desde: null,
  hora_hasta: null,
});

const FRECUENCIAS: { id: FrecuenciaPromo; texto: string; detalle: string }[] = [
  { id: "visita", texto: "Cada vez que entran", detalle: "Sale en cada visita al menú" },
  { id: "dia", texto: "Una vez al día", detalle: "Máximo una vez al día por cliente" },
  { id: "una_vez", texto: "Solo una vez", detalle: "Cada cliente la ve una sola vez" },
];
const MOMENTOS: { texto: string; detalle: string; desde: string | null; hasta: string | null }[] = [
  { texto: "Todo el día", detalle: "Siempre", desde: null, hasta: null },
  { texto: "Mañana", detalle: "5 a. m. – 12 m.", desde: "05:00", hasta: "12:00" },
  { texto: "Tarde", detalle: "12 m. – 6 p. m.", desde: "12:00", hasta: "18:00" },
  { texto: "Noche", detalle: "6 p. m. – 11 p. m.", desde: "18:00", hasta: "23:00" },
];
const horaBonita = (h: string) => {
  const [hh, mm] = h.split(":").map(Number);
  const s = hh < 12 ? "a. m." : "p. m.";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${s}`;
};

function resumenPromo(p: Promo) {
  const partes: string[] = [];
  partes.push(p.dias?.length ? `Solo ${etiquetaDias(p.dias).toLowerCase()}` : "Todos los días");
  const f = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  if (p.desde && p.hasta) partes.push(`del ${f(p.desde)} al ${f(p.hasta)}`);
  else if (p.desde) partes.push(`desde el ${f(p.desde)}`);
  else if (p.hasta) partes.push(`hasta el ${f(p.hasta)}`);
  if (p.hora_desde && p.hora_hasta) partes.push(`${horaBonita(p.hora_desde)} a ${horaBonita(p.hora_hasta)}`);
  partes.push(FRECUENCIAS.find((x) => x.id === (p.frecuencia ?? "dia"))!.texto.toLowerCase());
  return partes.join(" · ");
}

function PestanaPromos({ datos, clave, ejecutar }: PropsPestana) {
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [editando, setEditando] = useState<Promo | null>(null);
  const [error, setError] = useState("");
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const pausar = async (p: Promo, activo: boolean) => {
    setOcupadoId(p.id);
    setPromos((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, activo } : x)));
    const ok = await ejecutar(guardarPromo(clave, { ...p, activo }), activo ? "Promo activada" : "Promo pausada");
    if (!ok) setPromos((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, activo: p.activo } : x)));
    setOcupadoId(null);
  };
  const quitar = async (p: Promo) => {
    setOcupadoId(p.id);
    const ok = await ejecutar(borrarPromo(clave, p.id), "Promo borrada");
    setOcupadoId(null);
    setPorBorrar(null);
    if (ok) setPromos((l) => (l ?? []).filter((x) => x.id !== p.id));
  };
  const cargar = async () => {
    const r = await listarPromosAdmin(clave);
    if (r.ok) setPromos((r as { promos?: Promo[] }).promos ?? []);
    else setError(r.error ?? "No se pudieron cargar las promos");
  };
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <Tarjeta>
        <p className="text-sm text-muted-foreground">
          Las promos salen como ventana emergente al abrir el menú. Elige cuándo y cada cuánto: por ejemplo, el 2x1
          solo los martes en la tarde, una vez al día. Imagen vertical 3:4 (ideal 1080 × 1440).
        </p>
      </Tarjeta>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</p>}
      {promos === null && !error ? (
        <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <ul className="space-y-2">
          {(promos ?? []).map((p) => {
            const hoy = promoVigente(p);
            const producto = datos.productos.find((x) => x.id === p.producto_id);
            const ocupado = ocupadoId === p.id;
            return (
              <li key={p.id} className={`bg-card border border-border rounded-2xl shadow-card overflow-hidden transition ${p.activo ? "" : "opacity-75"}`}>
                <button onClick={() => setEditando(p)} className="w-full p-3 flex gap-3 text-left">
                  <span className={`h-24 aspect-[3/4] shrink-0 rounded-xl overflow-hidden bg-muted flex items-center justify-center ${p.activo ? "" : "grayscale"}`}>
                    {p.imagen ? <img src={p.imagen} alt="" className="w-full h-full object-cover" /> : <Camera className="h-6 w-6 text-muted-foreground" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-display font-bold text-primary truncate">{p.titulo || "Promo sin título"}</span>
                    <span className="block text-xs text-muted-foreground">{resumenPromo(p)}</span>
                    {producto && <span className="block text-xs mt-1">Producto: {producto.nombre}</span>}
                    <span className="mt-1.5 inline-flex text-xs">
                      {!p.activo ? <Etiqueta tono="gris">Pausada</Etiqueta> : hoy ? <Etiqueta tono="azul">Sale hoy</Etiqueta> : <Etiqueta tono="naranja">Programada</Etiqueta>}
                    </span>
                  </span>
                  <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
                {porBorrar === p.id ? (
                  <div role="alert" className="border-t border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2">
                    <span className="flex-1 text-sm font-semibold text-destructive">¿Borrar esta promo para siempre?</span>
                    <button onClick={() => setPorBorrar(null)} className="h-10 px-3 rounded-xl border-2 border-border font-semibold text-muted-foreground">
                      No
                    </button>
                    <button
                      onClick={() => quitar(p)}
                      disabled={ocupado}
                      className="h-10 px-3 rounded-xl bg-destructive text-white font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Sí, borrar
                    </button>
                  </div>
                ) : (
                  <div className="border-t border-border px-3 py-2 flex items-center gap-2">
                    <InterruptorCompacto
                      activo={p.activo}
                      ocupado={ocupado}
                      onCambiar={(v) => pausar(p, v)}
                      encendido="Activa"
                      apagado="Pausada"
                    />
                    <span className="flex-1" />
                    <button
                      onClick={() => setPorBorrar(p.id)}
                      aria-label={`Borrar promo ${p.titulo}`}
                      className="h-10 px-3 rounded-xl border-2 border-border text-destructive font-semibold inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" /> Borrar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <button
        onClick={() => setEditando(PROMO_NUEVA())}
        className="w-full h-12 rounded-xl bg-[#D9731B] text-white font-bold inline-flex items-center justify-center gap-2 shadow-card"
      >
        <Plus className="h-5 w-5" /> Nueva promo
      </button>

      <EditorPromo
        promo={editando}
        clave={clave}
        productos={datos.productos}
        categorias={datos.categorias}
        onCerrar={() => setEditando(null)}
        onGuardar={async (p) => {
          const ok = await ejecutar(guardarPromo(clave, p), "Promo guardada");
          if (ok) {
            setEditando(null);
            cargar();
          }
        }}
        onBorrar={async (p) => {
          const ok = await ejecutar(borrarPromo(clave, p.id), "Promo borrada");
          if (ok) {
            setEditando(null);
            cargar();
          }
        }}
      />
    </div>
  );
}

function EditorPromo({
  promo,
  clave,
  productos,
  categorias,
  onCerrar,
  onGuardar,
  onBorrar,
}: {
  promo: Promo | null;
  clave: string;
  productos: Product[];
  categorias: Category[];
  onCerrar: () => void;
  onGuardar: (p: Promo) => Promise<void>;
  onBorrar: (p: Promo) => Promise<void>;
}) {
  const [p, setP] = useState<Promo | null>(promo);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  useEffect(() => {
    setP(promo);
    setError("");
    setConfirmarBorrar(false);
  }, [promo]);
  if (!p) return null;
  const cambiar = (c: Partial<Promo>) => setP({ ...p, ...c });
  const subir = async (archivo: File | undefined) => {
    if (!archivo) return;
    setSubiendo(true);
    setError("");
    const r = await subirFoto(clave, p.id, archivo);
    setSubiendo(false);
    if (r.ok) cambiar({ imagen: r.url });
    else setError(r.error);
  };

  return (
    <Dialog open={!!promo} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-7rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{p.titulo ? "Editar promo" : "Nueva promo"}</DialogTitle>
          <DialogDescription>Ventana emergente vertical (3:4) al abrir el menú.</DialogDescription>
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
          <EstadoPromo p={p} onCambiar={(activo) => cambiar({ activo })} />

          <div className="flex gap-3 items-start">
            <div className="relative w-32 aspect-[3/4] shrink-0 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center">
              {p.imagen ? <img src={p.imagen} alt="" className="w-full h-full object-cover" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
              {subiendo && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white"><Loader2 className="h-6 w-6 animate-spin" /></div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className={`flex h-11 items-center justify-center gap-2 rounded-xl bg-[#D9731B] text-white font-bold cursor-pointer ${subiendo ? "opacity-50 pointer-events-none" : ""}`}>
                <Camera className="h-5 w-5" /> {p.imagen ? "Cambiar imagen" : "Subir imagen"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { subir(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              <p className="text-xs text-muted-foreground">Vertical 3:4. Lo que quede fuera de ese formato se recorta.</p>
            </div>
          </div>
          {error && <p role="alert" className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</p>}

          <Campo etiqueta="Título (interno)" ayuda="Para reconocerla en el panel; no se muestra al cliente.">
            <input className={INPUT} value={p.titulo} onChange={(e) => cambiar({ titulo: e.target.value })} placeholder="Martes 2x1" maxLength={60} />
          </Campo>
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">Producto que lleva</span>
            <SelectorProducto
              productos={productos}
              categorias={categorias}
              valor={p.producto_id}
              onCambiar={(id) => cambiar({ producto_id: id })}
            />
            <p className="text-xs text-muted-foreground">El botón lo agrega al pedido. Sin producto, el botón solo cierra.</p>
          </div>
          <Campo etiqueta="Texto del botón">
            <input className={INPUT} value={p.boton_texto} onChange={(e) => cambiar({ boton_texto: e.target.value })} maxLength={30} />
          </Campo>

          <div className="rounded-2xl border border-border p-3 space-y-4">
            <p className="font-display font-bold text-primary">¿Cuándo sale?</p>
            <div className="space-y-2">
              <span className="text-sm font-semibold">Cada cuánto la ve un cliente</span>
              <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Frecuencia">
                {FRECUENCIAS.map((f) => {
                  const activo = (p.frecuencia ?? "dia") === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      onClick={() => cambiar({ frecuencia: f.id })}
                      className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition ${activo ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <span className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${activo ? "border-primary" : "border-muted-foreground/40"}`}>
                        {activo && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{f.texto}</span>
                        <span className="block text-xs text-muted-foreground">{f.detalle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-semibold">Momento del día</span>
              <div className="grid grid-cols-2 gap-2">
                {MOMENTOS.map((m) => {
                  const activo = (p.hora_desde ?? null) === m.desde && (p.hora_hasta ?? null) === m.hasta;
                  return (
                    <button
                      key={m.texto}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => cambiar({ hora_desde: m.desde, hora_hasta: m.hasta })}
                      className={`rounded-xl border-2 px-3 py-2 text-left transition ${activo ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <span className="block text-sm font-semibold">{m.texto}</span>
                      <span className="block text-xs text-muted-foreground">{m.detalle}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  O desde
                  <input
                    type="time"
                    className={`${INPUT} mt-1`}
                    value={p.hora_desde ?? ""}
                    onChange={(e) => cambiar({ hora_desde: e.target.value || null, hora_hasta: p.hora_hasta ?? (e.target.value ? "23:00" : null) })}
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  hasta
                  <input
                    type="time"
                    className={`${INPUT} mt-1`}
                    value={p.hora_hasta ?? ""}
                    onChange={(e) => cambiar({ hora_hasta: e.target.value || null, hora_desde: p.hora_desde ?? (e.target.value ? "05:00" : null) })}
                  />
                </label>
              </div>
            </div>

          <div className="space-y-2">
            <span className="text-sm font-semibold">Días en que sale</span>
            <SelectorDias dias={p.dias ?? []} onCambiar={(d) => cambiar({ dias: d.length ? d : null })} />
            <p className="text-xs text-muted-foreground">{p.dias?.length ? `Solo ${etiquetaDias(p.dias).toLowerCase()}.` : "Sin días marcados sale todos los días."}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Desde (opcional)">
              <input type="date" className={INPUT} value={p.desde ?? ""} onChange={(e) => cambiar({ desde: e.target.value || null })} />
            </Campo>
            <Campo etiqueta="Hasta (opcional)">
              <input type="date" className={INPUT} value={p.hasta ?? ""} onChange={(e) => cambiar({ hasta: e.target.value || null })} />
            </Campo>
          </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {promo?.titulo !== undefined && (confirmarBorrar ? (
              <button type="button" onClick={() => onBorrar(p)} className="h-12 rounded-xl bg-destructive text-white font-bold px-4">Sí, borrar</button>
            ) : (
              <button type="button" onClick={() => setConfirmarBorrar(true)} aria-label="Borrar promo" className="h-12 w-12 rounded-xl border-2 border-border text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </button>
            ))}
            <button
              type="submit"
              disabled={guardando || subiendo || !p.imagen}
              className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {guardando && <Loader2 className="h-5 w-5 animate-spin" />} {!p.imagen ? "Sube una imagen para guardar" : p.activo ? "Guardar promo" : "Guardar (pausada)"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Domicilios por barrio ──────────────────────────────────────────────── */

function PestanaDomicilios({ datos, clave, ejecutar }: PropsPestana) {
  const [original, setOriginal] = useState<Barrio[] | null>(null);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  const [sedeId, setSedeId] = useState<number>(datos.sedes[0]?.id ?? 0);
  const [buscar, setBuscar] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [precioMasivo, setPrecioMasivo] = useState("");
  const [pegar, setPegar] = useState("");
  const [verPegar, setVerPegar] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    const r = await listarBarriosAdmin(clave);
    if (!r.ok) return setError(r.error ?? "No se pudieron cargar los barrios");
    const lista = ((r as { barrios?: Barrio[] }).barrios ?? []).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    setOriginal(lista);
    setBarrios(lista);
  };
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deCiudad = barrios.filter((b) => b.sede_id === sedeId);
  const q = buscar.trim().toLowerCase();
  const visibles = deCiudad.filter((b) => !q || b.nombre.toLowerCase().includes(q));
  const sinPrecio = deCiudad.filter((b) => b.activo && b.precio === null).length;
  const cambiados = barrios.filter((b) => JSON.stringify(b) !== JSON.stringify(original?.find((o) => o.id === b.id)));
  const poner = (id: string, c: Partial<Barrio>) => setBarrios((l) => l.map((b) => (b.id === id ? { ...b, ...c } : b)));
  const prefijo = (datos.sedes.find((s) => s.id === sedeId)?.ciudad ?? "bar").slice(0, 3).toLowerCase();
  const agregar = (nombre: string, precio: number | null) => {
    const id = `${prefijo}-${slug(nombre)}`;
    setBarrios((l) =>
      l.some((b) => b.id === id)
        ? l.map((b) => (b.id === id ? { ...b, precio: precio ?? b.precio, activo: true } : b))
        : [...l, { id, sede_id: sedeId, nombre, precio, activo: true }].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    );
  };

  return (
    <div className="space-y-4">
      <Tarjeta>
        <p className="text-sm text-muted-foreground">
          El cliente elige su barrio al pedir y ve el valor del domicilio. Barrio sin precio = "por confirmar" (igual
          puede pedir). Oculta los barrios a los que no llegan.
        </p>
      </Tarjeta>
      <div className="grid grid-cols-2 gap-1 bg-card border border-border rounded-xl p-1">
        {datos.sedes.map((s) => (
          <button
            key={s.id}
            onClick={() => setSedeId(s.id)}
            aria-pressed={sedeId === s.id}
            className={`h-10 rounded-lg font-semibold ${sedeId === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {etiquetaSede(s)}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</p>}

      <Tarjeta titulo="Precio rápido" icono={<Bike className="h-4 w-4" />}>
        <p className="text-xs text-muted-foreground">
          {sinPrecio ? `${sinPrecio} barrios activos sin precio.` : "Todos los barrios activos tienen precio."} Pon un valor y
          aplícalo a todos los que no tienen precio; luego ajusta los que cuesten distinto.
        </p>
        <div className="flex gap-2">
          <input
            className={INPUT}
            inputMode="numeric"
            placeholder="Ej: 5.000"
            value={precioMasivo ? Number(precioMasivo).toLocaleString("es-CO") : ""}
            onChange={(e) => setPrecioMasivo(e.target.value.replace(/\D/g, ""))}
          />
          <button
            type="button"
            disabled={!precioMasivo || !sinPrecio}
            onClick={() => setBarrios((l) => l.map((b) => (b.sede_id === sedeId && b.activo && b.precio === null ? { ...b, precio: Number(precioMasivo) } : b)))}
            className="shrink-0 h-11 rounded-xl bg-primary text-primary-foreground font-bold px-4 disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
      </Tarjeta>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder={`Buscar entre ${deCiudad.length} barrios`} className={`${INPUT} pl-9 bg-card`} />
      </div>

      {original === null && !error ? (
        <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <ul className="bg-card border border-border rounded-2xl shadow-card divide-y divide-border overflow-hidden">
          {visibles.map((b) => (
            <li key={b.id} className={`flex items-center gap-2 px-3 py-2 ${b.activo ? "" : "bg-muted/60"}`}>
              <span className={`flex-1 min-w-0 truncate font-medium ${b.activo ? "" : "text-muted-foreground line-through"}`}>{b.nombre}</span>
              <span className="relative w-28 shrink-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  inputMode="numeric"
                  aria-label={`Domicilio a ${b.nombre}`}
                  placeholder="Por confirmar"
                  disabled={!b.activo}
                  value={b.precio === null ? "" : b.precio.toLocaleString("es-CO")}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    poner(b.id, { precio: v ? Number(v) : null });
                  }}
                  className="w-full h-9 rounded-lg border-2 border-border bg-background pl-6 pr-2 text-sm outline-none focus:border-primary placeholder:text-xs"
                />
              </span>
              <button
                type="button"
                onClick={() => poner(b.id, { activo: !b.activo })}
                className="shrink-0 h-9 px-2 rounded-lg text-xs font-semibold hover:bg-muted"
              >
                {b.activo ? "Ocultar" : "Mostrar"}
              </button>
              <button
                type="button"
                aria-label={`Borrar ${b.nombre}`}
                onClick={async () => {
                  if (original?.some((o) => o.id === b.id)) await ejecutar(borrarBarrio(clave, b.id), `${b.nombre} borrado`);
                  setBarrios((l) => l.filter((x) => x.id !== b.id));
                  setOriginal((l) => (l ?? []).filter((x) => x.id !== b.id));
                }}
                className="shrink-0 p-1.5 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {visibles.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No hay barrios con ese nombre.</li>}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (nuevo.trim()) agregar(nuevo.trim(), null);
          setNuevo("");
        }}
        className="flex gap-2"
      >
        <input className={`${INPUT} bg-card`} value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Agregar barrio" />
        <button type="submit" disabled={!nuevo.trim()} className="shrink-0 h-11 rounded-xl bg-[#D9731B] text-white font-bold px-4 disabled:opacity-40">Agregar</button>
      </form>

      <button type="button" onClick={() => setVerPegar((v) => !v)} className="text-sm font-semibold text-primary">
        {verPegar ? "Ocultar" : "¿Tienes la lista en Excel o WhatsApp? Pégala aquí"}
      </button>
      {verPegar && (
        <Tarjeta>
          <p className="text-xs text-muted-foreground">Un barrio por línea, con o sin precio: "Manga, 5000" o "Manga 5.000". Si ya existe, se actualiza su precio.</p>
          <textarea className={`${INPUT} h-auto py-2`} rows={5} value={pegar} onChange={(e) => setPegar(e.target.value)} placeholder={"Manga, 5000\nCrespo, 6000\nBocagrande"} />
          <button
            type="button"
            disabled={!pegar.trim()}
            onClick={() => {
              for (const linea of pegar.split("\n")) {
                const m = linea.trim().match(/^(.*?)[\s,;:\t-]*\$?\s*([\d.]+)?$/);
                const nombre = (m?.[1] ?? linea).trim().replace(/[,;:\t-]+$/, "").trim();
                const precio = m?.[2] ? Number(m[2].replace(/\./g, "")) : null;
                if (nombre) agregar(nombre, precio);
              }
              setPegar("");
              setVerPegar(false);
            }}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40"
          >
            Agregar a {datos.sedes.find((s) => s.id === sedeId)?.ciudad}
          </button>
        </Tarjeta>
      )}

      <div className="sticky bottom-[4.5rem] z-10">
        <button
          type="button"
          disabled={guardando || cambiados.length === 0}
          onClick={async () => {
            setGuardando(true);
            const ok = await ejecutar(guardarBarrios(clave, cambiados), `${cambiados.length} barrios guardados`);
            setGuardando(false);
            if (ok) cargar();
          }}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-card disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {guardando && <Loader2 className="h-5 w-5 animate-spin" />}
          {cambiados.length ? `Guardar ${cambiados.length} cambios` : "Sin cambios"}
        </button>
      </div>
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
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    setA(datos.ajustes);
  }, [datos.ajustes]);
  const cambiar = (c: Partial<Ajustes>) => setA({ ...a, ...c });
  // medios_pago se mantiene igual a las opciones del dato "Medio de pago" (compatibilidad)
  const pago = a.campos_pedido.find((c) => c.id === "pago" && c.tipo === "opciones");
  const final: Ajustes = { ...a, medios_pago: pago?.opciones?.length ? pago.opciones : a.medios_pago };
  const sinCambios = JSON.stringify(final) === JSON.stringify(datos.ajustes);
  const errorFormulario = a.campos_pedido.find(
    (c) => c.activo && (!c.etiqueta.trim() || (c.tipo === "opciones" && !(c.opciones ?? []).length)),
  );

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

      <EditorFormularioPedido
        saludo={a.saludo_pedido}
        campos={a.campos_pedido}
        onCambiar={(c) => cambiar(c)}
      />

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
          disabled={guardando || sinCambios || !!errorFormulario}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-card disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {guardando && <Loader2 className="h-5 w-5 animate-spin" />} {sinCambios ? "Sin cambios" : "Guardar ajustes"}
        </button>
      </div>
    </form>
  );
}

function EditorFormularioPedido({
  saludo,
  campos,
  onCambiar,
}: {
  saludo: string;
  campos: CampoPedido[];
  onCambiar: (c: Partial<Ajustes>) => void;
}) {
  const poner = (i: number, c: Partial<CampoPedido> | null) => {
    const lista = [...campos];
    if (c) lista[i] = { ...lista[i], ...c };
    else lista.splice(i, 1);
    onCambiar({ campos_pedido: lista });
  };
  const mover = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= campos.length) return;
    const lista = [...campos];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    onCambiar({ campos_pedido: lista });
  };
  return (
    <Tarjeta titulo="Formulario del pedido" icono={<Tag className="h-4 w-4" />}>
      <p className="text-xs text-muted-foreground">
        Los datos que llena el cliente antes de enviar el pedido por WhatsApp, en este orden. Así llegan en el mensaje.
      </p>
      <Campo etiqueta="Saludo del mensaje">
        <input className={INPUT} value={saludo} onChange={(e) => onCambiar({ saludo_pedido: e.target.value })} maxLength={120} />
      </Campo>
      <ul className="space-y-2">
        {campos.map((c, i) => (
          <li key={c.id} className={`rounded-xl border border-border p-3 space-y-2 ${c.activo ? "" : "opacity-60"}`}>
            {c.tipo === "pedido" ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm">
                  <strong>{c.etiqueta}</strong>
                  <span className="block text-xs text-muted-foreground">Los productos y cantidades. Siempre va en el mensaje.</span>
                </span>
                <BotonesOrden i={i} total={campos.length} onMover={mover} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_12rem] gap-2">
                  <input
                    className={`${INPUT} h-10`}
                    value={c.etiqueta}
                    onChange={(e) => poner(i, { etiqueta: e.target.value })}
                    placeholder="Ej: Barrio"
                    aria-label="Nombre del dato"
                  />
                  <select
                    className={`${INPUT} h-10`}
                    value={c.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value as CampoPedido["tipo"];
                      poner(i, tipo === "opciones" ? { tipo, opciones: c.opciones?.length ? c.opciones : ["Sí", "No"] } : { tipo });
                    }}
                    aria-label="Tipo de dato"
                  >
                    {TIPOS_CAMPO.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                {c.tipo === "opciones" && (
                  <OpcionesCampo opciones={c.opciones ?? []} onCambiar={(opciones) => poner(i, { opciones })} />
                )}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => poner(i, { obligatorio: !c.obligatorio })}
                    className={`h-8 px-3 rounded-full text-xs font-semibold border-2 ${
                      c.obligatorio ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                    }`}
                  >
                    {c.obligatorio ? "Obligatorio" : "Opcional"}
                  </button>
                  <button type="button" onClick={() => poner(i, { activo: !c.activo })} className="h-8 px-2 rounded-lg text-xs font-semibold hover:bg-muted">
                    {c.activo ? "Ocultar" : "Mostrar"}
                  </button>
                  <span className="flex-1" />
                  <BotonesOrden i={i} total={campos.length} onMover={mover} />
                  <button type="button" onClick={() => poner(i, null)} aria-label="Quitar dato" className="p-1.5 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() =>
          onCambiar({
            campos_pedido: [
              ...campos,
              { id: uid().slice(0, 6), etiqueta: "", tipo: "texto", obligatorio: false, activo: true },
            ],
          })
        }
        className="w-full h-10 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground font-semibold hover:border-primary hover:text-primary"
      >
        + Agregar dato
      </button>
      <p className="text-xs text-muted-foreground">
        Ideas: "Barrio", "¿Domicilio o recoger?" (elegir opción), "Notas del pedido" (texto largo, opcional).
      </p>
    </Tarjeta>
  );
}

// Opciones separadas por coma; se guarda el texto tal cual se escribe para no estorbar al teclear
function OpcionesCampo({ opciones, onCambiar }: { opciones: string[]; onCambiar: (o: string[]) => void }) {
  const [texto, setTexto] = useState(opciones.join(", "));
  useEffect(() => {
    const actual = texto.split(",").map((x) => x.trim()).filter(Boolean);
    if (JSON.stringify(actual) !== JSON.stringify(opciones)) setTexto(opciones.join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opciones]);
  return (
    <div>
      <input
        className={`${INPUT} h-10`}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          onCambiar(e.target.value.split(",").map((x) => x.trim()).filter(Boolean));
        }}
        aria-label="Opciones"
      />
      <p className="mt-1 text-xs text-muted-foreground">Opciones separadas por coma. La primera queda marcada.</p>
    </div>
  );
}

function BotonesOrden({ i, total, onMover }: { i: number; total: number; onMover: (i: number, dir: -1 | 1) => void }) {
  return (
    <>
      <button type="button" onClick={() => onMover(i, -1)} disabled={i === 0} aria-label="Subir" className="p-1.5 disabled:opacity-25">
        <ArrowUp className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => onMover(i, 1)} disabled={i === total - 1} aria-label="Bajar" className="p-1.5 disabled:opacity-25">
        <ArrowDown className="h-4 w-4" />
      </button>
    </>
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

// Interruptor pequeño para listas (mismo diseño que Interruptor)
function InterruptorCompacto({
  activo,
  onCambiar,
  encendido,
  apagado,
  ocupado = false,
}: {
  activo: boolean;
  onCambiar: (v: boolean) => void;
  encendido: string;
  apagado: string;
  ocupado?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={ocupado}
      onClick={() => onCambiar(!activo)}
      className="h-10 inline-flex items-center gap-2 rounded-xl px-2 hover:bg-muted/50 disabled:opacity-60"
    >
      <span className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition ${activo ? "bg-[#1F9D4C]" : "bg-muted-foreground/30"}`}>
        <span className={`block h-5 w-5 rounded-full bg-white shadow transition ${activo ? "translate-x-5" : ""}`} />
      </span>
      <span className={`text-sm font-semibold ${activo ? "text-[#14652F]" : "text-muted-foreground"}`}>
        {activo ? encendido : apagado}
      </span>
    </button>
  );
}

// Estado de la promo, arriba y grande: se ve de un vistazo si está saliendo
function EstadoPromo({ p, onCambiar }: { p: Promo; onCambiar: (v: boolean) => void }) {
  const hoy = promoVigente(p);
  const detalle = !p.activo
    ? "Ningún cliente la ve. Actívala cuando quieras."
    : !p.imagen
      ? "Sube una imagen para que empiece a salir."
      : hoy
        ? `Los clientes la ven hoy · ${resumenPromo(p)}`
        : `Programada · ${resumenPromo(p)}`;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={p.activo}
      onClick={() => onCambiar(!p.activo)}
      className={`w-full flex items-center gap-3 rounded-2xl p-4 text-left border-2 transition ${
        p.activo ? "bg-[#DDF5E4] border-[#1F9D4C]/40" : "bg-muted border-border"
      }`}
    >
      <span className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center ${p.activo ? "bg-[#1F9D4C] text-white" : "bg-muted-foreground/20 text-muted-foreground"}`}>
        {p.activo ? <Megaphone className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block font-display font-bold text-lg leading-tight ${p.activo ? "text-[#14652F]" : "text-muted-foreground"}`}>
          {p.activo ? "Promo activa" : "Promo pausada"}
        </span>
        <span className="block text-xs text-muted-foreground">{detalle}</span>
      </span>
      <span className={`h-8 w-14 shrink-0 rounded-full p-1 transition ${p.activo ? "bg-[#1F9D4C]" : "bg-muted-foreground/30"}`}>
        <span className={`block h-6 w-6 rounded-full bg-white shadow transition ${p.activo ? "translate-x-6" : ""}`} />
      </span>
    </button>
  );
}

// Elegir producto: buscador con lupa + filtro por categoría
function SelectorProducto({
  productos,
  categorias,
  valor,
  onCambiar,
}: {
  productos: Product[];
  categorias: Category[];
  valor: string | null;
  onCambiar: (id: string | null) => void;
}) {
  const [buscar, setBuscar] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(!valor);
  const elegido = productos.find((x) => x.id === valor) ?? null;
  const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = sinTildes(buscar.trim());
  const lista = productos.filter((x) => (!cat || x.categoriaId === cat) && (!q || sinTildes(x.nombre).includes(q)));
  const conProductos = categorias.filter((c) => productos.some((x) => x.categoriaId === c.id));

  if (!abierto) {
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-2">
        <span className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {elegido?.foto ? <img src={elegido.foto} alt="" className="w-full h-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold truncate">{elegido ? elegido.nombre : "Ninguno"}</span>
          <span className="block text-xs text-muted-foreground">{elegido ? formatCOP(elegido.precio) : "El botón solo cierra la promo"}</span>
        </span>
        <button type="button" onClick={() => setAbierto(true)} className="h-10 px-3 rounded-xl border-2 border-border font-semibold text-primary shrink-0">
          Cambiar
        </button>
      </div>
    );
  }
  const elegir = (id: string | null) => {
    onCambiar(id);
    setAbierto(false);
    setBuscar("");
  };
  return (
    <div className="rounded-xl border-2 border-border p-2 space-y-2">
      <div className="relative">
        <Search className="h-5 w-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          className={`${INPUT} pl-10`}
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Busca el producto"
          aria-label="Buscar producto"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {[{ id: null as string | null, nombre: "Todos" }, ...conProductos].map((c) => (
          <button
            key={c.id ?? "todos"}
            type="button"
            aria-pressed={cat === c.id}
            onClick={() => setCat(c.id)}
            className={`h-8 px-3 rounded-full text-xs font-semibold border whitespace-nowrap shrink-0 ${cat === c.id ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
          >
            {c.nombre}
          </button>
        ))}
      </div>
      <ul className="max-h-56 overflow-y-auto space-y-1">
        <li>
          <button type="button" onClick={() => elegir(null)} className={`w-full flex items-center gap-3 rounded-lg p-2 text-left hover:bg-muted ${!valor ? "bg-primary/5" : ""}`}>
            <span className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center"><X className="h-4 w-4 text-muted-foreground" /></span>
            <span className="flex-1 text-sm font-semibold">Ninguno</span>
            {!valor && <Check className="h-5 w-5 text-primary" />}
          </button>
        </li>
        {lista.map((x) => (
          <li key={x.id}>
            <button type="button" onClick={() => elegir(x.id)} className={`w-full flex items-center gap-3 rounded-lg p-2 text-left hover:bg-muted ${valor === x.id ? "bg-primary/5" : ""}`}>
              <span className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {x.foto ? <img src={x.foto} alt="" className="w-full h-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">{x.nombre}</span>
                <span className="block text-xs text-muted-foreground">{formatCOP(x.precio)}</span>
              </span>
              {valor === x.id && <Check className="h-5 w-5 text-primary" />}
            </button>
          </li>
        ))}
        {lista.length === 0 && <li className="text-center text-sm text-muted-foreground py-4">No hay productos con “{buscar}”.</li>}
      </ul>
    </div>
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
