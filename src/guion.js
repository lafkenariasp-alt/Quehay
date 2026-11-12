// Guion del tutorial «Chefpu llega a tu cocina» (aprobado, con los cambios del dueño).
// foco: elemento resaltado (ver <Foco id>). en: pantalla donde ocurre si no hay foco.
// esperar: { evento, veces } = el jugador debe hacer eso para seguir; sin esperar = tocar el globo.
// capa: dónde se dibuja (raiz | cocina | regalo); los modales tienen su propia capa.
// pasar: tocar el elemento iluminado lo usa de verdad (marca la casilla, abre la receta) y la historia salta
//   a la línea que esperaba esa acción, sin pedir un toque extra para avanzar.
// opcional + junto: si 'junto' está en pantalla pero el foco no (p. ej. no hay recetas listas), se salta.
export const GUION = [
  // Prólogo · La llegada
  { cap: 0, en: 'pantalla_bienvenida', cara: 'feliz', texto: '¡Hola! Soy Chefpu, un pudú del sur con sueños de chef.' },
  { cap: 0, en: 'pantalla_bienvenida', cara: 'pensando', texto: 'Tengo mucha hambre… ¿me ayudas a cocinar algo con lo que tienes?' },
  { cap: 0, foco: 'empezar', cara: 'feliz', texto: '¡Vamos! Toca Empezar.', esperar: { evento: 'empezar' } },
  // Capítulo 1 · La despensa
  { cap: 1, foco: 'grilla', pasar: true, cara: 'feliz', texto: 'Estas son las cosas que tenemos en casa. Toca las que tengas tú.' },
  { cap: 1, foco: 'grilla', cara: 'feliz', texto: 'Toca una. Se pone verde: eso significa «lo tengo».', esperar: { evento: 'casilla', veces: 1 } },
  { cap: 1, foco: 'grilla', cara: 'feliz', texto: '¡Eso! Elige al menos 2 más.', esperar: { evento: 'casilla', veces: 2 } },
  { cap: 1, foco: 'buscar_otro', cara: 'pensando', texto: 'Si tienes algo que no está aquí, lo buscas acá. Ahora no hace falta.' },
  { cap: 1, foco: 'ver_recetas', cara: 'celebrando', texto: '¡Listo! Toca Ver recetas y veamos qué sale.', esperar: { evento: 'ver_recetas' } },
  // Capítulo 2 · El mapa de recetas
  { cap: 2, foco: 'grupo_ya', pasar: true, cara: 'celebrando', texto: 'Estas recetas las puedes hacer ahora mismo, con lo que tienes.', opcional: true, junto: 'receta_0' },
  { cap: 2, foco: 'receta_0', pasar: true, cara: 'feliz', texto: 'Verde es lo que tienes. Ámbar es lo que te falta.' },
  { cap: 2, foco: 'grupo_falta1', pasar: true, cara: 'pensando', texto: 'Aquí te falta solo una cosa. Ideal para cuando vas a comprar.', opcional: true, junto: 'receta_0' },
  { cap: 2, foco: 'receta_0', cara: 'feliz', texto: 'Elijamos esta. Tócala.', esperar: { evento: 'abrir_receta' } },
  // Capítulo 3 · La receta
  { cap: 3, foco: 'ingredientes', cara: 'feliz', texto: 'Aquí ves todo lo que lleva. Lo verde ya está en tu cocina.' },
  { cap: 3, en: 'pantalla_receta', cara: 'feliz', texto: 'Más abajo verás cómo les quedó a otros, con foto.' },
  { cap: 3, foco: 'paso_a_paso', cara: 'celebrando', texto: 'Ahora lo bueno: toca Paso a paso y cocinamos juntos.', esperar: { evento: 'paso_a_paso' } },
  // Capítulo 4 · Manos a la obra
  { cap: 4, capa: 'cocina', foco: 'texto_paso', cara: 'feliz', texto: 'Un paso a la vez, en letra grande. La pantalla no se apaga.' },
  { cap: 4, capa: 'cocina', foco: 'siguiente', cara: 'feliz', texto: 'Toca Siguiente para avanzar. Puedes cocinar de verdad o solo mirar.', esperar: { evento: 'ultimo_paso' } },
  { cap: 4, capa: 'cocina', foco: 'termine', cara: 'celebrando', texto: '¡Lo lograste! Toca ¡Terminé!', esperar: { evento: 'termine' } },
  // Epílogo · La recompensa
  { cap: 5, capa: 'regalo', foco: 'regalo', cara: 'celebrando', texto: '¡Gracias por ayudarme! Toma: insignia de bienvenida, 30 XP y Fundador.', esperar: { evento: 'regalo_cerrado' } },
  { cap: 5, foco: 'chefpu_flotante', cara: 'feliz', texto: 'Desde ahora vivo aquí. Arrástrame donde quieras o presióname para más opciones.' },
  { cap: 5, foco: 'tab_nevera', cara: 'feliz', texto: 'Si te creas una cuenta, guardo tus ingredientes en tu nevera. Cuando quieras, sin apuro.' },
];

export const LINEA_REGALO = GUION.findIndex((l) => l.foco === 'regalo');
export const CAPITULOS = 4;
