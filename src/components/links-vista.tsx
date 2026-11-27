import { Bike, ChevronRight, Facebook, Globe, Instagram, MapPin, Music2, Phone, Share2, UtensilsCrossed } from "lucide-react";
import { estadoDomicilios, urlEnlace, type Ajustes, type Enlace } from "@/lib/ajustes";
import type { PuntoPedido } from "@/lib/sedes";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { AZUL_MARCA, FONDO_MANCHAS, LOGO_OSCURO_URL } from "@/lib/brand";

// Página /links. La usan la página pública y la vista previa del panel (/admin → Links),
// para que lo que el dueño ve al editar sea exactamente lo que ve el cliente.

export const ICONOS_LINK: Record<Enlace["icono"], (p: { className?: string }) => React.ReactNode> = {
  web: (p) => <Globe {...p} />,
  ubicacion: (p) => <MapPin {...p} />,
  instagram: (p) => <Instagram {...p} />,
  tiktok: (p) => <Music2 {...p} />,
  facebook: (p) => <Facebook {...p} />,
  whatsapp: (p) => <WhatsAppIcon {...p} />,
  telefono: (p) => <Phone {...p} />,
  moto: (p) => <Bike {...p} />,
};

// Estilo de cada botón extra: fondo del botón y del círculo del ícono
export const ESTILOS_LINK: Record<Enlace["estilo"], { boton: string; icono: string; nombre: string }> = {
  blanco: { boton: "bg-white text-[#122a6b]", icono: "bg-[#0E47D6]/10 text-[#0E47D6]", nombre: "Blanco" },
  naranja: { boton: "bg-[#D9731B] text-white", icono: "bg-white/20 text-white", nombre: "Naranja" },
  dorado: { boton: "btn-dorado", icono: "bg-white/40 text-[#3a2706]", nombre: "Dorado" },
};

export function waUrl(phone: string, text: string) {
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}

// Id de cada pieza de la página, para resaltar en la vista previa lo que se está editando
export type PiezaLinks = "bio" | "menu" | `punto:${string}` | `enlace:${string}` | "instagram";

type Props = {
  ajustes: Pick<Ajustes, "bio" | "boton_menu" | "mostrar_boton_menu" | "enlaces" | "instagram" | "horario_domicilios">;
  puntos: PuntoPedido[];
  ciudades?: Record<number, string>; // sede_id → ciudad, para la etiqueta de cada punto
  // Vista previa: no navega; tocar una pieza la selecciona para editarla
  preview?: { seleccion: PiezaLinks | null; onElegir: (p: PiezaLinks) => void };
};

export function LinksVista({ ajustes, puntos, ciudades, preview }: Props) {
  const estado = estadoDomicilios(ajustes.horario_domicilios);
  const enlaces = ajustes.enlaces.filter((e) => e.activo && (preview ? true : urlEnlace(e)));
  const visibles = puntos.filter((p) => p.en_enlaces !== false && p.activo !== false);

  // En la vista previa los enlaces no abren nada: seleccionan la pieza
  const pieza = (id: PiezaLinks) =>
    preview
      ? {
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            preview.onElegir(id);
          },
          "data-pieza": id,
          className:
            preview.seleccion === id
              ? "outline outline-[3px] outline-offset-[3px] outline-[#F9E08B] rounded-2xl"
              : "outline-none",
        }
      : { className: "" };

  const compartir = async () => {
    if (preview) return;
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: "Los Buñuelos Los Originales", url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* cancelado o sin permiso */
    }
  };

  return (
    <div
      className="min-h-full text-white flex justify-center px-4 pt-5 pb-16"
      style={{ backgroundColor: AZUL_MARCA, backgroundImage: FONDO_MANCHAS, backgroundSize: "340px 340px" }}
    >
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur ${
              estado.abierto ? "bg-[#1F9D4C]/90" : "bg-black/30"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${estado.abierto ? "bg-white animate-pulse" : "bg-white/60"}`} />
            {estado.abierto
              ? `Domicilios abiertos · hasta ${estado.cierra}`
              : estado.abre
                ? `Domicilios cerrados · abrimos ${estado.abre.cuando} ${estado.abre.hora}`
                : "Domicilios cerrados"}
          </span>
          <button
            onClick={compartir}
            aria-label="Compartir"
            className="h-10 w-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 transition"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        <header {...pieza("bio")} className={`flex flex-col items-center text-center mt-4 p-1 ${pieza("bio").className}`}>
          <h1 className="sr-only">Los Buñuelos Los Originales</h1>
          <img src={LOGO_OSCURO_URL} alt="Los Buñuelos Los Originales" className="w-full max-w-[18rem] h-auto drop-shadow-xl" />
          {ajustes.bio ? (
            <p className="mt-3 max-w-xs text-white/90 text-balance whitespace-pre-line">{ajustes.bio}</p>
          ) : (
            preview && <p className="mt-3 text-white/50 text-sm italic">Sin texto bajo el logo</p>
          )}
        </header>

        <nav className="mt-6 space-y-3">
          {ajustes.mostrar_boton_menu && (
            <a
              href="/?elegir"
              {...pieza("menu")}
              className={`btn-dorado flex items-center gap-3 rounded-2xl p-3 pr-4 shadow-xl transition active:scale-[0.98] hover:brightness-105 ${pieza("menu").className}`}
            >
              <span className="h-12 w-12 shrink-0 rounded-xl bg-white/40 flex items-center justify-center">
                <UtensilsCrossed className="h-6 w-6" />
              </span>
              <span className="flex-1 min-w-0 text-left">
                <span className="block font-display font-bold text-lg leading-tight">{ajustes.boton_menu || "Ver el menú"}</span>
                <span className="block text-xs font-semibold opacity-80">Mira precios y arma tu pedido</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 opacity-70" />
            </a>
          )}

          {visibles.length > 0 && (
            <p className="pt-3 text-xs font-bold uppercase tracking-widest text-white/70 text-center">Pide por WhatsApp</p>
          )}
          {visibles.map((b) => {
            const id: PiezaLinks = `punto:${b.id}`;
            const ciudad = ciudades?.[b.sede_id];
            return (
              <a
                key={b.id}
                href={waUrl(b.whatsapp, b.mensaje)}
                target="_blank"
                rel="noopener noreferrer"
                {...pieza(id)}
                className={`flex items-center gap-3 rounded-2xl bg-white text-[#122a6b] p-3 pr-4 shadow-lg transition active:scale-[0.98] hover:bg-white/95 ${pieza(id).className}`}
              >
                <span className="h-12 w-12 shrink-0 rounded-xl bg-[#25D366] text-white flex items-center justify-center">
                  <WhatsAppIcon className="h-7 w-7" />
                </span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block font-bold text-base leading-tight truncate">{b.etiqueta_enlace || b.nombre || "Punto sin nombre"}</span>
                  <span className="block text-xs text-[#122a6b]/60 truncate">
                    {[ciudad, b.detalle].filter(Boolean).join(" · ") || "Escríbenos por WhatsApp"}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-[#122a6b]/40" />
              </a>
            );
          })}

          {enlaces.length > 0 && (
            <p className="pt-3 text-xs font-bold uppercase tracking-widest text-white/70 text-center">Más de nosotros</p>
          )}
          {enlaces.map((e) => {
            const id: PiezaLinks = `enlace:${e.id}`;
            const Icono = ICONOS_LINK[e.icono];
            const est = ESTILOS_LINK[e.estilo];
            return (
              <a
                key={e.id}
                href={urlEnlace(e) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                {...pieza(id)}
                className={`flex items-center gap-3 rounded-2xl p-3 pr-4 shadow-lg transition active:scale-[0.98] hover:brightness-105 ${est.boton} ${preview && !urlEnlace(e) ? "opacity-50 border-2 border-dashed border-white" : ""} ${pieza(id).className}`}
              >
                <span className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${est.icono}`}>
                  <Icono className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block font-semibold truncate">{e.texto || e.url || "Botón sin texto"}</span>
                  {preview && !urlEnlace(e) && <span className="block text-[11px] font-bold opacity-80">Falta el enlace · el cliente no lo ve</span>}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 opacity-50" />
              </a>
            );
          })}
        </nav>

        {ajustes.instagram && (
          <a
            href={`https://www.instagram.com/${ajustes.instagram}/`}
            target="_blank"
            rel="noopener noreferrer"
            {...pieza("instagram")}
            className={`mt-8 mx-auto flex w-fit items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold transition ${pieza("instagram").className}`}
          >
            <Instagram className="h-4 w-4" /> @{ajustes.instagram}
          </a>
        )}

        <p className="mt-6 text-center text-xs text-white/60">© {new Date().getFullYear()} Los Buñuelos Los Originales</p>
      </div>
    </div>
  );
}
