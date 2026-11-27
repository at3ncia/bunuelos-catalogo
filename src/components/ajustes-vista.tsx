import { AlignLeft, ChevronDown, Clock, ListChecks, MapPin, Phone, Search, ShoppingBag, ShoppingCart, Type } from "lucide-react";
import { estadoDomicilios, mensajePedido, type Ajustes, type CampoPedido, type TipoCampo } from "@/lib/ajustes";
import { formatCOP } from "@/lib/cart";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { AZUL_MARCA, FONDO_MANCHAS, LOGO_OSCURO_URL } from "@/lib/brand";

// Vista previa de /admin → Ajustes: portada del catálogo, formulario del pedido y el mensaje
// que llega por WhatsApp. Se dibuja con los mismos estilos del catálogo.

export type PantallaAjustes = "portada" | "formulario" | "mensaje";
export type PiezaAjustes = "titulo" | "subtitulo" | "horario" | "saludo" | `campo:${string}`;

export const ICONOS_TIPO: Record<TipoCampo, (p: { className?: string }) => React.ReactNode> = {
  texto: (p) => <Type {...p} />,
  texto_largo: (p) => <AlignLeft {...p} />,
  telefono: (p) => <Phone {...p} />,
  opciones: (p) => <ListChecks {...p} />,
  barrio: (p) => <MapPin {...p} />,
  pedido: (p) => <ShoppingBag {...p} />,
};

// Datos de ejemplo para ver cómo queda el mensaje
function ejemplo(c: CampoPedido) {
  if (c.tipo === "opciones") return c.opciones?.[0] ?? "";
  if (c.tipo === "telefono") return "300 123 4567";
  if (c.tipo === "barrio") return "Crespo";
  if (c.tipo === "texto_largo") return /direcc/i.test(c.etiqueta) ? "Cra 5 # 10-20, frente a la tienda" : "Sin cebolla, por favor";
  if (/nombre/i.test(c.etiqueta)) return "María López";
  return "Ejemplo";
}

type Props = {
  ajustes: Ajustes;
  pantalla: PantallaAjustes;
  seleccion: PiezaAjustes | null;
  onElegir: (p: PiezaAjustes) => void;
};

export function AjustesVista({ ajustes, pantalla, seleccion, onElegir }: Props) {
  const pieza = (id: PiezaAjustes, extra = "") => ({
    "data-pieza": id,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onElegir(id);
    },
    className: `${extra} cursor-pointer rounded-xl ${seleccion === id ? "outline outline-[3px] outline-offset-2 outline-[#F3B15A]" : ""}`,
  });
  if (pantalla === "portada") return <Portada ajustes={ajustes} pieza={pieza} />;
  if (pantalla === "formulario") return <Formulario ajustes={ajustes} pieza={pieza} />;
  return <Mensaje ajustes={ajustes} pieza={pieza} />;
}

type Pieza = (id: PiezaAjustes, extra?: string) => { "data-pieza": string; onClick: (e: React.MouseEvent) => void; className: string };

function Portada({ ajustes, pieza }: { ajustes: Ajustes; pieza: Pieza }) {
  const horario = estadoDomicilios(ajustes.horario_domicilios);
  return (
    <div className="min-h-full bg-background">
      <header className="text-white" style={{ backgroundColor: AZUL_MARCA, backgroundImage: FONDO_MANCHAS, backgroundSize: "340px 340px" }}>
        <div className="px-4 pt-9 pb-6">
          <div className="flex items-center gap-3">
            <img src={LOGO_OSCURO_URL} alt="" className="h-12 w-auto drop-shadow-lg" />
            <div className="flex-1" />
            <span className="h-11 w-11 rounded-full bg-white text-primary shadow-card flex items-center justify-center">
              <ShoppingCart className="h-5 w-5" />
            </span>
          </div>
          <h1 {...pieza("titulo", "mt-5 text-3xl font-display font-bold text-balance leading-tight")}>
            {ajustes.titulo || <span className="opacity-50">Sin título</span>}
          </h1>
          <p {...pieza("subtitulo", "text-sm text-white/80 mt-1")}>{ajustes.subtitulo || <span className="opacity-50">Sin subtítulo</span>}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-[#F3B15A]" /> Pidiendo en Cartagena <ChevronDown className="h-4 w-4" />
          </span>
        </div>
      </header>
      <div className="border-b border-border/60 px-4 py-3 flex gap-2 overflow-hidden">
        {["Todos", "Nuestros Buñuelos", "Combos"].map((t, i) => (
          <span key={t} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
            {t}
          </span>
        ))}
      </div>
      <div className="px-4 pt-5 space-y-4">
        <div {...pieza("horario", "block")}>
          {horario.abierto ? (
            <div className="flex items-center gap-3 rounded-2xl bg-[#DDF5E4] border border-[#1F9D4C]/30 px-4 py-3 text-sm text-[#14652F]">
              <Clock className="h-5 w-5 shrink-0" />
              <p>
                <strong>Domicilios abiertos</strong> hasta las {horario.cierra}. <span className="opacity-70">(Este aviso verde solo se ve aquí.)</span>
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl bg-[#FDF1E6] border border-[#F3C9A0] px-4 py-3 text-sm text-[#7A3B05]">
              <Clock className="h-5 w-5 shrink-0 mt-0.5" />
              <p>
                <strong>Domicilios cerrados en este momento.</strong>{" "}
                {horario.abre ? `Abrimos ${horario.abre.cuando} a las ${horario.abre.hora}.` : "Te respondemos apenas abramos."}
              </p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
              <div className="aspect-square bg-muted" />
              <div className="p-2.5 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
        {ajustes.instagram && <p className="pb-6 text-center text-xs text-muted-foreground">@{ajustes.instagram}</p>}
      </div>
    </div>
  );
}

function Formulario({ ajustes, pieza }: { ajustes: Ajustes; pieza: Pieza }) {
  const visibles = ajustes.campos_pedido.filter((c) => c.activo && c.tipo !== "pedido");
  const faltan = visibles.filter((c) => c.obligatorio && c.tipo !== "opciones");
  return (
    <div className="min-h-full bg-black/50 px-3 pt-10 pb-6">
      <div className="rounded-2xl bg-background p-5 space-y-4 shadow-2xl">
        <div className="text-center">
          <p className="font-display text-xl font-bold">Datos de entrega</p>
          <p className="text-sm text-muted-foreground">Completa para enviar tu pedido por WhatsApp.</p>
        </div>
        <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 text-sm flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 text-[#D9731B] shrink-0" />
            <span className="truncate">
              Llega a <strong>Terminal · Castellana</strong>
            </span>
          </span>
          <span className="font-display font-bold text-primary shrink-0">{formatCOP(14000)}</span>
        </div>
        <div className="space-y-3">
          {visibles.map((c) => (
            <div key={c.id} {...pieza(`campo:${c.id}`, "block p-1 -m-1")}>
              <p className="text-sm font-medium">
                {c.etiqueta || <span className="text-destructive">Dato sin nombre</span>}
                {!c.obligatorio && <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>}
              </p>
              {c.tipo === "opciones" ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {(c.opciones ?? []).map((o, i) => (
                    <span key={o} className={`px-3 py-2 rounded-full text-sm border ${i === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
                      {o}
                    </span>
                  ))}
                  {!(c.opciones ?? []).length && <span className="text-xs text-destructive">Agrega al menos una opción</span>}
                </div>
              ) : c.tipo === "barrio" ? (
                <div className="mt-1 h-11 rounded-xl border border-input bg-card px-3 flex items-center gap-2 text-muted-foreground text-sm">
                  <Search className="h-4 w-4" /> Busca tu barrio
                </div>
              ) : (
                <div className={`mt-1 rounded-xl border border-input bg-card ${c.tipo === "texto_largo" ? "h-16" : "h-11"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="h-12 rounded-xl bg-[#25D366]/50 text-white font-bold flex items-center justify-center gap-2">
          <WhatsAppIcon className="h-5 w-5" /> Enviar por WhatsApp
        </div>
        {faltan.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">Falta: {faltan.map((c) => c.etiqueta).join(", ")}</p>
        )}
      </div>
    </div>
  );
}

function Mensaje({ ajustes, pieza }: { ajustes: Ajustes; pieza: Pieza }) {
  const activos = ajustes.campos_pedido.filter((c) => c.activo);
  const valores = Object.fromEntries(activos.map((c) => [c.id, ejemplo(c)]));
  const detalle = `   - 2x Buñuelo de queso (${formatCOP(7000)})\n   - 1x Avena helada (${formatCOP(7000)})`;
  const hayBarrio = activos.some((c) => c.tipo === "barrio");
  const texto = mensajePedido(ajustes.saludo_pedido, activos, valores, detalle, formatCOP(14000), {
    codigo: "CAR-04821",
    domicilio: hayBarrio ? "por confirmar" : undefined,
  });
  const [primera, ...resto] = texto.split("\n\n");
  return (
    <div className="min-h-full flex flex-col bg-[#EFE7DE]">
      <div className="bg-[#075E54] text-white px-3 pt-9 pb-3 flex items-center gap-3">
        <span className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
          <WhatsAppIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-semibold leading-tight">Terminal · Castellana</span>
          <span className="block text-xs text-white/70">Así te llega el pedido</span>
        </span>
      </div>
      <div className="flex-1 p-3">
        <div className="ml-auto max-w-[90%] rounded-xl rounded-tr-sm bg-[#D9FDD3] px-3 py-2 text-[13px] leading-snug text-[#111B21] shadow-sm whitespace-pre-wrap break-words">
          <span {...pieza("saludo", "block -mx-1 px-1")}>{primera}</span>
          {"\n\n"}
          {resto.join("\n\n")}
          <span className="block text-right text-[10px] text-[#667781] mt-1">7:05 p. m. ✓✓</span>
        </div>
        <p className="mt-3 text-center text-[11px] text-[#667781]">Datos de ejemplo. El código del pedido se pone solo.</p>
      </div>
    </div>
  );
}
