// Prueba automática de la versión web: abre una receta y reporta errores y una captura.
// Se ejecuta en GitHub Actions (workflow "Probar web").
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8080/Quehay/';
const SUPA = 'https://qkqwiyioigwznmiqgcma.supabase.co/rest/v1/recetas?select=id,titulo&order=id&limit=3';
const KEY = 'sb_publishable_L6cwZ1GzkYq_Zq25g8nBGw_y7of4igP';

const recetas = await (await fetch(SUPA, { headers: { apikey: KEY } })).json();
console.log('Recetas de prueba:', JSON.stringify(recetas));

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errores = [];
pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push(`[${m.type()}] ${m.text()}`); });
pagina.on('pageerror', (e) => errores.push(`[pageerror] ${e.message}\n${e.stack}`));

await pagina.goto(BASE, { waitUntil: 'networkidle' });
await pagina.waitForTimeout(3000);
await pagina.screenshot({ path: 'capturas/inicio.png' });

for (const r of recetas.slice(0, 2)) {
  await pagina.goto(`${BASE}?receta=${r.id}`, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(5000);
  await pagina.screenshot({ path: `capturas/receta-${r.id}.png` });
  const texto = (await pagina.textContent('body')) || '';
  console.log(`--- Receta ${r.id} (${r.titulo}): ${texto.includes(r.titulo) ? 'SE VE EL TÍTULO' : 'NO SE VE EL TÍTULO'}`);
  console.log('Texto visible:', texto.replace(/\s+/g, ' ').slice(0, 400));
}

console.log('=== ERRORES ===');
for (const e of errores) console.log(e.slice(0, 1500));
await navegador.close();
