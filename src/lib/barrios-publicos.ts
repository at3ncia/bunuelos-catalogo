// Lista pública de barrios para el autocompletado del checkout.
// Solo nombres: los precios y zonas de domicilio son internos.
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Ciudad = "Barranquilla" | "Soledad" | "Cartagena";
export const CIUDADES: Ciudad[] = ["Barranquilla", "Soledad", "Cartagena"];

let cache: { ciudad: string; barrio: string }[] | null = null;

export function useBarriosPublicos(ciudad: Ciudad): string[] {
  const [rows, setRows] = useState(cache ?? []);
  useEffect(() => {
    if (cache) return;
    supabase.rpc("barrios_publicos").then(({ data, error }) => {
      if (error) return console.warn("[Barrios]", error.message);
      cache = (data ?? []) as { ciudad: string; barrio: string }[];
      setRows(cache);
    });
  }, []);
  return rows.filter((r) => r.ciudad === ciudad).map((r) => r.barrio);
}
