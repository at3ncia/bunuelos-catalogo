import { useEffect } from "react";
import { DEFAULT_META, type BusinessConfig } from "./storage";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Aplica en el navegador el título, descripción y favicon configurados en el admin.
 * (Las vistas previas de WhatsApp/Facebook las inyecta netlify/edge-functions/meta.ts,
 * porque esos robots no ejecutan JavaScript.)
 */
export function useDocumentMeta(config: BusinessConfig, enabled = true) {
  const { metaTitle, metaDescription, favicon, ogImage } = config;
  useEffect(() => {
    if (!enabled) return;
    const title = metaTitle || DEFAULT_META.title;
    const description = metaDescription || DEFAULT_META.description;
    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    if (ogImage && !ogImage.startsWith("data:")) setMeta("property", "og:image", ogImage);

    const href = favicon || DEFAULT_META.favicon;
    document.head
      .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')
      .forEach((l) => {
        l.href = href;
        l.removeAttribute("type");
        l.removeAttribute("sizes");
      });
  }, [enabled, metaTitle, metaDescription, favicon, ogImage]);
}
