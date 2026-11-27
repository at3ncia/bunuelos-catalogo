import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listarSedes, disponibilidadSede, SEDES_RESPALDO, nombreCorto, etiquetaSede, esPorCiudad, listarPuntos, PUNTOS_RESPALDO, type Sede, type PuntoPedido } from "@/lib/sedes";
import { MapPin, ChevronDown, Instagram, X, Search } from "lucide-react";
import { fechaColombia, listarBarrios, listarPromos, promoEnHorario, promoVigente, registrarPedido, type Barrio, type Promo } from "@/lib/negocio";
import { useAppState } from "@/lib/app-store";
import { useCart, formatCOP } from "@/lib/cart";
import type { Product } from "@/lib/storage";
import { LOGO_URL, LOGO_OSCURO_URL, MASCOTA_URL, AZUL_MARCA, FONDO_MANCHAS } from "@/lib/brand";
import { FotoProducto, colorCategoria, textoSobre } from "@/components/foto-producto";
import { estadoDomicilios, etiquetaDias, etiquetaFranjas, mensajePedido, visibleHoy, type CampoPedido } from "@/lib/ajustes";
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
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
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
  const [ultimo, setUltimo] = useState(() => leerLocal<{ items: { id: string; cantidad: number }[] }>(ULTIMO_PEDIDO));
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

  // "?elegir" (botón Menú domicilios de /links) abre siempre el selector de ciudad
  const [selectorAbierto, setSelectorAbierto] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (!params.has("elegir")) return false;
      params.delete("elegir");
      const resto = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (resto ? `?${resto}` : ""));
      return true;
    } catch {
      return false;
    }
  });
  const [puntos, setPuntos] = useState<PuntoPedido[]>([]);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [promosVistas, setPromosVistas] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("promosVistas") ?? "{}");
    } catch {
      return {};
    }
  });
  // Promos ya vistas en esta visita (para las de frecuencia "cada vez que entran")
  const [vistasVisita, setVistasVisita] = useState<string[]>([]);
  const yaVista = (p: Promo, base: Date) => {
    if (vistasVisita.includes(p.id)) return true;
    if (p.frecuencia === "visita") return false;
    if (p.frecuencia === "una_vez") return !!promosVistas[p.id];
    return promosVistas[p.id] === fechaColombia(base);
  };
  const marcarPromoVista = (id: string) => {
    setVistasVisita((l) => [...l, id]);
    const v = { ...promosVistas, [id]: fechaColombia() };
    setPromosVistas(v);
    try {
      localStorage.setItem("promosVistas", JSON.stringify(v));
    } catch {
      /* solo se vuelve a mostrar */
    }
  };
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
    listarBarrios().then(setBarrios);
    listarPromos().then(setPromos);
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
        {/* Pedir de nuevo: el último pedido con lo que hay hoy */}
        {(() => {
          if (!ultimo?.items?.length || cart.count > 0) return null;
          const repetibles = ultimo.items
            .map((i) => ({ ...i, producto: state.productos.find((p) => p.id === i.id) }))
            .filter(
              (i): i is { id: string; cantidad: number; producto: Product } =>
                !!i.producto && i.producto.disponible && (dispSede[i.id] ?? true) && visibleHoy(i.producto.dias, ahora),
            );
          if (!repetibles.length) return null;
          const faltantes = ultimo.items.length - repetibles.length;
          const totalUltimo = repetibles.reduce((t, i) => t + i.producto.precio * i.cantidad, 0);
          return (
            <div className="mb-5 rounded-2xl border-2 border-primary/20 bg-card shadow-card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tu último pedido</p>
                <p className="text-sm font-semibold line-clamp-2">
                  {repetibles.map((i) => `${i.cantidad}× ${i.producto.nombre}`).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCOP(totalUltimo)}
                  {faltantes > 0 ? ` · ${faltantes} producto${faltantes > 1 ? "s" : ""} no está${faltantes > 1 ? "n" : ""} hoy` : ""}
                </p>
              </div>
              <button
                onClick={() => {
                  repetibles.forEach((i) => cart.add(i.producto, i.cantidad));
                  setCartOpen(true);
                }}
                className="shrink-0 h-11 px-4 rounded-xl bg-[#D9731B] text-white font-bold shadow-card active:scale-95 transition"
              >
                Pedir de nuevo
              </button>
            </div>
          );
        })()}
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

      {/* Pop-up de promoción (programado desde /admin → Promos); con la frecuencia y horario de cada promo */}
      {(() => {
        if (!sedeId || selectorAbierto || faltaPunto || checkoutOpen || cartOpen || selected) return null;
        const promo = promos.find((p) => promoVigente(p, ahora) && promoEnHorario(p, ahora) && !yaVista(p, ahora));
        if (!promo) return null;
        const producto = state.productos.find(
          (x) => x.id === promo.producto_id && x.disponible && (dispSede[x.id] ?? true) && visibleHoy(x.dias, ahora),
        );
        return (
          <PopupPromo
            promo={promo}
            producto={producto ?? null}
            onCerrar={() => marcarPromoVista(promo.id)}
            onAgregar={() => {
              if (producto) cart.add(producto, 1);
              marcarPromoVista(promo.id);
              if (producto) setCartOpen(true);
            }}
          />
        );
      })()}

      {/* Botón flotante del carrito */}
      {cart.count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-[4.5rem] left-4 right-4 mx-auto max-w-md z-20 bg-primary text-primary-foreground rounded-full pl-5 pr-2 py-2 shadow-card flex items-center justify-between font-semibold"
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
        campos={ajustes.campos_pedido}
        saludo={ajustes.saludo_pedido}
        barrios={barrios.filter((b) => b.sede_id === sedeId)}
        sedeId={sedeId}
        puntoId={puntoActual?.id ?? null}
        onSent={() => {
          setUltimo(leerLocal(ULTIMO_PEDIDO));
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
          <div className={`max-w-5xl mx-auto px-4 pt-4 ${cart.count > 0 ? "pb-44" : "pb-20"} flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/70`}>
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
      <DialogContent className="max-w-md p-0 overflow-y-auto max-h-[calc(100dvh-7rem)]">
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
        <div className="border-t border-border pt-4 pb-14 space-y-3">
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
  campos,
  saludo,
  barrios,
  sedeId,
  puntoId,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: ReturnType<typeof useCart>["items"];
  subtotal: number;
  whatsapp: string;
  lugar: string;
  campos: CampoPedido[];
  saludo: string;
  barrios: Barrio[];
  sedeId: number | null;
  puntoId: string | null;
  onSent: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  // Los datos que se piden se editan en /admin → Ajustes → Formulario del pedido
  const visibles = campos.filter((c) => c.activo && c.tipo !== "pedido");
  const iniciales = () =>
    Object.fromEntries(visibles.map((c) => [c.id, c.tipo === "opciones" ? (c.opciones?.[0] ?? "") : ""]));
  // Datos del pedido anterior guardados en este celular: quien repite no vuelve a escribir nada
  const conGuardados = () => {
    const base = iniciales();
    const guardados = leerLocal<Record<string, string>>(DATOS_CLIENTE) ?? {};
    for (const c of visibles) {
      const v = guardados[c.id];
      if (typeof v !== "string") continue;
      if (c.tipo === "opciones" && !(c.opciones ?? []).includes(v)) continue;
      base[c.id] = v;
      if (c.tipo === "barrio" && typeof guardados[`${c.id}__otro`] === "string") base[`${c.id}__otro`] = guardados[`${c.id}__otro`];
    }
    return base;
  };
  const [valores, setValores] = useState<Record<string, string>>(conGuardados);
  const [hayGuardados, setHayGuardados] = useState(() => !!leerLocal(DATOS_CLIENTE));
  // Si cambian los campos (se recargó el menú), se completan los que falten
  useEffect(() => {
    setValores((v) => ({ ...iniciales(), ...v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campos]);
  // Barrio elegido: id de la lista o "__otro" con el nombre escrito
  const campoBarrio = visibles.find((c) => c.tipo === "barrio");
  const idBarrio = campoBarrio ? (valores[campoBarrio.id] ?? "") : "";
  const barrio = barrios.find((b) => b.id === idBarrio) ?? null;
  const textoOtro = campoBarrio ? (valores[`${campoBarrio.id}__otro`] ?? "") : "";
  const sinLista = !!campoBarrio && barrios.length === 0;
  // El cliente nunca ve el valor del domicilio (lo calcula la base de datos al registrar)
  const domicilio = null;
  const hayBarrio = !!barrio || ((idBarrio === "__otro" || sinLista) && !!textoOtro.trim());
  const valorCampo = (c: CampoPedido) =>
    c.tipo === "barrio" ? (barrio ? barrio.nombre : textoOtro.trim()) : (valores[c.id] ?? "").trim();
  // Teléfono: celular de 10 dígitos (o fijo de 7); acepta espacios, guiones y +57
  const telefonoInvalido = (c: CampoPedido) => {
    if (c.tipo !== "telefono") return false;
    const v = valorCampo(c);
    if (!v) return false;
    const d = v.replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");
    return !(d.length === 10 || d.length === 7);
  };
  const faltan = visibles.filter((c) => (c.obligatorio && !valorCampo(c)) || telefonoInvalido(c));
  const total = subtotal + (domicilio ?? 0);

  const enviar = async () => {
    if (faltan.length || enviando) return;
    setEnviando(true);
    // Se abre la pestaña ya (dentro del toque) para que el navegador no la bloquee
    const ventana = window.open("", "_blank");
    const legibles = Object.fromEntries(visibles.map((c) => [c.id, valorCampo(c)]));
    const cliente = Object.fromEntries(visibles.map((c) => [c.etiqueta, valorCampo(c)]).filter(([, v]) => v));
    const registro = await registrarPedido({
      sede_id: sedeId,
      punto_id: puntoId,
      cliente,
      items: items.map((i) => ({ id: i.product.id, cantidad: i.cantidad })),
      barrio_id: barrio?.id ?? null,
      barrio_texto: barrio ? null : textoOtro.trim() || null,
    });
    const detalle = items
      .map((i) => `   - ${i.cantidad}x ${i.product.nombre} (${formatCOP(i.product.precio * i.cantidad)})`)
      .join("\n");
    const msg = mensajePedido(saludo, campos, legibles, detalle, formatCOP(total), {
      codigo: registro?.codigo,
      domicilio: campoBarrio && hayBarrio ? "por confirmar" : undefined,
    });
    const url = `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
    // Recordar para el próximo pedido (solo en este celular)
    guardarLocal(DATOS_CLIENTE, valores);
    guardarLocal(ULTIMO_PEDIDO, { items: items.map((i) => ({ id: i.product.id, cantidad: i.cantidad })), fecha: Date.now() });
    setHayGuardados(true);
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
    setEnviando(false);
    onSent();
  };
  const poner = (id: string, valor: string) => setValores((v) => ({ ...v, [id]: valor }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[calc(100dvh-7rem)] overflow-y-auto">
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
          {visibles.map((c) => {
            const id = `campo-${c.id}`;
            const etiqueta = (
              <Label htmlFor={c.tipo === "opciones" ? undefined : id}>
                {c.etiqueta}
                {!c.obligatorio && <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>}
              </Label>
            );
            if (c.tipo === "barrio") {
              return (
                <div key={c.id}>
                  {etiqueta}
                  <BuscadorBarrio
                    id={id}
                    barrios={barrios}
                    elegido={barrio}
                    otro={idBarrio === "__otro" || sinLista ? textoOtro : ""}
                    onElegir={(b) => {
                      poner(c.id, b.id);
                      poner(`${c.id}__otro`, "");
                    }}
                    onOtro={(texto) => {
                      poner(c.id, "__otro");
                      poner(`${c.id}__otro`, texto);
                    }}
                    onLimpiar={() => {
                      poner(c.id, "");
                      poner(`${c.id}__otro`, "");
                    }}
                  />
                </div>
              );
            }
            if (c.tipo === "opciones") {
              return (
                <div key={c.id}>
                  {etiqueta}
                  <div className="flex flex-wrap gap-2 mt-1" role="radiogroup" aria-label={c.etiqueta}>
                    {(c.opciones ?? []).map((o) => (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={valores[c.id] === o}
                        onClick={() => poner(c.id, o)}
                        className={`px-3 py-2 rounded-full text-sm border transition ${
                          valores[c.id] === o
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:bg-muted"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={c.id}>
                {etiqueta}
                {c.tipo === "texto_largo" ? (
                  <Textarea id={id} value={valores[c.id] ?? ""} onChange={(e) => poner(c.id, e.target.value)} maxLength={240} rows={2} />
                ) : (
                  <Input
                    id={id}
                    value={valores[c.id] ?? ""}
                    onChange={(e) => poner(c.id, e.target.value)}
                    inputMode={c.tipo === "telefono" ? "tel" : undefined}
                    autoComplete={c.tipo === "telefono" ? "tel" : c.id === "nombre" ? "name" : undefined}
                    maxLength={c.tipo === "telefono" ? 20 : 80}
                    aria-invalid={telefonoInvalido(c) || undefined}
                    className={telefonoInvalido(c) ? "border-destructive focus-visible:ring-destructive" : undefined}
                  />
                )}
                {telefonoInvalido(c) && (
                  <p className="mt-1 text-xs font-medium text-destructive">Escribe los 10 dígitos del celular, ej: 300 123 4567</p>
                )}
              </div>
            );
          })}
          {campoBarrio && hayBarrio && (
            <dl className="rounded-xl bg-muted/60 p-3 text-sm space-y-1">
              <div className="flex justify-between"><dt>Productos</dt><dd>{formatCOP(subtotal)}</dd></div>
              <div className="flex justify-between">
                <dt>Domicilio{barrio ? ` (${barrio.nombre})` : ""}</dt>
                <dd>Te lo confirmamos</dd>
              </div>
              <div className="flex justify-between font-display font-bold text-primary text-base pt-1 border-t border-border">
                <dt>Total</dt><dd>{formatCOP(total)} + domicilio</dd>
              </div>
            </dl>
          )}
          <Button
            onClick={enviar}
            disabled={faltan.length > 0 || enviando}
            size="lg"
            className="w-full bg-[#25D366] text-[#073B1F] font-bold hover:bg-[#20BD5A]"
          >
            <WhatsAppIcon className="h-4 w-4 mr-2" /> Enviar por WhatsApp
          </Button>
          {faltan.length > 0 && (
            <p className="text-xs text-center text-muted-foreground">Falta: {faltan.map((c) => c.etiqueta).join(", ")}</p>
          )}
          {hayGuardados && (
            <p className="text-xs text-center text-muted-foreground">
              Guardamos tus datos solo en este celular para tu próximo pedido.{" "}
              <button
                type="button"
                className="font-semibold text-primary underline"
                onClick={() => {
                  borrarLocal(DATOS_CLIENTE);
                  borrarLocal(ULTIMO_PEDIDO);
                  setHayGuardados(false);
                  setValores(iniciales());
                }}
              >
                Borrar
              </button>
            </p>
          )}
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
  // Siempre se empieza eligiendo la ciudad; los puntos vienen después
  const [sedePaso2, setSedePaso2] = useState<Sede | null>(null);

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

function PopupPromo({
  promo,
  producto,
  onCerrar,
  onAgregar,
}: {
  promo: Promo;
  producto: Product | null;
  onCerrar: () => void;
  onAgregar: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={promo.titulo || "Promoción"}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pb-20"
      onClick={onCerrar}
    >
      <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute -top-3 -right-3 z-10 h-10 w-10 rounded-full bg-white text-primary shadow-card flex items-center justify-center"
        >
          <X className="h-5 w-5" />
        </button>
        {/* Formato 3:4 (vertical), recomendado 1080 × 1440 */}
        <div className="aspect-[3/4] max-h-[calc(100dvh-12rem)] mx-auto rounded-3xl overflow-hidden shadow-2xl bg-card">
          <img src={promo.imagen} alt={promo.titulo || "Promoción"} className="w-full h-full object-cover" />
        </div>
        <div className="mt-3 flex gap-2">
          {producto ? (
            <button
              onClick={onAgregar}
              className="btn-dorado flex-1 h-12 rounded-2xl font-bold shadow-card"
            >
              {promo.boton_texto || "Lo quiero"} · {formatCOP(producto.precio)}
            </button>
          ) : (
            <button onClick={onCerrar} className="btn-dorado flex-1 h-12 rounded-2xl font-bold shadow-card">
              {promo.boton_texto || "Ver el menú"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Sin tildes ni mayúsculas: "pie de la popa" encuentra "Pie de la Popa", "getsemani" encuentra "Getsemaní"
const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function BuscadorBarrio({
  id,
  barrios,
  elegido,
  otro,
  onElegir,
  onOtro,
  onLimpiar,
}: {
  id: string;
  barrios: Barrio[];
  elegido: Barrio | null;
  otro: string;
  onElegir: (b: Barrio) => void;
  onOtro: (texto: string) => void;
  onLimpiar: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);

  // Ya eligió: se muestra como tarjeta con opción de cambiar
  if (elegido || otro) {
    return (
      <div className="mt-1 flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 px-3 py-2.5">
        <MapPin className="h-5 w-5 text-[#D9731B] shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold truncate">{elegido ? elegido.nombre : otro}</span>
          <span className="block text-xs text-muted-foreground">Te confirmamos el valor del domicilio por WhatsApp</span>
        </span>
        <button
          type="button"
          onClick={() => {
            onLimpiar();
            setBusqueda("");
            setAbierto(true);
          }}
          className="text-sm font-semibold text-primary shrink-0"
        >
          Cambiar
        </button>
      </div>
    );
  }

  const q = normalizar(busqueda);
  const resultados = q
    ? barrios
        .filter((b) => normalizar(b.nombre).includes(q))
        // primero los que empiezan con lo escrito
        .sort((a, b) => Number(!normalizar(a.nombre).startsWith(q)) - Number(!normalizar(b.nombre).startsWith(q)))
    : barrios;
  const exacto = barrios.some((b) => normalizar(b.nombre) === q);

  return (
    <div className="mt-1 relative">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        id={id}
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Busca tu barrio"
        autoComplete="off"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        className="w-full h-10 rounded-md border border-input bg-background pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-primary/40"
      />
      {abierto && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-card divide-y divide-border"
        >
          {resultados.slice(0, 40).map((b) => (
            <li key={b.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onElegir(b);
                  setAbierto(false);
                }}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted active:bg-muted"
              >
                <span className="font-medium">{b.nombre}</span>
              </button>
            </li>
          ))}
          {q && !exacto && (
            <li>
              <button
                type="button"
                onClick={() => {
                  onOtro(busqueda.trim());
                  setAbierto(false);
                }}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted"
              >
                {resultados.length ? "¿No es ninguno? " : "No lo encontramos. "}
                Usar <strong>«{busqueda.trim()}»</strong>
                <span className="block text-xs text-muted-foreground">Te confirmamos el valor del domicilio por WhatsApp</span>
              </button>
            </li>
          )}
          {!q && barrios.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">Escribe tu barrio</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ── Recordar datos en este celular (nunca se envían a otro lado) ──
const DATOS_CLIENTE = "datosCliente_v1";
const ULTIMO_PEDIDO = "ultimoPedido_v1";
function leerLocal<T>(clave: string): T | null {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function guardarLocal(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: solo no se recuerda */
  }
}
function borrarLocal(clave: string) {
  try {
    localStorage.removeItem(clave);
  } catch {
    /* nada */
  }
}
