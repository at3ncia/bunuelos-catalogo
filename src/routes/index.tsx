import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listarSedes, disponibilidadSede, SEDES_RESPALDO, nombreCorto, etiquetaSede, esPorCiudad, listarPuntos, PUNTOS_RESPALDO, type Sede, type PuntoPedido } from "@/lib/sedes";
import { MapPin, ChevronDown } from "lucide-react";
import { useAppState } from "@/lib/app-store";
import { useCart, formatCOP } from "@/lib/cart";
import type { Product } from "@/lib/storage";
import { LOGO_URL } from "@/lib/brand";
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
import { ShoppingCart, Plus, Minus, Trash2, ImageOff, Settings } from "lucide-react";
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
  const { state, loading } = useAppState();
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
          (dispSede[p.id] ?? true) &&
          (activeCat === "todos" || p.categoriaId === activeCat),
      ),
    [state.productos, activeCat, dispSede],
  );

  const logoUrl = state.config.logo || LOGO_URL;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando catálogo…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/85 border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={logoUrl} alt={state.config.nombre} className="h-12 sm:h-14 w-auto" />
          <div className="flex-1" />
          <Link
            to="/sede"
            aria-label="Admin"
            className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <button
                className="relative inline-flex items-center justify-center h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-card hover:scale-105 transition"
                aria-label="Carrito"
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.count > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-secondary text-secondary-foreground text-[11px] font-bold flex items-center justify-center">
                    {cart.count}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <CartSheet
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

        {/* Sede elegida (toca para cambiar) */}
        {sedeActual && (
          <div className="max-w-5xl mx-auto px-4 pb-2">
            <button
              onClick={() => setSelectorAbierto(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm font-semibold hover:bg-primary/15 transition"
            >
              <MapPin className="h-4 w-4" />
              Pidiendo en {lugarPedido}
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Category bar */}
        <div className="max-w-5xl mx-auto px-4 pb-3 overflow-x-auto">
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
      </header>

      {/* Hero strip */}
      <section className="max-w-5xl mx-auto px-4 pt-6 pb-4">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary text-balance">
          Crujientes, doraditos y recién hechos 💙
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Elige tus favoritos y envía tu pedido directo por WhatsApp.
        </p>
      </section>

      {/* Product grid - 3 col instagram-like */}
      <main className="max-w-5xl mx-auto px-4">
        {visibles.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No hay productos disponibles en esta categoría.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {visibles.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={() => setSelected(p)} onAdd={() => cart.add(p, 1)} />
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

      {/* Floating cart button (mobile) */}
      {cart.count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-4 right-4 mx-auto max-w-md z-20 bg-gradient-brand text-brand-foreground rounded-full px-5 py-4 shadow-card flex items-center justify-between font-semibold"
        >
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> {cart.count} {cart.count === 1 ? "ítem" : "ítems"}
          </span>
          <span>{formatCOP(cart.subtotal)}</span>
        </button>
      )}

      {/* Product detail modal */}
      <ProductModal
        product={selected}
        onClose={() => setSelected(null)}
        onAdd={(qty) => {
          if (selected) cart.add(selected, qty);
          setSelected(null);
        }}
      />

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center border-t border-border/40 pt-8 max-w-5xl mx-auto">
        <Link to="/politica-de-privacidad-y-uso-de-datos" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          Política de Privacidad y Uso de Datos
        </Link>
      </footer>

      {/* Checkout modal */}
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={cart.items}
        subtotal={cart.subtotal}
        whatsapp={whatsappPedido}
        onSent={() => {
          cart.clear();
          setCheckoutOpen(false);
        }}
      />

      <footer className="text-center text-xs text-muted-foreground py-6 mt-10">
        © {new Date().getFullYear()} {state.config.nombre}
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
  onOpen,
  onAdd,
}: {
  product: Product;
  onOpen: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="group relative bg-card rounded-2xl overflow-hidden shadow-card border border-border/60 hover:-translate-y-0.5 transition">
      <button onClick={onOpen} className="block w-full aspect-square bg-muted overflow-hidden">
        {product.foto ? (
          <img
            src={product.foto}
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
      </button>
      <div className="p-3 pb-12">
        <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2">{product.nombre}</h3>
        <p className="text-primary font-display font-bold mt-1">{formatCOP(product.precio)}</p>
      </div>
      <button
        onClick={onAdd}
        aria-label={`Agregar ${product.nombre}`}
        className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-secondary text-secondary-foreground shadow-card flex items-center justify-center hover:scale-110 transition"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: Product | null;
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
            <div className="aspect-square bg-muted">
              {product.foto ? (
                <img src={product.foto} alt={product.nombre} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageOff className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="p-5">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{product.nombre}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {product.descripcion || "Delicioso producto."}
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
                className="w-full mt-5 bg-gradient-brand text-brand-foreground hover:opacity-95"
                size="lg"
              >
                Agregar al carrito
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CartSheet({
  items,
  subtotal,
  setQty,
  remove,
  onCheckout,
}: {
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
          <p className="text-muted-foreground text-center py-10">El carrito está vacío.</p>
        ) : (
          items.map((i) => (
            <div key={i.product.id} className="flex gap-3 bg-muted/50 rounded-xl p-2">
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {i.product.foto ? (
                  <img src={i.product.foto} alt={i.product.nombre} className="w-full h-full object-cover" />
                ) : null}
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
          <Button onClick={onCheckout} size="lg" className="w-full bg-gradient-brand text-brand-foreground hover:opacity-95">
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
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: ReturnType<typeof useCart>["items"];
  subtotal: number;
  whatsapp: string;
  onSent: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pago, setPago] = useState("Efectivo");

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
    setPago("Efectivo");
  };

  const opciones = ["Efectivo", "Nequi", "Bancolombia", "Otro"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Datos de entrega</DialogTitle>
          <DialogDescription>Completa para enviar tu pedido por WhatsApp.</DialogDescription>
        </DialogHeader>
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
            className="w-full bg-gradient-brand text-brand-foreground"
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
