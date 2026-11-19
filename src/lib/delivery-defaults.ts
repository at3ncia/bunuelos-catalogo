// Zonas sugeridas (solo se cargan en el admin; nunca en el catálogo público).
import type { Ciudad, Zona } from "./delivery";

/** Sedes de referencia para la proximidad (fuente: Instagram @kiosko_los_bunuelos y Rappi). */
export const SEDES = [
  { ciudad: "Barranquilla", nombre: "Centro", direccion: "Calle 38 #38-10, Centro" },
  { ciudad: "Cartagena", nombre: "Terminal de Transporte", direccion: "Bajo el Hotel Cordialidad Plaza" },
  { ciudad: "Cartagena", nombre: "La Castellana", direccion: "Al lado de Celuclock" },
] as const;

const z = (id: string, ciudad: Ciudad, orden: number, nombre: string, precio: number, barrios: string[]): Zona =>
  ({ id, ciudad, nombre, precio, barrios, activo: true, orden });

// Grupos sugeridos por anillos de distancia a cada sede. Los precios son un
// punto de partida: ajústalos en /admin → Envíos.
export const DEFAULT_ZONAS: Zona[] = [
  // ── Barranquilla (sede Centro, Calle 38 #38-10) ──
  z("baq-1", "Barranquilla", 1, "Centro cercano (≤2 km)", 3000, [
    "Centro", "Barrio Abajo", "San Roque", "Rebolo", "Chiquinquirá", "San José", "El Rosario",
    "Montecristo", "Barlovento", "Villanueva", "La Luz", "Las Nieves",
  ]),
  z("baq-2", "Barranquilla", 2, "Anillo medio (2–4 km)", 4500, [
    "Boston", "El Prado", "Bellavista", "Las Delicias", "Los Andes", "Santa Ana", "Simón Bolívar",
    "Lucero", "El Carmen", "Recreo", "Colombia", "Modelo", "Montes", "San Isidro", "Las Palmas",
    "La Victoria", "Olaya", "Ciudad Jardín", "Atlántico", "San Felipe", "La Concepción", "Los Pinos",
  ]),
  z("baq-3", "Barranquilla", 3, "Anillo exterior (4–7 km)", 6000, [
    "Alto Prado", "El Golf", "Villa Country", "Paraíso", "El Tabor", "Nueva Granada", "Kennedy",
    "Los Nogales", "Carrizal", "La Sierrita", "Santo Domingo", "Las Américas", "El Bosque",
    "Ciudadela 20 de Julio", "Me Quejo", "La Chinita", "La Magdalena", "Los Alpes", "Betania",
    "La Campiña", "Granadillo", "San Vicente", "Lipaya",
  ]),
  z("baq-4", "Barranquilla", 4, "Norte y periferia (7+ km)", 8000, [
    "Riomar", "Altos de Riomar", "Villa Santos", "Miramar", "Buenavista", "Las Flores", "Siape",
    "La Playa", "Villa Carolina", "El Silencio", "Los Olivos", "Siete de Abril", "Las Malvinas",
    "El Pueblo", "Villa del Este", "Adelita de Char", "Nueva Colombia", "Villas de San Pablo",
  ]),
  // ── Soledad (servida desde la sede Centro de Barranquilla) ──
  z("sol-1", "Soledad", 1, "Soledad norte (cerca a Murillo/Circunvalar)", 7000, [
    "Hipódromo", "Soledad 2000", "Villa Katanga", "Los Robles", "Las Moras", "Costa Hermosa",
    "Ciudad Paraíso", "Villa Estadio", "El Parque", "Normandía",
  ]),
  z("sol-2", "Soledad", 2, "Soledad centro y sur", 9000, [
    "Centro (Soledad)", "Manuela Beltrán", "Los Almendros", "Salamanca", "Vista Hermosa", "Villa Sol",
    "Ciudadela Metropolitana", "Villa Muvdi", "El Ferrocarril", "Juan Domínguez Romero", "Villa María",
  ]),
  // ── Cartagena (sedes Terminal y La Castellana) ──
  z("ctg-1", "Cartagena", 1, "Cerca a las sedes (≤3 km)", 3000, [
    "La Castellana", "Los Alpes", "Los Ejidos", "Calamares", "Los Ángeles", "Las Gaviotas", "El Recreo",
    "Villa Rosita", "Chiquinquirá", "Los Calamares", "Santa Mónica", "Villa Sandra", "Buenos Aires",
  ]),
  z("ctg-2", "Cartagena", 2, "Anillo medio (3–6 km)", 5000, [
    "Pie de la Popa", "Manga", "El Bosque", "Alcibia", "Zaragocilla", "Escallón Villa", "Los Corales",
    "Blas de Lezo", "El Socorro", "San Fernando", "Ternera", "El Educador", "Amberes", "Torices",
    "Daniel Lemaitre", "Olaya Herrera", "Bruselas", "La Esperanza", "Boston",
  ]),
  z("ctg-3", "Cartagena", 3, "Zona turística y periferia (6+ km)", 7000, [
    "Centro Histórico", "Getsemaní", "San Diego", "Bocagrande", "Castillogrande", "El Laguito",
    "Marbella", "Cabrero", "Crespo", "El Pozón", "Nelson Mandela", "La Boquilla", "Turbaco (vía)",
  ]),
];

