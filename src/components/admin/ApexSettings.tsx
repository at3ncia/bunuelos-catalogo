import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const EJEMPLO = `{
  "evento": "deal.ganado",
  "fuente": "catalogo-bunuelos",
  "deal": { "id", "estado", "motivo_perdida", "creado", "cerrado",
            "productos": [{ "nombre", "precio", "cantidad" }],
            "subtotal", "domicilio", "total_con_domicilio",
            "medio_pago", "ciudad", "barrio", "zona_id", "direccion" },
  "cliente": { "id", "telefono", "nombre", "ciudad", "barrio", "direccion", "desde" },
  "metricas": { "solicitudes", "ganados", "perdidos", "valor_total",
                "ticket_promedio", "primer_pedido", "ultimo_pedido" },
  "notas": [{ "fecha", "texto", "pedido_id" }]
}`;

/** URL del webhook de Apex. Se guarda en Supabase (solo admin) y el envío lo hace la base de datos. */
export function ApexSettings() {
  const [url, setUrl] = useState("");
  const [activo, setActivo] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.from("integraciones").select("*").maybeSingle().then(({ data }) => {
      if (data) { setUrl(data.apex_webhook_url ?? ""); setActivo(!!data.activo); }
    });
  }, []);

  const guardar = async () => {
    const limpia = url.trim();
    if (limpia && !/^https:\/\//.test(limpia)) return setMsg("La URL debe empezar por https://");
    const { error } = await supabase.from("integraciones")
      .upsert({ singleton: true, apex_webhook_url: limpia || null, activo: activo && !!limpia });
    setMsg(error ? `Error: ${error.message}` : "✓ Guardado");
    setTimeout(() => setMsg(""), 2500);
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h2 className="font-display text-lg font-bold">Conexión con Apex</h2>
        <p className="text-sm text-muted-foreground">
          Al marcar una solicitud como <strong>ganada</strong> o <strong>perdida</strong>, se envía el deal completo
          (pedido, cliente, métricas y notas) a este webhook.
        </p>
      </div>
      <div>
        <Label htmlFor="apex">URL del webhook de Apex</Label>
        <Input id="apex" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={activo} onCheckedChange={setActivo} id="apex-on" />
        <Label htmlFor="apex-on">Enviar deals a Apex</Label>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => void guardar()}>Guardar</Button>
        {msg && <span className="text-sm font-semibold text-primary">{msg}</span>}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Formato que recibe Apex</summary>
        <pre className="mt-2 bg-muted rounded-lg p-3 overflow-x-auto">{EJEMPLO}</pre>
      </details>
    </div>
  );
}
