import { createFileRoute } from "@tanstack/react-router";
import { Share2, UtensilsCrossed } from "lucide-react";
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

// Botones por zona. Terminal y Castellana comparten número.
const BOTONES = [
  { label: "Terminal - Castellana Cartagena", phone: "573013416503", text: "Hola! Quiero ordenar" },
  { label: "Bocagrande", phone: "573226768027", text: "Hola! Estoy interesad@ en:" },
  { label: "Barranquilla", phone: "573106107552", text: "Hola! Quisiera ordenar:" },
];



function waUrl(phone: string, text: string) {
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}

function LinksPage() {
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
      className="min-h-screen text-white flex items-start justify-center py-10 px-4"
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
            href="/"
            className="btn-dorado flex items-center gap-4 rounded-xl px-5 py-4 shadow-lg transition active:scale-[0.98] hover:brightness-105"
          >
            <UtensilsCrossed className="h-6 w-6 shrink-0" />
            <span className="flex-1 text-center font-bold text-base sm:text-lg">Ver nuestro menú</span>
            <span className="w-6 shrink-0" aria-hidden />
          </a>

          {BOTONES.map((b) => (
            <a
              key={b.phone}
              href={waUrl(b.phone, b.text)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl bg-[#D9731B] hover:bg-[#E37F25] px-5 py-4 shadow-lg transition active:scale-[0.98]"
            >
              <WhatsAppIcon className="h-7 w-7 shrink-0" />
              <span className="flex-1 text-center font-semibold text-base sm:text-lg">{b.label}</span>
              <span className="w-6 shrink-0" aria-hidden />
            </a>
          ))}
        </nav>

        <p className="mt-12 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Los Buñuelos Los Originales
        </p>
      </div>
    </div>
  );
}
