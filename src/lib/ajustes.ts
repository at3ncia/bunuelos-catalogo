// Ajustes del negocio editables desde /admin (tabla config.ajustes).
// Los valores por defecto solo se usan si la base de datos aún no los tiene.

export type Franja = [string, string]; // ["06:00", "13:00"]
export type ReglaHorario = { dias: number[]; franjas: Franja[] }; // dias: 0 = domingo … 6 = sábado

// Botón extra de /links (Google Maps, TikTok, Rappi, una promo…)
export type IconoEnlace = "web" | "ubicacion" | "instagram" | "tiktok" | "facebook" | "whatsapp" | "telefono" | "moto";
export type EstiloEnlace = "naranja" | "dorado" | "blanco";
export type Enlace = { id: string; texto: string; url: string; icono: IconoEnlace; estilo: EstiloEnlace; activo: boolean };

export const ICONOS_ENLACE: { id: IconoEnlace; nombre: string }[] = [
  { id: "web", nombre: "Página web" },
  { id: "ubicacion", nombre: "Ubicación / Maps" },
  { id: "instagram", nombre: "Instagram" },
  { id: "tiktok", nombre: "TikTok" },
  { id: "facebook", nombre: "Facebook" },
  { id: "whatsapp", nombre: "WhatsApp" },
  { id: "telefono", nombre: "Llamada" },
  { id: "moto", nombre: "Domicilios / app" },
];

// Datos que pide el formulario del pedido (checkout), en orden
export type TipoCampo = "texto" | "texto_largo" | "telefono" | "opciones" | "pedido";
export type CampoPedido = {
  id: string;
  etiqueta: string;
  tipo: TipoCampo;
  obligatorio: boolean;
  activo: boolean;
  opciones?: string[]; // solo tipo "opciones"
};

export const TIPOS_CAMPO: { id: Exclude<TipoCampo, "pedido">; nombre: string }[] = [
  { id: "texto", nombre: "Texto corto" },
  { id: "texto_largo", nombre: "Texto largo" },
  { id: "telefono", nombre: "Teléfono" },
  { id: "opciones", nombre: "Elegir una opción" },
];

function camposPorDefecto(mediosPago: string[]): CampoPedido[] {
  return [
    { id: "nombre", etiqueta: "Nombre completo", tipo: "texto", obligatorio: true, activo: true },
    { id: "pedido", etiqueta: "Pedido detallado", tipo: "pedido", obligatorio: true, activo: true },
    { id: "direccion", etiqueta: "Dirección + punto de referencia", tipo: "texto_largo", obligatorio: true, activo: true },
    { id: "telefono", etiqueta: "Número de contacto", tipo: "telefono", obligatorio: true, activo: true },
    { id: "pago", etiqueta: "Medio de pago", tipo: "opciones", obligatorio: true, activo: true, opciones: mediosPago },
  ];
}

export type Ajustes = {
  saludo_pedido: string; // primera línea del mensaje de WhatsApp
  campos_pedido: CampoPedido[];
  bio: string; // texto bajo el logo en /links
  mostrar_boton_menu: boolean;
  enlaces: Enlace[];
  titulo: string;
  subtitulo: string;
  instagram: string;
  boton_menu: string;
  medios_pago: string[];
  hora_reinicio: number;
  horario_domicilios: ReglaHorario[];
};

export const AJUSTES_POR_DEFECTO: Ajustes = {
  saludo_pedido: "Hola! quisiera hacer un pedido:",
  campos_pedido: camposPorDefecto(["Efectivo", "Nequi", "Bancolombia", "Otro"]),
  bio: "",
  mostrar_boton_menu: true,
  enlaces: [],
  titulo: "Crujientes, doraditos y recién hechos",
  subtitulo: "Elige tus favoritos y envía tu pedido directo por WhatsApp.",
  instagram: "kiosko_los_bunuelos",
  boton_menu: "Menú domicilios",
  medios_pago: ["Efectivo", "Nequi", "Bancolombia", "Otro"],
  hora_reinicio: 4,
  horario_domicilios: [
    { dias: [1, 2, 3, 4, 5, 6], franjas: [["06:00", "13:00"], ["14:00", "19:00"]] },
    { dias: [0], franjas: [["06:00", "13:00"]] },
  ],
};

// Mezcla lo guardado con los valores por defecto (tolera campos faltantes o mal formados)
export function normalizarAjustes(raw: unknown): Ajustes {
  const a = (raw && typeof raw === "object" ? raw : {}) as Partial<Ajustes>;
  const d = AJUSTES_POR_DEFECTO;
  const iconos = ICONOS_ENLACE.map((i) => i.id);
  const enlaces: Enlace[] = Array.isArray(a.enlaces)
    ? a.enlaces
        .filter((e) => e && typeof e === "object" && typeof e.url === "string")
        .map((e) => ({
          id: String(e.id || Math.random().toString(36).slice(2, 8)),
          texto: String(e.texto ?? ""),
          url: e.url,
          icono: iconos.includes(e.icono) ? e.icono : "web",
          estilo: (["naranja", "dorado", "blanco"] as const).includes(e.estilo) ? e.estilo : "naranja",
          activo: e.activo !== false,
        }))
    : d.enlaces;
  const mediosPago = Array.isArray(a.medios_pago) && a.medios_pago.length ? a.medios_pago.map(String) : d.medios_pago;
  const tipos: TipoCampo[] = ["texto", "texto_largo", "telefono", "opciones", "pedido"];
  let campos: CampoPedido[] = Array.isArray(a.campos_pedido)
    ? a.campos_pedido
        .filter((c) => c && typeof c === "object" && tipos.includes(c.tipo))
        .map((c) => ({
          id: String(c.id || Math.random().toString(36).slice(2, 8)),
          etiqueta: String(c.etiqueta ?? ""),
          tipo: c.tipo,
          obligatorio: c.tipo === "pedido" ? true : c.obligatorio !== false,
          activo: c.tipo === "pedido" ? true : c.activo !== false,
          ...(c.tipo === "opciones" ? { opciones: (c.opciones ?? []).map(String).filter(Boolean) } : {}),
        }))
    : camposPorDefecto(mediosPago); // ajustes de antes: se arma con sus medios de pago
  // El detalle del pedido siempre está en el mensaje
  if (!campos.some((c) => c.tipo === "pedido")) {
    campos = [campos[0], camposPorDefecto([])[1], ...campos.slice(1)].filter(Boolean);
  }
  return {
    saludo_pedido: typeof a.saludo_pedido === "string" && a.saludo_pedido.trim() ? a.saludo_pedido : d.saludo_pedido,
    campos_pedido: campos,
    bio: typeof a.bio === "string" ? a.bio : d.bio,
    mostrar_boton_menu: a.mostrar_boton_menu !== false,
    enlaces,
    titulo: typeof a.titulo === "string" && a.titulo.trim() ? a.titulo : d.titulo,
    subtitulo: typeof a.subtitulo === "string" ? a.subtitulo : d.subtitulo,
    instagram: typeof a.instagram === "string" ? a.instagram.replace(/^@/, "") : d.instagram,
    boton_menu: typeof a.boton_menu === "string" && a.boton_menu.trim() ? a.boton_menu : d.boton_menu,
    medios_pago: mediosPago,
    hora_reinicio: Number.isInteger(a.hora_reinicio) ? (a.hora_reinicio as number) : d.hora_reinicio,
    horario_domicilios: Array.isArray(a.horario_domicilios) ? a.horario_domicilios : d.horario_domicilios,
  };
}

// ── Hora de Colombia (UTC-5 todo el año, sin horario de verano) ──────────────

export function ahoraColombia(base = new Date()) {
  const d = new Date(base.getTime() - 5 * 3600 * 1000);
  return {
    anio: d.getUTCFullYear(),
    mes: d.getUTCMonth(), // 0-11
    dia: d.getUTCDate(),
    diaSemana: d.getUTCDay(), // 0 = domingo
    minutos: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

// ── Festivos de Colombia (Ley 51 de 1983, "Ley Emiliani") ───────────────────

function pascua(anio: number) {
  // Algoritmo de Meeus/Jones/Butcher (calendario gregoriano)
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(anio, mes, dia);
}

const DIA_MS = 86400000;
const clave = (t: number) => new Date(t).toISOString().slice(0, 10);
const alLunes = (t: number) => {
  const dow = new Date(t).getUTCDay();
  return dow === 1 ? t : t + (((8 - dow) % 7) || 7) * DIA_MS;
};

const cacheFestivos = new Map<number, Set<string>>();

export function festivosColombia(anio: number): Set<string> {
  const guardado = cacheFestivos.get(anio);
  if (guardado) return guardado;
  const f = (m: number, d: number) => Date.UTC(anio, m, d);
  const p = pascua(anio);
  const fechas = [
    // Fijos
    f(0, 1), f(4, 1), f(6, 20), f(7, 7), f(11, 8), f(11, 25),
    // Se trasladan al lunes siguiente
    alLunes(f(0, 6)), alLunes(f(2, 19)), alLunes(f(5, 29)), alLunes(f(7, 15)),
    alLunes(f(9, 12)), alLunes(f(10, 1)), alLunes(f(10, 11)),
    // Según la Pascua
    p - 3 * DIA_MS, p - 2 * DIA_MS, // Jueves y Viernes Santo
    alLunes(p + 39 * DIA_MS), // Ascensión
    alLunes(p + 60 * DIA_MS), // Corpus Christi
    alLunes(p + 68 * DIA_MS), // Sagrado Corazón
  ];
  const set = new Set(fechas.map(clave));
  cacheFestivos.set(anio, set);
  return set;
}

export function esFestivo(anio: number, mes: number, dia: number) {
  return festivosColombia(anio).has(clave(Date.UTC(anio, mes, dia)));
}

// ── Horario de domicilios ───────────────────────────────────────────────────

const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

export function formatoHora(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${sufijo}`;
}

// Franjas que aplican a un día (los festivos usan la regla del domingo)
function franjasDelDia(reglas: ReglaHorario[], diaSemana: number, festivo: boolean): Franja[] {
  const dia = festivo ? 0 : diaSemana;
  return reglas.find((r) => r.dias.includes(dia))?.franjas ?? [];
}

export type EstadoHorario =
  | { abierto: true; cierra: string }
  | { abierto: false; abre: { cuando: string; hora: string } | null };

export function estadoDomicilios(reglas: ReglaHorario[], base = new Date()): EstadoHorario {
  const hoy = ahoraColombia(base);
  const festivoHoy = esFestivo(hoy.anio, hoy.mes, hoy.dia);
  for (const [desde, hasta] of franjasDelDia(reglas, hoy.diaSemana, festivoHoy)) {
    if (hoy.minutos >= aMin(desde) && hoy.minutos < aMin(hasta)) return { abierto: true, cierra: formatoHora(hasta) };
  }
  // Próxima apertura: más tarde hoy o en los próximos 7 días
  for (let i = 0; i < 8; i++) {
    const d = ahoraColombia(new Date(base.getTime() + i * DIA_MS));
    const franjas = franjasDelDia(reglas, d.diaSemana, esFestivo(d.anio, d.mes, d.dia));
    const siguiente = franjas.map((f) => f[0]).sort().find((desde) => i > 0 || aMin(desde) > hoy.minutos);
    if (siguiente) {
      const cuando = i === 0 ? "hoy" : i === 1 ? "mañana" : NOMBRES_DIA[d.diaSemana].toLowerCase();
      return { abierto: false, abre: { cuando, hora: formatoHora(siguiente) } };
    }
  }
  return { abierto: false, abre: null };
}

export const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// "Lunes a sábado", "Domingos y festivos", "Lunes, miércoles y viernes"
export function etiquetaDias(dias: number[]) {
  const orden = [...dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // lunes primero
  const festivos = dias.includes(0) ? " y festivos" : "";
  if (orden.length === 1) {
    if (orden[0] === 0) return "Domingos y festivos";
    const n = NOMBRES_DIA[orden[0]];
    return n.endsWith("s") ? n : `${n}s`; // "Martes", "Sábados"
  }
  const pos = orden.map((d) => (d + 6) % 7);
  const seguidos = pos.every((p, i) => i === 0 || p === pos[i - 1] + 1);
  if (seguidos && orden.length > 2) {
    return `${NOMBRES_DIA[orden[0]]} a ${NOMBRES_DIA[orden[orden.length - 1]].toLowerCase()}${festivos}`;
  }
  const nombres = orden.map((d, i) => (i === 0 ? NOMBRES_DIA[d] : NOMBRES_DIA[d].toLowerCase()));
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}${festivos}`;
}

export function etiquetaFranjas(franjas: Franja[]) {
  return franjas.map(([a, b]) => `${formatoHora(a)} – ${formatoHora(b)}`).join(" y ");
}

// ¿Se muestra hoy este producto? (dias null o vacío = todos los días)
export function visibleHoy(dias: number[] | null | undefined, base = new Date()) {
  if (!dias || dias.length === 0) return true;
  return dias.includes(ahoraColombia(base).diaSemana);
}

// "maps.app.goo.gl/x" -> "https://maps.app.goo.gl/x"; "3001234567" con ícono llamada -> "tel:+573001234567"
export function urlEnlace(e: Pick<Enlace, "url" | "icono">) {
  const u = e.url.trim();
  if (!u) return "";
  if (e.icono === "telefono" && /^[\d\s+()-]+$/.test(u)) {
    const n = u.replace(/\D/g, "");
    return `tel:+${n.length === 10 ? `57${n}` : n}`;
  }
  if (e.icono === "whatsapp" && /^[\d\s+()-]+$/.test(u)) {
    const n = u.replace(/\D/g, "");
    return `https://wa.me/${n.length === 10 ? `57${n}` : n}`;
  }
  return /^(https?:|tel:|mailto:)/i.test(u) ? u : `https://${u}`;
}

// Mensaje de WhatsApp con el mismo formato de siempre:
// saludo, "- Etiqueta: valor" por cada dato (el detalle del pedido en su lugar) y el total.
export function mensajePedido(
  saludo: string,
  campos: CampoPedido[],
  valores: Record<string, string>,
  detalle: string,
  total: string,
) {
  const partes = [saludo];
  for (const c of campos.filter((c) => c.activo)) {
    if (c.tipo === "pedido") partes.push(`- ${c.etiqueta}:\n${detalle}`);
    else if ((valores[c.id] ?? "").trim()) partes.push(`- ${c.etiqueta}: ${valores[c.id].trim()}`);
  }
  partes.push(`Total: ${total}`);
  return partes.join("\n\n");
}
