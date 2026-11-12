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
| `migrations/002_fotos.sql` | Carpeta pública de fotos con permisos por usuario |
| `migrations/003_seguidores.sql` | Seguir a otros cocineros |
| `seed/02_recetas_demo.sql` | 12 recetas de prueba (ejecutar después de crear tu cuenta) |
| `migrations/009_sin_limite_admin.sql` | El límite de 3 cuentas por día no aplica a teléfonos que entraron con una cuenta admin, oficial o quehay |
| `migrations/010_lista_compras.sql` | Lista de compras en la Nevera (tabla `compras`) y `comprado()`, que la pasa a la nevera |
| `migrations/011_credito_fotos.sql` | Columna `foto_credito` en recetas: enlace al autor y licencia de fotos libres |
| `migrations/008_regalo_y_cuentas.sql` | El regalo se gana terminando el tutorial; máx. 3 cuentas por día por teléfono; eliminar cuenta; «Lo cociné» sin foto (comentario sin XP) |
| `migrations/007_tutorial_por_cuenta.sql` | El tutorial se guarda en la cuenta: cada cuenta nueva lo hace la primera vez, en cualquier teléfono |
| `migrations/006_amigos.sql` | Sugerencias de amigos (te sigue, amigos en común, misma ciudad, mismos gustos) |
| `migrations/005_titulos.sql` | Primer título: Aprendiz de cocina |
| `migrations/004_estabilidad.sql` | Roles, topes de XP, foto única al cocinar, logros automáticos, reportes, propuestas de ingredientes, eventos para métricas, paquete de bienvenida |
| `seed/03_mas_ingredientes.sql` | ~180 ingredientes más (se puede ejecutar de nuevo sin duplicar) |
| `seed/04_recetas_chilenas.sql` | 52 recetas chilenas de todos los días, publicadas por la cuenta oficial `quehay` (no duplica) |
| `seed/05_fotos_libres.sql` | Fotos con licencia libre (Wikimedia Commons) para 9 recetas de `quehay`; no reemplaza fotos existentes. Requiere la 011 |
| `cuentas/configurar_cuentas.sql` | Cuenta oficial, tu cuenta admin y cuentas de prueba (por nick) |
| `cuentas/cambiar_clave.sql` | Restablecer la contraseña de alguien que la olvidó |
| `tests/` | Pruebas locales (no se suben a Supabase) |

### Instalar en Supabase

1. En supabase.com, abre tu proyecto → **SQL Editor** → **New query**.
2. Pega el contenido de `migrations/001_esquema.sql` y presiona **Run**.
3. Repite con `seed/01_ingredientes_y_logros.sql`.
4. Cuando tengas tu cuenta creada en la app, ejecuta `seed/02_recetas_demo.sql`.

### Reglas clave

- **Buscador:** `buscar_recetas(tengo, max_faltantes, incluir_basicos, categoria, max_minutos)` devuelve recetas ordenadas por lo que falta (0 = puedes cocinarla ya). Entiende genéricos: tener "Carne" calza con "Pollo" y viceversa.
- **XP:** publicar receta 50 · recibir "así me quedó" 30 · subir "así me quedó" 20 · recibir 5 estrellas 10 · responder como creador 10 · recibir like 2 (tope 200/día) · dar like 1 (tope 20/día).
- **Niveles:** para llegar al nivel N se necesitan 25 × N × (N − 1) XP. Títulos: Aprendiz de cocina (1), Chefcito (5), Cocinero de barrio (10), Chef de partida (20), Sous chef (35), Chef ejecutivo (50), Chef Michelin (75).
- **Seguridad:** todos leen; cada uno escribe solo lo suyo. Nadie puede editarse el XP a mano, y solo el creador responde los "así me quedó".

## App (`App.js` y `src/`)

| Pantalla | Qué hace |
| --- | --- |
| Bienvenida | Mascota, "¿Qué tienes a mano?" con 12 ingredientes típicos y recetas al instante, sin cuenta |
| Acceso | Crear cuenta con nick y contraseña de 8 (con paquete de bienvenida), entrar, recordar en el teléfono |
| Nevera | Inventario por categoría, agregar desde el catálogo, control de vencimiento opcional, recetas para aprovechar lo que vence |
| Buscar | Elegir ingredientes (o usar toda la nevera), despensa básica, máximo de faltantes, filtros |
| Resultados | Recetas agrupadas: puedes cocinarla ya · falta 1 · faltan 2 · 3 o 4 |
| Receta | Casillas verdes (tienes) y ámbar (falta), pasos, me gusta, nota con estrellas, modo paso a paso, "Lo cociné" con foto obligatoria de cámara, reportar |
| Publicar | Formulario de receta con ingredientes del catálogo (+50 XP) |
| Perfil | Nivel, título, barra de XP, logros por rareza y mis recetas |

### Probar en el iPhone (sin computador)

**Versión web (para que otros prueben sin instalar nada):** https://lafkenariasp-alt.github.io/Quehay/ — se actualiza sola con cada cambio en `main` (workflow `.github/workflows/web.yml`). Las cuentas y su avance son los mismos que en la app.

**Atajo:** [Abrir Qué Hay en Snack](https://snack.expo.dev/?name=Qu%C3%A9%20Hay&platform=mydevice&sdkVersion=54.0.0&dependencies=%40supabase%2Fsupabase-js%2C%40react-native-async-storage%2Fasync-storage%2Creact-native-url-polyfill%2Creact-native-safe-area-context%2C%40expo%2Fvector-icons%2Cexpo-status-bar%2Cexpo-image-picker%2Cbase64-arraybuffer%2Cexpo-image-manipulator%2Cexpo-crypto%2Cexpo-keep-awake%2Cexpo-secure-store%2C%40react-navigation%2Fnative%2C%40react-navigation%2Fnative-stack%2Creact-native-screens%2Cexpo-audio%2Cexpo-haptics%2Cexpo-file-system&files=%7B%22App.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2FApp.js%22%7D%2C%22src%2FSelectorIngredientes.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2FSelectorIngredientes.js%22%7D%2C%22src%2Fanalitica.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fanalitica.js%22%7D%2C%22src%2Fanim.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fanim.js%22%7D%2C%22src%2Fchefpu.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fchefpu.js%22%7D%2C%22src%2FchefpuFlotante.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2FchefpuFlotante.js%22%7D%2C%22src%2Fcontexto.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fcontexto.js%22%7D%2C%22src%2Femoji.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Femoji.js%22%7D%2C%22src%2Ferrores.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Ferrores.js%22%7D%2C%22src%2Ffoco.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Ffoco.js%22%7D%2C%22src%2Ffotos.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Ffotos.js%22%7D%2C%22src%2Fguion.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fguion.js%22%7D%2C%22src%2Fmascota.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fmascota.js%22%7D%2C%22src%2Freportar.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Freportar.js%22%7D%2C%22src%2Fsonido.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fsonido.js%22%7D%2C%22src%2Fsupabase.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fsupabase.js%22%7D%2C%22src%2Ftheme.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Ftheme.js%22%7D%2C%22src%2Ftutorial.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Ftutorial.js%22%7D%2C%22src%2Fui.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fui.js%22%7D%2C%22src%2Fweb.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fweb.js%22%7D%2C%22src%2Fpantallas%2FAcceso.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fpantallas%2FAcceso.js%22%7D%2C%22src%2Fpantallas%2FBienvenida.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fpantallas%2FBienvenida.js%22%7D%2C%22src%2Fpantallas%2FBuscar.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fpantallas%2FBuscar.js%22%7D%2C%22src%2Fpantallas%2FComunidad.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fpantallas%2FComunidad.js%22%7D%2C%22src%2Fpantallas%2FNevera.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fpantallas%2FNevera.js%22%7D%2C%22src%2Fpantallas%2FPerfil.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fpantallas%2FPerfil.js%22%7D%2C%22src%2Fpantallas%2FPerfilPublico.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fpantallas%2FPerfilPublico.js%22%7D%2C%22src%2Fpantallas%2FPublicar.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fpantallas%2FPublicar.js%22%7D%2C%22src%2Fpantallas%2FReceta.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fpantallas%2FReceta.js%22%7D%2C%22src%2Fpantallas%2FResultados.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fpantallas%2FResultados.js%22%7D%2C%22src%2Fpantallas%2FUsuarios.js%22%3A%7B%22type%22%3A%22CODE%22%2C%22url%22%3A%22https%3A%2F%2Fraw.githubusercontent.com%2Flafkenariasp-alt%2FQuehay%2Fe6190b0c3a87c0a5299969ffe3bcb451a860ed2b%2Fsrc%2Fpantallas%2FUsuarios.js%22%7D%7D) — carga todo el código desde este repositorio. Toca Save y luego ábrelo en Expo Go.

Otra forma:

1. Instala **Expo Go** en el iPhone e inicia sesión con tu cuenta de Expo.
2. En el iPad abre **snack.expo.dev** → menú → **Import git repository** → pega `https://github.com/lafkenariasp-alt/quehay`.
3. Escanea el código QR con la cámara del iPhone: se abre en Expo Go.

**Modo invitado:** sin cuenta se puede buscar y mirar recetas y perfiles; al intentar cocinar, guardar, seguir o publicar se pide crear cuenta.

Pendiente: comentarios, feed, rankings, backend de administración y CRM (definidos en el plan), verificación de fotos con IA.
