import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Share2, UtensilsCrossed } from "lucide-react";
import { LOGO_URL } from "@/lib/brand";

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

// Fondo de manchas orgánicas en azul claro sobre azul de marca (mosaico SVG)
const MANCHAS = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'><g fill='#2C64F0'>
<path d='M80,40 C140,0 230,30 240,100 C250,170 180,190 150,240 C120,290 40,280 20,210 C0,140 20,80 80,40Z'/>
<path d='M380,60 C440,20 540,50 560,120 C580,190 520,220 470,210 C420,200 400,250 350,230 C300,210 320,100 380,60Z'/>
<path d='M300,300 C360,270 430,300 440,360 C450,420 400,470 340,460 C280,450 230,400 250,350 C260,320 270,315 300,300Z'/>
<path d='M60,380 C110,350 170,380 180,440 C190,500 140,560 80,550 C20,540 -10,480 10,430 C20,405 40,392 60,380Z'/>
<path d='M480,380 C530,360 600,390 600,450 C600,520 540,580 480,560 C430,545 440,500 450,460 C455,430 460,392 480,380Z'/>
<path d='M200,520 C240,500 300,520 300,570 C300,610 250,620 220,600 C190,585 170,540 200,520Z'/>
</g></svg>`;
const FONDO = `url("data:image/svg+xml,${encodeURIComponent(MANCHAS)}")`;

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
      style={{ backgroundColor: "#0E47D6", backgroundImage: FONDO, backgroundSize: "340px 340px" }}
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

        <header className="flex flex-col items-center text-center mt-2">
          <div className="h-32 w-32 rounded-full bg-[#EE7F1A] flex items-center justify-center shadow-xl overflow-hidden">
            <img src={LOGO_URL} alt="Los Buñuelos Los Originales" className="h-28 w-auto object-contain" />
          </div>
          <h1 className="mt-5 font-display text-2xl sm:text-3xl font-extrabold tracking-wide uppercase">
            Buñuelos Los Originales
          </h1>
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
              <MessageCircle className="h-6 w-6 shrink-0 fill-white/20" />
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
