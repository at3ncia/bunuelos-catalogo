// Inserta en el HTML los metadatos editados en el admin (título, descripción,
// imagen al compartir y favicon), para que WhatsApp/Facebook/X los vean:
// sus robots leen el HTML y no ejecutan el JavaScript de la app.
//
// También sirve las imágenes guardadas en Supabase como archivos normales:
//   /meta/og-image  → imagen al compartir
//   /meta/favicon   → icono de la pestaña
//
// Si Supabase no responde o no hay nada configurado, deja la página tal cual.

import type { Config, Context } from "https://edge.netlify.com";

type MetaRow = {
  nombre?: string | null;
  favicon?: string | null;
  og_image?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
};

async function loadMeta(): Promise<MetaRow | null> {
  const url = Netlify.env.get("VITE_SUPABASE_URL");
  const key = Netlify.env.get("VITE_SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  try {
    // Solo columnas públicas: nunca pedir admin_user/admin_pass aquí.
    const res = await fetch(
      `${url}/rest/v1/config?id=eq.1&select=nombre,favicon,og_image,meta_title,meta_description`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as MetaRow[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function serveImage(
  value: string | null | undefined,
  fallbackPath: string,
  origin: string,
): Response {
  if (!value) return Response.redirect(`${origin}${fallbackPath}`, 302);
  if (!value.startsWith("data:")) return Response.redirect(value, 302);
  const m = value.match(/^data:([^;,]+);base64,(.*)$/);
  if (!m) return Response.redirect(`${origin}${fallbackPath}`, 302);
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      "content-type": m[1],
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function setMetaTag(html: string, attr: "name" | "property", key: string, content: string): string {
  const tag = `<meta ${attr}="${key}" content="${esc(content)}" />`;
  const re = new RegExp(`<meta\\s+${attr}="${key}"[^>]*>`, "i");
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const origin = url.origin;

  if (url.pathname === "/meta/og-image") {
    const meta = await loadMeta();
    return serveImage(meta?.og_image, "/og-image.png", origin);
  }
  if (url.pathname === "/meta/favicon") {
    const meta = await loadMeta();
    return serveImage(meta?.favicon, "/favicon.png", origin);
  }

  const [response, meta] = await Promise.all([context.next(), loadMeta()]);
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;

  let html = await response.text();
  const version = Date.now().toString(36).slice(0, -3); // cambia cada ~minuto: evita caché vieja
  const title = meta?.meta_title?.trim();
  const description = meta?.meta_description?.trim();
  const image = meta?.og_image ? `${origin}/meta/og-image?v=${version}` : `${origin}/og-image.png`;

  if (title) {
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`);
    html = setMetaTag(html, "property", "og:title", title);
    html = setMetaTag(html, "name", "twitter:title", title);
  }
  if (description) {
    html = setMetaTag(html, "name", "description", description);
    html = setMetaTag(html, "property", "og:description", description);
    html = setMetaTag(html, "name", "twitter:description", description);
  }
  // Los robots necesitan URLs absolutas
  html = setMetaTag(html, "property", "og:image", image);
  html = setMetaTag(html, "name", "twitter:image", image);
  html = setMetaTag(html, "property", "og:url", `${origin}${url.pathname}`);
  if (meta?.favicon) {
    html = html
      .replace(/<link rel="icon"[^>]*>/gi, "")
      .replace(/<link rel="apple-touch-icon"[^>]*>/gi, "")
      .replace(
        "</head>",
        `    <link rel="icon" href="/meta/favicon?v=${version}" />\n    <link rel="apple-touch-icon" href="/meta/favicon?v=${version}" />\n  </head>`,
      );
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(html, { status: response.status, headers });
};

export const config: Config = {
  path: ["/", "/meta/og-image", "/meta/favicon"],
};
