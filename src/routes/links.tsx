import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-store";
import { leerCopia } from "@/lib/storage";
import { listarPuntos, listarSedes, PUNTOS_RESPALDO, SEDES_RESPALDO, type PuntoPedido } from "@/lib/sedes";
import { LinksVista } from "@/components/links-vista";
import { AZUL_MARCA } from "@/lib/brand";

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { title: "Los Buñuelos Los Originales — Pedidos" },
      { name: "description", content: "Haz tu pedido por WhatsApp en la sede que te quede más cerca." },
    ],
  }),
  component: LinksPage,
});

// Los botones salen de los puntos de pedido (se editan en /admin → Puntos de pedido).
// Se pinta al instante con la última copia y se actualiza al llegar los datos.
function usePuntosEnlaces() {
  const [puntos, setPuntos] = useState<PuntoPedido[]>(
    () => leerCopia<PuntoPedido[]>("bunuelos_puntos_v1") ?? PUNTOS_RESPALDO,
  );
  useEffect(() => {
    listarPuntos().then(setPuntos);
  }, []);
  return puntos;
}

function LinksPage() {
  const { state } = useAppState();
  const puntos = usePuntosEnlaces();
  const [sedes, setSedes] = useState(SEDES_RESPALDO);
  useEffect(() => {
    listarSedes()
      .then((l) => l.length && setSedes(l))
      .catch(() => {});
  }, []);
  const ciudades = Object.fromEntries(sedes.map((s) => [s.id, s.ciudad]));
  return (
    <div className="min-h-screen" style={{ backgroundColor: AZUL_MARCA }}>
      <LinksVista ajustes={state.config.ajustes} puntos={puntos} ciudades={ciudades} />
    </div>
  );
}
