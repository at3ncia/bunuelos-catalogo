import type { Product } from "@/lib/storage";
import { MASCOTA_URL } from "@/lib/brand";

// Colores de las piezas del menú impreso, uno por categoría (fondo + texto legible encima)
const COLOR_CATEGORIA: Record<string, { fondo: string; texto: string }> = {
  bunuelos: { fondo: "#E8781A", texto: "#FFFFFF" },
  "otras-delicias": { fondo: "#E2563F", texto: "#FFFFFF" },
  jugos: { fondo: "#1B3A8C", texto: "#FFFFFF" },
  "bebidas-calientes": { fondo: "#A9B4F7", texto: "#122a6b" },
  combos: { fondo: "#F2B231", texto: "#122a6b" },
};
const POR_DEFECTO = { fondo: "#E8781A", texto: "#FFFFFF" };

export function colorCategoria(categoriaId: string) {
  return (COLOR_CATEGORIA[categoriaId] ?? POR_DEFECTO).fondo;
}
export function textoCategoria(categoriaId: string) {
  return (COLOR_CATEGORIA[categoriaId] ?? POR_DEFECTO).texto;
}

// Foto del producto. Sin foto: el color de su categoría, su nombre y la mascota asomándose.
export function FotoProducto({
  product,
  className = "",
  conNombre = true,
  mascota = "w-[38%]",
}: {
  product: Product;
  className?: string;
  conNombre?: boolean;
  mascota?: string;
}) {
  if (product.foto) {
    return <img src={product.foto} alt={product.nombre} className={`w-full h-full object-cover ${className}`} />;
  }
  const { fondo, texto } = COLOR_CATEGORIA[product.categoriaId] ?? POR_DEFECTO;
  // "Buñuelo Mozarella" -> "Mozarella"; "Jugo de Mora" -> "Mora": la palabra que distingue
  const corto = product.nombre
    .replace(/^(Buñuelo|Jugo de|Pan de Bono)\s+/i, "")
    .replace(/\s*·.*$/, "");
  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ backgroundColor: fondo }}
      aria-hidden
    >
      <div className="absolute -top-1/3 -left-1/4 h-full w-3/4 rounded-full bg-white/15 blur-2xl" />
      {conNombre && (
        <span
          className="absolute left-3 top-3 right-[34%] text-left font-display font-bold leading-[1.05] text-[clamp(0.95rem,4.2vw,1.35rem)] line-clamp-3"
          style={{ color: texto }}
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
