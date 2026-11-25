// Capa de datos respaldada por Supabase con fallback a localStorage.
// Si Supabase no está configurado, funciona localmente.

import { supabase } from "./supabase";

export type Category = { id: string; nombre: string };

export type Product = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoriaId: string;
  foto: string; // base64 data url o url
  disponible: boolean;
};

export type BusinessConfig = {
  nombre: string;
  whatsapp: string; // formato internacional sin + (ej: 573001112233)
  logo: string;
  /** Icono de la pestaña del navegador (data URL o URL). Vacío = el predeterminado. */
  favicon: string;
  /** Imagen que aparece al compartir el link (WhatsApp, Facebook…). */
  ogImage: string;
  /** Título de la página y de la vista previa al compartir. */
  metaTitle: string;
  /** Descripción de la página y de la vista previa al compartir. */
  metaDescription: string;
};

export const DEFAULT_META = {
  title: "Los Buñuelos Los Originales — Pide en línea",
  description: "🧡Kiosco los buñuelos los originales + de 10 años en el mercado",
  favicon: "/favicon.png",
  ogImage: "/og-image.png",
};

export type AppState = {
  config: BusinessConfig;
  categorias: Category[];
  productos: Product[];
  adminAuth: { user: string; pass: string };
  adminSession: boolean;
};

// ─── Valores por defecto ──────────────────────────────────────────────────────

const DEFAULT_CATEGORIES: Category[] = [
  { id: "comidas", nombre: "Comidas" },
  { id: "bebidas", nombre: "Bebidas" },
  { id: "combos", nombre: "Combos" },
  { id: "extras", nombre: "Extras" },
];

export const DEFAULT_STATE: AppState = {
  config: {
    nombre: "Los Buñuelos Los Originales",
    whatsapp: "573001234567",
    logo: "",
    favicon: "",
    ogImage: "",
    metaTitle: "",
    metaDescription: "",
  },
  categorias: DEFAULT_CATEGORIES,
  productos: [
    {
      id: "p1",
      nombre: "Buñuelo Clásico",
      descripcion: "Crujiente por fuera, esponjoso por dentro. El original.",
      precio: 2500,
      categoriaId: "comidas",
      foto: "",
      disponible: true,
    },
    {
      id: "p2",
      nombre: "Combo Buñuelo + Chocolate",
      descripcion: "Tres buñuelos recién hechos con chocolate caliente.",
      precio: 9000,
      categoriaId: "combos",
      foto: "",
      disponible: true,
    },
    {
      id: "p3",
      nombre: "Aguapanela con Limón",
      descripcion: "Bebida tradicional fría o caliente.",
      precio: 4000,
      categoriaId: "bebidas",
      foto: "",
      disponible: true,
    },
  ],
  adminAuth: { user: "admin", pass: "bunuelos2025" },
  adminSession: false,
};

// ─── Helpers localStorage (fallback) ─────────────────────────────────────────

const LS_KEY = "bunuelos_app_v1";

function lsLoad(): AppState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    // Cachés antiguas no tienen los campos nuevos de config
    return { ...parsed, config: { ...DEFAULT_STATE.config, ...parsed.config } };
  } catch {
    return null;
  }
}

function lsSave(state: AppState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ─── Supabase: Cargar ─────────────────────────────────────────────────────────

export async function loadStateFromSupabase(): Promise<AppState> {
  try {
    const [configRes, catRes, prodRes] = await Promise.all([
      supabase.from("config").select("*").eq("id", 1).single(),
      supabase.from("categorias").select("*").order("orden"),
      supabase.from("productos").select("*"),
    ]);

    if (configRes.error || catRes.error || prodRes.error) {
      console.warn("[Supabase] Error cargando datos, usando localStorage:", configRes.error || catRes.error || prodRes.error);
      return lsLoad() ?? DEFAULT_STATE;
    }

    const raw = configRes.data as {
      nombre: string; whatsapp: string; logo: string;
      favicon?: string | null; og_image?: string | null;
      meta_title?: string | null; meta_description?: string | null;
      admin_user: string; admin_pass: string;
    };

    const categorias: Category[] = (catRes.data ?? []).map((c: { id: string; nombre: string }) => ({
      id: c.id,
      nombre: c.nombre,
    }));

    const productos: Product[] = (prodRes.data ?? []).map((p: {
      id: string; nombre: string; descripcion: string; precio: number;
      categoria_id: string; foto: string; disponible: boolean;
    }) => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      precio: p.precio,
      categoriaId: p.categoria_id,
      foto: p.foto ?? "",
      disponible: p.disponible,
    }));

    const state: AppState = {
      config: {
        nombre: raw.nombre,
        whatsapp: raw.whatsapp,
        logo: raw.logo ?? "",
        favicon: raw.favicon ?? "",
        ogImage: raw.og_image ?? "",
        metaTitle: raw.meta_title ?? "",
        metaDescription: raw.meta_description ?? "",
      },
      categorias,
      productos,
      adminAuth: { user: raw.admin_user, pass: raw.admin_pass },
      adminSession: false,
    };

    lsSave(state); // cache local
    return state;
  } catch (err) {
    console.warn("[Supabase] Excepción al cargar, usando localStorage:", err);
    return lsLoad() ?? DEFAULT_STATE;
  }
}

// ─── Supabase: Guardar ────────────────────────────────────────────────────────

export async function saveStateToSupabase(state: AppState): Promise<void> {
  lsSave(state); // siempre cache local primero

  try {
    // Guardar config
    const baseConfig = {
      id: 1,
      nombre: state.config.nombre,
      whatsapp: state.config.whatsapp,
      logo: state.config.logo,
      admin_user: state.adminAuth.user,
      admin_pass: state.adminAuth.pass,
    };
    const { error: cfgError } = await supabase.from("config").upsert({
      ...baseConfig,
      favicon: state.config.favicon,
      og_image: state.config.ogImage,
      meta_title: state.config.metaTitle,
      meta_description: state.config.metaDescription,
    });
    if (cfgError) {
      // Si la base aún no tiene las columnas nuevas, guardar al menos lo básico.
      console.warn(
        "[Supabase] No se pudieron guardar favicon/metadatos. " +
          "¿Ejecutaste supabase/migrations/20261125_config_metadata.sql?",
        cfgError,
      );
      await supabase.from("config").upsert(baseConfig);
    }

    // Sincronizar categorías: eliminar las que ya no están, insertar/actualizar nuevas
    const catIds = state.categorias.map((c) => c.id);

    // Eliminar categorías removidas
    await supabase.from("categorias").delete().not("id", "in", `(${catIds.map((id) => `'${id}'`).join(",") || "'__none__'"})`);

    // Upsert categorías actuales
    if (state.categorias.length > 0) {
      await supabase.from("categorias").upsert(
        state.categorias.map((c, i) => ({ id: c.id, nombre: c.nombre, orden: i }))
      );
    }

    // Sincronizar productos
    const prodIds = state.productos.map((p) => p.id);

    // Eliminar productos removidos
    await supabase.from("productos").delete().not("id", "in", `(${prodIds.map((id) => `'${id}'`).join(",") || "'__none__'"})`);

    // Upsert productos actuales
    if (state.productos.length > 0) {
      await supabase.from("productos").upsert(
        state.productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          precio: p.precio,
          categoria_id: p.categoriaId,
          foto: p.foto,
          disponible: p.disponible,
        }))
      );
    }
  } catch (err) {
    console.error("[Supabase] Error al guardar:", err);
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
