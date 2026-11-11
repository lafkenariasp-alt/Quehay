# Qué Hay (nombre provisional)

App de recetas: cocina con lo que tienes en la nevera, comparte recetas y sube de nivel.

## Cómo está armado

- **App:** Expo (React Native), un solo código para iPhone y Android.
- **Servidor y base de datos:** Supabase (PostgreSQL, login, fotos).
- **Desarrollo sin computador:** el código vive en GitHub → Snack de Expo lo importa → se prueba en el iPhone con la app Expo Go.

## Base de datos (`supabase/`)

| Archivo | Qué hace |
| --- | --- |
| `migrations/001_esquema.sql` | Tablas, seguridad, buscador "taller", XP, niveles, logros y nevera |
| `seed/01_ingredientes_y_logros.sql` | ~100 ingredientes con sinónimos chilenos y logros iniciales |
| `seed/02_recetas_demo.sql` | 12 recetas de prueba (ejecutar después de crear tu cuenta) |
| `tests/` | Pruebas locales (no se suben a Supabase) |

### Instalar en Supabase

1. En supabase.com, abre tu proyecto → **SQL Editor** → **New query**.
2. Pega el contenido de `migrations/001_esquema.sql` y presiona **Run**.
3. Repite con `seed/01_ingredientes_y_logros.sql`.
4. Cuando tengas tu cuenta creada en la app, ejecuta `seed/02_recetas_demo.sql`.

### Reglas clave

- **Buscador:** `buscar_recetas(tengo, max_faltantes, incluir_basicos, categoria, max_minutos)` devuelve recetas ordenadas por lo que falta (0 = puedes cocinarla ya). Entiende genéricos: tener "Carne" calza con "Pollo" y viceversa.
- **XP:** publicar receta 50 · recibir "así me quedó" 30 · subir "así me quedó" 20 · recibir 5 estrellas 10 · responder como creador 10 · recibir like 2 (tope 200/día) · dar like 1 (tope 20/día).
- **Niveles:** para llegar al nivel N se necesitan 25 × N × (N − 1) XP. Títulos: Pinche de cocina (1), Chefcito (5), Cocinero de barrio (10), Chef de partida (20), Sous chef (35), Chef ejecutivo (50), Chef Michelin (75).
- **Seguridad:** todos leen; cada uno escribe solo lo suyo. Nadie puede editarse el XP a mano, y solo el creador responde los "así me quedó".
