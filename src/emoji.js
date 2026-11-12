// Ícono (emoji) de cada ingrediente. Se busca por palabras del nombre, en orden:
// lo más específico va primero. Si nada calza, se usa el de su categoría.
const REGLAS = [
  // preparados y compuestos (antes que sus ingredientes base)
  ['salsa de soya', '🥢'], ['salsa de tomate|pasta de tomate|tomate en lata|ketchup', '🥫'], ['salsa de aji|salsa inglesa', '🌶️'],
  ['leche de coco|coco', '🥥'], ['leche condensada|leche evaporada|leche en polvo|leche vegetal', '🥛'], ['manjar|chancaca|miel', '🍯'],
  ['jugo de naranja', '🧃'], ['aceite de oliva|aceitunas', '🫒'], ['aceite', '🧴'], ['vinagre', '🍶'],
  ['vino', '🍷'], ['cerveza', '🍺'], ['cafe', '☕'], ['caldo', '🍲'], ['mayonesa|mostaza', '🥫'],
  ['papas fritas', '🍟'], ['hamburguesa', '🍔'], ['pan de completo|vienesa', '🌭'], ['pizza', '🍕'], ['empanada', '🥟'],
  ['nuggets|pescado apanado', '🍤'], ['helado', '🍨'], ['frutas congeladas', '🍧'], ['galletas', '🍪'], ['mermelada', '🍓'],
  ['gelatina', '🍮'], ['chocolate|cacao', '🍫'], ['vainilla', '🌼'],
  // carnes y huevos
  ['huevo', '🥚'], ['pollo|pavo|trutro|pechuga|alitas', '🍗'], ['tocino', '🥓'], ['jamon|salame', '🥩'],
  ['longaniza|chorizo|prieta', '🌭'], ['cerdo|chuleta|costillar', '🥩'], ['cordero', '🍖'],
  ['vacuno|carne|lomo|plateada|asiento|osobuco', '🥩'],
  // pescados y mariscos
  ['camaron', '🦐'], ['jaiba', '🦀'], ['pulpo', '🐙'], ['calamar', '🦑'], ['ostion|almeja|macha|chorito|loco', '🦪'],
  ['atun en lata|jurel en lata|sardinas', '🥫'], ['cochayuyo|luche', '🌿'], ['surimi', '🍥'],
  ['pescado|salmon|reineta|corvina|atun|tilapia|pejerrey|merluza', '🐟'],
  // lácteos
  ['queso|quesillo|mozzarella|ricotta', '🧀'], ['mantequilla|margarina', '🧈'], ['yogur', '🥣'], ['crema', '🥛'], ['leche', '🥛'],
  // verduras
  ['tomate', '🍅'], ['cebollin|ciboulette|puerro', '🌱'], ['cebolla', '🧅'], ['ajo', '🧄'],
  ['papa', '🥔'], ['camote', '🍠'], ['zanahoria', '🥕'], ['choclo|chuchoca', '🌽'], ['zapallo italiano|pepino|pepinillo', '🥒'],
  ['zapallo', '🎃'], ['pimenton', '🫑'], ['aji|merken|paprika', '🌶️'], ['brocoli|coliflor', '🥦'],
  ['lechuga|espinaca|acelga|repollo|rucula|kale', '🥬'], ['champinon|hongo', '🍄'], ['palta', '🥑'], ['berenjena', '🍆'],
  ['porotos verdes|arvejas|habas', '🫛'], ['betarraga|rabanito|nabo', '🥗'], ['jengibre', '🫚'],
  ['cilantro|perejil|albahaca|menta|romero|tomillo|eneldo|oregano|laurel|hierbas|apio|alcachofa|esparrago|brotes|palmito', '🌿'],
  // frutas
  ['limon|lima', '🍋'], ['naranja|mandarina|pomelo', '🍊'], ['manzana|membrillo', '🍎'], ['platano', '🍌'], ['frutilla', '🍓'],
  ['durazno|damasco|huesillo', '🍑'], ['pera', '🍐'], ['uva|pasas', '🍇'], ['sandia', '🍉'], ['melon', '🍈'], ['pina', '🍍'],
  ['mango', '🥭'], ['kiwi', '🥝'], ['cereza|ciruela', '🍒'], ['arandano|mora', '🫐'], ['higo', '🟣'],
  ['mani', '🥜'], ['nuez|nueces|almendra|frutos secos', '🌰'],
  // despensa
  ['arroz|quinoa|cuscus|mote|trigo|semola', '🍚'], ['spaghetti|tallarin|fideo|cabello', '🍝'],
  ['corbata|penne|espiral|lasana|noqui|raviol', '🍝'], ['lenteja|poroto|garbanzo|arvejas partidas', '🫘'],
  ['harina|maicena|levadura|polvos|bicarbonato|avena|pan rallado', '🌾'], ['azucar', '🍬'], ['sal', '🧂'],
  ['tofu', '🧊'], ['semilla|linaza|sesamo|chia', '🌱'], ['agua', '💧'],
  // condimentos
  ['pimienta|comino|canela|clavo|nuez moscada|curry|curcuma|alino|color', '🧂'],
  // panadería
  ['tortilla|pan pita', '🫓'], ['masa', '🥟'], ['tostada|pan', '🍞'],
];
const POR_CATEGORIA = {
  'Lácteos': '🥛', 'Carnes y huevos': '🥩', 'Pescados y mariscos': '🐟', 'Verduras': '🥬', 'Frutas': '🍎',
  'Despensa': '🥫', 'Condimentos': '🧂', 'Panadería': '🍞', 'Congelados': '🧊', 'Bebidas': '🥤',
};
const COMPILADAS = REGLAS.map(([patron, e]) => [new RegExp(`(^|[^a-z])(${patron})`), e]);
const limpio = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const cache = {};

export function emojiDe(nombre, categoria) {
  const clave = `${nombre}|${categoria || ''}`;
  if (cache[clave]) return cache[clave];
  const n = limpio(nombre);
  const regla = COMPILADAS.find(([re]) => re.test(n));
  const e = regla ? regla[1] : POR_CATEGORIA[categoria] || '🍽️';
  cache[clave] = e;
  return e;
}
