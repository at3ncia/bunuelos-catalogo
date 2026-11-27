// Capturas automáticas de la web (celular y PC) con datos de prueba, sin Supabase real.
// Uso: npx vite preview --port 4173 &  luego  node scripts/capturas.cjs [carpeta]
// En GitHub se ejecuta solo en cada pull request (ver .github/workflows/revision.yml).
const { chromium } = require("playwright");
const { mkdirSync } = require("node:fs");

const SALIDA = process.argv[2] || "capturas";
const BASE_URL = process.env.URL_BASE || "http://localhost:4173";
mkdirSync(SALIDA, { recursive: true });

// ── Datos de prueba ─────────────────────────────────────────────────────────
const hace = (dias) => new Date(Date.now() - dias * 864e5).toISOString();
const productos = [
  ["p1", "Buñuelo de queso", 3500, "b"],
  ["p2", "Buñuelo de bocadillo", 4000, "b"],
  ["p3", "Combo familiar", 22000, "c"],
  ["p4", "Combo pareja", 12000, "c"],
  ["p5", "Avena helada", 5000, "d"],
].map(([id, nombre, precio, c], i) => ({ id, nombre, precio, categoria_id: c, descripcion: "Recién hecho", foto: "", disponible: true, dias: null, orden: i }));
const ajustes = {
  titulo: "Crujientes, doraditos y recién hechos",
  subtitulo: "Elige tus favoritos y envía tu pedido directo por WhatsApp.",
  bio: "🧡 + de 10 años en el mercado",
  instagram: "kiosko_los_bunuelos",
  enlaces: [
    { id: "e1", texto: "Cómo llegar", url: "maps.app.goo.gl/abc", icono: "ubicacion", estilo: "blanco", activo: true },
    { id: "e2", texto: "Síguenos en TikTok", url: "tiktok.com/@losbunuelos", icono: "tiktok", estilo: "naranja", activo: true },
  ],
};
const puntos = [
  { id: "ctg-terminal-castellana", sede_id: 1, nombre: "Terminal · Castellana", detalle: "Terminal de transporte", whatsapp: "573013416503", orden: 0, activo: true, mensaje: "Hola!", etiqueta_enlace: "Terminal - Castellana", en_enlaces: true },
  { id: "ctg-bocagrande", sede_id: 1, nombre: "Bocagrande", detalle: "Cra 2 Calle 4", whatsapp: "573226768027", orden: 1, activo: true, mensaje: "Hola!", etiqueta_enlace: "Bocagrande", en_enlaces: true },
];
const pedido = (id, codigo, estado, dias, total, nombre) => ({
  id, codigo, estado, total, subtotal: total - 6000, domicilio: 6000, sede_id: 1, punto_id: "ctg-terminal-castellana", barrio: "Crespo",
  cliente: { "Nombre completo": nombre, "Número de contacto": "3001234567", "Medio de pago": "Nequi" },
  items: [{ id: "p1", nombre: "Buñuelo de queso", precio: 3500, cantidad: 4 }], confirmado_por: null, pago_proveedor: null, creado_en: hace(dias),
});
const tablas = {
  categorias: [
    { id: "b", nombre: "Nuestros Buñuelos", color: "#D9731B", orden: 0 },
    { id: "c", nombre: "Combos", color: "#0E47D6", orden: 1 },
    { id: "d", nombre: "Bebidas", color: "#1F9D4C", orden: 2 },
  ],
  productos,
  sedes_publicas: [
    { id: 1, nombre: "Cartagena", ciudad: "Cartagena", direccion: "", whatsapp: "573013416503", activa: true },
    { id: 2, nombre: "Barranquilla", ciudad: "Barranquilla", direccion: "", whatsapp: "573000000000", activa: true },
  ],
  puntos_pedido: puntos,
  barrios_publicos: [{ id: "b1", sede_id: 1, nombre: "Crespo", precio: null, activo: true }],
  promos: [],
  config_publica: [{ id: 1, ajustes }],
  sede_disponibilidad: [{ sede_id: 1 }],
};
const rpc = {
  admin_verificar: { ok: true },
  admin_listar_pedidos: { ok: true, pedidos: [pedido(1, "CAR-04821", "pendiente", 0.05, 42000, "María López"), pedido(2, "CAR-11930", "confirmado", 0.2, 28000, "Carlos Pérez")] },
  admin_listar_promos: { ok: true, promos: [] },
  admin_listar_barrios: { ok: true, barrios: tablas.barrios_publicos },
};

async function contexto(navegador, ancho, alto, movil) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil });
  await ctx.route(/supabase\.co\//, (r) => {
    const u = new URL(r.request().url());
    const nombre = u.pathname.split("/").pop();
    let cuerpo = u.pathname.includes("/rpc/") ? (rpc[nombre] ?? { ok: true }) : (tablas[nombre] ?? []);
    if (!u.pathname.includes("/rpc/") && r.request().headers()["accept"]?.includes("vnd.pgrst.object")) cuerpo = cuerpo[0] ?? null;
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cuerpo) });
  });
  return ctx;
}
const espera = (p, ms = 700) => p.waitForTimeout(ms);
const foto = (p, nombre) => p.screenshot({ path: `${SALIDA}/${nombre}.png` });

async function main() {
const navegador = await chromium.launch();
const tamanos = [
  ["390", 390, 844, true],
  ["360", 360, 640, true],
  ["pc", 1366, 768, false],
];
for (const [tag, ancho, alto, movil] of tamanos) {
  const ctx = await contexto(navegador, ancho, alto, movil);
  const p = await ctx.newPage();
  const paso = async (nombre, fn) => {
    try {
      await fn();
      await foto(p, `${tag}-${nombre}`);
    } catch (e) {
      console.warn(`No se pudo capturar ${tag}-${nombre}: ${e.message.split("\n")[0]}`);
    }
  };
  await paso("1-catalogo", async () => {
    await p.goto(BASE_URL + "/");
    await espera(p, 2000);
    await p.getByRole("button", { name: "Cartagena" }).click({ timeout: 3000 }).catch(() => {});
    await espera(p);
    await p.getByRole("button", { name: /Terminal · Castellana/ }).first().click({ timeout: 3000 }).catch(() => {});
    await espera(p);
  });
  await paso("2-formulario", async () => {
    await p.getByRole("button", { name: /Agregar Buñuelo de queso/ }).first().click({ timeout: 5000 });
    await espera(p, 400);
    await p.getByRole("button", { name: /Ver pedido/ }).click({ timeout: 5000 });
    await espera(p, 600);
    await p.getByRole("button", { name: /Enviar pedido por WhatsApp/ }).click({ timeout: 5000 });
    await espera(p, 800);
  });
  await paso("3-links", async () => {
    await p.goto(BASE_URL + "/links");
    await espera(p, 1500);
  });
  await p.goto(BASE_URL + "/admin");
  await espera(p, 1000);
  await p.locator("input[type=password]").fill("prueba").catch(() => {});
  await p.keyboard.press("Enter");
  await espera(p, 1500);
  for (const [n, pestana] of [["4-pedidos", "Pedidos"], ["5-promos", "Promos"], ["6-categorias", "Categorías"], ["7-links-panel", "Links"], ["8-ajustes", "Ajustes"]]) {
    await paso(n, async () => {
      await p.getByRole("button", { name: pestana, exact: true }).first().click({ timeout: 5000 });
      await espera(p, 900);
      await p.evaluate(() => window.scrollTo(0, 380));
      await espera(p, 300);
    });
  }
  if (movil) {
    await paso("9-ajustes-vista-previa", async () => {
      await p.getByRole("button", { name: "Vista previa" }).click({ timeout: 5000 });
      await espera(p, 600);
    });
  }
  await ctx.close();
}
await navegador.close();
console.log(`Capturas listas en ${SALIDA}/`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
