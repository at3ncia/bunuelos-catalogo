import type { Category, Product } from "@/lib/storage";
import { MASCOTA_URL } from "@/lib/brand";

// Paleta del menú impreso: se usa para categorías sin color asignado en el panel
const PALETA = ["#E8781A", "#E2563F", "#1B3A8C", "#A9B4F7", "#F2B231", "#2E8B57", "#8E44AD"];
const AZUL_TEXTO = "#122a6b";

// Color de una categoría: el del panel, o uno de la paleta según su posición
export function colorCategoria(categorias: Category[], categoriaId: string) {
  const i = categorias.findIndex((c) => c.id === categoriaId);
  const propio = i >= 0 ? categorias[i].color : "";
  if (/^#[0-9a-f]{6}$/i.test(propio)) return propio;
  return PALETA[(i >= 0 ? i : 0) % PALETA.length];
}

// Texto legible sobre un color: blanco en fondos oscuros, azul marino en claros (WCAG)
export function textoSobre(hex: string) {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrasteBlanco = 1.05 / (lum + 0.05);
  const contrasteAzul = (lum + 0.05) / (0.0286 + 0.05); // 0.0286 = luminancia de #122a6b
  return contrasteBlanco >= contrasteAzul ? "#FFFFFF" : AZUL_TEXTO;
}

// Foto del producto. Sin foto: el color de su categoría, su nombre y la mascota asomándose.
export function FotoProducto({
  product,
  color,
  className = "",
  conNombre = true,
  mascota = "w-[38%]",
}: {
  product: Product;
  color: string;
  className?: string;
  conNombre?: boolean;
  mascota?: string;
}) {
  if (product.foto) {
    return (
      <img
        src={product.foto}
        alt={product.nombre}
        loading="lazy"
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }
  // "Buñuelo Mozarella" -> "Mozarella"; "Jugo de Mora" -> "Mora": la palabra que distingue
  const corto = product.nombre.replace(/^(Buñuelo|Jugo de|Pan de Bono)\s+/i, "").replace(/\s*·.*$/, "");
  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ backgroundColor: color }} aria-hidden>
      <div className="absolute -top-1/3 -left-1/4 h-full w-3/4 rounded-full bg-white/15 blur-2xl" />
      {conNombre && (
        <span
          className="absolute left-3 top-3 right-[34%] text-left font-display font-bold leading-[1.05] text-[clamp(0.95rem,4.2vw,1.35rem)] line-clamp-3"
          style={{ color: textoSobre(color) }}
        >
          {corto}
        </span>
      )}
      <img
        src={MASCOTA_URL}
        alt=""
        className={`absolute -bottom-[6%] -right-[2%] ${mascota} h-auto -rotate-12 drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]`}
      />
    </div>
  );
}
