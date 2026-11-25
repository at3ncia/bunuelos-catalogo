import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listarSedes, disponibilidadSede, SEDES_RESPALDO, nombreCorto, etiquetaSede, esPorCiudad, listarPuntos, PUNTOS_RESPALDO, type Sede, type PuntoPedido } from "@/lib/sedes";
import { MapPin, ChevronDown, Instagram } from "lucide-react";
import { useAppState } from "@/lib/app-store";
import { useCart, formatCOP } from "@/lib/cart";
import type { Product } from "@/lib/storage";
import { LOGO_URL, LOGO_OSCURO_URL, MASCOTA_URL, AZUL_MARCA, FONDO_MANCHAS } from "@/lib/brand";
import { FotoProducto, colorCategoria, textoSobre } from "@/components/foto-producto";
import { estadoDomicilios, etiquetaDias, etiquetaFranjas, visibleHoy } from "@/lib/ajustes";
import { Clock, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Plus, Minus, Trash2, Settings } from "lucide-react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Los Buñuelos Los Originales — Catálogo" },
      { name: "description", content: "🧡Kiosco los buñuelos los originales + de 10 años en el mercado" },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const { state, loading, recargar } = useAppState();
  const ajustes = state.config.ajustes;
  const colorDe = (categoriaId: string) => colorCategoria(state.categorias, categoriaId);

  // El estado del horario se recalcula cada minuto (abre/cierra sin recargar)
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const horario = estadoDomicilios(ajustes.horario_domicilios, ahora);
  const cart = useCart();
  const [activeCat, setActiveCat] = useState<string>("todos");
  const [selected, setSelected] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sedeId, setSedeId] = useState<number | null>(() => {
    try {
      const v = Number(localStorage.getItem("sedeSeleccionada"));
      return v || null;
    } catch {
      return null;
    }
  });
  const [dispSede, setDispSede] = useState<Record<string, boolean>>({});

  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [puntos, setPuntos] = useState<PuntoPedido[]>([]);
  const [puntoId, setPuntoId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("puntoSeleccionado");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    listarSedes()
      .then((lista) => setSedes(lista.length ? lista : SEDES_RESPALDO))
      .catch(() => setSedes(SEDES_RESPALDO));
    listarPuntos()
      .then((lista) => setPuntos(lista.length ? lista : PUNTOS_RESPALDO))
      .catch(() => setPuntos(PUNTOS_RESPALDO));
  }, []);

  useEffect(() => {
    try {
      if (puntoId) localStorage.setItem("puntoSeleccionado", puntoId);
      else localStorage.removeItem("puntoSeleccionado");
    } catch {}
  }, [puntoId]);

  // Si la sede guardada ya no existe, se vuelve a preguntar
  useEffect(() => {
    if (sedes.length && sedeId && !sedes.some((s) => s.id === sedeId)) setSedeId(null);
  }, [sedes, sedeId]);

  useEffect(() => {
    if (!sedeId) return;
    try {
      localStorage.setItem("sedeSeleccionada", String(sedeId));
    } catch {}
    disponibilidadSede(sedeId)
      .then(setDispSede)
      .catch(() => setDispSede({}));
  }, [sedeId]);

  const sedeActual = sedes.find((s) => s.id === sedeId) ?? null;
  // Punto de pedido dentro de la ciudad: decide a qué WhatsApp llega el pedido
  const puntosDeSede = puntos.filter((p) => p.sede_id === sedeId);
  const puntoActual =
    puntosDeSede.find((p) => p.id === puntoId) ?? (puntosDeSede.length === 1 ? puntosDeSede[0] : null);
  const faltaPunto = !!sedeId && puntosDeSede.length > 1 && !puntoActual;
  const whatsappPedido = puntoActual?.whatsapp || sedeActual?.whatsapp || state.config.whatsapp;
  const lugarPedido =
    sedeActual && puntoActual && puntosDeSede.length > 1
      ? `${puntoActual.nombre}, ${sedeActual.ciudad}`
      : sedeActual
        ? etiquetaSede(sedeActual)
        : "";

  // ⚠️ Todos los hooks deben ir ANTES de cualquier return condicional
  const visibles = useMemo(
    () =>
      state.productos.filter(
        (p) =>
          p.disponible &&
          visibleHoy(p.dias, ahora) &&
          (dispSede[p.id] ?? true) &&
          (activeCat === "todos" || p.categoriaId === activeCat),
      ),
    [state.productos, activeCat, dispSede, ahora.getDate()],
  );


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src={MASCOTA_URL} alt="" className="h-24 w-auto animate-bounce" />
          <p className="text-muted-foreground text-sm">Calentando el aceite…</p>
        </div>
      </div>
    );
  }

  // Con "Todos", el menú se muestra por secciones como en el menú impreso
  const secciones =
    activeCat === "todos"
      ? [
          ...state.categorias.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            items: visibles.filter((p) => p.categoriaId === c.id),
          })),
          {
            id: "__otros",
            nombre: "Más productos",
            items: visibles.filter((p) => !state.categorias.some((c) => c.id === p.categoriaId)),
          },
        ].filter((g) => g.items.length > 0)
      : [{ id: activeCat, nombre: "", items: visibles }];

  return (
    <div className="min-h-screen">
      {/* Banda de marca (se va al hacer scroll) */}
      <header
        className="text-white"
        style={{ backgroundColor: AZUL_MARCA, backgroundImage: FONDO_MANCHAS, backgroundSize: "340px 340px" }}
      >
        <div className="max-w-5xl mx-auto px-4 pt-3 pb-6">
          <div className="flex items-center gap-3">
            <img src={LOGO_OSCURO_URL} alt={state.config.nombre} className="h-12 sm:h-14 w-auto drop-shadow-lg" />
            <div className="flex-1" />
            <Link
              to="/sede"
              aria-label="Gestión de disponibilidad"
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <button
                  className="relative inline-flex items-center justify-center h-11 w-11 rounded-full bg-white text-primary shadow-card hover:scale-105 transition"
                  aria-label="Carrito"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cart.count > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-[#D9731B] text-white text-[11px] font-bold flex items-center justify-center">
                      {cart.count}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <CartSheet
                colorDe={colorDe}
                items={cart.items}
                subtotal={cart.subtotal}
                setQty={cart.setQty}
                remove={cart.remove}
                onCheckout={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
              />
            </Sheet>
          </div>

          <h1 className="mt-5 text-3xl sm:text-4xl font-display font-bold text-balance leading-tight">
            {ajustes.titulo}
          </h1>
          <p className="text-sm sm:text-base text-white/80 mt-1">
            {ajustes.subtitulo}
          </p>

          {sedeActual && (
            <button
              onClick={() => setSelectorAbierto(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 text-sm font-semibold transition"
            >
              <MapPin className="h-4 w-4 text-[#F3B15A]" />
              Pidiendo en {lugarPedido}
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Categorías: lo único fijo al hacer scroll */}
      <nav className="sticky top-0 z-30 backdrop-blur-md bg-background/90 border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <CategoryPill active={activeCat === "todos"} onClick={() => setActiveCat("todos")}>
              Todos
            </CategoryPill>
            {state.categorias.map((c) => (
              <CategoryPill key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
                {c.nombre}
              </CategoryPill>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 pt-5">
        {!horario.abierto && (
          <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl bg-[#FDF1E6] border border-[#F3C9A0] px-4 py-3 text-sm text-[#7A3B05]">
            <Clock className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              <strong>Domicilios cerrados en este momento.</strong>{" "}
              {horario.abre
                ? `Abrimos ${horario.abre.cuando} a las ${horario.abre.hora}${horario.abre.hora.endsWith(".") ? "" : "."} Puedes enviar tu pedido y te respondemos al abrir.`
                : "Puedes enviar tu pedido y te respondemos apenas abramos."}
            </p>
          </div>
        )}
        {state.fuente === "copia" && (
          <p className="mb-5 text-xs text-muted-foreground flex items-center gap-2">
            Mostrando el último menú guardado; puede no estar al día.
            <button onClick={() => recargar()} className="inline-flex items-center gap-1 font-semibold text-primary">
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </button>
          </p>
        )}
        {visibles.length === 0 ? (
          <div className="text-center py-20">
            <img src={MASCOTA_URL} alt="" className="h-20 w-auto mx-auto opacity-60" />
            <p className="mt-3 text-muted-foreground">
              {state.fuente === "vacio"
                ? "No pudimos cargar el menú. Revisa tu conexión."
                : "Por ahora no hay productos disponibles aquí."}
            </p>
            {state.fuente === "vacio" && (
              <button
                onClick={() => recargar()}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 font-semibold"
              >
                <RefreshCw className="h-4 w-4" /> Reintentar
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {secciones.map((g) => (
              <section key={g.id} aria-labelledby={g.nombre ? `sec-${g.id}` : undefined}>
                {g.nombre && (
                  <h2
                    id={`sec-${g.id}`}
                    className="mb-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-display font-bold shadow-soft"
                    style={{
                      backgroundColor: g.id === "__otros" ? AZUL_MARCA : colorDe(g.id),
                      color: g.id === "__otros" ? "#fff" : textoSobre(colorDe(g.id)),
                    }}
                  >
                    {g.nombre}
                    <span className="text-xs font-semibold opacity-75">{g.items.length}</span>
                  </h2>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {g.items.map((p) => (
                    <ProductCard key={p.id} product={p} color={colorDe(p.categoriaId)} onOpen={() => setSelected(p)} onAdd={() => cart.add(p, 1)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {sedes.length > 0 && (!sedeId || selectorAbierto || faltaPunto) && (
        <SelectorSede
          sedes={sedes}
          puntos={puntos}
          actualSede={sedeId}
          actualPunto={puntoActual?.id ?? null}
          puedeCerrar={!!sedeId && !faltaPunto}
          onElegir={(id, punto) => {
            setSedeId(id);
            setPuntoId(punto);
            setSelectorAbierto(false);
          }}
          onCerrar={() => setSelectorAbierto(false)}
        />
      )}

      {/* Botón flotante del carrito */}
      {cart.count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-4 right-4 mx-auto max-w-md z-20 bg-primary text-primary-foreground rounded-full pl-5 pr-2 py-2 shadow-card flex items-center justify-between font-semibold"
        >
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Ver pedido · {cart.count} {cart.count === 1 ? "producto" : "productos"}
          </span>
          <span className="rounded-full bg-[#D9731B] px-4 py-2">{formatCOP(cart.subtotal)}</span>
        </button>
      )}

      <ProductModal
        product={selected}
        color={selected ? colorDe(selected.categoriaId) : ""}
        onClose={() => setSelected(null)}
        onAdd={(qty) => {
          if (selected) cart.add(selected, qty);
          setSelected(null);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={cart.items}
        subtotal={cart.subtotal}
        whatsapp={whatsappPedido}
        lugar={lugarPedido}
        mediosPago={ajustes.medios_pago}
        onSent={() => {
          cart.clear();
          setCheckoutOpen(false);
        }}
      />

      {/* Pie de página */}
      <footer
        className="mt-16 text-white"
        style={{ backgroundColor: AZUL_MARCA, backgroundImage: FONDO_MANCHAS, backgroundSize: "340px 340px" }}
      >
        <div className="max-w-5xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2">
          <div>
            <img src={LOGO_OSCURO_URL} alt={state.config.nombre} className="h-14 w-auto" />
            <a
              href={`https://www.instagram.com/${ajustes.instagram}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white"
            >
              <Instagram className="h-4 w-4" /> @{ajustes.instagram}
            </a>
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Horario de domicilios</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {ajustes.horario_domicilios.map((r, i) => (
                <div key={i}>
                  <dt className="font-semibold text-[#F3B15A]">{etiquetaDias(r.dias)}</dt>
                  <dd className="text-white/85">{r.franjas.length ? etiquetaFranjas(r.franjas) : "Cerrado"}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="border-t border-white/15">
          <div className={`max-w-5xl mx-auto px-4 pt-4 ${cart.count > 0 ? "pb-28" : "pb-6"} flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/70`}>
            <span>© {new Date().getFullYear()} {state.config.nombre}</span>
            <Link to="/politica-de-privacidad-y-uso-de-datos" className="hover:text-white underline underline-offset-4">
              Política de Privacidad y Uso de Datos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition shadow-soft ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-foreground hover:bg-muted border border-border"
      }`}
    >
      {children}
    </button>
  );
}

function ProductCard({
  product,
  color,
  onOpen,
  onAdd,
}: {
  product: Product;
  color: string;
  onOpen: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="group relative bg-card rounded-2xl overflow-hidden shadow-card border border-border/60 hover:-translate-y-0.5 transition flex flex-col">
      <button onClick={onOpen} className="block w-full aspect-[4/3] overflow-hidden" aria-label={`Ver ${product.nombre}`}>
        <FotoProducto product={product} color={color} className="group-hover:scale-105 transition duration-300" />
      </button>
      <button onClick={onOpen} className="flex-1 text-left p-3 pb-14">
        <h3 className="font-display font-bold text-sm sm:text-base leading-tight line-clamp-2 text-foreground">
          {product.nombre}
        </h3>
        {product.descripcion && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{product.descripcion}</p>
        )}
      </button>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <span className="text-primary font-display font-bold">{formatCOP(product.precio)}</span>
        <button
          onClick={onAdd}
          aria-label={`Agregar ${product.nombre}`}
          className="h-9 w-9 rounded-full bg-[#D9731B] text-white shadow-card flex items-center justify-center hover:scale-110 active:scale-95 transition"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function ProductModal({
  product,
  color,
  onClose,
  onAdd,
}: {
  product: Product | null;
  color: string;
  onClose: () => void;
  onAdd: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  return (
    <Dialog
      open={!!product}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setQty(1);
        }
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {product && (
          <>
            <div className="aspect-[4/3]">
              <FotoProducto product={product} color={color} mascota="w-[30%]" />
            </div>
            <div className="p-5">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{product.nombre}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {product.descripcion || "Recién hecho, como siempre."}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl font-display font-bold text-primary">
                  {formatCOP(product.precio * qty)}
                </span>
                <div className="flex items-center gap-2 bg-muted rounded-full p-1">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="h-8 w-8 rounded-full bg-card flex items-center justify-center"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-semibold">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="h-8 w-8 rounded-full bg-card flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <Button
                onClick={() => {
                  onAdd(qty);
                  setQty(1);
                }}
                className="w-full mt-5 bg-[#D9731B] text-white hover:bg-[#C56614]"
                size="lg"
              >
                <Plus className="h-4 w-4 mr-1" /> Agregar al pedido
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CartSheet({
  colorDe,
  items,
  subtotal,
  setQty,
  remove,
  onCheckout,
}: {
  colorDe: (categoriaId: string) => string;
  items: ReturnType<typeof useCart>["items"];
  subtotal: number;
  setQty: (id: string, q: number) => void;
  remove: (id: string) => void;
  onCheckout: () => void;
}) {
  return (
    <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
      <SheetHeader>
        <SheetTitle className="font-display">Tu pedido</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-10">
            <img src={MASCOTA_URL} alt="" className="h-20 w-auto mx-auto opacity-60" />
            <p className="mt-3 text-muted-foreground">Tu pedido está vacío.</p>
          </div>
        ) : (
          items.map((i) => (
            <div key={i.product.id} className="flex gap-3 bg-muted/50 rounded-xl p-2">
              <div className="h-16 w-16 rounded-lg overflow-hidden flex-shrink-0">
                <FotoProducto product={i.product} color={colorDe(i.product.categoriaId)} conNombre={false} mascota="w-3/4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm line-clamp-1">{i.product.nombre}</p>
                <p className="text-primary font-bold text-sm">{formatCOP(i.product.precio)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setQty(i.product.id, i.cantidad - 1)}
                    className="h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-semibold w-5 text-center">{i.cantidad}</span>
                  <button
                    onClick={() => setQty(i.product.id, i.cantidad + 1)}
                    className="h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => remove(i.product.id)}
                    className="ml-auto p-1 text-destructive"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {items.length > 0 && (
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex justify-between text-lg">
            <span className="font-semibold">Subtotal</span>
            <span className="font-display font-bold text-primary">{formatCOP(subtotal)}</span>
          </div>
          <Button onClick={onCheckout} size="lg" className="w-full bg-[#25D366] text-[#073B1F] font-bold hover:bg-[#20BD5A]">
            <WhatsAppIcon className="h-4 w-4 mr-2" />
            Enviar pedido por WhatsApp
          </Button>
        </div>
      )}
    </SheetContent>
  );
}

function CheckoutModal({
  open,
  onOpenChange,
  items,
  subtotal,
  whatsapp,
  lugar,
  mediosPago,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: ReturnType<typeof useCart>["items"];
  subtotal: number;
  whatsapp: string;
  lugar: string;
  mediosPago: string[];
  onSent: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pago, setPago] = useState(mediosPago[0] ?? "Efectivo");

  const enviar = () => {
    if (!nombre.trim() || !direccion.trim() || !telefono.trim()) return;
    const detalle = items
      .map((i) => `   - ${i.cantidad}x ${i.product.nombre} (${formatCOP(i.product.precio * i.cantidad)})`)
      .join("\n");
    const msg = `Hola! quisiera hacer un pedido:

- Nombre completo: ${nombre}

- Pedido detallado:
${detalle}

- Dirección + punto de referencia: ${direccion}

- Número de contacto: ${telefono}

- Medio de pago: ${pago}

Total: ${formatCOP(subtotal)}`;
    const url = `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    onSent();
    setNombre("");
    setDireccion("");
    setTelefono("");
    setPago(mediosPago[0] ?? "Efectivo");
  };

  const opciones = mediosPago;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Datos de entrega</DialogTitle>
          <DialogDescription>Completa para enviar tu pedido por WhatsApp.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 text-sm flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 text-[#D9731B] shrink-0" />
            <span className="truncate">
              Llega a <strong>{lugar || "la sede"}</strong>
            </span>
          </span>
          <span className="font-display font-bold text-primary shrink-0">{formatCOP(subtotal)}</span>
        </div>
        <div className="space-y-3 mt-2">
          <div>
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label htmlFor="dir">Dirección + punto de referencia</Label>
            <Textarea id="dir" value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={240} rows={2} />
          </div>
          <div>
            <Label htmlFor="tel">Número de contacto</Label>
            <Input
              id="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              inputMode="tel"
              maxLength={20}
            />
          </div>
          <div>
            <Label>Medio de pago</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {opciones.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setPago(o)}
                  className={`px-3 py-2 rounded-full text-sm border transition ${
                    pago === o
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:bg-muted"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={enviar}
            disabled={!nombre.trim() || !direccion.trim() || !telefono.trim()}
            size="lg"
            className="w-full bg-[#25D366] text-[#073B1F] font-bold hover:bg-[#20BD5A]"
          >
            <WhatsAppIcon className="h-4 w-4 mr-2" /> Enviar por WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SelectorSede({
  sedes,
  puntos,
  actualSede,
  actualPunto,
  puedeCerrar,
  onElegir,
  onCerrar,
}: {
  sedes: Sede[];
  puntos: PuntoPedido[];
  actualSede: number | null;
  actualPunto: string | null;
  puedeCerrar: boolean;
  onElegir: (sedeId: number, puntoId: string | null) => void;
  onCerrar: () => void;
}) {
  const puntosDe = (id: number) => puntos.filter((p) => p.sede_id === id);
  // Si ya eligió ciudad pero falta el punto, abrimos directo en el paso 2
  const [sedePaso2, setSedePaso2] = useState<Sede | null>(() => {
    const s = sedes.find((x) => x.id === actualSede);
    return s && puntosDe(s.id).length > 1 && !actualPunto ? s : null;
  });

  const ciudades = Array.from(new Set(sedes.map((s) => s.ciudad)));
  const porCiudad = esPorCiudad(sedes);

  const elegirSede = (s: Sede) => {
    const lista = puntosDe(s.id);
    if (lista.length > 1) setSedePaso2(s);
    else onElegir(s.id, lista[0]?.id ?? null);
  };

  const Tarjeta = ({
    titulo,
    detalle,
    activa,
    onClick,
  }: {
    titulo: string;
    detalle: string;
    activa: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 flex items-center gap-3 transition shadow-soft ${
        activa ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <span className="h-10 w-10 shrink-0 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">
        <MapPin className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-lg">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{detalle}</span>
      </span>
    </button>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-sede"
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto"
    >
      <div className="min-h-full max-w-md mx-auto px-4 py-8 flex flex-col">
        <div className="flex flex-col items-center text-center">
          <img src={LOGO_URL} alt="Los Buñuelos Los Originales" className="w-64 h-auto" />
          <h2 id="titulo-sede" className="mt-6 font-display text-2xl font-bold text-primary">
            {sedePaso2
              ? "¿Qué punto te queda más cerca?"
              : porCiudad
                ? "¿Desde qué ciudad pides?"
                : "¿A qué sede quieres pedir?"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {sedePaso2
              ? `Tu pedido llega directo a ese punto en ${sedePaso2.ciudad}.`
              : porCiudad
                ? "Te mostramos lo disponible en tu ciudad."
                : "Te mostramos lo disponible en esa sede."}
          </p>
        </div>

        {sedePaso2 ? (
          <div className="mt-6 space-y-3">
            {puntosDe(sedePaso2.id).map((p) => (
              <Tarjeta
                key={p.id}
                titulo={p.nombre}
                detalle={p.detalle}
                activa={actualPunto === p.id}
                onClick={() => onElegir(sedePaso2.id, p.id)}
              />
            ))}
            <button
              onClick={() => setSedePaso2(null)}
              className="w-full pt-2 text-sm text-muted-foreground underline underline-offset-4"
            >
              Cambiar de ciudad
            </button>
          </div>
        ) : (
          <div className={`mt-6 ${porCiudad ? "space-y-3" : "space-y-6"}`}>
            {ciudades.map((ciudad) => {
              const lista = sedes.filter((s) => s.ciudad === ciudad);
              return (
                <section key={ciudad}>
                  {!porCiudad && (
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      {ciudad} · {lista.length} {lista.length === 1 ? "sede" : "sedes"}
                    </h3>
                  )}
                  <div className="space-y-2">
                    {lista.map((s) => (
                      <Tarjeta
                        key={s.id}
                        titulo={nombreCorto(s)}
                        detalle={s.direccion}
                        activa={actualSede === s.id}
                        onClick={() => elegirSede(s)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {puedeCerrar && !sedePaso2 && (
          <button onClick={onCerrar} className="mt-6 text-sm text-muted-foreground underline underline-offset-4">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
