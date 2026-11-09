# SPEC 01 — MVP visual de Arcade Vault (todas las pantallas)

> **Status:** aprovado
> **Depends on:** Ninguna (el tema global y las fuentes ya existen en `app/globals.css` y `app/layout.tsx`)
> **Date:** 2026-11-09
> **Objective:** Portar a Next.js (App Router) las cinco pantallas del prototipo de `references/resources/templates/` (biblioteca, detalle, reproductor, salón de la fama y auth) con datos mock y sin ningún juego real.

---

## Por qué existe esta spec

El prototipo en `references/resources/templates/` es React + Babel en una sola página con navegación por hash. No forma parte del build de Next.js. Esta spec lo convierte en rutas reales, tipadas y reutilizables, para que las specs futuras (juegos reales, backend, auth real) tengan una base de UI estable.

`app/globals.css` ya contiene el tema y todas las clases del prototipo (`av-*`, `card`, `btn`, `chip`, `podium`, `modal`, etc.). `app/layout.tsx` ya carga las fuentes y los fondos `av-bg` / `av-noise`. Esta spec no reescribe estilos; los reutiliza.

---

## Scope

**In:**

- Cinco rutas del App Router que replican visual y funcionalmente el prototipo:
  - `/` — Biblioteca (hero, búsqueda por nombre, chips de categoría, grilla de tarjetas con tilt, estado vacío).
  - `/juegos/[id]` — Detalle (portada, tags, descripción, stat-strip, botones, leaderboard de 10 filas).
  - `/juegos/[id]/jugar` — Reproductor simulado (HUD, pausa, FIN, CRT con arena decorativa, modal de fin de juego con guardado).
  - `/salon` — Salón de la Fama (tabs por juego, podio, tabla de 12 filas, fila "tu mejor marca" si hay sesión).
  - `/auth` — Iniciar sesión / Crear cuenta / Jugar como invitado / botones sociales (no funcionales).
- Navegación global (`Nav`) y footer en `app/layout.tsx`, con menú móvil (hamburguesa + panel).
- Sesión mock en `localStorage` (clave `av_user`), compartida por un provider de cliente.
- Puntuaciones guardadas desde el reproductor en `localStorage` (clave `av_scores`).
- Datos mock tipados en `lib/`: `GAMES`, `CATS`, `seededScores`.
- Página 404 para ids de juego inexistentes (`notFound()`).
- Textos en español, tal como en el prototipo.
- Diseño de interfaces usando el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Cualquier juego real o motor de juego; el reproductor solo simula puntos con un intervalo.
- Backend, base de datos, API routes o Server Actions.
- Autenticación real (OAuth Google/GitHub, hash de contraseñas, cookies, sesiones de servidor). Los botones sociales son decorativos.
- Mostrar en el salón o el detalle las puntuaciones guardadas en `av_scores`; esas pantallas siguen usando `seededScores`.
- Tests automatizados (no hay runner configurado).
- Internacionalización, modo claro, accesibilidad avanzada más allá de etiquetas semánticas básicas (`aria-label` en hamburguesa, `label` en inputs).
- Sistema real de créditos; "CRÉDITOS · 03" es texto fijo.

---

## Data model

Esta feature no introduce backend. Introduce los siguientes tipos y datos mock.

```ts
// lib/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;          // slug usado en la URL: "bloque-buster"
  title: string;       // "BLOQUE BUSTER"
  short: string;       // descripción corta de la tarjeta
  long: string;        // descripción larga del detalle
  cat: GameCategory;
  cover: string;       // clase CSS existente: "cover-bricks", "cover-tetro", ...
  color: GameColor;
  best: number;        // mejor puntuación global (mock)
  plays: string;       // "12.4K"
}

export const GAMES: Game[];                          // 8 juegos, copiados de data.jsx
export const CATS: ("TODOS" | GameCategory)[];       // ["TODOS","ARCADE","PUZZLE","SHOOTER","VERSUS"]
export function getGame(id: string): Game | undefined;
```

```ts
// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;        // "DD/MM/2026"
}

export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista, mismo algoritmo que data.jsx

export interface SavedScore {
  game: string;        // Game.id
  score: number;
  name: string;
  at: number;          // Date.now()
}
```

```ts
// Persistencia en localStorage (solo cliente)
// "av_user"   -> { "name": string } | ausente        (sesión mock; invitado = ausente)
// "av_scores" -> SavedScore[]                          (append-only)
```

Convenciones:

- Los números se formatean con `toLocaleString("es-ES")`.
- `NAME` de jugador: mayúsculas, máximo 10 caracteres.
- Toda lectura de `localStorage` va dentro de `try/catch`; si falla, se asume sin sesión y sin puntuaciones.
- Las lecturas de `localStorage` ocurren solo en efectos del cliente, para evitar errores de hidratación.

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Leer la guía relevante en `node_modules/next/dist/docs/` (App Router, Link, `notFound`, `generateStaticParams`, params asíncronos) antes de escribir código Next.js.
2. Crear `lib/games.ts` y `lib/scores.ts` con los tipos y datos de arriba. Verificación: `npm run lint` sin errores.
3. Crear `components/session-provider.tsx` (client): contexto con `user`, `login(user | null)`, `signOut()`, persistencia en `av_user` leída en un efecto. Exponer el hook `useSession`.
4. Crear `components/nav.tsx` (client) con `usePathname` para el estado activo, logo, links, contador de créditos, botón de sesión y menú móvil. Crear `components/footer.tsx`. Cablear `SessionProvider`, `Nav` y `Footer` en `app/layout.tsx` dentro del `<div id="root">` / `<main className="av-main">`. Verificación: la home actual muestra nav y footer.
5. Reemplazar `app/page.tsx` por la biblioteca: `components/game-card.tsx` (client, con tilt por `onMouseMove`) y `components/library.tsx` (client: búsqueda, chips, grilla, estado vacío). Las tarjetas navegan con `Link` a `/juegos/[id]`. Verificación: filtrar por texto y categoría funciona.
6. Crear `app/juegos/[id]/page.tsx` (Server Component): detalle y leaderboard con `seededScores(id.length * 17 + 3, 10)`; `notFound()` si el id no existe; `generateStaticParams` con `GAMES`. Botón "JUGAR AHORA" enlaza a `/juegos/[id]/jugar`; "VOLVER AL VAULT" a `/`.
7. Crear `app/juegos/[id]/jugar/page.tsx` (Server, valida el id) y `components/game-player.tsx` (client): HUD, pausa, FIN, arena CRT decorativa, intervalo de puntos simulados cada 220 ms, subida de nivel, modal de fin con input de iniciales, guardado en `av_scores`, "JUGAR DE NUEVO", "VOLVER AL VAULT". "SALIR" vuelve a `/juegos/[id]`.
8. Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (client): tabs por juego, podio, tabla con animación escalonada y fila "tu mejor marca" visible solo con sesión.
9. Crear `app/auth/page.tsx` y `components/auth-form.tsx` (client): tabs entrar/crear, campo de correo solo en "crear", `login({ name })` y redirección a `/`; "JUGAR COMO INVITADO" llama `login(null)` y redirige a `/`; botones sociales sin acción.
10. Añadir `app/not-found.tsx` con el estilo del tema, y metadata por ruta (`title` por pantalla). Retirar los restos del scaffold de Create Next App (imports de `next.svg`, etc., si quedan).

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores de TypeScript ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `/` muestra el hero "ARCADE VAULT" y 8 tarjetas de juego.
- [ ] En `/`, escribir "caí" en el buscador deja solo la tarjeta CAÍDA... y escribir "zzz" muestra "NO HAY RESULTADOS".
- [ ] En `/`, el chip SHOOTER muestra exactamente INVASORES y ROCAS.
- [ ] Hacer clic en una tarjeta (o en JUGAR) navega a `/juegos/<id>` de ese juego.
- [ ] `/juegos/caida` muestra título, descripción, tres métricas (Partidas, Mejor global, Dificultad) y 10 filas de leaderboard con rangos 01–10.
- [ ] Recargar `/juegos/caida` muestra exactamente las mismas 10 filas (datos deterministas).
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la página 404.
- [ ] "JUGAR AHORA" lleva a `/juegos/<id>/jugar`; "SALIR" en el reproductor vuelve a `/juegos/<id>`.
- [ ] En el reproductor, la puntuación aumenta sola; PAUSA la detiene y muestra "EN PAUSA"; REANUDAR la continúa.
- [ ] "FIN" abre el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] En el modal, "GUARDAR PUNTUACIÓN" escribe una entrada en `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA_".
- [ ] El input de iniciales fuerza mayúsculas y máximo 10 caracteres.
- [ ] "JUGAR DE NUEVO" reinicia puntuación a 0, vidas a 3 y nivel a 01.
- [ ] `/salon` muestra podio (01 central en dorado, 02 y 03 a los lados) y 12 filas en la tabla.
- [ ] En `/salon`, cambiar de tab cambia las filas mostradas.
- [ ] Sin sesión, `/salon` no muestra la fila "TU MEJOR MARCA"; con sesión, la muestra con el nombre del usuario.
- [ ] En `/auth`, la pestaña "CREAR CUENTA" muestra el campo de correo y "INICIAR SESIÓN" lo oculta.
- [ ] Enviar el formulario de `/auth` guarda `av_user` en `localStorage`, redirige a `/` y el nav muestra el nombre en mayúsculas (máx. 10 caracteres).
- [ ] "JUGAR COMO INVITADO" redirige a `/` sin `av_user` y el nav muestra "Iniciar Sesión".
- [ ] Hacer clic en el botón con el nombre de usuario cierra la sesión y elimina `av_user`.
- [ ] Recargar la página con sesión iniciada mantiene el nombre en el nav sin errores de hidratación en la consola.
- [ ] Por debajo de 840 px el nav muestra la hamburguesa; abre y cierra el panel lateral; los links del panel navegan y cierran el panel.
- [ ] El link activo del nav se resalta: "Biblioteca" en `/`, `/juegos/*`; "Salón de la Fama" en `/salon`.
- [ ] No queda ninguna referencia visual al scaffold de Create Next App.
- [ ] No hay errores en la consola del navegador al recorrer las cinco pantallas.

---

## Decisions

- **Yes:** rutas del App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/auth`). URLs reales y compartibles; el hash JSON del prototipo era un recurso de demo.
- **No:** replicar la SPA con estado y hash. Obliga a todo client component y desaprovecha Next.js.
- **Yes:** sesión mock en `localStorage` (`av_user`) con un provider de cliente. Es lo que hace el prototipo y permite probar el flujo visual de nav, salón y reproductor.
- **No:** cookies o Server Actions. Es auth real y merece su propia spec.
- **Yes:** guardado de puntuaciones en `av_scores` como en el prototipo. Deja lista la forma del dato para un backend futuro.
- **No:** mostrar `av_scores` en detalle o salón. Mezclar datos semilla y locales complica el MVP visual.
- **Yes:** datos mock tipados en `lib/games.ts` y `lib/scores.ts`, componentes en `components/` en la raíz, sin `src/`. Coincide con el alias `@/*` ya configurado.
- **Yes:** páginas de detalle y reproductor como Server Components que validan el id y delegan lo interactivo a componentes cliente pequeños. Reduce JS enviado.
- **Yes:** reutilizar el CSS ya portado en `app/globals.css`; no reescribir estilos.
- **No:** Tailwind para reescribir las pantallas. Las clases `av-*` ya existen y garantizan fidelidad con el prototipo.
- **Yes:** `seededScores` conserva el algoritmo del prototipo para que los datos sean deterministas entre recargas y servidor/cliente.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Errores de hidratación al leer `localStorage` | Leer solo en `useEffect`; el primer render siempre es "sin sesión". |
| `localStorage` bloqueado (modo privado) | `try/catch` en cada acceso; la app sigue funcionando sin persistir. |
| Cambios de API de Next.js 16 (params asíncronos, `LayoutProps`) | Paso 1 obliga a leer `node_modules/next/dist/docs/` antes de codificar. |
| Diferencias visuales respecto al prototipo | Comparar cada pantalla contra `Arcade Vault.html` abierto en el navegador al terminar cada paso. |
| Intervalo del reproductor sigue corriendo al desmontar | Limpiar el `setInterval` en el cleanup del efecto. |

---

## What is **not** in this spec

- Ningún juego real, ni lógica de colisiones, ni controles de teclado/táctiles.
- Backend, base de datos o API.
- Autenticación real ni OAuth.
- Leaderboards alimentados por puntuaciones guardadas.
- Tests automatizados.
- Internacionalización o tema claro.

Cada uno de estos puntos, si se aborda, va en su propia spec.
