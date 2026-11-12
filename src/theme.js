// Paleta: cada color tiene un solo trabajo
// hambre (tomate) → acción · listo (verde) · casi (ámbar) · recompensa (dorado)
export const C = {
  fondo: '#FBF7F0',       // crema harina
  superficie: '#F3EBDD',
  blanco: '#FFFFFF',
  linea: '#E8DCC8',
  texto: '#2A211C',       // café espresso
  suave: '#6B5D52',
  tomate: '#C93F18',      // acciones principales
  tomateOscuro: '#A8320F',
  tomateTinte: '#FDE7DC',
  verde: '#15803D',       // lo tienes / puedes cocinarla ya
  verdeOscuro: '#14532D',
  verdeTinte: '#E6F4EA',
  ambar: '#C26A05',       // te falta (borde visible 3:1 sobre crema)
  ambarOscuro: '#92400E',
  ambarTexto: '#B45309',
  ambarTinte: '#FEF3E2',
  dorado: '#F59E0B',      // XP, niveles, recompensas
  doradoTinte: '#FEF3C7',
  estrella: '#D97706',    // estrellas: dorado más oscuro para que se vean sobre blanco (3:1)
  gris: '#78716C',
  grisTinte: '#E7E3DC',
};

export const RAREZA = {
  'Común': '#78716C',
  'Poco común': '#15803D',
  'Raro': '#2563EB',
  'Épico': '#7C3AED',
  'Legendario': '#F59E0B',
};

export const CATEGORIAS_ING = [
  'Lácteos', 'Carnes y huevos', 'Pescados y mariscos', 'Verduras', 'Frutas',
  'Despensa', 'Condimentos', 'Panadería', 'Congelados', 'Bebidas',
];

export const CATEGORIAS_RECETA = [
  'Chilena', 'Casera', 'Tradicional', 'Rápida', 'Pasta', 'Italiana',
  'Vegetariana', 'Desayuno', 'Postre', 'China', 'Peruana', 'Española',
];

// XP total para llegar al nivel N = 25 * N * (N - 1)
export const xpParaNivel = (n) => 25 * n * (n - 1);
