# SPEC 02 — Home (landing) de Arcade Vault

> **Status:** aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-09
> **Objective:** Portar a Next.js la landing del prototipo `references/resources/templates/home-about/home.jsx` como nueva página de inicio en `/`, moviendo la Biblioteca a `/juegos`.

---

## Por qué existe esta spec

La SPEC 01 puso la Biblioteca en `/`. El prototipo nuevo (`home-about/`) define un Home de marketing como pantalla de inicio y deja la Biblioteca como destino aparte ("Inicio" y "Biblioteca" son links distintos en su nav). Esta spec porta solo el Home. La pantalla "Acerca de" (con formulario de contacto) de la misma carpeta queda para otra spec.

El CSS del Home (`.home-*`, `.feature-*`, `.mini-*`, `.activity-*`, `.pricing-*`, etc.) no está en `app/globals.css`; vive en `references/resources/templates/home-about/styles.css`. Las utilidades base (`.pixel`, `.neon-*`, `.btn.xl`, `.btn.pulse`, `.fade-in`) ya existen en `globals.css`.

---

## Scope

**In:**

- Nueva página `/` con las secciones del prototipo, en este orden:
  - Hero: eyebrow "INSERTA UNA MONEDA_", título de tres líneas, subtítulo, dos CTAs ("EXPLORAR JUEGOS" → `/juegos`, "CREAR CUENTA" → `/auth`), indicador "DESLIZA" y 8 siluetas pixel flotantes decorativas.
  - `// 01` "¿POR QUÉ ARCADE VAULT?": 4 tarjetas de características con icono SVG pixel.
  - `// 02` "JUEGOS DISPONIBLES AHORA": 6 mini-tarjetas (los primeros 6 de `GAMES`) que enlazan a `/juegos/[id]`, y botón "VER TODOS LOS JUEGOS →" a `/juegos`.
  - Franja de estadísticas: "12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING".
  - `// 03` "ACTIVIDAD EN VIVO": ticker de 7 últimas puntuaciones y lista de 5 mejores jugadores de hoy con link "VER SALÓN →" a `/salon`. Datos mock estáticos.
  - `// 04` "PRECIOS": tarjeta "JUGADOR VAULT $0 / SIEMPRE" con botón "EMPEZAR GRATIS →" a `/auth`, y 3 preguntas frecuentes.
  - CTA final "¿LISTO PARA JUGAR?" con botón "INSERTAR MONEDA →" a `/juegos`.
- Animación de entrada por scroll (`.reveal` → `.in`) con `IntersectionObserver`.
- Mover la Biblioteca de `/` a `/juegos` (`app/juegos/page.tsx`).
- Nav (escritorio y panel móvil): añadir link "Inicio" a `/`; "Biblioteca" apunta a `/juegos`; el logo sigue apuntando a `/`.
- Actualizar los links que apuntaban a la Biblioteca en `/`: "VOLVER AL VAULT" del reproductor y del modal, "VOLVER AL VAULT" del detalle, "VOLVER A LA BIBLIOTECA" del salón.
- Portar a `app/globals.css` solo las reglas CSS del Home que faltan.
- Textos en español, tal como en el prototipo.
- Diseño de interfaces con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Pantalla "Acerca de" y formulario de contacto (link "Acerca de" del nav incluido).
- Datos reales: ticker, top de jugadores y estadísticas son texto fijo, no se calculan desde `av_scores` ni desde un backend.
- Actividad "en vivo" real (sin polling, sin websockets, el ticker no cambia).
- Cambiar los datos de `GAMES` para que coincida "12+ JUEGOS" con los 8 juegos actuales; el texto del prototipo se mantiene.
- Backend, auth real, pagos o planes (el "plan único" es solo copy).
- Tests automatizados (no hay runner configurado).
- Rediseñar el nav más allá de añadir "Inicio" y ajustar el estado activo.

---

## Data model

Datos mock estáticos tipados, sin persistencia. No se tocan `GAMES`, `av_user` ni `av_scores`.

```ts
// lib/home.ts
import type { GameColor } from "@/lib/games";

export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature {
  icon: FeatureIconKind;
  title: string;         // "JUEGOS CLÁSICOS"
  desc: string;
  color: GameColor;      // "cyan" | "magenta" | "yellow" | "green"
}

export interface HomeStat { n: string; u: string; s: string }          // "12+" / "JUEGOS" / "Y CONTANDO"

export interface RecentScore {
  player: string;        // "NEONFOX"
  game: string;          // "Caída"  (texto libre, igual que el prototipo)
  score: number;         // 184220
  ago: string;           // "hace 2 min"
  color: GameColor;
}

export interface TopPlayer { rank: number; player: string; score: number }
export interface FaqItem { q: string; a: string }

export const FEATURES: Feature[];            // 4
export const HOME_STATS: HomeStat[];         // 3
export const RECENT_SCORES: RecentScore[];   // 7
export const TOP_PLAYERS: TopPlayer[];       // 5
export const PRICING_PERKS: string[];        // 6 ítems "✔ ..."
export const FAQ: FaqItem[];                 // 3
```

Convenciones:

- Los números se formatean con `toLocaleString("es-ES")`.
- Los valores se copian tal cual de `home.jsx`.
- Las barras del top usan ancho `100 - i * 16` por ciento.

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Leer en `node_modules/next/dist/docs/` la guía de Server/Client Components y de `Link` antes de escribir código Next.js (`cacheComponents` está activo en `next.config.ts`).
2. Mover la Biblioteca: crear `app/juegos/page.tsx` con el contenido actual de `app/page.tsx` (`<Library />`, título "Biblioteca · Arcade Vault"). Verificación: `/juegos` muestra la Biblioteca; `/` sigue mostrándola de forma temporal.
3. Actualizar `components/nav.tsx`: link "Inicio" (`/`) en escritorio y panel móvil; "Biblioteca" a `/juegos`; `isHome = pathname === "/"`, `inLibrary = pathname.startsWith("/juegos")`. Actualizar los links a la Biblioteca en `components/game-player.tsx`, `app/juegos/[id]/page.tsx` y `components/hall-of-fame.tsx` de `/` a `/juegos`. Verificación: navegar entre Inicio, Biblioteca, detalle, salón; el resaltado activo es correcto.
4. Portar el CSS: copiar a `app/globals.css` las reglas de `home-about/styles.css` que no existen en `globals.css` (bloque `.home`…`.reveal` y bloque `.activity-grid`…`.pricing-*`/`.faq-*`, más keyframes que falten como `float` y `bounce`). No duplicar reglas existentes. Añadir `@media (prefers-reduced-motion: reduce)` que muestre `.reveal` sin transición. Verificación: `npm run build` sin errores de CSS.
5. Crear `lib/home.ts` con los tipos y datos de arriba.
6. Crear componentes presentacionales sin estado: `components/floating-silhouettes.tsx`, `components/feature-icon.tsx`, `components/mini-card.tsx` (un `Link` a `/juegos/[id]`, sin `onClick`).
7. Crear `components/reveal.tsx` (client): envuelve un `<section>`, aplica `.reveal`, y añade `.in` con `IntersectionObserver` (umbral 0.12, `unobserve` al entrar). Debe renderizar visible si `IntersectionObserver` no existe.
8. Reemplazar `app/page.tsx` por el Home (Server Component) con las 7 secciones en orden. Los CTAs son `Link` con clases `btn`. Metadata: título "Arcade Vault · El arcade clásico está de vuelta". Verificación: `/` muestra todas las secciones.
9. Revisar contra el prototipo (`arcade-vault-standalone.html` en `home-about/`) y ajustar diferencias de espaciado, y el comportamiento móvil (<840 px) del hero, `feature-grid`, `mini-rail`, `activity-grid` y `pricing-grid`.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores de TypeScript ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `/` muestra el título "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA" en tres líneas.
- [ ] El hero contiene 2 CTAs: "EXPLORAR JUEGOS" navega a `/juegos` y "CREAR CUENTA" navega a `/auth`.
- [ ] El hero muestra 8 siluetas decorativas con `aria-hidden="true"`.
- [ ] La sección `// 01` muestra exactamente 4 tarjetas de característica.
- [ ] La sección `// 02` muestra exactamente 6 mini-tarjetas; hacer clic en una navega a `/juegos/<id>` de ese juego.
- [ ] "VER TODOS LOS JUEGOS →" navega a `/juegos`.
- [ ] La franja de estadísticas muestra "12+", "MILES" y "GLOBAL".
- [ ] El ticker muestra 7 filas y el top muestra 5 filas; la primera fila del top está resaltada en dorado.
- [ ] "VER SALÓN →" navega a `/salon`.
- [ ] La sección de precios muestra "$0", 6 ventajas y 3 preguntas; "EMPEZAR GRATIS →" navega a `/auth`.
- [ ] "INSERTAR MONEDA →" navega a `/juegos`.
- [ ] Las secciones con `.reveal` pasan a visibles al entrar en el viewport al hacer scroll.
- [ ] Con `prefers-reduced-motion: reduce`, las secciones `.reveal` son visibles sin transición.
- [ ] `/juegos` muestra la Biblioteca completa (hero, buscador, chips, 8 tarjetas) y el filtrado de la SPEC 01 sigue funcionando.
- [ ] El nav muestra "Inicio", "Biblioteca" y "Salón de la Fama" en escritorio y panel móvil.
- [ ] El link activo es "Inicio" en `/`, "Biblioteca" en `/juegos` y `/juegos/*`, "Salón de la Fama" en `/salon`.
- [ ] Los botones "VOLVER AL VAULT" (detalle y reproductor) y "VOLVER A LA BIBLIOTECA" (salón) navegan a `/juegos`.
- [ ] Tras iniciar sesión en `/auth`, la redirección lleva a `/` y el nav muestra el nombre en mayúsculas.
- [ ] Por debajo de 840 px el Home no genera scroll horizontal y las rejillas se apilan.
- [ ] Recargar `/` no produce errores de hidratación ni errores en la consola.
- [ ] Las pantallas de la SPEC 01 (`/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/auth`) siguen funcionando sin errores en la consola.

---

## Decisions

- **Yes:** Home en `/` y Biblioteca en `/juegos`. Replica el prototipo (Inicio y Biblioteca como destinos distintos) y `/juegos/[id]` ya existe, así que `/juegos` es la ruta coherente.
- **No:** Biblioteca en `/biblioteca`. Rompe la coherencia con las rutas `/juegos/[id]` existentes.
- **Yes:** esta spec modifica una ruta definida en la SPEC 01 (Biblioteca en `/`). La SPEC 01 queda como historial y no se edita.
- **Yes:** solo el Home; "Acerca de" y contacto van en otra spec. Mantiene la spec en una pantalla, como se pidió.
- **Yes:** añadir al `globals.css` solo las reglas nuevas. Coherente con la SPEC 01 (CSS del prototipo en `globals.css`, sin Tailwind).
- **No:** archivo `app/home.css` separado. Dos fuentes de estilos del prototipo.
- **Yes:** página `/` como Server Component, con un único client component pequeño (`Reveal`) para el `IntersectionObserver`. Reduce JS enviado.
- **No:** `useReveal()` global sobre el DOM como en el prototipo (`querySelectorAll(".reveal")`). Es frágil con React y rutas; el wrapper por sección es explícito.
- **Yes:** mini-tarjetas como `Link`, no `div` con `onClick`. Navegación accesible y con prefetch.
- **Yes:** datos del ticker, top y estadísticas como mock estático en `lib/home.ts`. El copy del prototipo se conserva aunque "12+ JUEGOS" no coincida con los 8 juegos de `GAMES`.
- **No:** calcular el ticker o el top desde `av_scores`. Mezclar datos locales y semilla complica el MVP visual (misma decisión que en la SPEC 01).
- **Yes:** la redirección tras login/invitado sigue yendo a `/` (ahora el Home).

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| `.reveal` empieza con `opacity: 0`; si el JS falla o no hidrata, el contenido queda invisible | `Reveal` renderiza visible si no existe `IntersectionObserver`; regla `prefers-reduced-motion` muestra todo. |
| Duplicar o chocar reglas CSS al fusionar `styles.css` en `globals.css` (hay un `.stat-strip` y clases similares) | Importar solo bloques de Home y actividad/precios; comparar selector a selector antes de pegar. |
| Quedan links a `/` que debían ir a `/juegos` | Buscar `href="/"` y `push("/")` en `app/` y `components/`; el criterio de aceptación lista los botones afectados. |
| Cambios de API de Next.js 16 (`cacheComponents`, params asíncronos) | El paso 1 obliga a leer `node_modules/next/dist/docs/` antes de codificar. |
| Diferencias visuales respecto al prototipo | El paso 9 compara con `arcade-vault-standalone.html` abierto en el navegador. |

---

## What is **not** in this spec

- Pantalla "Acerca de", formulario de contacto y link "Acerca de" en el nav.
- Datos en vivo, backend o cálculo real de estadísticas.
- Autenticación real, pagos o planes.
- Cambios a los datos de `GAMES` o a la lógica de puntuaciones.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
