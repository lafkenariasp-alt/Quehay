# Auditoría Impeccable (nativa iOS) · Qué Hay · 2026-11-11

| # | Dimensión | Nota | Hallazgo clave |
|---|---|---|---|
| 1 | Accesibilidad | 2 | Casillas comunican "tengo/falta" solo con color y borde; VoiceOver no lo dice |
| 2 | Rendimiento | 2 | Listas largas con .map dentro de ScrollView; imágenes sin caché |
| 3 | Apariencia y tema | 3 | Paleta semántica en theme.js; pocos hex sueltos; solo modo claro (decisión) |
| 4 | Conformidad iOS | 2 | Navegación propia: sin gesto de volver deslizando y sin transiciones |
| 5 | Adaptabilidad | 2 | En iPad se estira el diseño de teléfono; teclado bien resuelto |
| **Total** | | **11/20** | **Aceptable** |

## P1
- Navegación propia sin swipe-back ni transiciones (App.js, nav.abrir/volver) → react-navigation native-stack.
- Casillas sin estado accesible (src/ui.js Casilla) → accessibilityLabel "Huevos, lo tienes / te falta", role button, state selected.
- Pressables sin rol/etiqueta (~16 de ~76): chips, estrellas, tarjetas de receta, ingredientes de bienvenida.

## P2
- Casilla: alto fijo 68 y texto 12 pt; con letra grande del sistema se corta.
- Resultados/Nevera/Perfil: .map en ScrollView (hasta 60 recetas con foto) → FlatList; Image → expo-image con caché.
- iPad: sin ancho máximo; casillas al 23% quedan enormes; orientación bloqueada en vertical.
- Estrellas doradas 2,15:1 sobre blanco; borde "falta" 2,98:1 (bajo 3:1 para elementos no textuales).
- Bandera de reportar 18–22 pt + hitSlop 10 ≈ 38–42 pt (bajo 44).

## P3
- Botón flotante "Cerrar teclado": iOS ya cierra deslizando la lista (keyboardDismissMode="interactive").
- Ionicons en vez de SF Symbols: aceptable en Expo, mantener un solo set.

## Bien hecho
Áreas seguras respetadas; barra de pestañas de 44 pt con rol tab; botones de 52 pt; contrastes de texto ≥4,5:1 (excepto estrellas); colores con un solo significado y leyenda con texto; errores con Reintentar; teclado no tapa campos; Alert nativo para reportar.

## Acciones recomendadas
1. [P1] adapt: navegación nativa con swipe-back y transiciones.
2. [P1] harden: accesibilidad de casillas, chips, estrellas y tarjetas.
3. [P2] optimize: FlatList + expo-image.
4. [P2] adapt: ancho máximo y grilla para iPad.
5. [P2] typeset: casillas que crecen con la letra del sistema.
6. polish final.

## Arreglado (P1)
- Navegación nativa (React Navigation native-stack): transición de empuje de iOS y volver deslizando desde el borde; botón atrás de Android.
- VoiceOver: casillas dicen "Huevos, lo tienes / te falta"; botones con rol y etiqueta; estrellas como grupo de opciones ("4 estrellas") y nota de solo lectura ("Nota 4 de 5"); pestañas con rol tab.
- De paso (P2): casillas crecen con la letra del sistema (sin alto fijo, texto 13 pt), estrellas y borde "falta" con contraste 3:1, áreas de toque de 44 pt en reportar, seguir, borrar búsqueda, volver y chips.
