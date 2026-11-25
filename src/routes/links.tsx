import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Instagram, Share2, UtensilsCrossed } from "lucide-react";
import { useAppState } from "@/lib/app-store";
import { leerCopia } from "@/lib/storage";
import { listarPuntos, PUNTOS_RESPALDO, type PuntoPedido } from "@/lib/sedes";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { LOGO_OSCURO_URL, FONDO_MANCHAS, AZUL_MARCA } from "@/lib/brand";

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { title: "Los Buñuelos Los Originales — Pedidos" },
      { name: "description", content: "Haz tu pedido por WhatsApp en la sede que te quede más cerca." },
    ],
  }),
  component: LinksPage,
});

// Los botones salen de los puntos de pedido (se editan en /admin → Puntos de pedido).
// Se pinta al instante con la última copia y se actualiza al llegar los datos.
function usePuntosEnlaces() {
  const [puntos, setPuntos] = useState<PuntoPedido[]>(
    () => leerCopia<PuntoPedido[]>("bunuelos_puntos_v1") ?? PUNTOS_RESPALDO,
  );
  useEffect(() => {
    listarPuntos().then(setPuntos);
  }, []);
  return puntos.filter((p) => p.en_enlaces !== false && p.activo !== false);
}

function waUrl(phone: string, text: string) {
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}

function LinksPage() {
  const { state } = useAppState();
  const ajustes = state.config.ajustes;
  const puntos = usePuntosEnlaces();
  const compartir = async () => {
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
      className="min-h-screen text-white flex items-start justify-center pt-10 pb-24 px-4"
      style={{ backgroundColor: AZUL_MARCA, backgroundImage: FONDO_MANCHAS, backgroundSize: "340px 340px" }}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-end">
          <button
            onClick={compartir}
            aria-label="Compartir"
            className="h-11 w-11 rounded-2xl bg-[#0B2F8F]/80 border border-white/15 flex items-center justify-center hover:scale-105 transition"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <header className="flex flex-col items-center text-center mt-4">
          <h1 className="sr-only">Buñuelos Los Originales</h1>
          <img
            src={LOGO_OSCURO_URL}
            alt="Los Buñuelos Los Originales"
            className="w-full max-w-sm h-auto drop-shadow-xl"
          />
        </header>

        <nav className="mt-8 space-y-4">
          <a
            href="/?elegir"
            className="btn-dorado flex items-center gap-4 rounded-xl px-5 py-4 shadow-lg transition active:scale-[0.98] hover:brightness-105"
          >
            <UtensilsCrossed className="h-6 w-6 shrink-0" />
            <span className="flex-1 text-center font-bold text-base sm:text-lg">{ajustes.boton_menu}</span>
            <span className="w-6 shrink-0" aria-hidden />
          </a>

          {puntos.map((b) => (
            <a
              key={b.id}
              href={waUrl(b.whatsapp, b.mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl bg-[#D9731B] hover:bg-[#E37F25] px-5 py-4 shadow-lg transition active:scale-[0.98]"
            >
              <WhatsAppIcon className="h-7 w-7 shrink-0" />
              <span className="flex-1 text-center font-semibold text-base sm:text-lg">
                {b.etiqueta_enlace || b.nombre}
              </span>
              <span className="w-6 shrink-0" aria-hidden />
            </a>
          ))}
        </nav>

        {ajustes.instagram && (
          <a
            href={`https://www.instagram.com/${ajustes.instagram}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 mx-auto flex w-fit items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold transition"
          >
            <Instagram className="h-4 w-4" /> @{ajustes.instagram}
          </a>
        )}

        <p className="mt-8 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Los Buñuelos Los Originales
        </p>
      </div>
    </div>
  );
}
