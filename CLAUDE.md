# Qué Hay · guía para Claude

App de recetas "qué cocino con lo que tengo" (Expo SDK 58, JavaScript, Supabase). El dueño trabaja solo desde iPad y iPhone: código en GitHub, pruebas en Expo Go vía Snack. Habla en español de Chile y quiere ir paso a paso, con preguntas antes de decisiones importantes.

## Marca

- Colores en `src/theme.js`; cada color tiene un solo trabajo: tomate = acción, verde = lo tienes, ámbar = te falta, dorado = XP y recompensas, fondo crema.
- Mascota: **Chefpu**, un pudú chef con mostacho francés y pañuelo rojo (versión "Clásico"). Los otros trajes (Andino, Patriota, Gourmet, Aventurero) son accesorios desbloqueables.
- Tono: amigable, cercano, gamer suave. Nada de estética genérica de IA.

## Skills de diseño instalados (`.claude/skills/`)

| Skill | Para qué lo usamos aquí |
|---|---|
| `impeccable` | Auditar y pulir pantallas (incluye guías para iOS y apps nativas): `audit`, `critique`, `polish`, `onboard`, `delight` |
| `emil-design-eng` | Criterio de Emil Kowalski: qué animar, cuánto dura, qué curva, detalles invisibles |
| `animate-expo` | Animaciones en React Native/Expo (Reanimated, gestos, respuesta al toque) |
| `review-animations` | Revisar animaciones ya hechas antes de subirlas |
| `mobile-native` | Para la parte web futura (panel admin, CRM, landing) en el teléfono |
| `design-taste-frontend` | Dirección visual y anti-"AI slop" para piezas web nuevas (landing, panel) |

Orden de trabajo para una pantalla: `impeccable` (auditoría) → arreglos → `emil-design-eng` / `animate-expo` (movimiento) → `review-animations`.

## Verificación

- Código: `esbuild` del bundle y `eslint` con `no-undef`.
- SQL: base local `quehay_test` con `supabase/tests/00_stub_supabase.sql`.
- Web (panel admin, landing, artefactos): Playwright para capturas en tamaño iPhone (390×844) e iPad.

## Reglas

- Las migraciones deben poder ejecutarse más de una vez sin error.
- Cuentas solo con nick + contraseña (mínimo 8); el correo interno es `nick@usuarios.quehay.app`.
- Nunca subir el correo personal del dueño al repositorio (es público).
