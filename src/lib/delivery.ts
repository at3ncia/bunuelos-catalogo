// Zonas de domicilio por grupos de barrios. Persistidas en Supabase (tabla
// zonas_envio) con fallback a localStorage y a las zonas sugeridas de abajo.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Ciudad = "Barranquilla" | "Soledad" | "Cartagena";
export const CIUDADES: Ciudad[] = ["Barranquilla", "Soledad", "Cartagena"];

export type Zona = {
  id: string;
  ciudad: Ciudad;
  nombre: string;
  precio: number;
  barrios: string[];
  activo: boolean;
  orden: number;
};

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

const LS_KEY = "bunuelos_zonas_v1";
let cache: Zona[] | null = null;
const listeners = new Set<(z: Zona[]) => void>();

async function loadZonas(): Promise<Zona[]> {
  try {
    const { data, error } = await supabase.from("zonas_envio").select("*").order("orden");
    if (error) throw error;
    if (data && data.length) return data as Zona[];
  } catch (e) {
    console.warn("[Envíos] Usando zonas locales:", e);
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Zona[];
  } catch { /* ignore */ }
  return DEFAULT_ZONAS;
}

async function saveZonas(zonas: Zona[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(zonas)); } catch { /* ignore */ }
  const ids = zonas.map((x) => `'${x.id}'`).join(",") || "'__none__'";
  await supabase.from("zonas_envio").delete().not("id", "in", `(${ids})`);
  if (zonas.length) {
    const { error } = await supabase.from("zonas_envio").upsert(zonas);
    if (error) console.error("[Envíos] Error al guardar:", error.message);
  }
}

export function useZonas() {
  const [zonas, setZonas] = useState<Zona[]>(cache ?? DEFAULT_ZONAS);
  useEffect(() => {
    if (!cache) loadZonas().then((z) => { cache = z; listeners.forEach((l) => l(z)); });
    const l = (z: Zona[]) => setZonas(z);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  const update = useCallback((fn: (z: Zona[]) => Zona[]) => {
    const next = fn(cache ?? DEFAULT_ZONAS);
    cache = next;
    listeners.forEach((l) => l(next));
    void saveZonas(next);
  }, []);
  return { zonas, update };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function findZona(zonas: Zona[], ciudad: Ciudad, barrio: string): Zona | undefined {
  const b = norm(barrio);
  return zonas.find((z) => z.activo && z.ciudad === ciudad && z.barrios.some((x) => norm(x) === b));
}

export function barriosDe(zonas: Zona[], ciudad: Ciudad): string[] {
  return zonas
    .filter((z) => z.activo && z.ciudad === ciudad)
    .flatMap((z) => z.barrios)
    .sort((a, b) => a.localeCompare(b, "es"));
}
