// INTERNO (solo admin). El catálogo público usa ./barrios-publicos.
// Zonas de domicilio por grupos de barrios. Persistidas en Supabase (tabla
// zonas_envio) con fallback a localStorage y a las zonas sugeridas de abajo.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { DEFAULT_ZONAS } from "./delivery-defaults";
export { SEDES, DEFAULT_ZONAS } from "./delivery-defaults";

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

export function zonaDePedido(zonas: Zona[], o: { zona_id?: string | null; ciudad?: string | null; barrio?: string | null }) {
  return zonas.find((z) => z.id === o.zona_id) ??
    (o.ciudad && o.barrio ? findZona(zonas, o.ciudad as Ciudad, o.barrio) : undefined);
}

export function barriosDe(zonas: Zona[], ciudad: Ciudad): string[] {
  return zonas
    .filter((z) => z.activo && z.ciudad === ciudad)
    .flatMap((z) => z.barrios)
    .sort((a, b) => a.localeCompare(b, "es"));
}
