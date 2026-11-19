// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE MARCA — único archivo a editar para clonar este catálogo
// para otro negocio. Ver TEMPLATE.md.
// (Nombre, WhatsApp y logo también se pueden cambiar en vivo desde /admin.)
// ─────────────────────────────────────────────────────────────────────────────
import logoAsset from "@/assets/logo-bunuelos.png.asset.json";

export const BUSINESS = {
  nombre: "Los Buñuelos Los Originales",
  nombreCorto: "Los Buñuelos",
  whatsapp: "573001234567", // internacional sin "+"
  logoUrl: logoAsset.url as string,
  seo: {
    tituloCatalogo: "Los Buñuelos Los Originales — Catálogo",
    descripcionCatalogo: "🧡Kiosco los buñuelos los originales + de 10 años en el mercado",
    tituloSitio: "Los Buñuelos Los Originales — Pide en línea",
    descripcionSitio: "Pide buñuelos, comidas, bebidas y combos. Los Originales, directo a tu casa por WhatsApp.",
    ogDescripcion: "Catálogo de comida callejera. Pide fácil por WhatsApp.",
  },
  mediosDePago: ["Efectivo", "Nequi", "Bancolombia", "Otro"],
  moneda: { locale: "es-CO", currency: "COP" },
} as const;
