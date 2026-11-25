import { useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { processImage, type ImageFormat } from "@/lib/image";

type Props = {
  label: string;
  hint?: string;
  value: string;
  /** Imagen que se muestra cuando no hay una personalizada. */
  fallback?: string;
  format: ImageFormat;
  onChange: (dataUrl: string) => void;
  /** Clases del recuadro de vista previa (define su tamaño/proporción). */
  previewClassName?: string;
  /** Texto del botón para volver al valor por defecto. */
  resetLabel?: string;
};

export function ImagePicker({
  label,
  hint,
  value,
  fallback,
  format,
  onChange,
  previewClassName = "h-20 w-20",
  resetLabel = "Quitar",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shown = value || fallback;

  const handle = async (f: File) => {
    setError("");
    setBusy(true);
    try {
      onChange(await processImage(f, format));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la imagen");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex items-center gap-3">
        <div
          className={`shrink-0 rounded-lg bg-muted overflow-hidden flex items-center justify-center ${previewClassName}`}
        >
          {shown ? (
            <img
              src={shown}
              alt=""
              className={
                format.fit === "cover"
                  ? "w-full h-full object-cover"
                  : "max-h-full max-w-full object-contain"
              }
            />
          ) : (
            <ImageOff className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Procesando…" : value ? "Cambiar imagen" : "Subir imagen"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              {resetLabel}
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
          />
        </div>
      </div>
      {hint && !error && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
