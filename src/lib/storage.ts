// Capa de datos del catálogo (solo lectura). Las escrituras pasan por las
// funciones del panel (/admin) y de las sedes (/sede), nunca directo a las tablas.
//
// Respaldo: si Supabase no responde, se usa la última carga buena guardada en
// el navegador. Nunca se muestran productos inventados.

import { supabase } from "./supabase";
import { AJUSTES_POR_DEFECTO, normalizarAjustes, type Ajustes } from "./ajustes";

export type Category = { id: string; nombre: string; color: string };

export type Product = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoriaId: string;
  foto: string; // url
  disponible: boolean;
  dias: number[] | null; // 0 = domingo … 6 = sábado; null = todos los días
  orden: number;
};

export type BusinessConfig = {
  nombre: string;
  whatsapp: string; // formato internacional sin + (ej: 573001112233)
  logo: string;
  ajustes: Ajustes;
};

export type AppState = {
  config: BusinessConfig;
  categorias: Category[];
  productos: Product[];
  fuente: "red" | "copia" | "vacio"; // de dónde salió el menú
};

export const DEFAULT_STATE: AppState = {
  config: { nombre: "Los Buñuelos Los Originales", whatsapp: "", logo: "", ajustes: AJUSTES_POR_DEFECTO },
  categorias: [],
  productos: [],
  fuente: "vacio",
};

// ─── Copia local de la última carga buena ───────────────────────────────────

const LS_KEY = "bunuelos_menu_v2";

export function leerCopia<T>(clave: string): T | null {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function guardarCopia(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: solo se pierde el respaldo */
  }
}

// ─── Conversión desde las filas de la base de datos ─────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export function filaAProducto(p: any): Product {
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion ?? "",
    precio: Number(p.precio) || 0,
    categoriaId: p.categoria_id ?? "",
    foto: p.foto ?? "",
    disponible: p.disponible !== false,
    dias: Array.isArray(p.dias) && p.dias.length ? p.dias.map(Number) : null,
    orden: Number(p.orden) || 0,
  };
}

export function filaACategoria(c: any): Category {
  return { id: c.id, nombre: c.nombre, color: c.color ?? "" };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function conTiempoLimite<T>(promesa: PromiseLike<T>, ms = 8000): Promise<T> {
  return Promise.race([
    Promise.resolve(promesa),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Tiempo de espera agotado")), ms)),
  ]);
}

// ─── Cargar ─────────────────────────────────────────────────────────────────

export async function loadStateFromSupabase(): Promise<AppState> {
  try {
    const [configRes, catRes, prodRes] = await conTiempoLimite(
      Promise.all([
        supabase.from("config_publica").select("*").eq("id", 1).maybeSingle(),
        supabase.from("categorias").select("*").order("orden"),
        supabase.from("productos").select("*").order("orden").order("nombre"),
      ]),
    );

    if (catRes.error || prodRes.error) throw catRes.error || prodRes.error;

    const raw = (configRes.data ?? {}) as { nombre?: string; whatsapp?: string; logo?: string; ajustes?: unknown };
    const state: AppState = {
      config: {
        nombre: raw.nombre || DEFAULT_STATE.config.nombre,
        whatsapp: raw.whatsapp ?? "",
        logo: raw.logo ?? "",
        ajustes: normalizarAjustes(raw.ajustes),
      },
      categorias: (catRes.data ?? []).map(filaACategoria),
      productos: (prodRes.data ?? []).map(filaAProducto),
      fuente: "red",
    };
    guardarCopia(LS_KEY, state);
    return state;
  } catch (err) {
    console.warn("[Supabase] No se pudo cargar el menú, usando la última copia:", err);
    const copia = leerCopia<AppState>(LS_KEY);
    if (copia?.productos?.length) {
      return { ...copia, config: { ...copia.config, ajustes: normalizarAjustes(copia.config?.ajustes) }, fuente: "copia" };
    }
    return DEFAULT_STATE;
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// "Jugo de Tomate de Árbol" -> "jugo-de-tomate-de-arbol"
export function slug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
