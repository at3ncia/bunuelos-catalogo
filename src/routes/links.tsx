import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Share2 } from "lucide-react";
import logoAsset from "@/assets/logo-bunuelos.png.asset.json";

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
  {
    label: "Terminal - Castellana Cartagena",
    phone: "573013416503",
    text: "Hola! Quiero ordenar",
  },
  {
    label: "Bocagrande",
    phone: "573226768027",
    text: "Hola! Estoy interesad@ en:",
  },
  {
    label: "Barranquilla",
    phone: "573106107552",
    text: "Hola! Quisiera ordenar:",
  },
];

function waUrl(phone: string, text: string) {
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}

function LinksPage() {
  const compartir = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Los Buñuelos Los Originales", url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* el usuario canceló o no hay permiso: no hacemos nada */
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#1740A8] text-white flex items-start justify-center py-10 px-4">
      {/* Fondo decorativo en tonos azules */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[#2456C9]/60 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-[#2E63DB]/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-[#1E4FC0]/60 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex justify-end">
          <button
            onClick={compartir}
            aria-label="Compartir"
            className="h-11 w-11 rounded-full bg-[#14379A] border border-white/15 flex items-center justify-center hover:scale-105 transition"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <header className="flex flex-col items-center text-center mt-2">
          <img
            src={logoAsset.url}
            alt="Los Buñuelos Los Originales"
            className="h-36 w-36 rounded-full object-cover shadow-xl ring-4 ring-white/10"
          />
          <h1 className="mt-5 font-display text-2xl sm:text-3xl font-extrabold tracking-wide uppercase">
            Buñuelos Los Originales
          </h1>
          <p className="mt-1 text-sm text-white/75">Crujientes, doraditos y recién hechos</p>
        </header>

        <nav className="mt-8 space-y-4">
          {BOTONES.map((b) => (
            <a
              key={b.phone}
              href={waUrl(b.phone, b.text)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-xl bg-[#D9731B] hover:bg-[#E37F25] px-5 py-4 shadow-lg transition active:scale-[0.98]"
            >
              <MessageCircle className="h-6 w-6 shrink-0 fill-white/20" />
              <span className="flex-1 text-center font-semibold text-base sm:text-lg">{b.label}</span>
              <span className="w-6 shrink-0" aria-hidden />
            </a>
          ))}
        </nav>

        <a
          href="/"
          className="mt-10 block text-center text-sm text-white/80 underline underline-offset-4 hover:text-white"
        >
          Ver el menú completo
        </a>

        <p className="mt-8 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Los Buñuelos Los Originales
        </p>
      </div>
    </div>
  );
}
