// Logos de la marca servidos desde /public (funcionan en cualquier hosting).
// Claro: para fondos claros (catálogo). Oscuro: para fondos azules (/links).
export const LOGO_URL = "/logo-claro.png";
export const LOGO_OSCURO_URL = "/logo-oscuro.png";
export const MASCOTA_URL = "/favicon.png";

export const AZUL_MARCA = "#0E47D6";
export const NARANJA_MARCA = "#D9731B";

// Fondo de manchas orgánicas en azul claro sobre azul de marca (mosaico SVG)
const MANCHAS = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'><g fill='#2C64F0'>
<path d='M80,40 C140,0 230,30 240,100 C250,170 180,190 150,240 C120,290 40,280 20,210 C0,140 20,80 80,40Z'/>
<path d='M380,60 C440,20 540,50 560,120 C580,190 520,220 470,210 C420,200 400,250 350,230 C300,210 320,100 380,60Z'/>
<path d='M300,300 C360,270 430,300 440,360 C450,420 400,470 340,460 C280,450 230,400 250,350 C260,320 270,315 300,300Z'/>
<path d='M60,380 C110,350 170,380 180,440 C190,500 140,560 80,550 C20,540 -10,480 10,430 C20,405 40,392 60,380Z'/>
<path d='M480,380 C530,360 600,390 600,450 C600,520 540,580 480,560 C430,545 440,500 450,460 C455,430 460,392 480,380Z'/>
<path d='M200,520 C240,500 300,520 300,570 C300,610 250,620 220,600 C190,585 170,540 200,520Z'/>
</g></svg>`;
export const FONDO_MANCHAS = `url("data:image/svg+xml,${encodeURIComponent(MANCHAS)}")`;
